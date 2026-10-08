import prisma from '../config/prisma.js';
import { Prisma } from '@prisma/client';

export interface ProductSearchParams {
  query?: string;
  category?: string;
  material?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  mallName?: string;
  inStockOnly?: boolean;
  limit?: number;
}

export interface AssistantProductSummary {
  id: string;
  name: string;
  slug: string;
  price: number;
  discountedPrice: number;
  discountPercent: number;
  material: string;
  color: string;
  size: string;
  availableQuantity: number;
  inStock: boolean;
  primaryImage: string;
  categoryName: string;
  categorySlug: string;
  shop: {
    id: string;
    name: string;
    slug: string;
    rating: number;
    phone: string;
    city: string;
    address: string;
    mallName?: string;
    floorName?: string;
    shopNumber?: string;
  };
}

export async function searchProducts(params: ProductSearchParams): Promise<AssistantProductSummary[]> {
  const limit = Math.min(params.limit || 6, 12);

  const shopWhere: Prisma.ShopWhereInput = {
    isActive: true,
  };

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    shop: shopWhere,
  };

  // 1. Text Query Filter
  if (params.query && params.query.trim()) {
    const q = params.query.trim();
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { material: { contains: q, mode: 'insensitive' } },
      { color: { contains: q, mode: 'insensitive' } },
      { tags: { hasSome: [q.toLowerCase()] } },
      { category: { name: { contains: q, mode: 'insensitive' } } },
      { category: { slug: { contains: q, mode: 'insensitive' } } },
    ];
  }

  // 2. Category Filter
  if (params.category && params.category.trim()) {
    const cat = params.category.trim();
    where.category = {
      OR: [
        { slug: { contains: cat.toLowerCase(), mode: 'insensitive' } },
        { name: { contains: cat, mode: 'insensitive' } },
      ],
    };
  }

  // 3. Material & Color Filter
  if (params.material && params.material.trim()) {
    where.material = { contains: params.material.trim(), mode: 'insensitive' };
  }
  if (params.color && params.color.trim()) {
    where.color = { contains: params.color.trim(), mode: 'insensitive' };
  }

  // 4. Price Filter
  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    where.discountedPrice = {};
    if (params.minPrice !== undefined) {
      where.discountedPrice.gte = Number(params.minPrice);
    }
    if (params.maxPrice !== undefined) {
      where.discountedPrice.lte = Number(params.maxPrice);
    }
  }

  // 5. In-Stock Filter (default true for shopping assistant recommendations)
  if (params.inStockOnly !== false) {
    where.availableQuantity = { gt: 0 };
  }

  // 6. Location / Mall Filter
  if (params.city || params.mallName) {
    shopWhere.location = {
      is: {
        ...(params.city ? { city: { equals: params.city.trim(), mode: 'insensitive' } } : {}),
        ...(params.mallName
          ? {
              mall: {
                name: { contains: params.mallName.trim(), mode: 'insensitive' },
              },
            }
          : {}),
      },
    };
  }

  const products = await prisma.product.findMany({
    where,
    take: limit,
    orderBy: [{ isFeatured: 'desc' }, { discountedPrice: 'asc' }],
    include: {
      images: {
        orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }],
        take: 2,
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

  return products.map((p) => {
    const primaryImg =
      p.images.find((img) => img.isPrimary)?.url ||
      p.images[0]?.url ||
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600';

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      discountedPrice: p.discountedPrice,
      discountPercent: p.discountPercent,
      material: p.material,
      color: p.color,
      size: p.size,
      availableQuantity: p.availableQuantity,
      inStock: p.availableQuantity > 0,
      primaryImage: primaryImg,
      categoryName: p.category?.name || 'Traditional Wear',
      categorySlug: p.category?.slug || '',
      shop: {
        id: p.shop.id,
        name: p.shop.name,
        slug: p.shop.slug,
        rating: p.shop.rating,
        phone: p.shop.phone,
        city: p.shop.location?.city || 'Local Store',
        address: p.shop.location?.address || '',
        mallName: p.shop.location?.mall?.name || undefined,
        floorName: p.shop.location?.floorName || p.shop.location?.floor?.floorName || undefined,
        shopNumber: p.shop.location?.shopNumber || undefined,
      },
    };
  });
}
