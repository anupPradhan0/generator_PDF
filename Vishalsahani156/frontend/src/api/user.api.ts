import api from './axios';
import { User } from '../types';

export const getProfileApi = () =>
  api.get<{ success: boolean; data: User }>('/users/profile');

export const updateProfileApi = (data: {
  name?: string;
  phone?: string;
  password?: string;
}) => api.put<{ success: boolean; data: User }>('/users/profile', data);
