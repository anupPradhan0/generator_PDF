import type { Request, Response } from "express";
import { env } from "../config/env";
import { SuperAdmin } from "../models/SuperAdmin";
import { hashPassword, verifyPassword } from "../services/auth.service";
import { signSuperAdminToken } from "../services/superAdminAuth.service";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { superAdminLoginSchema, superAdminRegisterSchema } from "../validators/superAdmin.validators";

function publicSuperAdmin(admin: { _id: unknown; username: string; email: string; createdAt: Date }) {
  return {
    id: String(admin._id),
    username: admin.username,
    email: admin.email,
    createdAt: admin.createdAt
  };
}

export const superAdminRegister = catchAsync(async (req: Request, res: Response) => {
  const body = superAdminRegisterSchema.parse(req.body);

  const existing = await SuperAdmin.findOne({ email: body.email });
  if (existing) throw new AppError("Email is already registered", 409);

  const existingCount = await SuperAdmin.countDocuments();

  if (env.SUPER_ADMIN_REGISTRATION_KEY) {
    if (!body.registrationKey || body.registrationKey !== env.SUPER_ADMIN_REGISTRATION_KEY) {
      throw new AppError("Invalid registration key", 403);
    }
  } else {
    // Bootstrap mode: allow only the first Super Admin to be created without a key.
    if (existingCount > 0) throw new AppError("Super Admin registration is disabled", 403);
  }

  const hashed = await hashPassword(body.password);
  const admin = await SuperAdmin.create({
    username: body.username,
    email: body.email,
    password: hashed
  });

  const token = signSuperAdminToken(String(admin._id));
  return res.status(201).json({ token, admin: publicSuperAdmin(admin) });
});

export const superAdminLogin = catchAsync(async (req: Request, res: Response) => {
  const body = superAdminLoginSchema.parse(req.body);

  const admin = await SuperAdmin.findOne({ email: body.email });
  if (!admin) throw new AppError("Invalid email or password", 401);

  const ok = await verifyPassword(body.password, admin.password);
  if (!ok) throw new AppError("Invalid email or password", 401);

  const token = signSuperAdminToken(String(admin._id));
  return res.json({ token, admin: publicSuperAdmin(admin) });
});

