import prisma from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateSku } from '../utils/codeGenerator.js';
import { Prisma } from '@prisma/client';

export interface ProductFilters {
  query?: string;
  category?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  color?: string;
  material?: string;
  inStockOnly?: boolean;
  shopId?: string;
  mallId?: string;
  sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'popular';
  page?: number;
  limit?: number;
}

export class ProductService {
  async listProducts(filters: ProductFilters) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const shopWhere: Prisma.ShopWhereInput = {
      isActive: true,
    };

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      shop: shopWhere,
    };

    // Parse natural language hints if query is provided
    let queryText = filters.query?.trim() || '';
    let parsedMaxPrice = filters.maxPrice;

    if (queryText) {
      // Check for price patterns like "under 5000" or "below 8000"
      const priceMatch = queryText.match(/(?:under|below|less than)\s*(?:rs\.?|inr|₹)?\s*(\d+)/i);
      if (priceMatch) {
        parsedMaxPrice = Number(priceMatch[1]);
        // Remove the "under X" part from the query text for better text matching
        queryText = queryText.replace(priceMatch[0], '').trim();
      }

      if (queryText) {
        where.OR = [
          { name: { contains: queryText, mode: 'insensitive' } },
          { description: { contains: queryText, mode: 'insensitive' } },
          { material: { contains: queryText, mode: 'insensitive' } },
          { color: { contains: queryText, mode: 'insensitive' } },
          { tags: { hasSome: [queryText.toLowerCase()] } },
          { category: { name: { contains: queryText, mode: 'insensitive' } } },
          { shop: { name: { contains: queryText, mode: 'insensitive' } } },
        ];
      }
    }

    if (filters.category) {
      where.category = {
        slug: { equals: filters.category, mode: 'insensitive' },
      };
    }

    if (filters.city || filters.mallId) {
      shopWhere.location = {
        is: {
          ...(filters.city ? { city: { equals: filters.city, mode: 'insensitive' } } : {}),
          ...(filters.mallId ? { mallId: filters.mallId } : {}),
        },
      };
    }

    if (filters.shopId) {
      where.shopId = filters.shopId;
    }

    if (filters.minPrice !== undefined || parsedMaxPrice !== undefined) {
      where.discountedPrice = {};
      if (filters.minPrice !== undefined) {
        where.discountedPrice.gte = filters.minPrice;
      }
      if (parsedMaxPrice !== undefined) {
        where.discountedPrice.lte = parsedMaxPrice;
      }
    }

    if (filters.color) {
      where.color = { contains: filters.color, mode: 'insensitive' };
    }

    if (filters.material) {
      where.material = { contains: filters.material, mode: 'insensitive' };
    }

    if (filters.inStockOnly) {
      where.availableQuantity = { gt: 0 };
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    if (filters.sortBy === 'price_asc') {
      orderBy = { discountedPrice: 'asc' };
    } else if (filters.sortBy === 'price_desc') {
      orderBy = { discountedPrice: 'desc' };
    } else if (filters.sortBy === 'popular') {
      orderBy = { soldQuantity: 'desc' };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          images: {
            orderBy: { order: 'asc' },
          },
          category: {
            select: { id: true, name: true, slug: true },
          },
          shop: {
            select: {
              id: true,
              name: true,
              slug: true,
              rating: true,
              reviewCount: true,
              phone: true,
              location: {
                select: {
                  city: true,
                  state: true,
                  address: true,
                  mallId: true,
                  floorName: true,
                  shopNumber: true,
                  nearbyLandmark: true,
                  latitude: true,
                  longitude: true,
                  mall: {
                    select: { id: true, name: true },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProductById(id: string, trackView?: { ip?: string; userAgent?: string }) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: { order: 'asc' },
        },
        category: true,
        shop: {
          include: {
            location: {
              include: {
                mall: true,
                floor: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    if (trackView && (trackView.ip || trackView.userAgent)) {
      // Fire-and-forget product view tracking
      prisma.productView
        .create({
          data: {
            productId: id,
            ipAddress: trackView.ip,
            userAgent: trackView.userAgent,
          },
        })
        .catch(console.error);
    }

    return product;
  }

  async createProduct(shopkeeperUserId: string, data: any) {
    const shop = await prisma.shop.findFirst({
      where: { ownerId: shopkeeperUserId },
    });

    if (!shop) {
      throw new AppError('Shop not found for this user. Please register your shop first.', 404, 'SHOP_NOT_FOUND');
    }

    const discountPercent = data.discountPercent || 0;
    const discountedPrice = Math.round(data.price * (1 - discountPercent / 100));
    const sku = data.sku || generateSku('SD');
    const slug = `${data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-4)}`;

    const product = await prisma.product.create({
      data: {
        sku,
        name: data.name,
        slug,
        description: data.description,
        price: data.price,
        discountPercent,
        discountedPrice,
        shopId: shop.id,
        categoryId: data.categoryId,
        material: data.material,
        color: data.color,
        size: data.size || 'Free Size',
        totalQuantity: data.totalQuantity,
        availableQuantity: data.totalQuantity,
        reservedQuantity: 0,
        soldQuantity: 0,
        tags: data.tags || [],
        images: {
          create: data.images.map((url: string, index: number) => ({
            url,
            isPrimary: index === 0,
            order: index,
          })),
        },
      },
      include: {
        images: true,
        category: true,
        shop: true,
      },
    });

    return product;
  }

  async updateProduct(shopkeeperUserId: string, productId: string, data: any) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { shop: true },
    });

    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    if (product.shop.ownerId !== shopkeeperUserId) {
      throw new AppError('Unauthorized: You can only edit products belonging to your shop', 403, 'FORBIDDEN');
    }

    let discountedPrice = product.discountedPrice;
    const price = data.price !== undefined ? data.price : product.price;
    const discountPercent = data.discountPercent !== undefined ? data.discountPercent : product.discountPercent;
    discountedPrice = Math.round(price * (1 - discountPercent / 100));

    // Handle quantity update
    let availableQuantity = product.availableQuantity;
    if (data.totalQuantity !== undefined) {
      const diff = data.totalQuantity - product.totalQuantity;
      availableQuantity = Math.max(0, product.availableQuantity + diff);
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        name: data.name,
        description: data.description,
        price,
        discountPercent,
        discountedPrice,
        categoryId: data.categoryId,
        material: data.material,
        color: data.color,
        size: data.size,
        totalQuantity: data.totalQuantity,
        availableQuantity,
        isActive: data.isActive,
        tags: data.tags,
      },
      include: {
        images: true,
        category: true,
      },
    });

    return updated;
  }

  async deleteProduct(shopkeeperUserId: string, productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { shop: true },
    });

    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    if (product.shop.ownerId !== shopkeeperUserId) {
      throw new AppError('Unauthorized to delete this product', 403, 'FORBIDDEN');
    }

    // Soft delete or cascade delete if no active reservations
    const activeReservations = await prisma.reservation.count({
      where: {
        productId,
        status: { in: ['PENDING', 'CONFIRMED', 'READY_FOR_VISIT'] },
      },
    });

    if (activeReservations > 0) {
      throw new AppError(
        'Cannot delete product with active reservations. Please complete or cancel reservations first.',
        400,
        'ACTIVE_RESERVATIONS_EXIST'
      );
    }

    await prisma.product.delete({
      where: { id: productId },
    });

    return true;
  }

  async getFeaturedProducts() {
    return prisma.product.findMany({
      where: {
        isFeatured: true,
        isActive: true,
        availableQuantity: { gt: 0 },
      },
      take: 8,
      include: {
        images: true,
        category: true,
        shop: {
          include: {
            location: true,
          },
        },
      },
    });
  }
}

export const productService = new ProductService();
