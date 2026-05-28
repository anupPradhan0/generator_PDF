import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

export function signToken(userId: string): string {
  // Put user id into `sub` claim so it stays consistent across token verifications.
  const expiresIn = env.JWT_EXPIRES_IN as any; // jsonwebtoken types want a constrained literal type
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn });
}

