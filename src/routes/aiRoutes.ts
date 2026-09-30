import { Router } from 'express';
import { aiController } from '../controllers/aiController.js';

const router = Router();

// Virtual Try-On endpoint powered by Google Gemini (Nano Banana)
router.post('/try-on', (req, res, next) => aiController.virtualTryOn(req, res, next));

export default router;
