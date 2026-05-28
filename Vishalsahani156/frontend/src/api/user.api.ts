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
}): Promise<User> => {
  const res = await api.put<{ user: BackendUser }>('/auth/me', {
    fullName: data.name?.trim(),
    phoneNumber: data.phone?.trim(),
  });
  return toUser(res.data.user);
};
