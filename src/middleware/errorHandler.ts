import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { sendError } from '../utils/apiResponse.js';

export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number = 400, code: string = 'BAD_REQUEST') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('API Error:', err);

  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode, err.code);
  }

  if (err instanceof ZodError) {
    const errorDetails = err.errors.map(e => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    return sendError(res, 'Validation failed', 422, 'VALIDATION_ERROR', errorDetails);
  }

  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid authentication token', 401, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'Authentication token has expired', 401, 'TOKEN_EXPIRED');
  }

  // Fallback internal error
  const message = process.env.NODE_ENV === 'production' 
    ? 'An unexpected internal server error occurred' 
    : (err.message || 'Internal Server Error');

  return sendError(res, message, 500, 'INTERNAL_SERVER_ERROR');
};
