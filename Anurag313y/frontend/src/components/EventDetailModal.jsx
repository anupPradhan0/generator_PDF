import { formatDate } from '../utils/invoiceCalculations';

function EventDetailModal({ event, onClose, onDelete, isDeleting }) {
  if (!event) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-modal-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="event-modal-title" className="text-lg font-semibold text-slate-900">
              {event.referenceNumber}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{event.eventName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <dl className="mt-6 space-y-4 text-sm">
          <div>
            <dt className="text-slate-500">Customer name</dt>
            <dd className="mt-1 font-medium text-slate-900">{event.customerName}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Mobile number</dt>
            <dd className="mt-1 font-medium text-slate-900">{event.mobileNo}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Event name</dt>
            <dd className="mt-1 font-medium text-slate-900">{event.eventName}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Event date</dt>
            <dd className="mt-1 font-medium text-slate-900">{formatDate(event.eventDate)}</dd>
          </div>
        </dl>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(event.id)}
              disabled={isDeleting}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-60"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default EventDetailModal;
