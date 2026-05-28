import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Loader } from '../components/common/Loader';
import { Button } from '../components/common/Button';
import { getDashboardApi } from '../api/pdf.api';
import { DashboardStats } from '../types';

export const DashboardPage = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await getDashboardApi();
        setStats(data.data);
      } catch {
        toast.error('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <DashboardLayout><Loader /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Overview of your event activity</p>
        </div>
        <Link to="/generate">
          <Button>+ Create New Event</Button>
        </Link>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Events</p>
          <p className="mt-1 text-3xl font-bold text-primary-600">{stats?.total ?? 0}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Categories Used</p>
          <p className="mt-1 text-3xl font-bold text-primary-600">
            {stats?.categories?.length ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900 sm:col-span-2 lg:col-span-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">Quick Action</p>
          <Link to="/records" className="mt-2 inline-block text-sm text-primary-600 hover:underline">
            View all events →
          </Link>
        </div>
      </div>

      {stats?.categories && stats.categories.length > 0 && (
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            By Category
          </h2>
          <div className="flex flex-wrap gap-2">
            {stats.categories.map((cat) => (
              <span
                key={cat._id}
                className="rounded-full bg-primary-100 px-3 py-1 text-sm text-primary-800 dark:bg-primary-900/40 dark:text-primary-200"
              >
                {cat._id}: {cat.count}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Events
          </h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {stats?.recent?.length ? (
            stats.recent.map((record) => (
              <div
                key={record._id}
                className="flex flex-wrap items-center justify-between gap-2 px-6 py-4"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{record.eventName || record.name}</p>
                  <p className="text-sm text-gray-500">
                    {record.sheetCategory} · {new Date(record.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Link to={`/records?edit=${record._id}`}>
                  <Button variant="outline" className="text-xs">
                    Edit
                  </Button>
                </Link>
              </div>
            ))
          ) : (
            <p className="px-6 py-8 text-center text-gray-500">No events yet</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};
