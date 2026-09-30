import { Request, Response, NextFunction } from 'express';
import { favoriteService } from '../services/favoriteService.js';
import { sendSuccess } from '../utils/apiResponse.js';

export class FavoriteController {
  async toggleFavorite(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId } = req.params;
      const result = await favoriteService.toggleFavorite(req.user!.userId, productId as string);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getFavorites(req: Request, res: Response, next: NextFunction) {
    try {
      const favorites = await favoriteService.getFavorites(req.user!.userId);
      return sendSuccess(res, favorites);
    } catch (error) {
      next(error);
    }
  }
}

export const favoriteController = new FavoriteController();
