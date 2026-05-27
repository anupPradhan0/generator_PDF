export const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const defaultEventInvoiceForm = () => ({
  customerName: '',
  mobileNo: '',
  eventName: '',
  eventDate: '',
});
