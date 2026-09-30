import { Request, Response, NextFunction } from 'express';
import { productService } from '../services/productService.js';
import { sendSuccess } from '../utils/apiResponse.js';

export class ProductController {
  async listProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await productService.listProducts(req.query as any);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getProductById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const trackView = {
        ip: req.ip || (req.headers['x-forwarded-for'] as string),
        userAgent: req.headers['user-agent'],
      };
      const product = await productService.getProductById(id as string, trackView);
      return sendSuccess(res, product);
    } catch (error) {
      next(error);
    }
  }

  async getFeaturedProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const products = await productService.getFeaturedProducts();
      return sendSuccess(res, products);
    } catch (error) {
      next(error);
    }
  }

  async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.createProduct(req.user!.userId, req.body);
      return sendSuccess(res, product, 'Product created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const product = await productService.updateProduct(req.user!.userId, id as string, req.body);
      return sendSuccess(res, product, 'Product updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await productService.deleteProduct(req.user!.userId, id as string);
      return sendSuccess(res, null, 'Product deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const productController = new ProductController();
