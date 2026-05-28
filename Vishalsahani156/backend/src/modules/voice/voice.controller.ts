import type { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { catchAsync } from "../../utils/catchAsync";
import { voiceAnalyzeBodySchema, voiceAudioToEventBodySchema } from "./voice.validators";
import { deepgramTranscribe, deepgramValidateApiKey } from "./deepgram.service";
import { analyzeTranscript } from "./transcriptParser";
import { geminiExtractEventDetails } from "./geminiEventExtractor";
import { PdfRecord } from "../../models/PdfRecord";

export const deepgramHealth = catchAsync(async (_req: Request, res: Response) => {
  const result = await deepgramValidateApiKey();
  return res.status(result.valid ? 200 : 502).json({
    success: result.valid,
    data: result
  });
});

export const analyzeVoice = catchAsync(async (req: Request, res: Response) => {
  const file = (req as any).file as undefined | { buffer: Buffer; mimetype?: string };
  if (!file?.buffer?.length) throw new AppError("Audio file is required", 400);

  const body = voiceAnalyzeBodySchema.parse(req.body ?? {});
  const language = body.language || "en-IN";
  const contentType = file.mimetype || "audio/webm";

  const { transcript, confidence } = await deepgramTranscribe({
    audioBuffer: file.buffer,
    contentType,
    language
  });

  const analysis = analyzeTranscript(transcript);

  // If we extracted extraNotes, append them to description without changing schema.
  if (analysis.extraNotes) {
    const desc = analysis.extracted.description?.trim();
    const notesLine = `Extra notes: ${analysis.extraNotes}`.trim();
    analysis.extracted.description = desc ? `${desc}\n${notesLine}` : notesLine;
  }

  return res.json({
    success: true,
    data: {
      transcript: analysis.transcript,
      extracted: analysis.extracted,
      extraNotes: analysis.extraNotes,
      unmatchedText: analysis.unmatchedText,
      confidence: {
        ...analysis.confidence,
        transcript: confidence
      }
    }
  });
});

export const audioToEvent = catchAsync(async (req: Request, res: Response) => {
  const file = (req as any).file as undefined | { buffer: Buffer; mimetype?: string };
  if (!file?.buffer?.length) throw new AppError("Audio file is required", 400);

  const body = voiceAudioToEventBodySchema.parse(req.body ?? {});
  const language = body.language || "en-IN";
  const timezone = body.timezone || "Asia/Kolkata";
  const contentType = file.mimetype || "audio/webm";

  const { transcript, confidence } = await deepgramTranscribe({
    audioBuffer: file.buffer,
    contentType,
    language
  });

  const event = await geminiExtractEventDetails({
    transcript,
    timezone
  });

  const isoDate = new Date(event.date);
  const eventDate = Number.isNaN(isoDate.getTime()) ? "" : isoDate.toISOString().slice(0, 10);

  const descriptionParts: string[] = [];
  if (event.time) descriptionParts.push(`Time: ${event.time}`);
  if (event.location) descriptionParts.push(`Location: ${event.location}`);
  if (event.notes) descriptionParts.push(event.notes);

  const suggested = {
    eventName: (event.eventName || event.eventType || "").trim() || "New Event",
    eventDate,
    // The app uses sheetCategory as its "type" field; if Gemini returns a new type
    // not in the allowed list, the frontend can fall back to "Custom Sheet".
    sheetCategory: event.eventType,
    description: descriptionParts.join("\n").trim()
  };

  return res.json({
    success: true,
    data: {
      transcript,
      sttConfidence: confidence,
      event,
      suggested
    }
  });
});

function toIsoDateOrEmpty(input: string): string {
  const s = String(input || "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString().slice(0, 10);
}

export const bookEventFromAudio = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError("Unauthorized", 401);

  const file = (req as any).file as undefined | { buffer: Buffer; mimetype?: string };
  if (!file?.buffer?.length) throw new AppError("Audio file is required", 400);

  const body = voiceAudioToEventBodySchema.parse(req.body ?? {});
  const language = body.language || "en-IN";
  const timezone = body.timezone || "Asia/Kolkata";
  const contentType = file.mimetype || "audio/webm";

  const { transcript, confidence } = await deepgramTranscribe({
    audioBuffer: file.buffer,
    contentType,
    language
  });

  const event = await geminiExtractEventDetails({
    transcript,
    timezone
  });

  const eventDate = toIsoDateOrEmpty(event.date);
  if (!eventDate) throw new AppError("Could not determine event date from audio", 400);

  const descriptionParts: string[] = [];
  if (event.time) descriptionParts.push(`Time: ${event.time}`);
  if (event.location) descriptionParts.push(`Location: ${event.location}`);
  if (event.notes) descriptionParts.push(event.notes);

  const suggested = {
    eventName: (event.eventName || event.eventType || "").trim() || "New Event",
    eventDate,
    sheetCategory: String(event.eventType || "").trim(),
    description: descriptionParts.join("\n").trim()
  };

  if (!suggested.sheetCategory) throw new AppError("Could not determine event category from audio", 400);
  if (!suggested.description) throw new AppError("Could not determine event description from audio", 400);

  const record = await PdfRecord.create({
    userId,
    name: "",
    email: "",
    phone: "",
    eventDate: new Date(eventDate),
    sheetCategory: suggested.sheetCategory,
    description: suggested.description,
    eventName: suggested.eventName
  } as any);

  return res.status(201).json({
    success: true,
    data: {
      record,
      transcript,
      sttConfidence: confidence,
      event,
      suggested
    }
  });
});

