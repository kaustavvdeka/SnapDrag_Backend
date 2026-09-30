import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { CLIENT_URL, IMAGE_UPLOAD_DIR, CORS_ORIGIN, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX } from './config/constants.js';

const uploadPath = path.resolve(process.cwd(), IMAGE_UPLOAD_DIR);

export const createApp = () => {
  const app = express();

  // Parse CORS allowed origins and strip trailing slashes for robust browser matching
  const origins = CORS_ORIGIN.split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  const normalizedClientUrl = CLIENT_URL ? CLIENT_URL.replace(/\/+$/, '') : '';
  if (normalizedClientUrl && !origins.includes(normalizedClientUrl)) origins.push(normalizedClientUrl);
  if (!origins.includes('http://localhost:5173')) origins.push('http://localhost:5173');
  if (!origins.includes('https://snap-drag.vercel.app')) origins.push('https://snap-drag.vercel.app');

  // Security Headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // CORS
  app.use(
    cors({
      origin: origins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Rate Limiting (Configurable via environment)
  const limiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX,
    message: { success: false, message: 'Too many requests from this IP, please try again later.' },
  });
  app.use('/api', limiter);

  // Logging & Parsing
  app.use(morgan('dev'));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Static files for local image uploads
  app.use('/uploads', express.static(uploadPath));

  // Health check with DB diagnostics
  app.get('/api/health', async (req, res) => {
    let dbStatus = 'UNKNOWN';
    let dbError = null;
    try {
      const { prisma } = await import('./config/prisma.js');
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'CONNECTED';
    } catch (e: any) {
      dbStatus = 'DISCONNECTED';
      dbError = e.message;
    }

    const dbEnv = process.env.DATABASE_URL;
    res.json({
      status: 'UP',
      database: dbStatus,
      databaseUrlConfigured: !!dbEnv,
      databaseTarget: dbEnv ? dbEnv.split('@')[1] || 'configured' : 'NOT_CONFIGURED (defaults to localhost:5432)',
      dbError,
      timestamp: new Date().toISOString(),
      service: 'SnapDrag API',
    });
  });

  // REST API v1 routes
  app.use('/api/v1', apiRoutes);

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
};

export default createApp;
