import { z } from "zod";

export const pdfInputSchema = z.object({
  eventName: z.string().min(2).max(160).trim(),
  name: z.string().max(120).trim().optional().default(""),
  email: z.string().email().trim().optional().default(""),
  phone: z.string().max(20).trim().optional().default(""),
  eventDate: z
    .string()
    .min(1)
    .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid event date"),
  sheetCategory: z.string().min(2).max(40).trim(),
  description: z.string().min(1).max(4000).trim()
});

export const pdfIdParamSchema = z.object({
  id: z.string().min(1)
});

