import type { NextFunction, Request, Response } from "express";
import { User } from "../models/User";
import { AppError } from "../utils/AppError";

export async function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const userId = req.user?.userId;
  if (!userId) return next(new AppError("Unauthorized", 401));

  const user = await User.findById(userId).select("role");
  if (!user) return next(new AppError("User not found", 404));
  if (user.role !== "admin") return next(new AppError("Forbidden", 403));
  return next();
}

