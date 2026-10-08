import prisma from '../config/prisma.js';
import { AssistantProductSummary } from './productSearch.tool.js';

export interface RecommendationParams {
  productId?: string;
  category?: string;
  occasion?: string;
  city?: string;
  maxPrice?: number;
  limit?: number;
}

export async function getRecommendations(params: RecommendationParams): Promise<AssistantProductSummary[]> {
  const limit = Math.min(params.limit || 4, 8);
  const where: any = {
    isActive: true,
    availableQuantity: { gt: 0 },
  };

  if (params.city) {
    where.shop = {
      location: {
        is: {
          city: { equals: params.city.trim(), mode: 'insensitive' },
        },
      },
    };
  }

  if (params.maxPrice) {
    where.discountedPrice = { lte: Number(params.maxPrice) };
  }

  if (params.productId) {
    // Find reference product to find matches
    const ref = await prisma.product.findUnique({
      where: { id: params.productId },
      select: { categoryId: true, material: true, color: true },
    });

    if (ref) {
      where.id = { not: params.productId };
      where.OR = [
        { categoryId: ref.categoryId },
        { material: { contains: ref.material, mode: 'insensitive' } },
        { color: { contains: ref.color, mode: 'insensitive' } },
      ];
    }
  } else if (params.occasion) {
    const occ = params.occasion.toLowerCase();
    if (occ.includes('wedding') || occ.includes('bridal') || occ.includes('reception')) {
      where.OR = [
        { category: { slug: { in: ['wedding-wear', 'lehenga-ghagra', 'sarees'] } } },
        { tags: { hasSome: ['wedding', 'bridal', 'zardozi', 'silk'] } },
      ];
    } else if (occ.includes('festival') || occ.includes('bihu') || occ.includes('puja')) {
      where.OR = [
        { category: { slug: { in: ['festival-wear', 'mekhela-chador', 'sarees'] } } },
        { tags: { hasSome: ['festival', 'bihu', 'handloom', 'festive'] } },
      ];
    }
  } else if (params.category) {
    where.category = {
      OR: [
        { slug: { contains: params.category.toLowerCase(), mode: 'insensitive' } },
        { name: { contains: params.category, mode: 'insensitive' } },
      ],
    };
  }

  const products = await prisma.product.findMany({
    where,
    take: limit,
    orderBy: [{ isFeatured: 'desc' }, { soldQuantity: 'desc' }],
    include: {
      images: {
        orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }],
        take: 1,
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

  return products.map((p) => ({
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
    primaryImage:
      p.images[0]?.url || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600',
    categoryName: p.category?.name || 'Traditional Handlooms',
    categorySlug: p.category?.slug || '',
    shop: {
      id: p.shop.id,
      name: p.shop.name,
      slug: p.shop.slug,
      rating: p.shop.rating,
      phone: p.shop.phone,
      city: p.shop.location?.city || 'Local Area',
      address: p.shop.location?.address || '',
      mallName: p.shop.location?.mall?.name || undefined,
      floorName: p.shop.location?.floorName || p.shop.location?.floor?.floorName || undefined,
      shopNumber: p.shop.location?.shopNumber || undefined,
    },
  }));
}
