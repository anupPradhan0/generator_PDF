import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";

type DeepgramListenResponse = {
  results?: {
    channels?: Array<{
      alternatives?: Array<{
        transcript?: string;
        confidence?: number;
      }>;
    }>;
  };
};

export async function deepgramValidateApiKey(): Promise<{ valid: boolean; status: number; message: string }> {
  if (!env.DEEPGRAM_API_KEY) {
    return { valid: false, status: 500, message: "Missing DEEPGRAM_API_KEY" };
  }

  const apiKey = String(env.DEEPGRAM_API_KEY || "").trim();
  const res = await fetch("https://api.deepgram.com/v1/projects", {
    method: "GET",
    headers: {
      Authorization: `Token ${apiKey}`
    }
  });

  if (res.ok) return { valid: true, status: res.status, message: "OK" };

  const text = await res.text().catch(() => "");
  const msg = text?.trim() || res.statusText || "Request failed";
  // 401/403 are the common cases for invalid/revoked key
  return { valid: false, status: res.status, message: msg };
}

export async function deepgramTranscribe(opts: {
  audioBuffer: Buffer;
  contentType: string;
  language: string;
}): Promise<{ transcript: string; confidence?: number }> {
  if (!env.DEEPGRAM_API_KEY) throw new AppError("Deepgram is not configured (missing DEEPGRAM_API_KEY)", 500);

  const apiKey = String(env.DEEPGRAM_API_KEY || "").trim();
  const url = new URL("https://api.deepgram.com/v1/listen");
  url.searchParams.set("model", "nova-2");
  url.searchParams.set("smart_format", "true");
  url.searchParams.set("punctuate", "true");
  url.searchParams.set("language", opts.language);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": opts.contentType
    },
    body: new Uint8Array(opts.audioBuffer)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new AppError(`Deepgram STT failed (${res.status}): ${text || res.statusText}`, 502);
  }

  const data = (await res.json()) as DeepgramListenResponse;
  const alt = data?.results?.channels?.[0]?.alternatives?.[0];
  const transcript = String(alt?.transcript || "").trim();
  const confidence = typeof alt?.confidence === "number" ? alt.confidence : undefined;
  if (!transcript) throw new AppError("Deepgram returned empty transcript", 502);

  return { transcript, confidence };
}

