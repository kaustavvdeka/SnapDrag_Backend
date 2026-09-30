import { Router } from 'express';
import { reservationController } from '../controllers/reservationController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRole } from '../middleware/rbac.js';
import { validateBody } from '../middleware/validate.js';
import { createReservationSchema, updateReservationStatusSchema } from '../validators/reservationValidator.js';
import { Role } from '@prisma/client';

const router = Router();

// Customer creates reservation
router.post(
  '/',
  authenticate,
  validateBody(createReservationSchema),
  (req, res, next) => reservationController.createReservation(req, res, next)
);

// Customer views their own reservations
router.get(
  '/my-reservations',
  authenticate,
  (req, res, next) => reservationController.getCustomerReservations(req, res, next)
);

// Shopkeeper views reservations for their shop
router.get(
  '/shop',
  authenticate,
  authorizeRole(Role.SHOPKEEPER, Role.ADMIN),
  (req, res, next) => reservationController.getShopReservations(req, res, next)
);

// Customer or Shopkeeper updates reservation status (confirm, cancel, complete)
router.patch(
  '/:id/status',
  authenticate,
  validateBody(updateReservationStatusSchema),
  (req, res, next) => reservationController.updateReservationStatus(req, res, next)
);

export default router;
