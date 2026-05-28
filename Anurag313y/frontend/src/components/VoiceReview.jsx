function VoiceReview({ transcript, warnings = [], onApply, isApplying = false }) {
  if (!transcript) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Transcript</p>
          <p className="mt-1 text-xs text-slate-500">
            Review and apply the extracted details to the form.
          </p>
        </div>
        <button
          type="button"
          onClick={onApply}
          disabled={isApplying}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isApplying ? 'Applying...' : 'Apply to form'}
        </button>
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
        {transcript}
      </div>

      {warnings.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <p className="font-medium">Needs attention</p>
          <ul className="mt-1 list-disc pl-5">
            {warnings.map((w, idx) => (
              <li key={`${w}-${idx}`}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default VoiceReview;

