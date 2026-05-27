import api from './axios';
import { AuthResponse } from '../types';

export const registerApi = (data: {
  name: string;
  email: string;
  phone: string;
  password: string;
}) => api.post<{ success: boolean; data: AuthResponse }>('/auth/register', data);

export const loginApi = (data: { email: string; password: string }) =>
  api.post<{ success: boolean; data: AuthResponse }>('/auth/login', data);
