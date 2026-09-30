import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { sendError } from '../utils/apiResponse.js';

export const authorizeRole = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
    }

    if (!roles.includes(req.user.role)) {
      return sendError(
        res,
        `Access denied. Requires one of roles: [${roles.join(', ')}]`,
        403,
        'FORBIDDEN'
      );
    }

    next();
  };
};
