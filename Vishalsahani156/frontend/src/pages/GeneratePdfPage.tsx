import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { InputField } from '../components/forms/InputField';
import { SelectField } from '../components/forms/SelectField';
import { TextAreaField } from '../components/forms/TextAreaField';
import { Button } from '../components/common/Button';
import { PdfPreviewModal } from '../components/pdf/PdfPreviewModal';
import { SHEET_CATEGORIES, PdfFormData } from '../types';
import { createPdfApi } from '../api/pdf.api';
import { audioToEventApi } from '../api/voice.api';
import { generatePdfBytes, downloadPdf, pdfToDataUrl } from '../utils/pdfGenerator';
import { createAudioRecorder } from '../services/voice/audioRecorder';
import { speak, stopSpeaking } from '../services/voice/speechSynthesis';

const pdfFormSchema = z.object({
  eventName: z.string().min(2, 'Event name is required'),
  eventDate: z.string().min(1, 'Event date is required'),
  sheetCategory: z.string().min(1, 'Please select a category'),
  description: z.string().min(1, 'Description is required'),
});

export const GeneratePdfPage = () => {
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAnalyzingAudio, setIsAnalyzingAudio] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [finalTranscript, setFinalTranscript] = useState<string>('');
  const [recorder] = useState(() => createAudioRecorder());

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<PdfFormData>({ resolver: zodResolver(pdfFormSchema) });

  const applySuggestedToForm = (suggested?: Partial<PdfFormData>) => {
    if (!suggested) return;
    const next = suggested as Partial<PdfFormData>;
    const keys = Object.keys(next) as Array<keyof PdfFormData>;
    for (const k of keys) {
      if (k === 'name' || k === 'email' || k === 'phone') continue;
      const v = next[k];
      if (typeof v === 'string' && v.trim()) {
        if (k === 'sheetCategory') {
          // If Gemini suggests a category not in allowed list, keep UX stable.
          const allowed = new Set(SHEET_CATEGORIES);
          const category = allowed.has(v as any) ? v : 'Custom Sheet';
          setValue('sheetCategory', category, { shouldValidate: true, shouldDirty: true });
          continue;
        }
        setValue(k, v, { shouldValidate: true, shouldDirty: true });
      }
    }
  };

  const analyzeAudioAndFill = async (opts: { blob: Blob; filename: string; language?: string }) => {
    setIsAnalyzingAudio(true);
    try {
      const formData = new FormData();
      formData.append('audio', opts.blob, opts.filename);
      formData.append('language', opts.language || 'en-IN');
      formData.append('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata');

      const result = await audioToEventApi(formData);
      const transcript = result?.data?.transcript || '';
      setFinalTranscript(transcript);

      applySuggestedToForm(result?.data?.suggested);

      // Also enrich description with explicit event info if present.
      const e = result?.data?.event;
      if (e) {
        const lines: string[] = [];
        if (e.time) lines.push(`Time: ${e.time}`);
        if (e.location) lines.push(`Location: ${e.location}`);
        const existing = getValues('description') || '';
        const extra = lines.join('\n').trim();
        if (extra && !existing.includes(extra)) {
          setValue('description', existing ? `${existing}\n${extra}` : extra, { shouldValidate: true, shouldDirty: true });
        }
      }

      toast.success('Event details filled from audio');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        'Failed to analyze audio';
      toast.error(message);
    } finally {
      setIsAnalyzingAudio(false);
    }
  };

  const onStartListening = async () => {
    try {
      if (isListening) return;
      stopSpeaking();
      setLiveTranscript('');
      setFinalTranscript('');
      if (!recorder.isSupported) {
        toast.error('Audio recording is not supported in this browser.');
        return;
      }

      setIsListening(true);
      setLiveTranscript('Listening…');
      await recorder.start();
      speak('Listening. You can say, my name is Vishal and my event name is Music Festival on 25 June.');
    } catch (e) {
      setIsListening(false);
      toast.error((e as Error)?.message || 'Failed to start microphone');
    }
  };

  const onStopListening = async () => {
    try {
      if (!isListening) return;
      setIsListening(false);
      setLiveTranscript('');

      const { blob, mimeType } = await recorder.stop();
      if (!blob.size) {
        speak('Stopped listening.');
        return;
      }

      await analyzeAudioAndFill({
        blob,
        filename: `voice.${mimeType.includes('ogg') ? 'ogg' : 'webm'}`,
        language: 'en-IN',
      });
      speak('Audio analyzed successfully.');
    } catch (e) {
      setIsListening(false);
      setLiveTranscript('');
      toast.error((e as Error)?.message || 'Failed to stop microphone');
    }
  };

  const onUploadAudioFile = async (file: File) => {
    if (!file) return;
    if (!file.size) {
      toast.error('Selected file is empty');
      return;
    }
    await analyzeAudioAndFill({ blob: file, filename: file.name, language: 'en-IN' });
  };

  const buildPdf = async (data: PdfFormData) => {
    setIsGenerating(true);
    try {
      const bytes = await generatePdfBytes(data);
      setPdfBytes(bytes);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(pdfToDataUrl(bytes));
      toast.success('PDF generated successfully!');
      return bytes;
    } catch {
      toast.error('Failed to generate PDF');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const onGenerate = handleSubmit(async (data) => {
    await buildPdf(data);
  });

  const onPreview = handleSubmit(async (data) => {
    const bytes = pdfBytes ?? (await buildPdf(data));
    if (bytes) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(pdfToDataUrl(bytes));
    }
  });

  const onDownload = () => {
    if (!pdfBytes) {
      toast.error('Generate PDF first');
      return;
    }
    const data = getValues();
    const filename = `${data.sheetCategory}-${data.eventName}-${Date.now()}.pdf`.replace(/\s+/g, '-');
    downloadPdf(pdfBytes, filename);
    toast.success('PDF downloaded!');
  };

  const onSaveRecord = handleSubmit(async (data) => {
    try {
      const bytes = pdfBytes ?? (await buildPdf(data));
      if (!bytes) return;

      await createPdfApi({
        ...data,
        pdfUrl: `generated-${Date.now()}.pdf`,
      });
      toast.success('PDF record saved to database!');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to save record';
      toast.error(message);
    }
  });

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
          PDF Generator
        </h1>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          Fill the form to create a professional A4 PDF with automatic pagination
        </p>

        <form className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Audio to event (AI)</p>
            {isListening ? (
              <Button type="button" variant="danger" className="px-3 py-1 text-xs" onClick={onStopListening}>
                Stop
              </Button>
            ) : (
              <Button type="button" variant="secondary" className="px-3 py-1 text-xs" onClick={onStartListening}>
                Start Mic
              </Button>
            )}
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Upload audio
              <input
                type="file"
                accept="audio/*"
                className="mt-1 block w-full text-xs text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-xs file:font-medium file:text-gray-700 hover:file:bg-gray-200 dark:text-gray-200 dark:file:bg-gray-800 dark:file:text-gray-200 dark:hover:file:bg-gray-700"
                disabled={isAnalyzingAudio || isListening}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadAudioFile(f);
                  e.currentTarget.value = '';
                }}
              />
            </label>
            {isAnalyzingAudio ? (
              <span className="text-xs text-gray-600 dark:text-gray-300">Analyzing audio…</span>
            ) : null}
          </div>
          {isListening ? (
            <div className="mb-4 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-xs text-primary-900 dark:border-primary-800 dark:bg-primary-900/20 dark:text-primary-100">
              <div className="flex items-center justify-between gap-2">
                <span>Listening… say: “Create a birthday event on 25 June at 7 PM in Delhi”</span>
                <div className="voice-wave" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              {liveTranscript ? (
                <div className="mt-2 text-[11px] opacity-90">
                  <span className="font-semibold">Live:</span> {liveTranscript}
                </div>
              ) : null}
            </div>
          ) : null}
          {finalTranscript ? (
            <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
              <span className="font-semibold">Transcript:</span> {finalTranscript}
            </div>
          ) : null}

          <InputField label="Event Name" {...register('eventName')} error={errors.eventName?.message} />
          <InputField
            label="Event Date"
            type="date"
            {...register('eventDate')}
            error={errors.eventDate?.message}
          />
          <SelectField
            label="Sheet Category"
            options={[...SHEET_CATEGORIES]}
            {...register('sheetCategory')}
            error={errors.sheetCategory?.message}
          />
          <TextAreaField
            label="Description / Notes"
            {...register('description')}
            error={errors.description?.message}
          />

          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" onClick={onGenerate} isLoading={isGenerating}>
              Generate PDF
            </Button>
            <Button type="button" variant="outline" onClick={onPreview} disabled={isGenerating}>
              Preview PDF
            </Button>
            <Button type="button" variant="secondary" onClick={onDownload} disabled={!pdfBytes}>
              Download PDF
            </Button>
            <Button type="button" variant="outline" onClick={onSaveRecord} isLoading={isGenerating}>
              Save to Database
            </Button>
          </div>
        </form>
      </div>

      <PdfPreviewModal
        previewUrl={previewUrl}
        onClose={closePreview}
        onDownload={onDownload}
      />
    </DashboardLayout>
  );
};
