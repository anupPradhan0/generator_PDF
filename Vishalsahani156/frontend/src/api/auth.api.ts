import api from './axios';
import { User } from '../types';

type RegisterInput = {
  name: string;
  email: string;
  phone: string;
  password: string;
};

type BackendUser = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  createdAt?: string;
};

type BackendAuthResponse = {
  token: string;
  user: BackendUser;
};

type AuthResult = {
  user: User;
  token: string;
};

const toBackendUser = (user: BackendUser): User => ({
  id: user.id,
  name: user.fullName,
  email: user.email,
  phone: user.phoneNumber,
  createdAt: user.createdAt,
});

export const registerApi = async (data: RegisterInput): Promise<AuthResult> => {
  const res = await api.post<BackendAuthResponse>('/auth/register', {
    fullName: data.name.trim(),
    email: data.email.trim(),
    phoneNumber: data.phone.trim(),
    password: data.password,
  });
  return { user: toBackendUser(res.data.user), token: res.data.token };
};

export const loginApi = async (data: { email: string; password: string }): Promise<AuthResult> => {
  const res = await api.post<BackendAuthResponse>('/auth/login', {
    email: data.email.trim(),
    password: data.password,
  });
  return { user: toBackendUser(res.data.user), token: res.data.token };
};
