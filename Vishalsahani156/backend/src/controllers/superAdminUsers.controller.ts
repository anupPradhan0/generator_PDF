import type { Request, Response } from "express";
import mongoose from "mongoose";
import { User } from "../models/User";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import {
  adminUserIdParamSchema,
  adminUsersListQuerySchema,
  adminUserUpdateSchema
} from "../validators/superAdminUsers.validators";

function publicAdminUser(u: any) {
  return {
    id: String(u._id),
    fullName: u.fullName,
    email: u.email,
    phoneNumber: u.phoneNumber,
    role: u.role,
    isBlocked: u.isBlocked,
    blockedReason: u.blockedReason ?? null,
    blockedAt: u.blockedAt ?? null,
    createdAt: u.createdAt
  };
}

export const listAllUsers = catchAsync(async (req: Request, res: Response) => {
  const query = adminUsersListQuerySchema.parse(req.query);
  const q = (query.q || "").trim();
  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (q) {
    const regex = new RegExp(q, "i");
    (filter as any).$or = [{ fullName: regex }, { email: regex }, { phoneNumber: regex }];
  }

  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter)
  ]);

  return res.json({
    success: true,
    data: items.map(publicAdminUser),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
});

export const deleteUserById = catchAsync(async (req: Request, res: Response) => {
  const params = adminUserIdParamSchema.parse(req.params);
  if (!mongoose.isValidObjectId(params.id)) throw new AppError("Invalid user id", 400);

  const user = await User.findById(params.id);
  if (!user) throw new AppError("User not found", 404);

  await user.deleteOne();
  return res.json({ success: true, message: "User deleted" });
});

export const updateUserById = catchAsync(async (req: Request, res: Response) => {
  const params = adminUserIdParamSchema.parse(req.params);
  if (!mongoose.isValidObjectId(params.id)) throw new AppError("Invalid user id", 400);

  const body = adminUserUpdateSchema.parse(req.body);

  const user = await User.findById(params.id);
  if (!user) throw new AppError("User not found", 404);

  if (body.role !== undefined) user.role = body.role;

  if (body.isBlocked !== undefined) {
    user.isBlocked = body.isBlocked;
    user.blockedAt = body.isBlocked ? new Date() : null;
    if (!body.isBlocked) {
      user.blockedReason = null;
    }
  }

  if (body.blockedReason !== undefined) {
    user.blockedReason = body.blockedReason;
    if (body.blockedReason && user.isBlocked !== true) {
      // If a reason is provided, assume they intend to restrict.
      user.isBlocked = true;
      user.blockedAt = user.blockedAt ?? new Date();
    }
    if (body.blockedReason === null && user.isBlocked === false) {
      user.blockedAt = null;
    }
  }

  await user.save();
  return res.json({ success: true, data: publicAdminUser(user) });
});

