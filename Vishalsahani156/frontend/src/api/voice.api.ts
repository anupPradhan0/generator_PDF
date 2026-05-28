import api from './axios';
import type { PdfFormData } from '../types';

export type VoiceAnalyzeResponse = {
  success: boolean;
  data: {
    transcript: string;
    extracted: Partial<PdfFormData>;
    extraNotes?: string;
    unmatchedText?: string;
    confidence?: Record<string, number>;
  };
};

export async function analyzeVoiceApi(formData: FormData) {
  // Let the browser/axios set the multipart boundary automatically.
  const res = await api.post<VoiceAnalyzeResponse>('/voice/analyze', formData);
  return res.data;
}

