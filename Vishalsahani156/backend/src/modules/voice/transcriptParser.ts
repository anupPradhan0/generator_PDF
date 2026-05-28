export type VoiceExtracted = Partial<{
  name: string;
  eventName: string;
  eventDate: string; // ISO YYYY-MM-DD
  sheetCategory: string;
  email: string;
  phone: string;
  description: string;
}>;

export type VoiceAnalysis = {
  transcript: string;
  extracted: VoiceExtracted;
  extraNotes?: string;
  unmatchedText?: string;
  confidence?: Partial<Record<keyof VoiceExtracted, number>>;
};

function normalize(s: string) {
  return s
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function splitPhrases(s: string) {
  return normalize(s)
    .split(/\s*(?:,|;|\band\b|\bthen\b)\s*/i)
    .map((p) => p.trim())
    .filter(Boolean);
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function parseIsoDateFromText(value: string): string | null {
  const v = normalize(value);
  if (!v) return null;

  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

  // dd/mm/yyyy or dd-mm-yyyy
  const m = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const yyyy = Number(m[3]);
    if (yyyy >= 1900 && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) return `${yyyy}-${pad2(mm)}-${pad2(dd)}`;
  }

  // "25 June" or "25 June 2026"
  const m2 = v.match(/^(\d{1,2})\s+([a-zA-Z]{3,})\s*(\d{4})?$/);
  if (m2) {
    const dd = Number(m2[1]);
    const monthName = m2[2].toLowerCase();
    const yyyy = m2[3] ? Number(m2[3]) : new Date().getFullYear();
    const months: Record<string, number> = {
      jan: 1,
      january: 1,
      feb: 2,
      february: 2,
      mar: 3,
      march: 3,
      apr: 4,
      april: 4,
      may: 5,
      jun: 6,
      june: 6,
      jul: 7,
      july: 7,
      aug: 8,
      august: 8,
      sep: 9,
      sept: 9,
      september: 9,
      oct: 10,
      october: 10,
      nov: 11,
      november: 11,
      dec: 12,
      december: 12
    };
    const mm = months[monthName];
    if (yyyy >= 1900 && mm && dd >= 1 && dd <= 31) return `${yyyy}-${pad2(mm)}-${pad2(dd)}`;
  }

  // last resort: Date.parse (can vary by runtime/locale but helps with "June 25, 2026")
  const dt = new Date(v);
  if (!Number.isNaN(dt.getTime())) return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;

  return null;
}

function extractEmail(text: string): string | null {
  const m = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return m ? m[0] : null;
}

function extractPhone(text: string): string | null {
  const m = text.match(/(?:\+?\d[\d\s().-]{6,}\d)/);
  if (!m) return null;
  const digits = m[0].replace(/[^\d+]/g, "").trim();
  const onlyDigits = digits.replace(/[^\d]/g, "");
  if (onlyDigits.length < 7) return null;
  return digits;
}

function stripLeadingPrefix(phrase: string, prefixes: string[]) {
  const p = normalize(phrase);
  for (const pre of prefixes) {
    const re = new RegExp(`^(?:${pre})\\s*(?:is|:|to)?\\s+`, "i");
    if (re.test(p)) return p.replace(re, "").trim();
  }
  return null;
}

function extractCategoryFromText(text: string): string | null {
  const t = normalize(text).toLowerCase();

  // Prefer explicit "category/type is X"
  const explicit = stripLeadingPrefix(t, ["category", "event category", "type"]);
  if (explicit) return explicit;

  // Heuristics: common spoken categories
  if (/\bconcert\b/.test(t)) return "Concert";
  if (/\bfestival\b/.test(t)) return "Festival";
  if (/\bevent pass\b/.test(t)) return "Event Pass";
  if (/\bcertificate\b/.test(t)) return "Certificate";
  if (/\binvoice\b/.test(t)) return "Invoice";
  if (/\breport\b/.test(t)) return "Report";
  if (/\bresume\b/.test(t)) return "Resume";
  return null;
}

function extractEventNameFromPhrase(phrase: string): string | null {
  const p = normalize(phrase);
  return (
    stripLeadingPrefix(p, ["event name", "event title", "title", "my event name"]) ??
    stripLeadingPrefix(p, ["event is called", "event called"]) ??
    null
  );
}

function extractPersonNameFromPhrase(phrase: string): string | null {
  const p = normalize(phrase);
  return stripLeadingPrefix(p, ["my name", "name", "i am", "i'm", "this is"]);
}

function extractDescriptionFromPhrase(phrase: string): { description?: string; extraNotes?: string } {
  const p = normalize(phrase);
  const lowered = p.toLowerCase();

  const extra = stripLeadingPrefix(p, ["extra note", "extra notes", "note", "notes", "also", "remember"]);
  if (extra) return { extraNotes: extra };

  const desc = stripLeadingPrefix(p, ["description", "about", "details"]);
  if (desc) return { description: desc };

  return {};
}

function extractDateFromText(text: string): string | null {
  const t = normalize(text);

  // explicit prefix
  const explicit = stripLeadingPrefix(t, ["event date", "date"]);
  if (explicit) return parseIsoDateFromText(explicit);

  // find a date-like segment inside the phrase
  const m = t.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\b/);
  if (m?.[1]) return parseIsoDateFromText(m[1]);

  const m2 = t.match(/\b(\d{1,2}\s+[A-Za-z]{3,}\s*\d{0,4})\b/);
  if (m2?.[1]) return parseIsoDateFromText(m2[1]);

  const m3 = t.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (m3?.[1]) return parseIsoDateFromText(m3[1]);

  return null;
}

export function analyzeTranscript(transcript: string): VoiceAnalysis {
  const t = normalize(transcript);
  const phrases = splitPhrases(t);

  const extracted: VoiceExtracted = {};
  const confidence: VoiceAnalysis["confidence"] = {};
  let extraNotes: string | undefined;

  const email = extractEmail(t);
  if (email) {
    extracted.email = email;
    confidence.email = 0.95;
  }

  const phone = extractPhone(t);
  if (phone) {
    extracted.phone = phone;
    confidence.phone = 0.9;
  }

  const dt = extractDateFromText(t);
  if (dt) {
    extracted.eventDate = dt;
    confidence.eventDate = 0.75;
  }

  const category = extractCategoryFromText(t);
  if (category) {
    extracted.sheetCategory = category;
    confidence.sheetCategory = 0.7;
  }

  for (const phrase of phrases) {
    if (!extracted.eventName) {
      const ev = extractEventNameFromPhrase(phrase);
      if (ev) {
        extracted.eventName = ev;
        confidence.eventName = 0.75;
        continue;
      }
    }
    if (!extracted.name) {
      const nm = extractPersonNameFromPhrase(phrase);
      if (nm) {
        extracted.name = nm;
        confidence.name = 0.75;
        continue;
      }
    }
    const descBits = extractDescriptionFromPhrase(phrase);
    if (descBits.description && !extracted.description) {
      extracted.description = descBits.description;
      confidence.description = 0.7;
    }
    if (descBits.extraNotes) {
      extraNotes = extraNotes ? `${extraNotes} ${descBits.extraNotes}` : descBits.extraNotes;
    }
  }

  // If user said "my event name is X on 25 June" we want eventName without the trailing date.
  if (extracted.eventName && extracted.eventDate) {
    const maybeDateText = extracted.eventDate;
    // Nothing fancy; just remove common "on <date>" tail.
    extracted.eventName = extracted.eventName.replace(/\s+on\s+\d{1,2}\s+[A-Za-z]{3,}(\s+\d{4})?$/i, "").trim();
    extracted.eventName = extracted.eventName.replace(/\s+on\s+\d{4}-\d{2}-\d{2}$/i, "").trim();
    void maybeDateText;
  }

  const unmatchedParts: string[] = [];
  for (const phrase of phrases) {
    const low = phrase.toLowerCase();
    const looksHandled =
      /@/.test(phrase) ||
      /\bphone\b|\bmobile\b/.test(low) ||
      /\bcategory\b|\btype\b/.test(low) ||
      /\bdescription\b|\babout\b|\bdetails\b/.test(low) ||
      /\bnote\b|\bremember\b|\bextra\b|\balso\b/.test(low) ||
      /\bevent name\b|\bevent title\b|\btitle\b/.test(low) ||
      /(\d{4}-\d{2}-\d{2})|(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})|(\d{1,2}\s+[A-Za-z]{3,})/.test(phrase);
    if (!looksHandled) unmatchedParts.push(phrase);
  }

  const analysis: VoiceAnalysis = {
    transcript: t,
    extracted,
    confidence: Object.keys(confidence).length ? confidence : undefined
  };

  if (extraNotes) analysis.extraNotes = extraNotes;
  if (unmatchedParts.length) analysis.unmatchedText = unmatchedParts.join(" ");

  return analysis;
}

