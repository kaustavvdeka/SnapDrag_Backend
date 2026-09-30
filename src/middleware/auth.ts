import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt.js';
import { sendError } from '../utils/apiResponse.js';
import prisma from '../config/prisma.js';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Authentication required. No token provided.', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return sendError(res, 'Authentication token missing.', 401, 'UNAUTHORIZED');
    }

    const payload = verifyAccessToken(token);

    // Verify user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return sendError(res, 'User account is inactive or not found.', 401, 'USER_INACTIVE');
    }

    req.user = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 'Access token expired. Please refresh your session.', 401, 'TOKEN_EXPIRED');
    }
    return sendError(res, 'Invalid or corrupt access token.', 401, 'INVALID_TOKEN');
  }
};

export const optionalAuthenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        const payload = verifyAccessToken(token);
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: { id: true, email: true, name: true, role: true, isActive: true },
        });
        if (user && user.isActive) {
          req.user = {
            userId: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        }
      }
    }
  } catch (e) {
    // Proceed as unauthenticated
  }
  next();
};
