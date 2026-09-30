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

export default router;
