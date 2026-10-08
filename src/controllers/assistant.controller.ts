import { Request, Response, NextFunction } from 'express';
import { assistantService } from '../services/assistant.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export class AssistantController {
  async chat(req: Request, res: Response, next: NextFunction) {
    try {
      const { message, conversationHistory, context } = req.body;

      const result = await assistantService.processChat({
        message,
        conversationHistory,
        context,
      });

      return sendSuccess(res, result, 'Assistant response generated successfully');
    } catch (error) {
      console.error('[AssistantController Error]:', error);
      next(error);
    }
  }
}

export const assistantController = new AssistantController();
export default assistantController;
