import { z } from "zod";

export const registerSchema = z.object({
  fullName: z
    .string({ required_error: "Field is required" })
    .trim()
    .min(1, "Field is required")
    .max(12, "Please enter a short name"),
  email: z
    .string({ required_error: "Field is required" })
    .trim()
    .min(1, "Field is required")
    .email(),
  phoneNumber: z
    .string({ required_error: "Field is required" })
    .trim()
    .min(1, "Field is required")
    .regex(/^\d+$/, "Invalid number")
    .max(12, "Invalid number"),
  password: z
    .string({ required_error: "Field is required" })
    .min(1, "Field is required")
    .min(4, "Minimum 4 characters required")
    .max(8, "Maximum 8 characters allowed")
});

export const loginSchema = z.object({
  email: z.string().email().trim(),
  password: z.string().min(4).max(100)
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(80).trim().optional(),
  phoneNumber: z.string().min(7).max(20).trim().optional()
});

