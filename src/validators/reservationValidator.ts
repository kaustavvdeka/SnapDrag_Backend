import { z } from 'zod';
import { ReservationStatus } from '@prisma/client';

export const createReservationSchema = z.object({
  productId: z.string().uuid('Valid product ID is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(5, 'Max 5 per reservation').default(1),
  preferredVisitDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  preferredVisitTime: z.string().optional(),
  notes: z.string().max(300).optional(),
});

export const updateReservationStatusSchema = z.object({
  status: z.enum([
    ReservationStatus.CONFIRMED,
    ReservationStatus.READY_FOR_VISIT,
    ReservationStatus.COMPLETED,
    ReservationStatus.CANCELLED,
    ReservationStatus.EXPIRED,
  ]),
  cancelReason: z.string().optional(),
});
