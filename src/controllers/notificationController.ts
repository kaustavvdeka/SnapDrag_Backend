import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notificationService.js';
import { sendSuccess } from '../utils/apiResponse.js';

export class NotificationController {
  async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await notificationService.getUserNotifications(req.user!.userId);
      return sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await notificationService.markAsRead(req.user!.userId, id as string);
      return sendSuccess(res, null, 'Notification marked as read');
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      await notificationService.markAllAsRead(req.user!.userId);
      return sendSuccess(res, null, 'All notifications marked as read');
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();
