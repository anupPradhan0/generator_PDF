const EXT_TO_MIME: Record<string, string> = {
  webm: "audio/webm",
  ogg: "audio/ogg",
  opus: "audio/ogg",
  mp3: "audio/mpeg",
  mpeg: "audio/mpeg",
  wav: "audio/wav",
  wave: "audio/wav",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  aac: "audio/aac",
  flac: "audio/flac",
  amr: "audio/amr",
  "3gp": "audio/3gpp"
};

const GENERIC_MIMES = new Set([
  "",
  "application/octet-stream",
  "binary/octet-stream",
  "application/binary"
]);

const MIME_ALIASES: Record<string, string> = {
  "audio/x-wav": "audio/wav",
  "audio/wave": "audio/wav",
  "audio/x-m4a": "audio/mp4",
  "audio/m4a": "audio/mp4",
  "audio/mp3": "audio/mpeg",
  "audio/x-mpeg": "audio/mpeg",
  "audio/x-mpeg-3": "audio/mpeg",
  "audio/x-ms-wma": "audio/wav"
};

function extFromFilename(filename?: string): string {
  if (!filename) return "";
  const dot = filename.lastIndexOf(".");
  if (dot < 0) return "";
  return filename.slice(dot + 1).toLowerCase();
}

function mimeFromExtension(filename?: string): string | null {
  const ext = extFromFilename(filename);
  return ext ? EXT_TO_MIME[ext] ?? null : null;
}

/** Strip codec parameters; Deepgram expects a simple audio/* MIME. */
export function normalizeMimeType(mime: string): string {
  const base = String(mime || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  return MIME_ALIASES[base] || base;
}

/** Sniff container from magic bytes when browser/multer MIME is wrong. */
export function detectContentTypeFromBuffer(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 12) return null;

  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return "audio/webm";
  }

  if (buffer.subarray(0, 4).toString("ascii") === "OggS") {
    return "audio/ogg";
  }

  if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WAVE") {
    return "audio/wav";
  }

  if (buffer.subarray(0, 3).toString("ascii") === "ID3") {
    return "audio/mpeg";
  }

  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
    return "audio/mpeg";
  }

  const ftyp = buffer.subarray(4, 8).toString("ascii");
  if (ftyp === "ftyp") {
    return "audio/mp4";
  }

  if (buffer.subarray(0, 4).toString("ascii") === "fLaC") {
    return "audio/flac";
  }

  return null;
}

export function resolveAudioContentType(opts: {
  contentType?: string;
  filename?: string;
  buffer?: Buffer;
}): string {
  const declared = normalizeMimeType(opts.contentType || "");
  const fromName = mimeFromExtension(opts.filename);
  const fromBytes = opts.buffer ? detectContentTypeFromBuffer(opts.buffer) : null;

  if (fromBytes && GENERIC_MIMES.has(declared)) {
    return fromBytes;
  }

  if (fromName && (GENERIC_MIMES.has(declared) || !declared.startsWith("audio/"))) {
    return fromName;
  }

  if (declared.startsWith("audio/")) {
    return declared;
  }

  if (fromBytes) return fromBytes;
  if (fromName) return fromName;

  return "audio/webm";
}
