import { Request, Response, NextFunction } from 'express';
import { shopService } from '../services/shopService.js';
import { sendSuccess } from '../utils/apiResponse.js';

export class ShopController {
  async listShops(req: Request, res: Response, next: NextFunction) {
    try {
      const shops = await shopService.listShops(req.query as any);
      return sendSuccess(res, shops);
    } catch (error) {
      next(error);
    }
  }

  async getShopById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const trackView = {
        ip: req.ip || (req.headers['x-forwarded-for'] as string),
        userAgent: req.headers['user-agent'],
      };
      const shop = await shopService.getShopById(id as string, trackView);
      return sendSuccess(res, shop);
    } catch (error) {
      next(error);
    }
  }

  async createShop(req: Request, res: Response, next: NextFunction) {
    try {
      const shop = await shopService.createShop(req.user!.userId, req.body);
      return sendSuccess(res, shop, 'Shop registered successfully. Pending approval.', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateShop(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const shop = await shopService.updateShop(req.user!.userId, id as string, req.body);
      return sendSuccess(res, shop, 'Shop profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await shopService.getShopkeeperDashboardStats(req.user!.userId);
      return sendSuccess(res, stats);
    } catch (error) {
      next(error);
    }
  }
}

export const shopController = new ShopController();
