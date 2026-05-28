import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";

export function requireSuperAdminAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) return next(new AppError("Unauthorized", 401));

  try {
    const payload = jwt.verify(token, env.SUPER_ADMIN_JWT_SECRET) as jwt.JwtPayload & { typ?: string };
    const adminId = payload.sub;
    if (!adminId) return next(new AppError("Invalid token", 401));
    if (payload.typ && payload.typ !== "super_admin") return next(new AppError("Invalid token", 401));
    req.superAdmin = { adminId: String(adminId) };
    next();
  } catch {
    next(new AppError("Invalid or expired token", 401));
  }
}

