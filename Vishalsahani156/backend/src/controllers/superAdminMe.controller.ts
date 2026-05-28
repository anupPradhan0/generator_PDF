import type { Request, Response } from "express";
import { SuperAdmin } from "../models/SuperAdmin";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";

function publicSuperAdmin(admin: { _id: unknown; username: string; email: string; createdAt: Date }) {
  return {
    id: String(admin._id),
    username: admin.username,
    email: admin.email,
    createdAt: admin.createdAt
  };
}

export const getSuperAdminMe = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.superAdmin?.adminId;
  if (!adminId) throw new AppError("Unauthorized", 401);

  const admin = await SuperAdmin.findById(adminId);
  if (!admin) throw new AppError("Super Admin not found", 404);

  return res.json({ admin: publicSuperAdmin(admin) });
});

