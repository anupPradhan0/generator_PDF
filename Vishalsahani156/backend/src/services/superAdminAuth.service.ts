import jwt from "jsonwebtoken";
import { env } from "../config/env";

export function signSuperAdminToken(adminId: string): string {
  const expiresIn = env.SUPER_ADMIN_JWT_EXPIRES_IN as any;
  return jwt.sign({ sub: adminId, typ: "super_admin" }, env.SUPER_ADMIN_JWT_SECRET, {
    expiresIn
  });
}

