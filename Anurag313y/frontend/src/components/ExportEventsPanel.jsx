import { useState } from 'react';
import { formatDate } from '../utils/invoiceCalculations';
import { downloadEventsPDF } from '../api/invoicesApi';
import { getApiErrorMessage } from '../hooks/useAuthQueries';

function ExportEventsPanel() {
  const [pickerDate, setPickerDate] = useState('');
  const [selectedDates, setSelectedDates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addDate = () => {
    if (!pickerDate) return;
    if (selectedDates.includes(pickerDate)) {
      setError('This date is already selected');
      return;
    }
    setSelectedDates((prev) => [...prev, pickerDate].sort());
    setPickerDate('');
    setError('');
  };

  const removeDate = (date) => {
    setSelectedDates((prev) => prev.filter((d) => d !== date));
    setError('');
  };

  const handleDownload = async () => {
    if (selectedDates.length === 0) {
      setError('Add at least one date to download');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await downloadEventsPDF(selectedDates);
    } catch (err) {
      if (err.response?.data instanceof Blob) {
        const text = await err.response.data.text();
        try {
          const json = JSON.parse(text);
          setError(json.message || 'Failed to download PDF');
        } catch {
          setError('Failed to download PDF');
        }
      } else {
        setError(getApiErrorMessage(err, 'Failed to download PDF'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Download events PDF</h2>
      <p className="mt-1 text-sm text-slate-500">
        Select one or more dates (e.g. 29 May 2026, or 29 &amp; 30 May 2026) and download all
        events for those days.
      </p>

      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="export-date" className="mb-1 block text-sm font-medium text-slate-700">
            Pick a date
          </label>
          <input
            id="export-date"
            type="date"
            value={pickerDate}
            onChange={(e) => setPickerDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          type="button"
          onClick={addDate}
          className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
        >
          + Add date
        </button>
      </div>

      {selectedDates.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {selectedDates.map((date) => (
            <span
              key={date}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
            >
              {formatDate(date)}
              <button
                type="button"
                onClick={() => removeDate(date)}
                className="ml-1 text-slate-400 hover:text-slate-700"
                aria-label={`Remove ${date}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleDownload}
        disabled={loading || selectedDates.length === 0}
        className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {loading ? 'Generating PDF...' : 'Download PDF'}
      </button>
    </section>
  );
}

export default ExportEventsPanel;
