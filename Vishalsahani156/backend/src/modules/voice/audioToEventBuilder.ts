import type { GeminiExtractedEvent } from "./geminiEventExtractor";
import { analyzeTranscript, type VoiceAnalysis } from "./transcriptParser";

export type AudioToEventPayload = {
  transcript: string;
  sttConfidence?: number;
  event: {
    eventType: string;
    date: string;
    time: string;
    location: string;
    eventName?: string;
    notes?: string;
  };
  suggested: {
    eventName: string;
    eventDate: string;
    sheetCategory: string;
    description: string;
  };
  source: "gemini" | "parser";
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildFromGemini(event: GeminiExtractedEvent, transcript: string): AudioToEventPayload["suggested"] {
  const isoDate = new Date(event.date);
  const eventDate = Number.isNaN(isoDate.getTime()) ? todayIso() : isoDate.toISOString().slice(0, 10);

  const descriptionParts: string[] = [];
  if (event.time) descriptionParts.push(`Time: ${event.time}`);
  if (event.location) descriptionParts.push(`Location: ${event.location}`);
  if (event.notes) descriptionParts.push(event.notes);

  return {
    eventName: (event.eventName || event.eventType || "").trim() || "New Event",
    eventDate,
    sheetCategory: String(event.eventType || "").trim() || "Custom Sheet",
    description:
      descriptionParts.join("\n").trim() || `Event created from voice: ${transcript.slice(0, 200)}`
  };
}

function buildFromParser(analysis: VoiceAnalysis): AudioToEventPayload {
  const ex = analysis.extracted;
  const descriptionParts: string[] = [];
  if (ex.description) descriptionParts.push(ex.description);
  if (analysis.extraNotes) descriptionParts.push(`Extra notes: ${analysis.extraNotes}`);

  const eventDate = ex.eventDate || todayIso();
  const sheetCategory = ex.sheetCategory || "Custom Sheet";

  const suggested = {
    eventName: (ex.eventName || sheetCategory || "New Event").trim(),
    eventDate,
    sheetCategory,
    description:
      descriptionParts.join("\n").trim() ||
      `Event created from voice: ${analysis.transcript.slice(0, 200)}`
  };

  return {
    transcript: analysis.transcript,
    event: {
      eventType: sheetCategory,
      date: eventDate,
      time: "",
      location: "",
      eventName: ex.eventName,
      notes: ex.description
    },
    suggested,
    source: "parser"
  };
}

export function buildAudioToEventFromGemini(
  transcript: string,
  sttConfidence: number | undefined,
  event: GeminiExtractedEvent
): AudioToEventPayload {
  const suggested = buildFromGemini(event, transcript);
  return {
    transcript,
    sttConfidence,
    event: {
      eventType: event.eventType,
      date: suggested.eventDate,
      time: event.time || "",
      location: event.location || "",
      eventName: event.eventName,
      notes: event.notes
    },
    suggested,
    source: "gemini"
  };
}

export function buildAudioToEventFromParser(transcript: string, sttConfidence?: number): AudioToEventPayload {
  const analysis = analyzeTranscript(transcript);
  if (analysis.extraNotes) {
    const desc = analysis.extracted.description?.trim();
    const notesLine = `Extra notes: ${analysis.extraNotes}`.trim();
    analysis.extracted.description = desc ? `${desc}\n${notesLine}` : notesLine;
  }
  const payload = buildFromParser(analysis);
  return { ...payload, sttConfidence };
}
