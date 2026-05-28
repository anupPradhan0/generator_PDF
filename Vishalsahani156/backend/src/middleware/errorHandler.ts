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
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        message: "Uploaded file is too large"
      });
    }

    return res.status(400).json({
      message: "Upload error",
      details: { code: err.code, field: err.field }
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

  // Avoid leaking stack traces to clients.
  return res.status(500).json({
    message: "Internal server error"
  });
}

