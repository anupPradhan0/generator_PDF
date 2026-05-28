import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/common/Button';
import { Loader } from '../components/common/Loader';
import { adminDeleteUserApi, adminListUsersApi, adminUpdateUserApi, AdminUser } from '../api/superAdmin.api';

export const SuperAdminDashboardPage = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const columns = useMemo(
    () => [
      { key: 'fullName', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'phoneNumber', label: 'Phone' },
      { key: 'role', label: 'Role' },
      { key: 'status', label: 'Status' },
    ],
    []
  );

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminListUsersApi({ page: 1, limit: 100 });
      setUsers(res.data);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to load users';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDelete = async (u: AdminUser) => {
    if (!confirm(`Delete user ${u.fullName} (${u.email})? This cannot be undone.`)) return;
    setBusyUserId(u.id);
    try {
      await adminDeleteUserApi(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      toast.success('User deleted');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Delete failed';
      toast.error(message);
    } finally {
      setBusyUserId(null);
    }
  };

  const onToggleRestrict = async (u: AdminUser) => {
    const next = !u.isBlocked;
    const reason = next ? prompt('Restriction reason (optional):') : null;
    setBusyUserId(u.id);
    try {
      const res = await adminUpdateUserApi(u.id, { isBlocked: next, blockedReason: reason });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? res.data : x)));
      toast.success(next ? 'User restricted' : 'User unrestricted');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Update failed';
      toast.error(message);
    } finally {
      setBusyUserId(null);
    }
  };

  const onToggleRole = async (u: AdminUser) => {
    const next = u.role === 'admin' ? 'user' : 'admin';
    setBusyUserId(u.id);
    try {
      const res = await adminUpdateUserApi(u.id, { role: next });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? res.data : x)));
      toast.success(`Role updated to ${next}`);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Role update failed';
      toast.error(message);
    } finally {
      setBusyUserId(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Loader />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Super Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage registered users</p>
        </div>
        <Button variant="outline" onClick={load}>
          Refresh
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className="px-6 py-3">
                    {c.label}
                  </th>
                ))}
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.length ? (
                users.map((u) => {
                  const isBusy = busyUserId === u.id;
                  return (
                    <tr key={u.id} className="text-gray-700 dark:text-gray-200">
                      <td className="px-6 py-4 font-medium">{u.fullName}</td>
                      <td className="px-6 py-4">{u.email}</td>
                      <td className="px-6 py-4">{u.phoneNumber}</td>
                      <td className="px-6 py-4">
                        <span className="rounded-full bg-primary-100 px-2 py-1 text-xs text-primary-800 dark:bg-primary-900/40 dark:text-primary-200">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {u.isBlocked ? (
                          <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-800 dark:bg-red-900/30 dark:text-red-200">
                            Restricted
                          </span>
                        ) : (
                          <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800 dark:bg-green-900/30 dark:text-green-200">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            className="text-xs"
                            disabled={isBusy}
                            onClick={() => onToggleRole(u)}
                          >
                            {u.role === 'admin' ? 'Make User' : 'Make Admin'}
                          </Button>
                          <Button
                            variant={u.isBlocked ? 'secondary' : 'danger'}
                            className="text-xs"
                            disabled={isBusy}
                            onClick={() => onToggleRestrict(u)}
                          >
                            {u.isBlocked ? 'Unrestrict' : 'Restrict'}
                          </Button>
                          <Button
                            variant="danger"
                            className="text-xs"
                            disabled={isBusy}
                            onClick={() => onDelete(u)}
                          >
                            Delete
                          </Button>
                        </div>
                        {u.isBlocked && u.blockedReason ? (
                          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            Reason: {u.blockedReason}
                          </p>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-6 py-10 text-center text-gray-500 dark:text-gray-400" colSpan={columns.length + 1}>
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

