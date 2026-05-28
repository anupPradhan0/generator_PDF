import { z } from "zod";

export const voiceAnalyzeBodySchema = z.object({
  language: z.string().trim().min(2).max(20).optional()
});

