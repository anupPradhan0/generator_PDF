import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import VoiceRecorder from './VoiceRecorder';
import VoiceReview from './VoiceReview';
import {
  defaultEventInvoiceForm,
  getMinEventDateString,
} from '../utils/invoiceCalculations';
import {
  normalizeMobile,
  validateEventField,
  validateEventForm,
} from '../utils/eventFormValidation';
import {
  getApiErrorMessage,
  useCreateInvoiceMutation,
} from '../hooks/useInvoiceQueries';
import { voiceExtract, voiceTranscribe } from '../api/voiceApi';
import { audioBlobToWav } from '../utils/audioToWav';

const inputClass = (hasError) =>
  `w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 ${
    hasError
      ? 'border-red-400 focus:ring-red-300'
      : 'border-slate-300 focus:ring-indigo-500'
  }`;

function InvoiceForm() {
  const navigate = useNavigate();
  const createMutation = useCreateInvoiceMutation();
  const [form, setForm] = useState(defaultEventInvoiceForm);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [voiceState, setVoiceState] = useState({
    status: 'idle', // idle | transcribing | extracting | ready | error
    transcript: '',
    warnings: [],
    fields: null,
    error: '',
  });

  const minEventDate = getMinEventDateString();

  const showError = (field) => (touched[field] || submitted) && errors[field];

  const updateField = (name, value) => {
    const nextForm = { ...form, [name]: value };
    setForm(nextForm);
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => {
      const fieldError = validateEventField(name, value, nextForm);
      const next = { ...prev };
      if (fieldError) next[name] = fieldError;
      else delete next[name];
      return next;
    });
    createMutation.reset();
  };

  const applyVoiceFields = () => {
    if (!voiceState.fields) return;
    const f = voiceState.fields;
    if (f.customerName) updateField('customerName', f.customerName);
    if (f.mobileNo) updateField('mobileNo', f.mobileNo);
    if (f.eventName) updateField('eventName', f.eventName);
    if (f.eventDate) updateField('eventDate', f.eventDate);
  };

  const handleRecorded = async (blob) => {
    if (!blob || blob.size < 8 * 1024) {
      setVoiceState({
        status: 'error',
        transcript: '',
        warnings: [],
        fields: null,
        error:
          'Recording was too short or silent. Please record 2–5 seconds and speak clearly.',
      });
      return;
    }

    setVoiceState({
      status: 'transcribing',
      transcript: '',
      warnings: [],
      fields: null,
      error: '',
    });

    try {
      // Convert to WAV for maximum Deepgram compatibility.
      const wavBlob = await audioBlobToWav(blob);
      const transcribed = await voiceTranscribe(wavBlob, 'voice.wav');
      const transcript = transcribed?.data?.transcript || '';

      if (!transcript.trim()) {
        setVoiceState({
          status: 'error',
          transcript: '',
          warnings: [],
          fields: null,
          error: 'No speech detected. Try again and speak clearly.',
        });
        return;
      }

      setVoiceState((prev) => ({ ...prev, status: 'extracting', transcript }));
      const extracted = await voiceExtract(transcript);
      setVoiceState({
        status: 'ready',
        transcript,
        warnings: extracted?.data?.warnings || [],
        fields: extracted?.data?.fields || null,
        error: '',
      });
    } catch (e) {
      setVoiceState({
        status: 'error',
        transcript: '',
        warnings: [],
        fields: null,
        error: e?.response?.data?.message || 'Voice processing failed. Please try again.',
      });
    }
  };

  const handleMobileChange = (e) => {
    const digits = normalizeMobile(e.target.value).slice(0, 10);
    updateField('mobileNo', digits);
  };

  const handleBlur = (name) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => {
      const fieldError = validateEventField(name, form[name], form);
      const next = { ...prev };
      if (fieldError) next[name] = fieldError;
      else delete next[name];
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    const { errors: validationErrors, isValid } = validateEventForm(form);
    setErrors(validationErrors);
    setTouched({
      customerName: true,
      mobileNo: true,
      eventName: true,
      eventDate: true,
    });

    if (!isValid) return;

    createMutation.mutate(form, {
      onSuccess: (data) => {
        if (data.success) {
          navigate('/dashboard');
        }
      },
      onError: (err) => {
        const serverErrors = err.response?.data?.errors;
        if (serverErrors && typeof serverErrors === 'object') {
          setErrors((prev) => ({ ...prev, ...serverErrors }));
        }
      },
    });
  };

  const apiError =
    createMutation.isError && !Object.keys(errors).length
      ? getApiErrorMessage(createMutation.error, 'Failed to create event')
      : '';

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-lg" noValidate>
      {apiError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {apiError}
        </div>
      )}

      <div className="mb-4 space-y-4">
        <VoiceRecorder
          onRecorded={handleRecorded}
          disabled={voiceState.status === 'transcribing' || voiceState.status === 'extracting'}
        />

        {voiceState.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {voiceState.error}
          </div>
        )}

        <VoiceReview
          transcript={voiceState.transcript}
          warnings={voiceState.warnings}
          onApply={applyVoiceFields}
          isApplying={false}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Event details</h2>
        <p className="mt-1 text-sm text-slate-500">
          All fields are required. Event date must be today or a future date.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="customerName" className="mb-1 block text-sm font-medium text-slate-700">
              Customer name <span className="text-red-500">*</span>
            </label>
            <input
              id="customerName"
              name="customerName"
              type="text"
              value={form.customerName}
              onChange={(e) => updateField('customerName', e.target.value)}
              onBlur={() => handleBlur('customerName')}
              placeholder="Full name"
              className={inputClass(showError('customerName'))}
              aria-invalid={Boolean(showError('customerName'))}
            />
            {showError('customerName') && (
              <p className="mt-1 text-xs text-red-600">{errors.customerName}</p>
            )}
          </div>

          <div>
            <label htmlFor="mobileNo" className="mb-1 block text-sm font-medium text-slate-700">
              Mobile number <span className="text-red-500">*</span>
            </label>
            <input
              id="mobileNo"
              name="mobileNo"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={form.mobileNo}
              onChange={handleMobileChange}
              onBlur={() => handleBlur('mobileNo')}
              placeholder="9876543210"
              className={inputClass(showError('mobileNo'))}
              aria-invalid={Boolean(showError('mobileNo'))}
            />
            {showError('mobileNo') ? (
              <p className="mt-1 text-xs text-red-600">{errors.mobileNo}</p>
            ) : (
              <p className="mt-1 text-xs text-slate-400">10-digit Indian mobile number</p>
            )}
          </div>

          <div>
            <label htmlFor="eventName" className="mb-1 block text-sm font-medium text-slate-700">
              Event name <span className="text-red-500">*</span>
            </label>
            <input
              id="eventName"
              name="eventName"
              type="text"
              value={form.eventName}
              onChange={(e) => updateField('eventName', e.target.value)}
              onBlur={() => handleBlur('eventName')}
              placeholder="Wedding, Birthday, Corporate event..."
              className={inputClass(showError('eventName'))}
              aria-invalid={Boolean(showError('eventName'))}
            />
            {showError('eventName') && (
              <p className="mt-1 text-xs text-red-600">{errors.eventName}</p>
            )}
          </div>

          <div>
            <label htmlFor="eventDate" className="mb-1 block text-sm font-medium text-slate-700">
              Event date <span className="text-red-500">*</span>
            </label>
            <input
              id="eventDate"
              name="eventDate"
              type="date"
              min={minEventDate}
              value={form.eventDate}
              onChange={(e) => updateField('eventDate', e.target.value)}
              onBlur={() => handleBlur('eventDate')}
              className={inputClass(showError('eventDate'))}
              aria-invalid={Boolean(showError('eventDate'))}
            />
            {showError('eventDate') ? (
              <p className="mt-1 text-xs text-red-600">{errors.eventDate}</p>
            ) : (
              <p className="mt-1 text-xs text-slate-400">Cannot be before today</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createMutation.isPending ? 'Saving...' : 'Save event'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

export default InvoiceForm;
