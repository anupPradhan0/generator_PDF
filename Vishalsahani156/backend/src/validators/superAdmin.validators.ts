import { z } from "zod";

export const superAdminRegisterSchema = z.object({
  username: z.string({ required_error: "Field is required" }).trim().min(2).max(50),
  email: z.string({ required_error: "Field is required" }).trim().email(),
  password: z.string({ required_error: "Field is required" }).min(6).max(100),
  registrationKey: z.string().trim().optional()
});

export const superAdminLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6).max(100)
});

