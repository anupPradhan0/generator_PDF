import type { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { catchAsync } from "../../utils/catchAsync";
import { voiceAnalyzeBodySchema } from "./voice.validators";
import { deepgramTranscribe } from "./deepgram.service";
import { analyzeTranscript } from "./transcriptParser";

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

