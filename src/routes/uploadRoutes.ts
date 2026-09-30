import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { uploadSingle, uploadMultiple } from '../middleware/upload.js';
import { storageService } from '../storage/storageService.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

const router = Router();

router.post('/single', authenticate, uploadSingle, async (req, res, next) => {
  try {
    if (!req.file) {
      return sendError(res, 'No image file uploaded', 400);
    }
    const result = await storageService.uploadImage(req.file);
    return sendSuccess(res, result, 'Image uploaded successfully');
  } catch (error) {
    next(error);
  }
});

router.post('/multiple', authenticate, uploadMultiple, async (req, res, next) => {
  try {
    if (!req.files || !(req.files as Express.Multer.File[]).length) {
      return sendError(res, 'No image files uploaded', 400);
    }
    const files = req.files as Express.Multer.File[];
    const results = await Promise.all(files.map(file => storageService.uploadImage(file)));
    return sendSuccess(res, results, 'Images uploaded successfully');
  } catch (error) {
    next(error);
  }
});

export default router;
