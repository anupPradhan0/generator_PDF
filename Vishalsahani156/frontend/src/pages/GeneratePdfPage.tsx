import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { InputField } from '../components/forms/InputField';
import { SelectField } from '../components/forms/SelectField';
import { TextAreaField } from '../components/forms/TextAreaField';
import { Button } from '../components/common/Button';
import { PdfPreviewModal } from '../components/pdf/PdfPreviewModal';
import { SHEET_CATEGORIES, PdfFormData } from '../types';
import { createPdfApi } from '../api/pdf.api';
import { generatePdfBytes, downloadPdf, pdfToDataUrl } from '../utils/pdfGenerator';

const pdfFormSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(10, 'Phone is required'),
  eventDate: z.string().min(1, 'Event date is required'),
  sheetCategory: z.string().min(1, 'Please select a category'),
  description: z.string().min(1, 'Description is required'),
});

export const GeneratePdfPage = () => {
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<PdfFormData>({ resolver: zodResolver(pdfFormSchema) });

  const buildPdf = async (data: PdfFormData) => {
    setIsGenerating(true);
    try {
      const bytes = await generatePdfBytes(data);
      setPdfBytes(bytes);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(pdfToDataUrl(bytes));
      toast.success('PDF generated successfully!');
      return bytes;
    } catch {
      toast.error('Failed to generate PDF');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const onGenerate = handleSubmit(async (data) => {
    await buildPdf(data);
  });

  const onPreview = handleSubmit(async (data) => {
    const bytes = pdfBytes ?? (await buildPdf(data));
    if (bytes) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(pdfToDataUrl(bytes));
    }
  });

  const onDownload = () => {
    if (!pdfBytes) {
      toast.error('Generate PDF first');
      return;
    }
    const data = getValues();
    const filename = `${data.sheetCategory}-${data.name}-${Date.now()}.pdf`.replace(/\s+/g, '-');
    downloadPdf(pdfBytes, filename);
    toast.success('PDF downloaded!');
  };

  const onSaveRecord = handleSubmit(async (data) => {
    try {
      const bytes = pdfBytes ?? (await buildPdf(data));
      if (!bytes) return;

      await createPdfApi({
        ...data,
        pdfUrl: `generated-${Date.now()}.pdf`,
      });
      toast.success('PDF record saved to database!');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to save record';
      toast.error(message);
    }
  });

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
          PDF Generator
        </h1>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          Fill the form to create a professional A4 PDF with automatic pagination
        </p>

        <form className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <InputField label="Name" {...register('name')} error={errors.name?.message} />
          <InputField
            label="Email"
            type="email"
            {...register('email')}
            error={errors.email?.message}
          />
          <InputField label="Phone Number" {...register('phone')} error={errors.phone?.message} />
          <InputField
            label="Event Date"
            type="date"
            {...register('eventDate')}
            error={errors.eventDate?.message}
          />
          <SelectField
            label="Sheet Category"
            options={[...SHEET_CATEGORIES]}
            {...register('sheetCategory')}
            error={errors.sheetCategory?.message}
          />
          <TextAreaField
            label="Description / Notes"
            {...register('description')}
            error={errors.description?.message}
          />

          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" onClick={onGenerate} isLoading={isGenerating}>
              Generate PDF
            </Button>
            <Button type="button" variant="outline" onClick={onPreview} disabled={isGenerating}>
              Preview PDF
            </Button>
            <Button type="button" variant="secondary" onClick={onDownload} disabled={!pdfBytes}>
              Download PDF
            </Button>
            <Button type="button" variant="outline" onClick={onSaveRecord} isLoading={isGenerating}>
              Save to Database
            </Button>
          </div>
        </form>
      </div>

      <PdfPreviewModal
        previewUrl={previewUrl}
        onClose={closePreview}
        onDownload={onDownload}
      />
    </DashboardLayout>
  );
};
