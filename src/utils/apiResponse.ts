import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  code?: string;
  error?: any;
}

export const sendSuccess = <T>(res: Response, data: T, message?: string, statusCode: number = 200) => {
  return res.status(statusCode).json({
    success: true,
    ...(message ? { message } : {}),
    data,
  });
};

export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 400,
  code: string = 'BAD_REQUEST',
  error?: any
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    code,
    ...(error ? { error } : {}),
  });
};
