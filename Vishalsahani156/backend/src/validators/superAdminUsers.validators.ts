import { z } from "zod";

export const adminUsersListQuerySchema = z.object({
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const adminUserIdParamSchema = z.object({
  id: z.string().trim().min(1)
});

export const adminUserUpdateSchema = z
  .object({
    role: z.enum(["user", "admin"]).optional(),
    isBlocked: z.boolean().optional(),
    blockedReason: z.string().trim().max(500).nullable().optional()
  })
  .refine((v) => Object.keys(v).length > 0, { message: "No updates provided" });

