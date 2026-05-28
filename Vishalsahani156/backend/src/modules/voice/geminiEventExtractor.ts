import { z } from "zod";
import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";

const geminiEventSchema = z
  .object({
    eventType: z.string().trim().min(1).max(60),
    date: z
      .string()
      .trim()
      .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date"),
    // Allow empty string when missing (Gemini often omits these).
    time: z.string().trim().max(30).optional().default(""),
    location: z.string().trim().max(120).optional().default(""),
    eventName: z.string().trim().min(1).max(160).optional(),
    notes: z.string().trim().max(4000).optional()
  })
  .strict();

export type GeminiExtractedEvent = z.infer<typeof geminiEventSchema>;

type GeminiModelInfo = {
  name?: string;
  supportedGenerationMethods?: string[];
};

function extractFirstJsonObject(text: string): unknown {
  const s = String(text || "");
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) return null;
  const candidate = s.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

let cachedGenerateContentModel: string | null = null;

async function pickGenerateContentModel(): Promise<string> {
  if (cachedGenerateContentModel) return cachedGenerateContentModel;

  // Optional override (lets you pin a specific available model without code changes)
  const override = String(process.env.GEMINI_MODEL || "").trim();
  if (override) {
    cachedGenerateContentModel = override.startsWith("models/") ? override : `models/${override}`;
    return cachedGenerateContentModel;
  }

  const url = new URL("https://generativelanguage.googleapis.com/v1beta/models");
  url.searchParams.set("key", env.GEMINI_API_KEY);

  const res = await fetch(url.toString(), { method: "GET" }).catch((e) => {
    throw new AppError(`Gemini model discovery failed: ${String((e as any)?.message || e)}`, 502);
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new AppError(`Gemini model discovery failed (${res.status}): ${text || res.statusText}`, 502);
  }

  const data = (await res.json()) as { models?: GeminiModelInfo[] };
  const models = Array.isArray(data.models) ? data.models : [];

  const supportsGenerate = (m: GeminiModelInfo) =>
    Array.isArray(m.supportedGenerationMethods) &&
    m.supportedGenerationMethods.includes("generateContent") &&
    typeof m.name === "string" &&
    m.name.startsWith("models/");

  // Prefer a "flash" model when available (fast/cheap). Otherwise pick first that supports generateContent.
  const flash = models.find((m) => supportsGenerate(m) && String(m.name).toLowerCase().includes("flash"));
  const first = models.find((m) => supportsGenerate(m));
  const picked = (flash?.name || first?.name || "").trim();

  if (!picked) {
    throw new AppError(
      "No Gemini model available for generateContent. Check your API key/project and call ListModels to confirm.",
      502
    );
  }

  cachedGenerateContentModel = picked;
  return picked;
}

export async function geminiExtractEventDetails(opts: {
  transcript: string;
  timezone?: string;
  nowIso?: string;
}): Promise<GeminiExtractedEvent> {
  if (!env.GEMINI_API_KEY) throw new AppError("Gemini is not configured (missing GEMINI_API_KEY)", 500);

  const tz = opts.timezone || "Asia/Kolkata";
  const nowIso = opts.nowIso || new Date().toISOString();
  const transcript = String(opts.transcript || "").trim();
  if (!transcript) throw new AppError("Transcript is empty", 400);

  const buildPrompt = (mode: "normal" | "retry") =>
    [
      "You are an information extraction engine.",
      "Extract event details from the user text and return ONLY valid JSON (no markdown, no backticks).",
      "",
      "Rules:",
      `- Current time (ISO): ${nowIso}`,
      `- Timezone: ${tz}`,
      "- Output must match this JSON schema exactly:",
      '{ "eventType": string, "date": string, "time": string, "location": string, "eventName"?: string, "notes"?: string }',
      "- date must be a real date. Prefer ISO date format: YYYY-MM-DD.",
      "- If time or location is missing, return empty string for that field (\"\").",
      "- eventType must be a short non-empty category (e.g. Birthday, Meeting, Conference, Wedding).",
      ...(mode === "retry"
        ? [
            "",
            "IMPORTANT:",
            "- Do NOT leave eventType blank.",
            "- Do NOT output placeholders like N/A. Use empty string only for time/location.",
            "- If the date is not explicitly stated, infer the most likely upcoming date; otherwise use today's date in the given timezone."
          ]
        : []),
      "",
      "User text:",
      transcript
    ].join("\n");

  const model = await pickGenerateContentModel();
  async function callGemini(promptText: string): Promise<unknown> {
    const url = new URL(`https://generativelanguage.googleapis.com/v1beta/${model}:generateContent`);
    url.searchParams.set("key", env.GEMINI_API_KEY);

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: promptText }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 512 }
      })
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 404) cachedGenerateContentModel = null;
      throw new AppError(`Gemini extraction failed (${res.status}): ${text || res.statusText}`, 502);
    }

    const data = (await res.json()) as any;
    const outText = String(data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
    if (!outText) throw new AppError("Gemini returned empty response", 502);

    try {
      return JSON.parse(outText);
    } catch {
      return extractFirstJsonObject(outText);
    }
  }

  const parsed1 = await callGemini(buildPrompt("normal"));
  if (parsed1) {
    try {
      return geminiEventSchema.parse(parsed1);
    } catch (e) {
      // fallthrough to retry below
      void e;
    }
  }

  const parsed2 = await callGemini(buildPrompt("retry"));
  if (!parsed2) throw new AppError("Gemini response was not valid JSON", 502);

  // If this still fails, let ZodError bubble to the error handler (400 with field-level issues).
  return geminiEventSchema.parse(parsed2);
}

