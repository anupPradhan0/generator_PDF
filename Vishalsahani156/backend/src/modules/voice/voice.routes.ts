import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../../middleware/auth";
import { requireNotBlocked } from "../../middleware/requireNotBlocked";
import { analyzeVoice, audioToEvent, bookEventFromAudio, deepgramHealth } from "./voice.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024 // 8MB
  }
});

export const voiceRoutes = Router();

voiceRoutes.get(
  "/deepgram/health",
  requireAuth as any,
  requireNotBlocked as any,
  deepgramHealth as any
);

// Type-cast to avoid @types/express duplication mismatch across repo.
voiceRoutes.post(
  "/analyze",
  requireAuth as any,
  requireNotBlocked as any,
  upload.single("audio") as any,
  analyzeVoice as any
);

voiceRoutes.post(
  "/audio-to-event",
  requireAuth as any,
  requireNotBlocked as any,
  upload.single("audio") as any,
  audioToEvent as any
);

// Voice → Extract → Book (creates an event record for the user)
voiceRoutes.post(
  "/book-event",
  requireAuth as any,
  requireNotBlocked as any,
  upload.single("audio") as any,
  bookEventFromAudio as any
);

