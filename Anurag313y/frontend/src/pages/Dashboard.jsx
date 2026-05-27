import { useState } from 'react';
import { Link } from 'react-router-dom';
import EventDetailModal from '../components/EventDetailModal';
import ExportEventsPanel from '../components/ExportEventsPanel';
import InvoiceTable from '../components/InvoiceTable';
import Pagination from '../components/Pagination';
import {
  useDeleteInvoiceMutation,
  useInvoicesQuery,
} from '../hooks/useInvoiceQueries';
import { useAuth } from '../context/AuthContext';

const PAGE_SIZE = 10;

function Dashboard() {
  const { isAuthenticated } = useAuth();
  const [page, setPage] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const { data, isLoading, isError, isFetching } = useInvoicesQuery(
    page,
    PAGE_SIZE,
    isAuthenticated,
  );
  const deleteMutation = useDeleteInvoiceMutation();

  const invoices = data?.data?.invoices ?? [];
  const pagination = data?.data?.pagination ?? {
    page: 1,
    totalPages: 1,
    total: 0,
  };
  const stats = data?.data?.stats ?? { total: 0, upcoming: 0, past: 0 };

  const handleDelete = (id) => {
    if (!window.confirm('Delete this event permanently?')) return;
    deleteMutation.mutate(id, {
      onSuccess: () => {
        setSelectedEvent(null);
        if (invoices.length === 1 && page > 1) {
          setPage((p) => p - 1);
        }
      },
    });
  };

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Events</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage customer events and download reports by date.
          </p>
        </div>
        <Link
          to="/events/add"
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          + Add events
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Total events', value: isLoading ? '...' : stats.total },
          { label: 'Upcoming', value: isLoading ? '...' : stats.upcoming },
          { label: 'Past events', value: isLoading ? '...' : stats.past },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <ExportEventsPanel />

      {isError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          Failed to load events. Make sure the backend is running on port 5001.
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <InvoiceTable
          invoices={invoices}
          isLoading={isLoading}
          onSelectEvent={setSelectedEvent}
        />
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          onPageChange={handlePageChange}
          isLoading={isFetching}
        />
      </div>

      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onDelete={handleDelete}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}

export default Dashboard;
