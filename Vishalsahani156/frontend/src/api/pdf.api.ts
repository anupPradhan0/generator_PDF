import api from './axios';
import { DashboardStats, PdfFormData, PdfRecord } from '../types';

export const getDashboardApi = () =>
  api.get<{ success: boolean; data: DashboardStats }>('/pdfs/dashboard');

export const getPdfsApi = (params?: { q?: string; category?: string; page?: number; limit?: number }) =>
  api.get<{ success: boolean; data: PdfRecord[]; meta?: { page: number; limit: number; total: number } }>('/pdfs', {
    params,
  });

export const createPdfApi = (data: PdfFormData & { pdfUrl?: string }) =>
  api.post<{ success: boolean; data: PdfRecord }>('/pdfs', data);

export const getPdfByIdApi = (id: string) =>
  api.get<{ success: boolean; data: PdfRecord }>(`/pdfs/${id}`);

export const updatePdfApi = (id: string, data: Partial<PdfFormData>) =>
  api.put<{ success: boolean; data: PdfRecord }>(`/pdfs/${id}`, data);

export const deletePdfApi = (id: string) =>
  api.delete<{ success: boolean; message: string }>(`/pdfs/${id}`);
