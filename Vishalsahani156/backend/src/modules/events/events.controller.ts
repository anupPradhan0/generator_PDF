import type { Request, Response } from "express";
import fs from "fs/promises";
import { PDFDocument } from "pdf-lib";
import { matchAllowedSheetCategory } from "../../constants/sheetCategories";
import { PdfRecord } from "../../models/PdfRecord";
import { generateA4PdfBytes } from "../../services/pdf.service";
import { AppError } from "../../utils/AppError";
import { catchAsync } from "../../utils/catchAsync";
import {
  allowedCategoriesFilter,
  assertAllowedCategoryFilter,
  assertRecordHasAllowedCategory,
  categoryNotFoundError
} from "../../utils/sheetCategory";
import { eventIdParamSchema, eventInputSchema, eventsListQuerySchema } from "./events.validators";

/**
 * Transitional implementation:
 * We store Events in the existing `PdfRecord` collection so the app keeps working,
 * while we migrate naming + PDF rendering in later steps.
 */

export const createEvent = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError("Unauthorized", 401);

  const body = eventInputSchema.parse(req.body);
  const eventDate = new Date(body.eventDate);
  if (Number.isNaN(eventDate.getTime())) throw new AppError("Invalid event date");

  const record = await PdfRecord.create({
    userId,
    // map event -> current schema fields
    name: "",
    email: "",
    phone: "",
    eventDate,
    sheetCategory: body.eventCategory,
    description: body.description,
    // store eventName temporarily inside description prefix until schema is expanded
    // (we will add a proper field in the next backend-models step)
    // NOTE: keep as plain text so existing PDF generator still works.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    eventName: body.eventName
  } as any);

  return res.status(201).json({ success: true, data: record });
});

export const listEvents = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError("Unauthorized", 401);

  const query = eventsListQuerySchema.parse(req.query);
  const q = (query.q || "").trim();
  const category = (query.category || "").trim();
  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = { userId, ...allowedCategoriesFilter() };
  if (category) {
    assertAllowedCategoryFilter(category);
    filter.sheetCategory = matchAllowedSheetCategory(category)!;
  }
  if (q) {
    const regex = new RegExp(q, "i");
    (filter as any).$or = [
      { name: regex },
      { email: regex },
      { phone: regex },
      { sheetCategory: regex },
      { description: regex }
    ];
  }

  const [items, total] = await Promise.all([
    PdfRecord.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    PdfRecord.countDocuments(filter)
  ]);

  if (category && total === 0) {
    throw categoryNotFoundError();
  }

  return res.json({
    success: true,
    data: items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
});

export const getEventById = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError("Unauthorized", 401);

  const params = eventIdParamSchema.parse(req.params);
  const record = await PdfRecord.findOne({ _id: params.id, userId });
  if (!record) throw categoryNotFoundError();
  assertRecordHasAllowedCategory(record.sheetCategory);

  return res.json({ success: true, data: record });
});

export const updateEvent = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError("Unauthorized", 401);

  const params = eventIdParamSchema.parse(req.params);
  const body = eventInputSchema.parse(req.body);
  const eventDate = new Date(body.eventDate);
  if (Number.isNaN(eventDate.getTime())) throw new AppError("Invalid event date");

  const record = await PdfRecord.findOne({ _id: params.id, userId });
  if (!record) throw new AppError("Event not found", 404);

  // Create Event no longer includes name/email/phone. Preserve existing stored values.
  record.eventDate = eventDate;
  record.sheetCategory = body.eventCategory;
  record.description = body.description;
  (record as any).eventName = body.eventName;

  await record.save();
  return res.json({ success: true, data: record });
});

export const deleteEvent = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError("Unauthorized", 401);

  const params = eventIdParamSchema.parse(req.params);
  const record = await PdfRecord.findOne({ _id: params.id, userId });
  if (!record) throw new AppError("Event not found", 404);

  // Remove stored PDF file if present (same behavior as /pdfs)
  if (record.filePath) {
    try {
      await fs.unlink(record.filePath);
    } catch {
      // ignore
    }
  }

  await record.deleteOne();
  return res.json({ success: true, message: "Deleted" });
});

function toPdfInputFromRecord(record: any) {
  return {
    eventName: record.eventName ?? "",
    name: record.name ?? "",
    email: record.email ?? "",
    phone: record.phone ?? "",
    eventDate:
      record.eventDate instanceof Date
        ? record.eventDate.toISOString()
        : String(record.eventDate ?? new Date().toISOString()),
    sheetCategory: matchAllowedSheetCategory(record.sheetCategory ?? "") ?? "Custom Sheet",
    description: record.description ?? ""
  };
}

export const downloadSingleEventPdf = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError("Unauthorized", 401);

  const params = eventIdParamSchema.parse(req.params);
  const record = await PdfRecord.findOne({ _id: params.id, userId });
  if (!record) throw categoryNotFoundError();
  assertRecordHasAllowedCategory(record.sheetCategory);

  let bytes: Uint8Array;
  if (record.filePath) {
    try {
      const fileBytes = await fs.readFile(record.filePath);
      bytes = new Uint8Array(fileBytes);
    } catch {
      bytes = await generateA4PdfBytes(toPdfInputFromRecord(record));
    }
  } else {
    bytes = await generateA4PdfBytes(toPdfInputFromRecord(record));
  }

  const safeName = String(record.eventName || record.name || "event").replace(/[^a-z0-9-_]+/gi, "-");
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="event-${safeName}-${record._id}.pdf"`);
  res.send(Buffer.from(bytes));
});

export const downloadAllEventsPdf = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError("Unauthorized", 401);

  const records = await PdfRecord.find({ userId, ...allowedCategoriesFilter() }).sort({
    createdAt: -1
  });
  if (!records.length) throw categoryNotFoundError();

  const outDoc = await PDFDocument.create();

  for (const record of records) {
    try {
      let eventBytes: Uint8Array;
      if (record.filePath) {
        try {
          const fileBytes = await fs.readFile(record.filePath);
          eventBytes = new Uint8Array(fileBytes);
        } catch {
          eventBytes = await generateA4PdfBytes(toPdfInputFromRecord(record));
        }
      } else {
        eventBytes = await generateA4PdfBytes(toPdfInputFromRecord(record));
      }

      const srcDoc = await PDFDocument.load(eventBytes);
      const copiedPages = await outDoc.copyPages(srcDoc, srcDoc.getPageIndices());
      for (const p of copiedPages) outDoc.addPage(p);
    } catch {
      // Skip records whose PDF cannot be read or merged.
    }
  }

  if (outDoc.getPageCount() === 0) {
    throw categoryNotFoundError();
  }

  const mergedBytes = await outDoc.save();
  const date = new Date().toISOString().slice(0, 10);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="all-events-${date}.pdf"`);
  res.send(Buffer.from(mergedBytes));
});

