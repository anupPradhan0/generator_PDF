import { z } from "zod";

export const registerSchema = z.object({
  fullName: z
    .string({ required_error: "Field is required" })
    .trim()
    .min(1, "Field is required"),
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

const emptyToUndefined = (value: unknown) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
};

const profileNameSchema = z
  .string()
  .trim()
  .regex(
    /^[A-Za-z]+$/,
    "Name must contain only letters (A–Z) and no numbers or special characters."
  )
  .min(2, "Name must be at least 2 characters")
  .max(80);

const profilePasswordSchema = z
  .string()
  .min(4, "Minimum 4 characters required")
  .max(8, "Maximum 8 characters allowed");

export const updateProfileSchema = z
  .object({
    fullName: z.preprocess(emptyToUndefined, profileNameSchema.optional()),
    phoneNumber: z.preprocess(
      emptyToUndefined,
      z.string().min(7).max(20).trim().optional()
    ),
    oldPassword: z.preprocess(emptyToUndefined, z.string().optional()),
    newPassword: z.preprocess(emptyToUndefined, profilePasswordSchema.optional()),
    confirmNewPassword: z.preprocess(emptyToUndefined, z.string().optional())
  })
  .superRefine((data, ctx) => {
    const wantsPasswordChange =
      data.oldPassword !== undefined ||
      data.newPassword !== undefined ||
      data.confirmNewPassword !== undefined;

    if (!wantsPasswordChange) return;

    if (!data.oldPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Old password is required",
        path: ["oldPassword"]
      });
    }

    if (!data.newPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "New password is required",
        path: ["newPassword"]
      });
    }

    if (!data.confirmNewPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Confirm new password is required",
        path: ["confirmNewPassword"]
      });
    } else if (data.newPassword && data.newPassword !== data.confirmNewPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match",
        path: ["confirmNewPassword"]
      });
    }
  });

