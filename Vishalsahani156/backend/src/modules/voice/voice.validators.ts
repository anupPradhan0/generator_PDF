import { z } from "zod";

export const voiceAnalyzeBodySchema = z.object({
  language: z.string().trim().min(2).max(20).optional()
});

export const voiceAudioToEventBodySchema = z.object({
  language: z.string().trim().min(2).max(20).optional(),
  timezone: z.string().trim().min(2).max(64).optional()
});

