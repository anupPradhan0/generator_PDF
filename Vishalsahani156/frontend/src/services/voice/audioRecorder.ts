export type AudioRecorder = {
  start: () => Promise<void>;
  stop: () => Promise<{ blob: Blob; mimeType: string }>;
  isSupported: boolean;
};

function pickMimeType(): string | null {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(c)) return c;
  }
  return null;
}

export function createAudioRecorder(): AudioRecorder {
  const supported =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined';

  if (!supported) {
    return {
      isSupported: false,
      start: async () => {
        throw new Error('Audio recording is not supported in this browser.');
      },
      stop: async () => {
        throw new Error('Audio recording is not supported in this browser.');
      },
    };
  }

  let stream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;
  let chunks: BlobPart[] = [];
  let mimeType = pickMimeType() || 'audio/webm';

  return {
    isSupported: true,
    start: async () => {
      if (recorder && recorder.state !== 'inactive') return;
      chunks = [];
      mimeType = pickMimeType() || mimeType;
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      recorder.start(250);
    },
    stop: async () => {
      if (!recorder) throw new Error('Recorder not started');
      const r = recorder;
      const s = stream;
      return await new Promise((resolve, reject) => {
        r.onerror = () => reject(new Error('Recording failed'));
        r.onstop = () => {
          try {
            const blob = new Blob(chunks, { type: mimeType });
            s?.getTracks()?.forEach((t) => t.stop());
            recorder = null;
            stream = null;
            resolve({ blob, mimeType });
          } catch (e) {
            reject(e);
          }
        };
        try {
          r.stop();
        } catch (e) {
          reject(e);
        }
      });
    },
  };
}

