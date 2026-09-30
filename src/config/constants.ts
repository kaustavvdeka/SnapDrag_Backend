import dotenv from 'dotenv';
dotenv.config();

export const PORT = Number(process.env.PORT) || 5001;
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const CLIENT_URL = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173';

// JWT Configuration (Supports both JWT_ACCESS_SECRET and JWT_SECRET)
export const JWT_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'snapdrag_fallback_jwt_access_secret_2026';
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'snapdrag_fallback_jwt_refresh_secret_2026';
export const JWT_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || process.env.JWT_EXPIRES_IN || '7d';
export const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

// Image Storage Configuration (Local, Cloudinary, S3)
export const IMAGE_STORAGE_PROVIDER = process.env.IMAGE_STORAGE_PROVIDER || (process.env.CLOUDINARY_CLOUD_NAME ? 'cloudinary' : 'local');
export const IMAGE_STORAGE_URL = process.env.IMAGE_STORAGE_URL || `http://localhost:${PORT}/uploads`;
export const IMAGE_UPLOAD_DIR = process.env.IMAGE_UPLOAD_DIR || './uploads';

// Cloudinary Configuration
export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '';
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || '';

// Email / SMTP Configuration
export const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
export const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
export const SMTP_USER = process.env.SMTP_USER || '';
export const SMTP_PASS = process.env.SMTP_PASS || '';
export const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';
export const RESEND_API_KEY = process.env.RESEND_API_KEY || '';

// OAuth Configuration
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

// Security & Rate Limiting
export const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000';
export const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 900000;
export const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX) || 500;
export const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';
export const LOG_LEVEL = process.env.LOG_LEVEL || 'debug';

export const DEFAULT_RESERVATION_EXPIRY_HOURS = 48; // Reservations hold stock for 48 hours

// AI Virtual Try-On Configuration (Google Gemini Nano Banana)
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.Gemini_api || '';
export const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY || process.env.MAP_API_KEY || '';
