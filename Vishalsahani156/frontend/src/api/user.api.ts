import api from './axios';
import { User } from '../types';

type BackendUser = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  createdAt?: string;
};

const toUser = (user: BackendUser): User => ({
  id: user.id,
  name: user.fullName,
  email: user.email,
  phone: user.phoneNumber,
  createdAt: user.createdAt,
});

export const getProfileApi = async (): Promise<User> => {
  const res = await api.get<{ user: BackendUser }>('/auth/me');
  return toUser(res.data.user);
};

export const updateProfileApi = async (data: {
  name?: string;
  phone?: string;
  oldPassword?: string;
  newPassword?: string;
  confirmNewPassword?: string;
}): Promise<{ user: User; message?: string }> => {
  const payload: Record<string, string> = {};
  const name = data.name?.trim();
  const phone = data.phone?.trim();
  if (name) payload.fullName = name;
  if (phone) payload.phoneNumber = phone;
  if (data.oldPassword?.trim()) payload.oldPassword = data.oldPassword;
  if (data.newPassword?.trim()) payload.newPassword = data.newPassword;
  if (data.confirmNewPassword?.trim()) payload.confirmNewPassword = data.confirmNewPassword;

  const res = await api.put<{ user: BackendUser; message?: string }>('/auth/me', payload);
  return { user: toUser(res.data.user), message: res.data.message };
};
