import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof multer.MulterError) {
    const uploadErr = err;
    if (uploadErr.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        message: "Uploaded file is too large"
      });
    }

    return res.status(400).json({
      message: "Upload error",
      details: { code: uploadErr.code, field: uploadErr.field }
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Validation error",
      errors: err.issues
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
      details: err.details
    });
  }

  // Log unexpected errors server-side (check: docker-compose logs -f backend).
  // eslint-disable-next-line no-console
  console.error("[errorHandler] Unhandled error:", err);

  // Avoid leaking stack traces to clients in production.
  const isDev = process.env.NODE_ENV !== "production";
  return res.status(500).json({
    message: isDev && err instanceof Error ? err.message : "Internal server error"
  });
}

