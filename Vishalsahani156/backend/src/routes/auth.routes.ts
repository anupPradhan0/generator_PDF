import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getMe, login, logout, register, updateMe } from "../controllers/auth.controller";

export const authRoutes = Router();

authRoutes.post("/register", register);
authRoutes.post("/login", login);
authRoutes.post("/logout", requireAuth, logout);
authRoutes.get("/me", requireAuth, getMe);
authRoutes.put("/me", requireAuth, updateMe);

