import type { Request, Response } from "express";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { env } from "../config/env";
import { PdfRecord } from "../models/PdfRecord";
import { generateA4PdfBytes } from "../services/pdf.service";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { pdfIdParamSchema, pdfInputSchema } from "../validators/pdf.validators";

async function writePdfToDisk(opts: {
  userId: string;
  recordId: string;
  bytes: Uint8Array;
}) {
  const { userId, recordId, bytes } = opts;
  const uploadsRoot = path.resolve(process.cwd(), env.UPLOAD_DIR);
  const userDir = path.join(uploadsRoot, userId);
  await fs.mkdir(userDir, { recursive: true });

  const fileName = `${recordId}-${crypto.randomUUID()}.pdf`;
  const filePath = path.join(userDir, fileName);
  await fs.writeFile(filePath, bytes);

  const pdfUrl = `${env.PUBLIC_URL}/api/pdfs/download/${recordId}`;
  return { fileName, filePath, pdfUrl };
}

export const generatePreview = catchAsync(async (req: Request, res: Response) => {
  const body = pdfInputSchema.parse(req.body);
  const bytes = await generateA4PdfBytes(body);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'inline; filename="preview.pdf"');
  res.send(Buffer.from(bytes));
});

export const createRecord = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError("Unauthorized", 401);

  const body = pdfInputSchema.parse(req.body);
  const eventDate = new Date(body.eventDate);
  if (Number.isNaN(eventDate.getTime())) throw new AppError("Invalid event date");

  const record = await PdfRecord.create({
    userId,
    name: body.name,
    email: body.email,
    phone: body.phone,
    eventDate,
    sheetCategory: body.sheetCategory,
    description: body.description
  });

  const bytes = await generateA4PdfBytes(body);
  const written = await writePdfToDisk({
    userId,
    recordId: String(record._id),
    bytes
  });

  record.pdfUrl = written.pdfUrl;
  record.filePath = written.filePath;
  await record.save();

  return res.status(201).json({ record });
});

export const listRecords = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError("Unauthorized", 401);

  const q = String(req.query.q || "").trim();
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 50);
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = { userId };
  if (q) {
    const regex = new RegExp(q, "i");
    filter.name = regex as any;
    // We'll handle multi-field search using $or.
    delete (filter as any).name;
    (filter as any).$or = [
      { name: regex },
      { email: regex },
      { phone: regex },
      { sheetCategory: regex },
      { description: regex }
    ];
  }

  const [items, total] = await Promise.all([
    PdfRecord.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    PdfRecord.countDocuments(filter)
  ]);

  return res.json({
    items,
    page,
    limit,
    total
  });
});

export const updateRecord = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError("Unauthorized", 401);

  const params = pdfIdParamSchema.parse(req.params);
  const id = params.id;

  const body = pdfInputSchema.parse(req.body);
  const eventDate = new Date(body.eventDate);
  if (Number.isNaN(eventDate.getTime())) throw new AppError("Invalid event date");

  const record = await PdfRecord.findOne({ _id: id, userId });
  if (!record) throw new AppError("PDF record not found", 404);

  // Regenerate PDF and overwrite file.
  const bytes = await generateA4PdfBytes(body);

  // Remove old file if present.
  if (record.filePath) {
    try {
      await fs.unlink(record.filePath);
    } catch {
      // ignore missing file
    }
  }

  const written = await writePdfToDisk({
    userId,
    recordId: String(record._id),
    bytes
  });

  record.name = body.name;
  record.email = body.email;
  record.phone = body.phone;
  record.eventDate = eventDate;
  record.sheetCategory = body.sheetCategory;
  record.description = body.description;
  record.pdfUrl = written.pdfUrl;
  record.filePath = written.filePath;

  await record.save();
  return res.json({ record });
});

export const deleteRecord = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError("Unauthorized", 401);

  const params = pdfIdParamSchema.parse(req.params);
  const id = params.id;

  const record = await PdfRecord.findOne({ _id: id, userId });
  if (!record) throw new AppError("PDF record not found", 404);

  if (record.filePath) {
    try {
      await fs.unlink(record.filePath);
    } catch {
      // ignore missing file
    }
  }

  await record.deleteOne();
  return res.status(204).send();
});

export const downloadById = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError("Unauthorized", 401);

  const params = pdfIdParamSchema.parse(req.params);
  const id = params.id;

  const record = await PdfRecord.findOne({ _id: id, userId });
  if (!record || !record.filePath) throw new AppError("File not found", 404);

  const fileBytes = await fs.readFile(record.filePath);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${record.sheetCategory || "sheet"}-${record._id}.pdf"`
  );
  res.send(fileBytes);
});

