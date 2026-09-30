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

  // Parse CORS allowed origins
  const origins = CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
  if (!origins.includes(CLIENT_URL)) origins.push(CLIENT_URL);
  if (!origins.includes('http://localhost:5173')) origins.push('http://localhost:5173');

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

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'SnapDrag API',
      concept: 'Discover Online -> Check Availability -> Locate Shop -> Reserve -> Visit Shop -> Inspect Physically -> Purchase',
    });
  });

  // REST API v1 routes
  app.use('/api/v1', apiRoutes);

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
};

export default createApp;
