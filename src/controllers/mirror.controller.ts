import { Request, Response, NextFunction } from 'express';
import { mirrorService } from '../services/mirror.service.js';

export class MirrorController {
  async tryOn(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.body.productId;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'Please upload a clear photo of yourself.',
        });
      }

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: 'Product ID is required.',
        });
      }

      const result = await mirrorService.processTryOn({
        productId,
        userImageFile: file,
      });

      return res.status(200).json({
        success: true,
        result: {
          imageUrl: result.imageUrl,
        },
      });
    } catch (error: any) {
      const message = error.message || 'Mirror Virtual Try-On failed. Please try again.';
      let statusCode = 500;

      if (message.includes('Product not found')) {
        statusCode = 404;
      } else if (message.includes('User image is missing') || message.includes('Product ID is required') || message.includes('cannot be used with Mirror')) {
        statusCode = 400;
      } else if (message.includes('busy or unavailable')) {
        statusCode = 503;
      }

      return res.status(statusCode).json({
        success: false,
        message,
      });
    }
  }
}

export const mirrorController = new MirrorController();
export default mirrorController;
