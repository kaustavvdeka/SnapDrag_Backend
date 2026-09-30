import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/adminService.js';
import { sendSuccess } from '../utils/apiResponse.js';

export class AdminController {
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await adminService.getPlatformStats();
      return sendSuccess(res, stats);
    } catch (error) {
      next(error);
    }
  }

  async getPendingShops(req: Request, res: Response, next: NextFunction) {
    try {
      const shops = await adminService.getPendingShops();
      return sendSuccess(res, shops);
    } catch (error) {
      next(error);
    }
  }

  async updateShopApproval(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { approve } = req.body;
      const shop = await adminService.updateShopApproval(id as string, approve);
      return sendSuccess(res, shop, `Shop ${approve ? 'approved' : 'declined'}`);
    } catch (error) {
      next(error);
    }
  }

  async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await adminService.getAllUsers();
      return sendSuccess(res, users);
    } catch (error) {
      next(error);
    }
  }

  async toggleUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const user = await adminService.toggleUserStatus(id as string, isActive);
      return sendSuccess(res, user, 'User status updated');
    } catch (error) {
      next(error);
    }
  }

  async getAllShops(req: Request, res: Response, next: NextFunction) {
    try {
      const shops = await adminService.getAllShops();
      return sendSuccess(res, shops);
    } catch (error) {
      next(error);
    }
  }

  async getAllProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const products = await adminService.getAllProducts();
      return sendSuccess(res, products);
    } catch (error) {
      next(error);
    }
  }

  async toggleProductStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const product = await adminService.toggleProductStatus(id as string, isActive);
      return sendSuccess(res, product, 'Product status updated');
    } catch (error) {
      next(error);
    }
  }

  async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await adminService.createCategory(req.body);
      return sendSuccess(res, category, 'Category created successfully', 201);
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
