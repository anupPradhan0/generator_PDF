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

export async function deepgramTranscribe(opts: {
  audioBuffer: Buffer;
  contentType: string;
  language: string;
}): Promise<{ transcript: string; confidence?: number }> {
  if (!env.DEEPGRAM_API_KEY) throw new AppError("Deepgram is not configured (missing DEEPGRAM_API_KEY)", 500);

  const url = new URL("https://api.deepgram.com/v1/listen");
  url.searchParams.set("model", "nova-2");
  url.searchParams.set("smart_format", "true");
  url.searchParams.set("punctuate", "true");
  url.searchParams.set("language", opts.language);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Token ${env.DEEPGRAM_API_KEY}`,
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

