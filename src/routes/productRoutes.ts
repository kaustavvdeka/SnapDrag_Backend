import { Router } from 'express';
import { productController } from '../controllers/productController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRole } from '../middleware/rbac.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { createProductSchema, updateProductSchema, productQuerySchema } from '../validators/productValidator.js';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', validateQuery(productQuerySchema), (req, res, next) => productController.listProducts(req, res, next));
router.get('/featured', (req, res, next) => productController.getFeaturedProducts(req, res, next));
router.get('/:id', (req, res, next) => productController.getProductById(req, res, next));

// Shopkeeper product management routes
router.post(
  '/',
  authenticate,
  authorizeRole(Role.SHOPKEEPER, Role.ADMIN),
  validateBody(createProductSchema),
  (req, res, next) => productController.createProduct(req, res, next)
);

router.patch(
  '/:id',
  authenticate,
  authorizeRole(Role.SHOPKEEPER, Role.ADMIN),
  validateBody(updateProductSchema),
  (req, res, next) => productController.updateProduct(req, res, next)
);

router.delete(
  '/:id',
  authenticate,
  authorizeRole(Role.SHOPKEEPER, Role.ADMIN),
  (req, res, next) => productController.deleteProduct(req, res, next)
);

export default router;
