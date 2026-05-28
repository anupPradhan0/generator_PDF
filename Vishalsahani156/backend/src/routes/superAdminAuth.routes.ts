import { Router } from "express";
import { superAdminLogin, superAdminRegister } from "../controllers/superAdminAuth.controller";
import { getSuperAdminMe } from "../controllers/superAdminMe.controller";
import { requireSuperAdminAuth } from "../middleware/requireSuperAdminAuth";

export const superAdminAuthRoutes = Router();

superAdminAuthRoutes.post("/register", superAdminRegister);
superAdminAuthRoutes.post("/login", superAdminLogin);
superAdminAuthRoutes.get("/me", requireSuperAdminAuth, getSuperAdminMe);

