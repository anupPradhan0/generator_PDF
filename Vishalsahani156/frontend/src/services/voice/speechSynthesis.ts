export function speak(text: string, opts?: { lang?: string; rate?: number; pitch?: number }) {
  if (typeof window === 'undefined') return;
  const synth = window.speechSynthesis;
  if (!synth) return;

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = opts?.lang ?? 'en-IN';
  utter.rate = opts?.rate ?? 1;
  utter.pitch = opts?.pitch ?? 1;
  synth.cancel(); // keep it simple: last message wins
  synth.speak(utter);
}

export function stopSpeaking() {
  if (typeof window === 'undefined') return;
  window.speechSynthesis?.cancel();
}

