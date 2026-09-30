import { Request, Response, NextFunction } from 'express';
import { reservationService } from '../services/reservationService.js';
import { sendSuccess } from '../utils/apiResponse.js';

export class ReservationController {
  async createReservation(req: Request, res: Response, next: NextFunction) {
    try {
      const reservation = await reservationService.createReservation(
        req.user!.userId,
        req.body
      );
      return sendSuccess(res, reservation, 'Reservation created successfully!', 201);
    } catch (error) {
      next(error);
    }
  }

  async getCustomerReservations(req: Request, res: Response, next: NextFunction) {
    try {
      const reservations = await reservationService.getCustomerReservations(req.user!.userId);
      return sendSuccess(res, reservations);
    } catch (error) {
      next(error);
    }
  }

  async getShopReservations(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.query;
      const reservations = await reservationService.getShopReservations(
        req.user!.userId,
        status as any
      );
      return sendSuccess(res, reservations);
    } catch (error) {
      next(error);
    }
  }

  async updateReservationStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, cancelReason } = req.body;
      const updated = await reservationService.updateReservationStatus(
        req.user!.userId,
        id as string,
        status,
        cancelReason
      );
      return sendSuccess(res, updated, `Reservation status updated to ${status}`);
    } catch (error) {
      next(error);
    }
  }
}

export const reservationController = new ReservationController();
