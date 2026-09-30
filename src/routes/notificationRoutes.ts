import { Router } from 'express';
import { notificationController } from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, (req, res, next) => notificationController.getNotifications(req, res, next));
router.patch('/:id/read', authenticate, (req, res, next) => notificationController.markAsRead(req, res, next));
router.patch('/read-all', authenticate, (req, res, next) => notificationController.markAllAsRead(req, res, next));

export default router;
