import { Request, Response, NextFunction } from 'express';
import { locationService } from '../services/locationService.js';
import { sendSuccess } from '../utils/apiResponse.js';

export class LocationController {
  async getCities(req: Request, res: Response, next: NextFunction) {
    try {
      const cities = await locationService.getCities();
      return sendSuccess(res, cities);
    } catch (error) {
      next(error);
    }
  }

  async getMalls(req: Request, res: Response, next: NextFunction) {
    try {
      const { city } = req.query;
      const malls = await locationService.getMalls(city as string);
      return sendSuccess(res, malls);
    } catch (error) {
      next(error);
    }
  }

  async getMallById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const mall = await locationService.getMallById(id as string);
      return sendSuccess(res, mall);
    } catch (error) {
      next(error);
    }
  }
}

export const locationController = new LocationController();
