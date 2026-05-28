import { Router } from "express";
import { requireSuperAdminAuth } from "../middleware/requireSuperAdminAuth";
import { deleteUserById, listAllUsers, updateUserById } from "../controllers/superAdminUsers.controller";

export const superAdminUsersRoutes = Router();

superAdminUsersRoutes.use(requireSuperAdminAuth);

superAdminUsersRoutes.get("/", listAllUsers);
superAdminUsersRoutes.patch("/:id", updateUserById);
superAdminUsersRoutes.delete("/:id", deleteUserById);

