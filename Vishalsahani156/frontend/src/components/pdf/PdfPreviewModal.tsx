import { Button } from '../common/Button';

interface PdfPreviewModalProps {
  previewUrl: string | null;
  onClose: () => void;
  onDownload: () => void;
}

export const PdfPreviewModal = ({ previewUrl, onClose, onDownload }: PdfPreviewModalProps) => {
  if (!previewUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">PDF Preview</h3>
          <div className="flex gap-2">
            <Button onClick={onDownload}>Download PDF</Button>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden p-2">
          <iframe
            src={previewUrl}
            title="PDF Preview"
            className="h-[70vh] w-full rounded-lg border border-gray-200 dark:border-gray-700"
          />
        </div>
      </div>
    </div>
  );
};
