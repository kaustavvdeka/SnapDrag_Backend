import { Request, Response, NextFunction } from 'express';
import { geminiTryOnService } from '../services/geminiTryOnService.js';
import { sendSuccess } from '../utils/apiResponse.js';

export class AiController {
  async virtualTryOn(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId, customerImageBase64, customerImageUrl, fitPreference } = req.body;
      const result = await geminiTryOnService.processVirtualTryOn({
        productId,
        customerImageBase64,
        customerImageUrl,
        fitPreference,
      });
      return sendSuccess(res, result, 'Virtual try-on visualization generated successfully with Gemini AI');
    } catch (error) {
      next(error);
    }
  }
}

export const aiController = new AiController();
export default aiController;
