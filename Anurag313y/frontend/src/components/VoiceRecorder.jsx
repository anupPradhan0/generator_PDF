import { useEffect, useMemo, useRef, useState } from 'react';

const formatSeconds = (s) => {
  const sec = Math.max(0, Math.floor(s));
  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');
  return `${mm}:${ss}`;
};

function VoiceRecorder({ onRecorded, disabled = false }) {
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const [status, setStatus] = useState('idle'); // idle | recording | stopped | error
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');

  const canRecord = useMemo(
    () => status === 'idle' || status === 'stopped' || status === 'error',
    [status],
  );

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const cleanupStream = () => {
    try {
      streamRef.current?.getTracks()?.forEach((t) => t.stop());
    } catch {
      // ignore
    }
    streamRef.current = null;
  };

  useEffect(() => {
    return () => {
      stopTimer();
      cleanupStream();
    };
  }, []);

  const start = async () => {
    setError('');
    setSeconds(0);
    chunksRef.current = [];

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone is not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;

      recorder.ondataavailable = (evt) => {
        if (evt.data && evt.data.size > 0) chunksRef.current.push(evt.data);
      };

      recorder.onstop = () => {
        stopTimer();
        cleanupStream();
        setStatus('stopped');

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size > 0) onRecorded?.(blob);
      };

      recorder.onerror = () => {
        stopTimer();
        cleanupStream();
        setStatus('error');
        setError('Recording failed. Please try again.');
      };

      // Use a small timeslice so browsers flush data reliably.
      recorder.start(250);
      setStatus('recording');
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (e) {
      setStatus('error');
      setError(e?.message || 'Unable to access microphone');
      cleanupStream();
    }
  };

  const stop = () => {
    try {
      recorderRef.current?.requestData?.();
      recorderRef.current?.stop();
    } catch {
      // ignore
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Voice input</p>
          <p className="mt-1 text-xs text-slate-500">
            Press record and say: customer name, mobile number, event name, and date.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700">
            {formatSeconds(seconds)}
          </span>

          {status === 'recording' ? (
            <button
              type="button"
              onClick={stop}
              className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500"
            >
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={start}
              disabled={disabled || !canRecord}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Record
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}

export default VoiceRecorder;

