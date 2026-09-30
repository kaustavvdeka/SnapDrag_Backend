import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(3, 'Product name must be at least 3 characters'),
  sku: z.string().optional(),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.number().positive('Price must be greater than 0'),
  discountPercent: z.number().min(0).max(100).default(0),
  categoryId: z.string().uuid('Invalid category ID'),
  material: z.string().min(2, 'Material is required'),
  color: z.string().min(2, 'Color is required'),
  size: z.string().default('Free Size'),
  totalQuantity: z.number().int().min(1, 'Quantity must be at least 1'),
  tags: z.array(z.string()).default([]),
  images: z.array(z.string().url()).min(1, 'At least one product image is required'),
});

export const updateProductSchema = createProductSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const productQuerySchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  city: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  color: z.string().optional(),
  material: z.string().optional(),
  inStockOnly: z.coerce.boolean().optional(),
  shopId: z.string().optional(),
  mallId: z.string().optional(),
  sortBy: z.enum(['newest', 'price_asc', 'price_desc', 'popular']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
