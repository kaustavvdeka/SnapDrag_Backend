import prisma from '../config/prisma.js';
import { Prisma } from '@prisma/client';

export interface ShopSearchParams {
  query?: string;
  city?: string;
  mallName?: string;
  limit?: number;
}

export interface AssistantShopSummary {
  id: string;
  name: string;
  slug: string;
  description: string;
  rating: number;
  reviewCount: number;
  phone: string;
  openingHours: string;
  city: string;
  address: string;
  mallName?: string;
  floorName?: string;
  shopNumber?: string;
  section?: string;
  nearbyLandmark?: string;
  indoorDirections?: string;
  productCount: number;
}

export async function searchShops(params: ShopSearchParams): Promise<AssistantShopSummary[]> {
  const limit = Math.min(params.limit || 5, 10);

  const where: Prisma.ShopWhereInput = {
    isActive: true,
    isApproved: true,
  };

  if (params.query && params.query.trim()) {
    const q = params.query.trim();
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (params.city || params.mallName) {
    where.location = {
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

  const shops = await prisma.shop.findMany({
    where,
    take: limit,
    orderBy: { rating: 'desc' },
    include: {
      location: {
        include: {
          mall: true,
          floor: true,
        },
      },
      _count: {
        select: {
          products: { where: { isActive: true } },
        },
      },
    },
  });

  return shops.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    description: s.description || '',
    rating: s.rating,
    reviewCount: s.reviewCount,
    phone: s.phone,
    openingHours: s.openingHours || '10:00 AM - 9:00 PM',
    city: s.location?.city || 'Local Store',
    address: s.location?.address || '',
    mallName: s.location?.mall?.name || undefined,
    floorName: s.location?.floorName || s.location?.floor?.floorName || undefined,
    shopNumber: s.location?.shopNumber || undefined,
    section: s.location?.section || undefined,
    nearbyLandmark: s.location?.nearbyLandmark || undefined,
    indoorDirections: s.location?.indoorDirections || undefined,
    productCount: s._count.products,
  }));
}
