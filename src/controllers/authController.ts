import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService.js';
import { sendSuccess } from '../utils/apiResponse.js';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body);
      return sendSuccess(res, result, 'Registered successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body);
      return sendSuccess(res, result, 'Logged in successfully');
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshToken(refreshToken);
      return sendSuccess(res, result, 'Token refreshed successfully');
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      await authService.logout(refreshToken);
      return sendSuccess(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.getProfile(req.user!.userId);
      return sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  }

  async googleLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.authenticateGoogle(req.body);
      return sendSuccess(res, result, 'Google authentication successful');
    } catch (error) {
      next(error);
    }
  }

  async getGoogleAuthUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const role = req.query.role as any;
      const redirectUri = req.query.redirectUri as string;
      const url = authService.getGoogleAuthUrl(role, redirectUri);
      return sendSuccess(res, { url }, 'Google OAuth URL generated');
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
