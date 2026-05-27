import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  useDeleteInvoiceMutation,
  useInvoiceQuery,
} from '../hooks/useInvoiceQueries';
import { formatDate } from '../utils/invoiceCalculations';

function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { data, isLoading, isError } = useInvoiceQuery(id, isAuthenticated);
  const deleteMutation = useDeleteInvoiceMutation();

  const invoice = data?.data?.invoice;

  const handleDelete = () => {
    if (!window.confirm('Delete this event invoice permanently?')) return;
    deleteMutation.mutate(id, {
      onSuccess: () => navigate('/dashboard'),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {invoice?.referenceNumber || 'Event invoice'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {invoice ? invoice.eventName : 'Loading...'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/dashboard"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back
          </Link>
          {invoice && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-60"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
          Loading...
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-sm text-red-600">
          Event invoice not found.
        </div>
      )}

      {invoice && (
        <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-slate-500">Customer name</dt>
              <dd className="mt-1 text-lg font-medium text-slate-900">
                {invoice.customerName}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Mobile number</dt>
              <dd className="mt-1 font-medium text-slate-900">{invoice.mobileNo}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Event name</dt>
              <dd className="mt-1 font-medium text-slate-900">{invoice.eventName}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Event date</dt>
              <dd className="mt-1 font-medium text-slate-900">
                {formatDate(invoice.eventDate)}
              </dd>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <dt className="text-slate-500">Created on</dt>
              <dd className="mt-1 text-slate-700">{formatDate(invoice.createdAt)}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}

export default InvoiceDetail;
