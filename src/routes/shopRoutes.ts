import { Router } from 'express';
import { shopController } from '../controllers/shopController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRole } from '../middleware/rbac.js';
import { validateBody } from '../middleware/validate.js';
import { createShopSchema, updateShopSchema } from '../validators/shopValidator.js';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', (req, res, next) => shopController.listShops(req, res, next));
router.get('/dashboard-stats', authenticate, authorizeRole(Role.SHOPKEEPER, Role.ADMIN), (req, res, next) =>
  shopController.getDashboardStats(req, res, next)
);
router.get('/:id', (req, res, next) => shopController.getShopById(req, res, next));

router.post(
  '/',
  authenticate,
  authorizeRole(Role.SHOPKEEPER, Role.ADMIN),
  validateBody(createShopSchema),
  (req, res, next) => shopController.createShop(req, res, next)
);

router.patch(
  '/:id',
  authenticate,
  authorizeRole(Role.SHOPKEEPER, Role.ADMIN),
  validateBody(updateShopSchema),
  (req, res, next) => shopController.updateShop(req, res, next)
);

export default router;
