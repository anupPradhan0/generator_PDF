import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Loader } from '../components/common/Loader';
import { Button } from '../components/common/Button';
import { InputField } from '../components/forms/InputField';
import { SelectField } from '../components/forms/SelectField';
import { TextAreaField } from '../components/forms/TextAreaField';
import {
  deleteEventApi,
  downloadAllEventsPdfApi,
  downloadSingleEventPdfApi,
  getEventByIdApi,
  listEventsApi,
  updateEventApi,
} from '../api/events.api';
import { EventsListMeta, PdfRecord, SHEET_CATEGORIES, PdfFormData } from '../types';

const editSchema = z.object({
  eventName: z.string().min(2),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  eventDate: z.string().min(1),
  sheetCategory: z.string().min(1),
  description: z.string().min(1),
});

export const RecordsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [records, setRecords] = useState<PdfRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [meta, setMeta] = useState<EventsListMeta>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [editingId, setEditingId] = useState<string | null>(
    searchParams.get('edit')
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PdfFormData>({ resolver: zodResolver(editSchema) });

  const page = useMemo(() => Math.max(Number(searchParams.get('page') || 1), 1), [searchParams]);
  const limit = useMemo(() => Math.min(Math.max(Number(searchParams.get('limit') || 10), 1), 50), [searchParams]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data } = await listEventsApi({
        q: search || undefined,
        category: categoryFilter || undefined,
        page,
        limit,
      });
      setRecords(Array.isArray(data.data) ? data.data : []);
      setMeta(data.meta ?? { page, limit, total: data.data?.length ?? 0 });
    } catch {
      toast.error('Failed to load records');
      setRecords([]);
      setMeta({ page, limit, total: 0, totalPages: 1 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [search, categoryFilter, page, limit]);

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId) {
      setEditingId(editId);
      loadRecord(editId);
    }
  }, [searchParams]);

  const loadRecord = async (id: string) => {
    try {
      const { data } = await getEventByIdApi(id);
      const record = data.data;
      reset({
        eventName: record.eventName || '',
        name: record.name,
        email: record.email,
        phone: record.phone,
        eventDate: record.eventDate.split('T')[0],
        sheetCategory: record.sheetCategory,
        description: record.description,
      });
    } catch {
      toast.error('Failed to load record');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    try {
      await deleteEventApi(id);
      toast.success('Event deleted');
      setRecords((prev) => prev.filter((r) => r._id !== id));
      if (editingId === id) {
        setEditingId(null);
        setSearchParams({});
      }
    } catch {
      toast.error('Failed to delete record');
    }
  };

  const handleEdit = (record: PdfRecord) => {
    setEditingId(record._id);
    setSearchParams({ edit: record._id });
    reset({
      eventName: record.eventName || '',
      name: record.name,
      email: record.email,
      phone: record.phone,
      eventDate: record.eventDate.split('T')[0],
      sheetCategory: record.sheetCategory,
      description: record.description,
    });
  };

  const onUpdate = handleSubmit(async (data) => {
    if (!editingId) return;
    try {
      await updateEventApi(editingId, data);
      toast.success('Event updated');
      setEditingId(null);
      setSearchParams({});
      fetchRecords();
    } catch {
      toast.error('Failed to update record');
    }
  });

  const downloadStoredPdf = async (record: PdfRecord) => {
    try {
      const blob = await downloadSingleEventPdfApi(record._id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${record.sheetCategory}-${record.eventName || record.name}.pdf`.replace(/\s+/g, '-');
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch {
      toast.error('Failed to download PDF');
    }
  };

  const downloadAllEvents = async () => {
    try {
      const blob = await downloadAllEventsPdfApi();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `all-events-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('All events PDF downloaded');
    } catch {
      toast.error('Failed to download all events PDF');
    }
  };

  const goToPage = (nextPage: number) => {
    const p = Math.max(1, nextPage);
    setSearchParams((prev) => {
      const n = new URLSearchParams(prev);
      n.set('page', String(p));
      n.set('limit', String(limit));
      if (editingId) n.set('edit', editingId);
      return n;
    });
  };

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">My Events</h1>

      <div className="mb-6 flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search records..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        >
          <option value="">All Categories</option>
          {SHEET_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <Button type="button" variant="outline" onClick={downloadAllEvents} className="text-xs px-3 py-2">
          Download All Events
        </Button>
      </div>

      {editingId && (
        <div className="mb-8 rounded-xl border border-primary-200 bg-primary-50/50 p-6 dark:border-primary-800 dark:bg-primary-900/20">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Edit Event
          </h2>
          <form>
            <InputField label="Event Name" {...register('eventName')} error={errors.eventName?.message} />
            <InputField label="Name" {...register('name')} error={errors.name?.message} />
            <InputField label="Email" type="email" {...register('email')} error={errors.email?.message} />
            <InputField label="Phone" {...register('phone')} error={errors.phone?.message} />
            <InputField label="Event Date" type="date" {...register('eventDate')} error={errors.eventDate?.message} />
            <SelectField label="Category" options={[...SHEET_CATEGORIES]} {...register('sheetCategory')} error={errors.sheetCategory?.message} />
            <TextAreaField label="Description" {...register('description')} error={errors.description?.message} />
            <div className="flex gap-2">
              <Button onClick={onUpdate} isLoading={isSubmitting}>Save Changes</Button>
              <Button variant="secondary" type="button" onClick={() => { setEditingId(null); setSearchParams({}); }}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <Loader />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Date</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {(records?.length ?? 0) ? (
                records.map((record) => (
                  <tr key={record._id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {record.eventName || record.name}
                      </p>
                      <p className="text-xs text-gray-500">{record.email}</p>
                    </td>
                    <td className="px-4 py-3">{record.sheetCategory}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {new Date(record.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Button variant="outline" className="text-xs px-2 py-1" onClick={() => downloadStoredPdf(record)}>
                          Download PDF
                        </Button>
                        <Button variant="secondary" className="text-xs px-2 py-1" onClick={() => handleEdit(record)}>
                          Edit
                        </Button>
                        <Button variant="danger" className="text-xs px-2 py-1" onClick={() => handleDelete(record._id)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    No records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && (meta.totalPages ?? 1) > 1 ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Page <span className="font-semibold">{meta.page}</span> of{' '}
            <span className="font-semibold">{meta.totalPages ?? 1}</span> · Total{' '}
            <span className="font-semibold">{meta.total}</span>
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              type="button"
              disabled={meta.page <= 1}
              onClick={() => goToPage(meta.page - 1)}
              className="px-3 py-1 text-xs"
            >
              Prev
            </Button>
            <Button
              variant="outline"
              type="button"
              disabled={meta.page >= (meta.totalPages ?? 1)}
              onClick={() => goToPage(meta.page + 1)}
              className="px-3 py-1 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
};
