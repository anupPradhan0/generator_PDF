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
    time: z.string().trim().min(1).max(30).optional().default(""),
    location: z.string().trim().min(1).max(120).optional().default(""),
    eventName: z.string().trim().min(1).max(160).optional(),
    notes: z.string().trim().max(4000).optional()
  })
  .strict();

export type GeminiExtractedEvent = z.infer<typeof geminiEventSchema>;

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

  const prompt = [
    "You are an information extraction engine.",
    "Extract event details from the user text and return ONLY valid JSON (no markdown, no backticks).",
    "",
    "Rules:",
    `- Current time (ISO): ${nowIso}`,
    `- Timezone: ${tz}`,
    "- Output must match this JSON schema exactly:",
    '{ "eventType": string, "date": string, "time": string, "location": string, "eventName"?: string, "notes"?: string }',
    "- date must be ISO 8601 date-time or date string parseable by JS Date.parse (prefer ISO date: YYYY-MM-DD).",
    "- If time or location is not present, return empty string for that field.",
    "- eventType should be short (e.g. Birthday, Meeting, Conference, Wedding).",
    "",
    "User text:",
    transcript
  ].join("\n");

  const url = new URL("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent");
  url.searchParams.set("key", env.GEMINI_API_KEY);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 512 }
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new AppError(`Gemini extraction failed (${res.status}): ${text || res.statusText}`, 502);
  }

  const data = (await res.json()) as any;
  const outText = String(data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
  if (!outText) throw new AppError("Gemini returned empty response", 502);

  let parsed: unknown;
  try {
    parsed = JSON.parse(outText);
  } catch {
    parsed = extractFirstJsonObject(outText);
  }
  if (!parsed) throw new AppError("Gemini response was not valid JSON", 502);

  const validated = geminiEventSchema.parse(parsed);
  return validated;
}

