import { Router } from 'express';
import {
  createInvoice,
  deleteInvoice,
  downloadEventsPDF,
  downloadInvoicePDF,
  getInvoiceById,
  getInvoices,
  updateInvoice,
} from '../controllers/invoiceController.js';
import protect from '../middleware/authMiddleware.js';

const router = Router();

router.use(protect);

router.route('/').get(getInvoices).post(createInvoice);
router.post('/export/pdf', downloadEventsPDF);
router.get('/:id/pdf', downloadInvoicePDF);
router.route('/:id').get(getInvoiceById).put(updateInvoice).delete(deleteInvoice);

export default router;
