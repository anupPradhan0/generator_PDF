import type { Request, Response } from "express";
import { User } from "../models/User";
import { hashPassword, signToken, verifyPassword } from "../services/auth.service";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { loginSchema, registerSchema, updateProfileSchema } from "../validators/auth.validators";

function publicUser(user: {
  _id: unknown;
  fullName: string;
  email: string;
  phoneNumber: string;
  createdAt: Date;
}) {
  return {
    id: String(user._id),
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    createdAt: user.createdAt
  };
}

export const register = catchAsync(async (req: Request, res: Response) => {
  const body = registerSchema.parse(req.body);

  const existing = await User.findOne({ email: body.email });
  if (existing) throw new AppError("Email is already registered", 409);

  const hashed = await hashPassword(body.password);

  const user = await User.create({
    fullName: body.fullName,
    email: body.email,
    phoneNumber: body.phoneNumber,
    password: hashed
  });

  const token = signToken(String(user._id));

  return res.status(201).json({
    token,
    user: publicUser(user)
  });
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const body = loginSchema.parse(req.body);

  const user = await User.findOne({ email: body.email });
  if (!user) throw new AppError("Invalid email or password", 401);

  const ok = await verifyPassword(body.password, user.password);
  if (!ok) throw new AppError("Invalid email or password", 401);

  const token = signToken(String(user._id));

  return res.json({
    token,
    user: publicUser(user)
  });
});

export const logout = catchAsync(async (_req: Request, res: Response) => {
  // JWT auth is stateless; frontend clears the token.
  res.status(204).send();
});

export const getMe = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError("Unauthorized", 401);

  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);

  res.json({ user: publicUser(user) });
});

export const updateMe = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError("Unauthorized", 401);

  const body = updateProfileSchema.parse(req.body);

  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);

  if (body.fullName !== undefined) user.fullName = body.fullName;
  if (body.phoneNumber !== undefined) user.phoneNumber = body.phoneNumber;

  await user.save();
  res.json({ user: publicUser(user) });
});

