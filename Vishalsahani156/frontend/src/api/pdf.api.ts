import api from './axios';
import { DashboardStats, PdfFormData, PdfRecord } from '../types';

export const getDashboardApi = () =>
  api.get<{ success: boolean; data: DashboardStats }>('/pdf/dashboard');

export const getPdfsApi = (params?: { q?: string; category?: string }) =>
  api.get<{ success: boolean; data: PdfRecord[] }>('/pdf', { params });

export const createPdfApi = (data: PdfFormData & { pdfUrl?: string }) =>
  api.post<{ success: boolean; data: PdfRecord }>('/pdf', data);

export const getPdfByIdApi = (id: string) =>
  api.get<{ success: boolean; data: PdfRecord }>(`/pdf/${id}`);

export const updatePdfApi = (id: string, data: Partial<PdfFormData>) =>
  api.put<{ success: boolean; data: PdfRecord }>(`/pdf/${id}`, data);

export const deletePdfApi = (id: string) =>
  api.delete<{ success: boolean; message: string }>(`/pdf/${id}`);
