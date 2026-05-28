import { z } from "zod";

export const registerSchema = z.object({
  fullName: z.string().min(2).max(80).trim(),
  email: z.string().email().trim(),
  phoneNumber: z.string().min(7).max(20).trim(),
  password: z.string().min(8).max(100)
});

export const loginSchema = z.object({
  email: z.string().email().trim(),
  password: z.string().min(8).max(100)
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(80).trim().optional(),
  phoneNumber: z.string().min(7).max(20).trim().optional()
});

