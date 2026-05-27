import InvoiceForm from '../components/InvoiceForm';

function CreateInvoice() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Add events</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enter customer name, mobile number, event name, and event date.
        </p>
      </div>

      <InvoiceForm />
    </div>
  );
}

export default CreateInvoice;
