import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";
import {
  detectContentTypeFromBuffer,
  normalizeMimeType,
  resolveAudioContentType
} from "./audioContentType";

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

type TranscribeAttempt = {
  contentType: string;
  language?: string;
  detectLanguage?: boolean;
};

function parseDeepgramTranscript(data: DeepgramListenResponse): {
  transcript: string;
  confidence?: number;
} {
  const alt = data?.results?.channels?.[0]?.alternatives?.[0];
  const transcript = String(alt?.transcript || "").trim();
  const confidence = typeof alt?.confidence === "number" ? alt.confidence : undefined;
  return { transcript, confidence };
}

function buildTranscribeAttempts(opts: {
  audioBuffer: Buffer;
  contentType: string;
  language: string;
  filename?: string;
}): TranscribeAttempt[] {
  const resolved = resolveAudioContentType({
    contentType: opts.contentType,
    filename: opts.filename,
    buffer: opts.audioBuffer
  });
  const sniffed = detectContentTypeFromBuffer(opts.audioBuffer);
  const declared = normalizeMimeType(opts.contentType);

  const contentTypes = [resolved];
  if (sniffed && !contentTypes.includes(sniffed)) contentTypes.push(sniffed);
  if (declared.startsWith("audio/") && !contentTypes.includes(declared)) {
    contentTypes.push(declared);
  }

  const attempts: TranscribeAttempt[] = [];
  const languages = [opts.language];
  if (opts.language !== "en") languages.push("en");
  if (opts.language !== "hi") languages.push("hi");

  for (const contentType of contentTypes) {
    for (const language of languages) {
      attempts.push({ contentType, language });
    }
  }
  for (const contentType of contentTypes) {
    attempts.push({ contentType, detectLanguage: true });
  }

  const seen = new Set<string>();
  return attempts.filter((a) => {
    const key = `${a.contentType}|${a.detectLanguage ? "detect" : a.language || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function deepgramTranscribeOnce(opts: {
  audioBuffer: Buffer;
  contentType: string;
  language?: string;
  detectLanguage?: boolean;
}): Promise<{ transcript: string; confidence?: number; ok: boolean }> {
  const apiKey = String(env.DEEPGRAM_API_KEY || "").trim();
  const url = new URL("https://api.deepgram.com/v1/listen");
  url.searchParams.set("model", "nova-2");
  url.searchParams.set("smart_format", "true");
  url.searchParams.set("punctuate", "true");

  if (opts.detectLanguage) {
    url.searchParams.set("detect_language", "true");
  } else if (opts.language) {
    url.searchParams.set("language", opts.language);
  }

  const contentType = normalizeMimeType(opts.contentType);
  const audioBytes = Buffer.from(opts.audioBuffer);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": contentType
      },
      body: new Uint8Array(audioBytes)
    });
  } catch (e) {
    throw new AppError(
      `Deepgram request failed (network): ${String((e as Error)?.message || e)}`,
      502
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new AppError(`Deepgram STT failed (${res.status}): ${text || res.statusText}`, 502);
  }

  let data: DeepgramListenResponse;
  try {
    data = (await res.json()) as DeepgramListenResponse;
  } catch {
    throw new AppError("Deepgram returned invalid JSON", 502);
  }

  const parsed = parseDeepgramTranscript(data);
  return { ...parsed, ok: Boolean(parsed.transcript) };
}

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
  return { valid: false, status: res.status, message: msg };
}

export async function deepgramTranscribe(opts: {
  audioBuffer: Buffer;
  contentType: string;
  language: string;
  filename?: string;
}): Promise<{ transcript: string; confidence?: number }> {
  if (!env.DEEPGRAM_API_KEY) {
    throw new AppError("Deepgram is not configured (missing DEEPGRAM_API_KEY)", 500);
  }

  if (!opts.audioBuffer?.length) {
    throw new AppError("Audio buffer is empty", 400);
  }

  const attempts = buildTranscribeAttempts(opts);

  for (const attempt of attempts) {
    const result = await deepgramTranscribeOnce({
      audioBuffer: opts.audioBuffer,
      contentType: attempt.contentType,
      language: attempt.language,
      detectLanguage: attempt.detectLanguage
    });
    if (result.ok) {
      return { transcript: result.transcript, confidence: result.confidence };
    }
  }

  const resolvedType = resolveAudioContentType({
    contentType: opts.contentType,
    filename: opts.filename,
    buffer: opts.audioBuffer
  });

  // eslint-disable-next-line no-console
  console.warn(
    `[deepgram] empty transcript after ${attempts.length} attempt(s); ` +
      `declared=${opts.contentType} resolved=${resolvedType} bytes=${opts.audioBuffer.length}` +
      (opts.filename ? ` file=${opts.filename}` : "")
  );

  throw new AppError(
    "Deepgram returned empty transcript. Use a clear speech recording (MP3, WAV, M4A, OGG, or WebM).",
    502
  );
}
