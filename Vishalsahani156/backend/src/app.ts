import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { env } from "./config/env";
import { authRateLimiter, apiRateLimiter } from "./middleware/rateLimit";
import { errorHandler } from "./middleware/errorHandler";
import { authRoutes } from "./routes/auth.routes";
import { pdfRoutes } from "./routes/pdf.routes";
import { eventsRoutes } from "./modules/events/events.routes";
import { voiceRoutes } from "./modules/voice/voice.routes";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true
  })
);

app.use(express.json({ limit: "2mb" }));

// API routes
app.use("/api/auth", authRateLimiter, authRoutes);
app.use("/api/pdfs", apiRateLimiter, pdfRoutes);
app.use("/api/events", apiRateLimiter, eventsRoutes);
app.use("/api/voice", apiRateLimiter, voiceRoutes);

// Health check
app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use(
  // For debugging: ensure uploads path errors don't crash.
  "/uploads",
  express.static(path.resolve(process.cwd(), env.UPLOAD_DIR))
);

app.use(errorHandler);

