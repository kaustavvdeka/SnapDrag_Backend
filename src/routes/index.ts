import { Router } from 'express';
import authRoutes from './authRoutes.js';
import productRoutes from './productRoutes.js';
import shopRoutes from './shopRoutes.js';
import reservationRoutes from './reservationRoutes.js';
import favoriteRoutes from './favoriteRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import locationRoutes from './locationRoutes.js';
import adminRoutes from './adminRoutes.js';
import uploadRoutes from './uploadRoutes.js';
import aiRoutes from './aiRoutes.js';
import mirrorRoutes from './mirrorRoutes.js';
import assistantRoutes from './assistantRoutes.js';
import prisma from '../config/prisma.js';
import { sendSuccess } from '../utils/apiResponse.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/shops', shopRoutes);
router.use('/reservations', reservationRoutes);
router.use('/favorites', favoriteRoutes);
router.use('/notifications', notificationRoutes);
router.use('/locations', locationRoutes);
router.use('/admin', adminRoutes);
router.use('/upload', uploadRoutes);
router.use('/ai', aiRoutes);
router.use('/mirror', mirrorRoutes);
router.use('/assistant', assistantRoutes);

// Category discovery endpoint
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
    return sendSuccess(res, categories);
  } catch (error) {
    next(error);
  }
});

// Setup and seed database endpoint
router.post('/setup-db', async (req, res) => {
  try {
    const key = req.headers['x-setup-key'] || req.query.key;
    if (key !== 'snapdrag-seed-2026') {
      return res.status(403).json({ success: false, message: 'Unauthorized key' });
    }

    const { execSync } = await import('child_process');
    console.log('🚀 Running npx prisma db push --accept-data-loss...');
    const pushOut = execSync('npx prisma db push --accept-data-loss', { encoding: 'utf-8' });

    console.log('🌱 Running npx tsx prisma/seed.ts...');
    const seedOut = execSync('npx tsx prisma/seed.ts', {
      encoding: 'utf-8',
      env: { ...process.env, FORCE_SEED: 'true' },
    });

    return res.json({
      success: true,
      message: 'Database schema pushed and all 21 boutiques seeded successfully!',
      pushSummary: pushOut.trim(),
      seedSummary: seedOut.trim().slice(-300),
    });
  } catch (err: any) {
    console.error('Setup endpoint failed:', err);
    return res.status(500).json({
      success: false,
      message: err.message,
      stderr: err.stderr,
    });
  }
});

export default router;
