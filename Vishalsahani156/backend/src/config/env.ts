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
      if (process.env[name]) continue;
      const m = raw.match(new RegExp(`^\\s*${name}\\s*=\\s*(.*)\\s*$`, "m"));
      if (m?.[1]) process.env[name] = m[1];
    }
  } catch {
    // ignore
  }
}

fallbackExtractFromEnvFile(["DEEPGRAM_API_KEY", "GEMINI_API_KEY"]);

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
  DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY || "",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
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

