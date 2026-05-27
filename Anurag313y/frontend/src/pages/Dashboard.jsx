import { useState } from 'react';
import { Link } from 'react-router-dom';
import EventDetailModal from '../components/EventDetailModal';
import ExportEventsPanel from '../components/ExportEventsPanel';
import InvoiceTable from '../components/InvoiceTable';
import {
  useDeleteInvoiceMutation,
  useInvoicesQuery,
} from '../hooks/useInvoiceQueries';
import { useAuth } from '../context/AuthContext';

function Dashboard() {
  const { isAuthenticated } = useAuth();
  const { data, isLoading, isError } = useInvoicesQuery(isAuthenticated);
  const deleteMutation = useDeleteInvoiceMutation();
  const [selectedEvent, setSelectedEvent] = useState(null);

  const invoices = data?.data?.invoices ?? [];

  const upcomingCount = invoices.filter((inv) => {
    const eventDate = new Date(inv.eventDate);
    return eventDate >= new Date(new Date().setHours(0, 0, 0, 0));
  }).length;

  const stats = {
    total: invoices.length,
    upcoming: upcomingCount,
    past: invoices.length - upcomingCount,
  };

  const handleDelete = (id) => {
    if (!window.confirm('Delete this event permanently?')) return;
    deleteMutation.mutate(id, {
      onSuccess: () => {
        setSelectedEvent(null);
      },
    });
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

      <InvoiceTable
        invoices={invoices}
        isLoading={isLoading}
        onSelectEvent={setSelectedEvent}
      />

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
