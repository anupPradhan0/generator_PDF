import type { PdfFormData } from '../../types';

type FieldKey = keyof PdfFormData;

export type VoiceUpdate = { field: FieldKey; value: string };

const fieldSynonyms: Array<{ field: FieldKey; names: string[] }> = [
  { field: 'eventName', names: ['event name', 'event title', 'title'] },
  { field: 'eventDate', names: ['event date', 'date'] },
  { field: 'sheetCategory', names: ['category', 'type'] },
  { field: 'description', names: ['description', 'notes', 'note'] },
  { field: 'phone', names: ['phone number', 'phone', 'mobile'] },
  { field: 'email', names: ['email', 'mail'] },
  // NOTE: keep `name` last so it doesn’t steal “event name”
  { field: 'name', names: ['name', 'full name'] },
];

function normalize(s: string) {
  return s
    .replace(/\s+/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();
}

function splitCommands(s: string) {
  // Split multiple commands spoken in one sentence.
  // Example: "Event name is X and email is Y"
  return s
    .split(/\s*(?:,|;|\band\b|\bthen\b)\s*/i)
    .map((p) => p.trim())
    .filter(Boolean);
}

function toIsoDate(value: string): string | null {
  const v = value.trim();
  if (!v) return null;

  // Already ISO date
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

  // dd/mm/yyyy or dd-mm-yyyy
  const m = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const yyyy = Number(m[3]);
    if (yyyy >= 1900 && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      return `${String(yyyy).padStart(4, '0')}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    }
  }

  // Natural language date like "20 June 2026"
  const dt = new Date(v);
  if (!Number.isNaN(dt.getTime())) {
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
}

function matchField(command: string): { field: FieldKey; value: string } | null {
  const c = normalize(command).toLowerCase();

  for (const f of fieldSynonyms) {
    for (const name of f.names) {
      // Support: "field is value", "field: value", "set field to value", "add field value"
      const re = new RegExp(
        `^(?:set\\s+|add\\s+)?${name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*(?:is|:|to)?\\s+(.+)$`,
        'i'
      );
      const m = command.match(re);
      if (!m?.[1]) continue;
      const rawValue = normalize(m[1]);

      if (f.field === 'eventDate') {
        const iso = toIsoDate(rawValue);
        return { field: 'eventDate', value: iso ?? rawValue };
      }

      if (f.field === 'phone') {
        const digits = rawValue.replace(/[^\d+]/g, '').trim();
        return { field: 'phone', value: digits || rawValue };
      }

      return { field: f.field, value: rawValue };
    }
  }

  return null;
}

export function parseVoiceCommands(transcript: string): VoiceUpdate[] {
  const t = normalize(transcript);
  if (!t) return [];

  const parts = splitCommands(t);
  const updates: VoiceUpdate[] = [];

  for (const p of parts) {
    const hit = matchField(p);
    if (hit) updates.push(hit);
  }

  return updates;
}

