import { Link } from 'react-router-dom';
import { formatDate } from '../utils/invoiceCalculations';

function InvoiceTable({ invoices = [], isLoading = false, onSelectEvent }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Ref #</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Customer</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Mobile</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Event</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Event date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {isLoading ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                Loading events...
              </td>
            </tr>
          ) : invoices.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                No events yet.{' '}
                <Link
                  to="/events/add"
                  className="font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Add events
                </Link>
              </td>
            </tr>
          ) : (
            invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onSelectEvent?.(invoice)}
                    className="font-medium text-indigo-600 hover:text-indigo-500 hover:underline"
                  >
                    {invoice.referenceNumber}
                  </button>
                </td>
                <td className="px-4 py-3 text-slate-700">{invoice.customerName}</td>
                <td className="px-4 py-3 text-slate-700">{invoice.mobileNo}</td>
                <td className="px-4 py-3 text-slate-700">{invoice.eventName}</td>
                <td className="px-4 py-3 text-slate-500">{formatDate(invoice.eventDate)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default InvoiceTable;
