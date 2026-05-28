import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../../middleware/auth";
import { requireNotBlocked } from "../../middleware/requireNotBlocked";
import { analyzeVoice } from "./voice.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024 // 8MB
  }
});

export const voiceRoutes = Router();

// Type-cast to avoid @types/express duplication mismatch across repo.
voiceRoutes.post(
  "/analyze",
  requireAuth as any,
  requireNotBlocked as any,
  upload.single("audio") as any,
  analyzeVoice as any
);

