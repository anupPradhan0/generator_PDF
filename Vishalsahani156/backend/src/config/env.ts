import fs from "fs";
import path from "path";
import dotenv from "dotenv";

function loadEnvFile(): string | null {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../.env"),
    path.resolve(__dirname, "../../.env"),
    path.resolve(__dirname, "../../../.env")
  ];

  const envPath = candidates.find((p) => fs.existsSync(p));
  if (envPath) {
    dotenv.config({ path: envPath });
    return envPath;
  }

  dotenv.config();
  return null;
}

const loadedEnvPath = loadEnvFile();

// Some environments/editors can introduce NUL bytes or other non-printing chars
// in `.env` files which can cause dotenv to stop parsing part-way. As a fallback,
// we opportunistically read the file content and extract keys we rely on.
function fallbackExtractFromEnvFile(names: string[]) {
  if (!loadedEnvPath) return;
  try {
    const raw = fs.readFileSync(loadedEnvPath, "utf8").replace(/\u0000/g, "");
    for (const name of names) {
      const current = cleanEnvValue(process.env[name] || "");
      if (current) {
        process.env[name] = current;
        continue;
      }
      // Use last non-empty assignment (handles duplicate/commented lines in .env).
      const re = new RegExp(`^\\s*${name}\\s*=\\s*(.*)\\s*$`, "gm");
      let last = "";
      for (const m of raw.matchAll(re)) {
        const v = cleanEnvValue(m[1] || "");
        if (v) last = v;
      }
      if (last) process.env[name] = last;
    }
  } catch {
    // ignore
  }
}

// Always try backend/.env next to this package (works for Docker + local dev).
function loadBackendEnvFallback() {
  const backendEnv = path.resolve(__dirname, "../../.env");
  if (!fs.existsSync(backendEnv)) return;
  dotenv.config({ path: backendEnv, override: false });
  fallbackExtractFromEnvFile(["DEEPGRAM_API_KEY", "GEMINI_API_KEY"]);
}

loadBackendEnvFallback();

fallbackExtractFromEnvFile(["DEEPGRAM_API_KEY", "GEMINI_API_KEY"]);

/** Strip whitespace and optional surrounding quotes from .env values. */
function cleanEnvValue(value: string): string {
  let s = String(value || "")
    .replace(/^\uFEFF/, "")
    .replace(/\r/g, "")
    .trim();
  // Strip inline comments: KEY=value # comment
  const hash = s.indexOf(" #");
  if (hash > 0) s = s.slice(0, hash).trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  PORT: process.env.PORT ? Number(process.env.PORT) : 5000,
  NODE_ENV: process.env.NODE_ENV || "development",
  MONGODB_URI: required("MONGODB_URI"),
  JWT_SECRET: required("JWT_SECRET"),
  DEEPGRAM_API_KEY: cleanEnvValue(process.env.DEEPGRAM_API_KEY || ""),
  GEMINI_API_KEY: cleanEnvValue(process.env.GEMINI_API_KEY || ""),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  SUPER_ADMIN_JWT_SECRET: process.env.SUPER_ADMIN_JWT_SECRET || required("JWT_SECRET"),
  SUPER_ADMIN_JWT_EXPIRES_IN: process.env.SUPER_ADMIN_JWT_EXPIRES_IN || "7d",
  // If set, required for new Super Admin registrations.
  // If not set, only the first Super Admin can register (bootstrap mode).
  SUPER_ADMIN_REGISTRATION_KEY: (process.env.SUPER_ADMIN_REGISTRATION_KEY || "").trim(),
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",
  PUBLIC_URL: process.env.PUBLIC_URL || "http://localhost:5000",
  UPLOAD_DIR: process.env.UPLOAD_DIR || "uploads"
};

