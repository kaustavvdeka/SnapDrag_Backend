import { Router } from 'express';
import { mirrorController } from '../controllers/mirror.controller.js';
import { optionalAuthenticate } from '../middleware/auth.js';
import { uploadUserImage } from '../middleware/upload.js';

const router = Router();

// POST /api/mirror/try-on (or /api/v1/mirror/try-on)
router.post('/try-on', optionalAuthenticate, uploadUserImage, (req, res, next) =>
  mirrorController.tryOn(req, res, next)
);

export default router;
