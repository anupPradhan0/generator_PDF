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

export type AudioToEventResponse = {
  success: boolean;
  data: {
    transcript: string;
    sttConfidence?: number;
    event: {
      eventType: string;
      date: string;
      time: string;
      location: string;
      eventName?: string;
      notes?: string;
    };
    suggested: {
      eventName: string;
      eventDate: string;
      sheetCategory: string;
      description: string;
    };
  };
};

export async function audioToEventApi(formData: FormData) {
  const res = await api.post<AudioToEventResponse>('/voice/audio-to-event', formData);
  return res.data;
}

