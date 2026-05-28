import superAdminApi from './superAdminAxios';

export type SuperAdmin = {
  id: string;
  username: string;
  email: string;
  createdAt?: string;
};

export type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: 'user' | 'admin';
  isBlocked: boolean;
  blockedReason: string | null;
  blockedAt: string | null;
  createdAt?: string;
};

export async function superAdminRegisterApi(data: {
  username: string;
  email: string;
  password: string;
  registrationKey?: string;
}) {
  const res = await superAdminApi.post<{ token: string; admin: SuperAdmin }>(
    '/super-admin/auth/register',
    {
      username: data.username.trim(),
      email: data.email.trim(),
      password: data.password,
      registrationKey: data.registrationKey?.trim() || undefined,
    }
  );
  return res.data;
}

export async function superAdminLoginApi(data: { email: string; password: string }) {
  const res = await superAdminApi.post<{ token: string; admin: SuperAdmin }>(
    '/super-admin/auth/login',
    {
      email: data.email.trim(),
      password: data.password,
    }
  );
  return res.data;
}

export async function superAdminMeApi() {
  const res = await superAdminApi.get<{ admin: SuperAdmin }>('/super-admin/auth/me');
  return res.data.admin;
}

export async function adminListUsersApi(params?: { q?: string; page?: number; limit?: number }) {
  const res = await superAdminApi.get<{
    success: boolean;
    data: AdminUser[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }>('/super-admin/users', { params });
  return res.data;
}

export async function adminDeleteUserApi(userId: string) {
  const res = await superAdminApi.delete<{ success: boolean; message: string }>(
    `/super-admin/users/${userId}`
  );
  return res.data;
}

export async function adminUpdateUserApi(
  userId: string,
  data: { role?: 'user' | 'admin'; isBlocked?: boolean; blockedReason?: string | null }
) {
  const res = await superAdminApi.patch<{ success: boolean; data: AdminUser }>(
    `/super-admin/users/${userId}`,
    data
  );
  return res.data;
}

