export type SpeechRecognizer = {
  start: () => void;
  stop: () => void;
  isSupported: boolean;
};

type SpeechRecognitionCtor = new () => SpeechRecognition;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function createSpeechRecognizer(opts: {
  lang: string;
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (message: string) => void;
  onEnd: () => void;
}): SpeechRecognizer {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) {
    return {
      isSupported: false,
      start: () => opts.onError('Speech recognition is not supported in this browser.'),
      stop: () => undefined,
    };
  }

  const recognition = new Ctor();
  recognition.lang = opts.lang;
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    let interim = '';
    let final = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res = event.results[i];
      const text = (res[0]?.transcript || '').trim();
      if (!text) continue;
      if (res.isFinal) final += (final ? ' ' : '') + text;
      else interim += (interim ? ' ' : '') + text;
    }

    if (interim) opts.onInterim(interim);
    if (final) {
      opts.onInterim('');
      opts.onFinal(final);
    }
  };

  recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
    const msg = typeof (e as any)?.error === 'string' ? (e as any).error : 'speech-error';
    opts.onError(`Mic error: ${msg}`);
  };

  recognition.onend = () => {
    opts.onEnd();
  };

  return {
    isSupported: true,
    start: () => {
      try {
        recognition.start();
      } catch {
        // Some browsers throw if start() is called twice.
      }
    },
    stop: () => {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    },
  };
}

