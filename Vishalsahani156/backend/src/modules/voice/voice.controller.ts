import type { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { catchAsync } from "../../utils/catchAsync";
import { voiceAnalyzeBodySchema, voiceAudioToEventBodySchema } from "./voice.validators";
import { deepgramTranscribe, deepgramValidateApiKey } from "./deepgram.service";
import { analyzeTranscript } from "./transcriptParser";
import { geminiExtractEventDetails } from "./geminiEventExtractor";

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

