import { z } from "zod";
import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";

const geminiEventSchema = z.object({
  eventType: z.string().trim().min(1).max(60),
  date: z
    .string()
    .trim()
    .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date"),
  time: z.string().trim().max(30).optional().default(""),
  location: z.string().trim().max(120).optional().default(""),
  eventName: z.string().trim().min(1).max(160).optional(),
  notes: z.string().trim().max(4000).optional()
});

export type GeminiExtractedEvent = z.infer<typeof geminiEventSchema>;

const GEMINI_MODEL_FALLBACKS = [
  "models/gemini-2.0-flash",
  "models/gemini-1.5-flash",
  "models/gemini-1.5-pro"
] as const;

function normalizeGeminiPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const o = raw as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim());

  return {
    eventType: str(o.eventType ?? o.event_type ?? o.category ?? o.type),
    date: str(o.date ?? o.eventDate ?? o.event_date),
    time: str(o.time),
    location: str(o.location),
    eventName: str(o.eventName ?? o.event_name ?? o.name) || undefined,
    notes: str(o.notes ?? o.description) || undefined
  };
}

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

function parseGeminiEvent(raw: unknown): GeminiExtractedEvent {
  return geminiEventSchema.parse(normalizeGeminiPayload(raw));
}

function geminiModelCandidates(): string[] {
  const override = String(process.env.GEMINI_MODEL || "").trim();
  if (override) {
    const name = override.startsWith("models/") ? override : `models/${override}`;
    return [name, ...GEMINI_MODEL_FALLBACKS.filter((m) => m !== name)];
  }
  return [...GEMINI_MODEL_FALLBACKS];
}

function isGeminiApiKeyError(status: number, body: string): boolean {
  if (status === 401 || status === 403) return true;
  if (status !== 400) return false;
  try {
    const parsed = JSON.parse(body) as {
      error?: { details?: Array<{ reason?: string }>; message?: string };
    };
    const reasons = parsed.error?.details?.map((d) => d.reason) ?? [];
    if (reasons.includes("API_KEY_INVALID")) return true;
    const msg = String(parsed.error?.message || body);
    return /API key not valid|API_KEY_INVALID|API Key not found/i.test(msg);
  } catch {
    return /API_KEY_INVALID|API Key not found|API key not valid/i.test(body);
  }
}

function geminiRequestHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-goog-api-key": env.GEMINI_API_KEY
  };
}

async function callGeminiGenerate(model: string, promptText: string): Promise<unknown> {
  const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: geminiRequestHeaders(),
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: promptText }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 512,
          responseMimeType: "application/json"
        }
      })
    });
  } catch (e) {
    throw new AppError(
      `Gemini request failed (network): ${String((e as Error)?.message || e)}`,
      502
    );
  }

  const text = await res.text().catch(() => "");

  if (!res.ok) {
    if (isGeminiApiKeyError(res.status, text)) {
      throw new AppError(
        "Invalid GEMINI_API_KEY. Create a new key at https://aistudio.google.com/apikey, update backend/.env (no quotes), then restart the backend container.",
        500
      );
    }
    throw new AppError(`Gemini extraction failed (${res.status}) [${model}]: ${text || res.statusText}`, 502);
  }

  let data: { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  try {
    data = JSON.parse(text) as typeof data;
  } catch {
    throw new AppError("Gemini returned invalid JSON", 502);
  }

  const outText = String(data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
  if (!outText) throw new AppError("Gemini returned empty response", 502);

  try {
    return JSON.parse(outText);
  } catch {
    return extractFirstJsonObject(outText);
  }
}

async function callGeminiWithModelFallback(promptText: string): Promise<unknown> {
  const models = geminiModelCandidates();
  let lastError: AppError | null = null;

  for (const model of models) {
    try {
      return await callGeminiGenerate(model, promptText);
    } catch (e) {
      if (e instanceof AppError) {
        if (e.statusCode === 500) throw e;
        lastError = e;
        continue;
      }
      throw e;
    }
  }

  throw lastError ?? new AppError("Gemini extraction failed for all models", 502);
}

export async function geminiExtractEventDetails(opts: {
  transcript: string;
  timezone?: string;
  nowIso?: string;
}): Promise<GeminiExtractedEvent> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) throw new AppError("Gemini is not configured (missing GEMINI_API_KEY)", 500);
  if (!apiKey.startsWith("AIza")) {
    throw new AppError(
      "GEMINI_API_KEY must be from Google AI Studio (starts with AIzaSy). Keys starting with AQ. or other formats will not work. Create one at https://aistudio.google.com/apikey then update backend/.env and restart Docker.",
      500
    );
  }

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
      '- If time or location is missing, return empty string for that field ("").',
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

  const parsed1 = await callGeminiWithModelFallback(buildPrompt("normal"));
  if (parsed1) {
    try {
      return parseGeminiEvent(parsed1);
    } catch {
      // retry below
    }
  }

  const parsed2 = await callGeminiWithModelFallback(buildPrompt("retry"));
  if (!parsed2) throw new AppError("Gemini response was not valid JSON", 502);

  try {
    return parseGeminiEvent(parsed2);
  } catch (e) {
    if (e instanceof z.ZodError) {
      throw new AppError(
        "Could not extract a valid event from audio. Please speak clearly and include event type and date.",
        502,
        e.issues
      );
    }
    throw e;
  }
}
