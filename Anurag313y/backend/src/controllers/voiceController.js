import { validateEventPayload } from '../utils/invoiceHelpers.js';

const DEEPGRAM_URL = 'https://api.deepgram.com/v1/listen';
const DEFAULT_DEEPGRAM_PARAMS = {
  model: 'nova-2',
  language: 'en',
  punctuate: 'true',
  smart_format: 'true',
  numerals: 'true',
};

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

const getEnvOrThrow = (name) => {
  const value = process.env[name];
  if (!value) {
    const err = new Error(`${name} is not configured`);
    err.statusCode = 500;
    throw err;
  }
  return value;
};

const buildQuery = (params) =>
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && String(v) !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');

const inMemoryRate = new Map();
const checkRateLimit = (key, { limit, windowMs }) => {
  const now = Date.now();
  const current = inMemoryRate.get(key);
  if (!current || current.resetAt <= now) {
    inMemoryRate.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (current.count >= limit) {
    return { ok: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count += 1;
  return { ok: true, remaining: limit - current.count, resetAt: current.resetAt };
};

const safeJsonParse = (text) => {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, value: null };
  }
};

const extractFirstJsonObject = (text) => {
  if (!text) return null;
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '{') depth += 1;
    if (ch === '}') depth -= 1;
    if (depth === 0) {
      const candidate = text.slice(start, i + 1);
      const parsed = safeJsonParse(candidate);
      if (parsed.ok) return parsed.value;
      return null;
    }
  }
  return null;
};

export const transcribeVoice = async (req, res) => {
  try {
    const key = `voice:transcribe:${req.user.id}`;
    const rate = checkRateLimit(key, { limit: 20, windowMs: 60_000 });
    if (!rate.ok) {
      return res.status(429).json({
        success: false,
        message: 'Too many transcription requests. Please wait a minute and try again.',
      });
    }

    const deepgramKey = getEnvOrThrow('DEEPGRAM_API_KEY');
    const file = req.file;

    if (!file?.buffer?.length) {
      return res.status(400).json({
        success: false,
        message: 'audio file is required',
      });
    }

    const mimetype = file.mimetype || 'application/octet-stream';
    const qs = buildQuery(DEFAULT_DEEPGRAM_PARAMS);
    const url = `${DEEPGRAM_URL}?${qs}`;

    const dgRes = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Token ${deepgramKey}`,
        Accept: 'application/json',
        'Content-Type': mimetype,
      },
      body: file.buffer,
    });

    const dgText = await dgRes.text();
    if (!dgRes.ok) {
      return res.status(502).json({
        success: false,
        message: 'Deepgram transcription failed',
        details: dgText?.slice(0, 1000),
      });
    }

    const dgJson = safeJsonParse(dgText).value;
    const alt = dgJson?.results?.channels?.[0]?.alternatives?.[0];
    const transcript = alt?.transcript || '';
    const confidence = alt?.confidence ?? null;
    const words = Array.isArray(alt?.words)
      ? alt.words.map((w) => ({
          word: w.word,
          start: w.start,
          end: w.end,
          confidence: w.confidence,
        }))
      : undefined;

    if (!transcript.trim()) {
      const duration = dgJson?.metadata?.duration ?? null;
      console.warn('Deepgram empty transcript', {
        userId: req.user.id,
        bytes: file.size,
        mimetype,
        duration,
      });
      return res.status(422).json({
        success: false,
        message:
          'No speech detected. Please record again and speak clearly (try 2–5 seconds). If you still see this error, your browser may be producing an unsupported audio format — try again after reload.',
      });
    }

    return res.status(200).json({
      success: true,
      data: { transcript, confidence, words },
    });
  } catch (error) {
    console.error('Voice transcribe error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

export const extractEventFields = async (req, res) => {
  try {
    const key = `voice:extract:${req.user.id}`;
    const rate = checkRateLimit(key, { limit: 30, windowMs: 60_000 });
    if (!rate.ok) {
      return res.status(429).json({
        success: false,
        message: 'Too many extraction requests. Please wait a minute and try again.',
      });
    }

    const geminiKey = getEnvOrThrow('GEMINI_API_KEY');
    const transcript = String(req.body?.transcript || '').trim();

    if (!transcript) {
      return res.status(400).json({
        success: false,
        message: 'transcript is required',
      });
    }

    const schemaHint = {
      customerName: 'string (required)',
      mobileNo: 'string (required, 10 digits India)',
      eventName: 'string (required)',
      eventDate: 'string (required, YYYY-MM-DD)',
      warnings: 'string[] (optional)',
    };

    const prompt = [
      'You extract event fields from a transcript. Return ONLY valid JSON (no markdown, no explanations).',
      'If a field is unknown, return an empty string and add a warning explaining what is missing/ambiguous.',
      'Prefer interpreting dates into YYYY-MM-DD (ISO date) with year included.',
      '',
      `JSON schema: ${JSON.stringify(schemaHint)}`,
      '',
      `Transcript: ${transcript}`,
    ].join('\n');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      GEMINI_MODEL,
    )}:generateContent?key=${encodeURIComponent(geminiKey)}`;

    const gmRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.9,
          maxOutputTokens: 400,
        },
      }),
    });

    const gmText = await gmRes.text();
    if (!gmRes.ok) {
      return res.status(502).json({
        success: false,
        message: 'Gemini extraction failed',
        details: gmText?.slice(0, 1000),
      });
    }

    const gmJson = safeJsonParse(gmText).value;
    const rawText =
      gmJson?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join('\n') || '';

    const parsed =
      safeJsonParse(rawText).value ||
      extractFirstJsonObject(rawText) ||
      extractFirstJsonObject(gmText);

    if (!parsed || typeof parsed !== 'object') {
      return res.status(502).json({
        success: false,
        message: 'Failed to parse extraction JSON',
      });
    }

    const fields = {
      customerName: String(parsed.customerName || '').trim(),
      mobileNo: String(parsed.mobileNo || '').trim(),
      eventName: String(parsed.eventName || '').trim(),
      eventDate: String(parsed.eventDate || '').trim(),
    };

    const warnings = Array.isArray(parsed.warnings)
      ? parsed.warnings.map((w) => String(w)).filter(Boolean)
      : [];

    // Validate using existing server-side rules (also normalizes mobile and date)
    const validation = validateEventPayload(fields);
    const validationWarnings = Object.values(validation.errors || {});

    return res.status(200).json({
      success: true,
      data: {
        fields: {
          customerName: validation.normalized.customerName,
          mobileNo: validation.normalized.mobileNo,
          eventName: validation.normalized.eventName,
          eventDate: fields.eventDate, // keep as YYYY-MM-DD for the form input
        },
        warnings: [...warnings, ...validationWarnings],
        transcript,
      },
    });
  } catch (error) {
    console.error('Voice extract error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

