import { Router } from 'express';
import { assistantController } from '../controllers/assistant.controller.js';
import { optionalAuthenticate } from '../middleware/auth.js';

const router = Router();

// POST /api/v1/assistant/chat
router.post('/chat', optionalAuthenticate, (req, res, next) =>
  assistantController.chat(req, res, next)
);

export default router;
