import api from './axios';
import { downloadBlob } from '../utils/downloadBlob';

export const fetchInvoices = async ({ page = 1, limit = 10 } = {}) => {
  const { data } = await api.get('/invoices', { params: { page, limit } });
  return data;
};

export const fetchInvoiceById = async (id) => {
  const { data } = await api.get(`/invoices/${id}`);
  return data;
};

export const createInvoice = async (payload) => {
  const { data } = await api.post('/invoices', payload);
  return data;
};

export const updateInvoice = async ({ id, payload }) => {
  const { data } = await api.put(`/invoices/${id}`, payload);
  return data;
};

export const deleteInvoice = async (id) => {
  const { data } = await api.delete(`/invoices/${id}`);
  return data;
};

export const downloadEventsPDF = async (dates) => {
  const response = await api.post(
    '/invoices/export/pdf',
    { dates },
    { responseType: 'blob' },
  );

  const filename =
    response.headers['content-disposition']?.match(/filename="(.+)"/)?.[1] ||
    `events-${dates.join('_')}.pdf`;

  downloadBlob(new Blob([response.data], { type: 'application/pdf' }), filename);
};
