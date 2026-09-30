import { Router } from 'express';
import { adminController } from '../controllers/adminController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRole } from '../middleware/rbac.js';
import { Role } from '@prisma/client';

const router = Router();

// Protect all admin routes
router.use(authenticate, authorizeRole(Role.ADMIN));

router.get('/stats', (req, res, next) => adminController.getStats(req, res, next));
router.get('/pending-shops', (req, res, next) => adminController.getPendingShops(req, res, next));
router.patch('/shops/:id/approve', (req, res, next) => adminController.updateShopApproval(req, res, next));
router.get('/shops', (req, res, next) => adminController.getAllShops(req, res, next));

router.get('/users', (req, res, next) => adminController.getAllUsers(req, res, next));
router.patch('/users/:id/status', (req, res, next) => adminController.toggleUserStatus(req, res, next));

router.get('/products', (req, res, next) => adminController.getAllProducts(req, res, next));
router.patch('/products/:id/status', (req, res, next) => adminController.toggleProductStatus(req, res, next));

router.post('/categories', (req, res, next) => adminController.createCategory(req, res, next));

export default router;
