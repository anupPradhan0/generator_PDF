import api from './axios';
import { EventsListMeta, PdfFormData, PdfRecord } from '../types';

export const listEventsApi = (params?: { q?: string; category?: string; page?: number; limit?: number }) =>
  api.get<{ success: boolean; data: PdfRecord[]; meta: EventsListMeta }>('/events', { params });

export const getEventByIdApi = (id: string) =>
  api.get<{ success: boolean; data: PdfRecord }>(`/events/${id}`);

export const updateEventApi = (id: string, data: Partial<PdfFormData>) =>
  api.put<{ success: boolean; data: PdfRecord }>(`/events/${id}`, data);

export const deleteEventApi = (id: string) =>
  api.delete<{ success: boolean; message: string }>(`/events/${id}`);

export async function downloadSingleEventPdfApi(id: string): Promise<Blob> {
  const res = await api.get(`/events/${id}/pdf`, { responseType: 'blob' });
  return res.data as Blob;
}

export async function downloadAllEventsPdfApi(): Promise<Blob> {
  const res = await api.get(`/events/pdf/bulk`, { responseType: 'blob' });
  return res.data as Blob;
}

