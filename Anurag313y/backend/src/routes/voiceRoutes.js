import { Router } from 'express';
import multer from 'multer';
import protect from '../middleware/authMiddleware.js';
import { extractEventFields, transcribeVoice } from '../controllers/voiceController.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

router.use(protect);

router.post('/transcribe', upload.single('audio'), transcribeVoice);
router.post('/extract', extractEventFields);

export default router;

