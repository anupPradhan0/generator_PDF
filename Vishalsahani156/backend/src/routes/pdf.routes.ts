import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  createRecord,
  deleteRecord,
  getDashboard,
  getRecordById,
  downloadById,
  generatePreview,
  listRecords,
  updateRecord
} from "../controllers/pdf.controller";

export const pdfRoutes = Router();

pdfRoutes.post("/generate", requireAuth, generatePreview);
pdfRoutes.post("/", requireAuth, createRecord);

pdfRoutes.get("/dashboard", requireAuth, getDashboard);
pdfRoutes.get("/", requireAuth, listRecords);
pdfRoutes.get("/:id", requireAuth, getRecordById);
pdfRoutes.put("/:id", requireAuth, updateRecord);
pdfRoutes.delete("/:id", requireAuth, deleteRecord);

pdfRoutes.get("/download/:id", requireAuth, downloadById);

