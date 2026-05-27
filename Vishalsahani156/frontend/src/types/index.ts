export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface PdfFormData {
  name: string;
  email: string;
  phone: string;
  eventDate: string;
  sheetCategory: string;
  description: string;
}

export interface PdfRecord extends PdfFormData {
  _id: string;
  userId: string;
  pdfUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  total: number;
  recent: PdfRecord[];
  categories: { _id: string; count: number }[];
}

export const SHEET_CATEGORIES = [
  'Invoice',
  'Event Pass',
  'Resume',
  'Certificate',
  'Report',
  'Custom Sheet',
] as const;
