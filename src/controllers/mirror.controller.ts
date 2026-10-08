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
          userImageUrl: result.userImageUrl,
          productId: result.productId,
          garmentImageUrl: result.garmentImageUrl,
          category: result.category,
        },
      });
    } catch (error: any) {
      console.error('[MirrorController Error]:', error.message || error);

      const rawMsg = error.message || '';
      let friendlyMessage = 'Mirror is temporarily unavailable. Please try again.';
      let statusCode = 500;

      if (rawMsg.includes('Product not found')) {
        friendlyMessage = 'Product not found in SnapDrag catalog.';
        statusCode = 404;
      } else if (
        rawMsg.includes('cannot be used with Mirror') ||
        rawMsg.includes('no garment image') ||
        rawMsg.includes('no valid garment image')
      ) {
        friendlyMessage = 'This product currently cannot be used with Mirror.';
        statusCode = 400;
      } else if (
        rawMsg.includes('Please upload a clear photo') ||
        rawMsg.includes('too small or corrupted') ||
        rawMsg.includes('Unsupported image format') ||
        rawMsg.includes('exceeds 10MB') ||
        rawMsg.includes('User image is missing')
      ) {
        friendlyMessage = rawMsg;
        statusCode = 400;
      } else if (
        rawMsg.includes('busy') ||
        rawMsg.includes('unavailable') ||
        rawMsg.includes('ZeroGPU') ||
        rawMsg.includes('quota') ||
        rawMsg.includes('timed out') ||
        rawMsg.includes('timeout')
      ) {
        friendlyMessage = 'Mirror is temporarily busy or unavailable. Please try again in a few moments.';
        statusCode = 503;
      } else if (rawMsg.includes('Gradio') || rawMsg.includes('connect')) {
        friendlyMessage = 'Mirror is temporarily unavailable. Please try again.';
        statusCode = 502;
      }

      // Never expose backend stack traces to the client
      return res.status(statusCode).json({
        success: false,
        message: friendlyMessage,
      });
    }
  }
}

export const mirrorController = new MirrorController();
export default mirrorController;
