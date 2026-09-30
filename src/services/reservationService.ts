import prisma from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateReservationCode } from '../utils/codeGenerator.js';
import { DEFAULT_RESERVATION_EXPIRY_HOURS } from '../config/constants.js';
import { ReservationStatus, NotificationType } from '@prisma/client';
import { emailService } from './emailService.js';

export class ReservationService {
  /**
   * Atomic reservation creation with PostgreSQL transaction
   * Guarantees that concurrent attempts on limited stock cannot oversell
   */
  async createReservation(
    customerId: string,
    data: {
      productId: string;
      quantity?: number;
      preferredVisitDate: string | Date;
      preferredVisitTime?: string;
      notes?: string;
    }
  ) {
    const qty = data.quantity || 1;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + DEFAULT_RESERVATION_EXPIRY_HOURS);

    const reservationCode = generateReservationCode();

    // Use Prisma interactive transaction for atomic concurrency guarantee
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch current product state inside transaction
      const product = await tx.product.findUnique({
        where: { id: data.productId },
        include: {
          shop: true,
        },
      });

      if (!product || !product.isActive) {
        throw new AppError('Product not found or unavailable', 404, 'PRODUCT_NOT_FOUND');
      }

      // Check stock availability
      if (product.availableQuantity < qty) {
        throw new AppError(
          `Insufficient stock. Only ${product.availableQuantity} item(s) currently available.`,
          409,
          'INSUFFICIENT_STOCK'
        );
      }

      // 2. Decrement availableQuantity and increment reservedQuantity atomically
      const updatedProduct = await tx.product.update({
        where: { id: product.id },
        data: {
          availableQuantity: { decrement: qty },
          reservedQuantity: { increment: qty },
        },
      });

      // Guard check: ensure available quantity didn't drop below 0
      if (updatedProduct.availableQuantity < 0) {
        throw new AppError('Product went out of stock during transaction', 409, 'OUT_OF_STOCK');
      }

      // 3. Create the reservation record
      const reservation = await tx.reservation.create({
        data: {
          reservationCode,
          customerId,
          shopId: product.shopId,
          productId: product.id,
          quantity: qty,
          unitPrice: product.discountedPrice,
          status: ReservationStatus.PENDING,
          preferredVisitDate: new Date(data.preferredVisitDate),
          preferredVisitTime: data.preferredVisitTime || 'Flexible',
          notes: data.notes,
          expiresAt,
        },
        include: {
          product: {
            include: {
              images: { take: 1 },
            },
          },
          shop: {
            include: {
              location: true,
            },
          },
          customer: {
            select: { id: true, name: true, phone: true, email: true },
          },
        },
      });

      // 4. Create in-app notification for the shopkeeper
      await tx.notification.create({
        data: {
          userId: product.shop.ownerId,
          title: 'New In-Store Reservation!',
          message: `${reservation.customer.name} reserved "${product.name}" (${reservationCode}). Visit planned on ${new Date(data.preferredVisitDate).toLocaleDateString()}.`,
          type: NotificationType.RESERVATION_UPDATE,
          link: `/dashboard/reservations`,
        },
      });

      // 5. Create in-app notification for the customer
      await tx.notification.create({
        data: {
          userId: customerId,
          title: 'Reservation Placed Successfully',
          message: `Your reservation code is ${reservationCode} for ${product.name} at ${product.shop.name}. Shop holds it for ${DEFAULT_RESERVATION_EXPIRY_HOURS} hours.`,
          type: NotificationType.RESERVATION_UPDATE,
          link: `/reservations`,
        },
      });

      return reservation;
    });

    // Send email confirmation asynchronously (non-blocking)
    if (result && result.customer && result.customer.email) {
      emailService.sendReservationConfirmationEmail(
        result.customer.email,
        result.reservationCode,
        result.product.name,
        result.shop.name,
        result.shop.location?.floorName || undefined,
        result.shop.location?.shopNumber || undefined
      ).catch((err) => console.warn('Email dispatch warning:', err));
    }

    return result;
  }

  async updateReservationStatus(
    userId: string,
    reservationId: string,
    status: ReservationStatus,
    cancelReason?: string
  ) {
    return prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id: reservationId },
        include: {
          shop: true,
          product: true,
          customer: true,
        },
      });

      if (!reservation) {
        throw new AppError('Reservation not found', 404, 'RESERVATION_NOT_FOUND');
      }

      const isShopkeeper = reservation.shop.ownerId === userId;
      const isCustomer = reservation.customerId === userId;

      if (!isShopkeeper && !isCustomer) {
        throw new AppError('Unauthorized to update this reservation', 403, 'FORBIDDEN');
      }

      // Customer can only cancel their own pending/confirmed reservation
      if (isCustomer && !isShopkeeper && status !== ReservationStatus.CANCELLED) {
        throw new AppError('Customers can only cancel their reservation', 403, 'FORBIDDEN');
      }

      const prevStatus = reservation.status;
      if (prevStatus === status) {
        return reservation;
      }

      // If transition from an active hold to CANCELLED or EXPIRED -> return reserved stock to available
      const activeHoldStatuses: ReservationStatus[] = [
        ReservationStatus.PENDING,
        ReservationStatus.CONFIRMED,
        ReservationStatus.READY_FOR_VISIT,
      ];
      const wasHoldingStock = activeHoldStatuses.includes(prevStatus);

      if (wasHoldingStock && (status === ReservationStatus.CANCELLED || status === ReservationStatus.EXPIRED)) {
        await tx.product.update({
          where: { id: reservation.productId },
          data: {
            availableQuantity: { increment: reservation.quantity },
            reservedQuantity: { decrement: reservation.quantity },
          },
        });
      }

      // If transition from active hold to COMPLETED (offline customer purchase in shop)
      if (wasHoldingStock && status === ReservationStatus.COMPLETED) {
        await tx.product.update({
          where: { id: reservation.productId },
          data: {
            reservedQuantity: { decrement: reservation.quantity },
            soldQuantity: { increment: reservation.quantity },
          },
        });
      }

      const updated = await tx.reservation.update({
        where: { id: reservationId },
        data: {
          status,
          cancelReason,
          completedAt: status === ReservationStatus.COMPLETED ? new Date() : undefined,
        },
        include: {
          product: { include: { images: true } },
          shop: { include: { location: true } },
          customer: { select: { id: true, name: true, phone: true, email: true } },
        },
      });

      // Send status notification to customer
      const statusLabels: Record<string, string> = {
        CONFIRMED: 'Confirmed by Shop! Item is being held for you.',
        READY_FOR_VISIT: 'Ready for Visit! Head to the shop now to inspect.',
        COMPLETED: 'Purchase marked as completed. Thank you for shopping local!',
        CANCELLED: `Reservation was cancelled: ${cancelReason || 'No reason provided'}`,
        EXPIRED: 'Reservation expired because the visit window lapsed.',
      };

      await tx.notification.create({
        data: {
          userId: reservation.customerId,
          title: `Reservation ${reservation.reservationCode} Update`,
          message: statusLabels[status] || `Status updated to ${status}`,
          type: NotificationType.RESERVATION_UPDATE,
          link: `/reservations`,
        },
      });

      return updated;
    });
  }

  async getCustomerReservations(customerId: string) {
    // Automatically check for expired reservations
    await this.expireStaleReservations();

    return prisma.reservation.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          include: {
            images: { take: 1 },
            category: true,
          },
        },
        shop: {
          include: {
            location: {
              include: {
                mall: true,
              },
            },
          },
        },
      },
    });
  }

  async getShopReservations(shopkeeperUserId: string, status?: ReservationStatus) {
    await this.expireStaleReservations();

    const shop = await prisma.shop.findFirst({
      where: { ownerId: shopkeeperUserId },
    });

    if (!shop) {
      throw new AppError('Shop not found', 404, 'SHOP_NOT_FOUND');
    }

    const where: any = { shopId: shop.id };
    if (status) {
      where.status = status;
    }

    return prisma.reservation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          include: {
            images: { take: 1 },
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });
  }

  /**
   * Helper to automatically expire reservations past their expiry window
   * and restore inventory back to available
   */
  private async expireStaleReservations() {
    const staleReservations = await prisma.reservation.findMany({
      where: {
        status: { in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] },
        expiresAt: { lt: new Date() },
      },
    });

    for (const res of staleReservations) {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.reservation.update({
            where: { id: res.id },
            data: { status: ReservationStatus.EXPIRED },
          });

          await tx.product.update({
            where: { id: res.productId },
            data: {
              availableQuantity: { increment: res.quantity },
              reservedQuantity: { decrement: res.quantity },
            },
          });
        });
      } catch (err) {
        console.error('Failed to expire reservation:', res.id, err);
      }
    }
  }
}

export const reservationService = new ReservationService();
