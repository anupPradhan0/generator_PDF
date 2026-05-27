import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { defaultEventInvoiceForm } from '../utils/invoiceCalculations';
import {
  getApiErrorMessage,
  useCreateInvoiceMutation,
} from '../hooks/useInvoiceQueries';

function InvoiceForm() {
  const navigate = useNavigate();
  const createMutation = useCreateInvoiceMutation();
  const [form, setForm] = useState(defaultEventInvoiceForm);

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    createMutation.reset();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(form, {
      onSuccess: (data) => {
        if (data.success) {
          navigate('/dashboard');
        }
      },
    });
  };

  const error = createMutation.isError
    ? getApiErrorMessage(createMutation.error, 'Failed to create event')
    : '';

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-lg">
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Event details</h2>
        <p className="mt-1 text-sm text-slate-500">
          Enter customer and event information below.
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
              required
              value={form.customerName}
              onChange={(e) => updateField('customerName', e.target.value)}
              placeholder="Full name"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="mobileNo" className="mb-1 block text-sm font-medium text-slate-700">
              Mobile number <span className="text-red-500">*</span>
            </label>
            <input
              id="mobileNo"
              name="mobileNo"
              type="tel"
              required
              value={form.mobileNo}
              onChange={(e) => updateField('mobileNo', e.target.value)}
              placeholder="9876543210"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="eventName" className="mb-1 block text-sm font-medium text-slate-700">
              Event name <span className="text-red-500">*</span>
            </label>
            <input
              id="eventName"
              name="eventName"
              type="text"
              required
              value={form.eventName}
              onChange={(e) => updateField('eventName', e.target.value)}
              placeholder="Wedding, Birthday, Corporate event..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="eventDate" className="mb-1 block text-sm font-medium text-slate-700">
              Event date <span className="text-red-500">*</span>
            </label>
            <input
              id="eventDate"
              name="eventDate"
              type="date"
              required
              value={form.eventDate}
              onChange={(e) => updateField('eventDate', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
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
