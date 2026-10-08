import prisma from '../config/prisma.js';

export interface AvailabilityParams {
  productId?: string;
  query?: string;
}

export interface AvailabilityResult {
  found: boolean;
  product?: {
    id: string;
    name: string;
    price: number;
    discountedPrice: number;
    availableQuantity: number;
    reservedQuantity: number;
    totalQuantity: number;
    inStock: boolean;
    primaryImage: string;
    shop: {
      id: string;
      name: string;
      city: string;
      address: string;
      mallName?: string;
      floorName?: string;
      shopNumber?: string;
      nearbyLandmark?: string;
      indoorDirections?: string;
      phone: string;
      openingHours: string;
    };
  };
  policyNotice: string;
}

export async function checkAvailability(params: AvailabilityParams): Promise<AvailabilityResult> {
  const where: any = { isActive: true };

  if (params.productId) {
    where.id = params.productId;
  } else if (params.query) {
    where.OR = [
      { name: { contains: params.query.trim(), mode: 'insensitive' } },
      { slug: { contains: params.query.trim(), mode: 'insensitive' } },
    ];
  } else {
    return {
      found: false,
      policyNotice: 'Please provide a product name or ID to check real-time stock availability.',
    };
  }

  const product = await prisma.product.findFirst({
    where,
    include: {
      images: {
        orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }],
        take: 1,
      },
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
    return {
      found: false,
      policyNotice: 'This product was not found in SnapDrag inventory.',
    };
  }

  const primaryImage =
    product.images[0]?.url || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600';

  return {
    found: true,
    product: {
      id: product.id,
      name: product.name,
      price: product.price,
      discountedPrice: product.discountedPrice,
      availableQuantity: product.availableQuantity,
      reservedQuantity: product.reservedQuantity,
      totalQuantity: product.totalQuantity,
      inStock: product.availableQuantity > 0,
      primaryImage,
      shop: {
        id: product.shop.id,
        name: product.shop.name,
        city: product.shop.location?.city || 'Local Store',
        address: product.shop.location?.address || '',
        mallName: product.shop.location?.mall?.name,
        floorName: product.shop.location?.floorName || product.shop.location?.floor?.floorName || undefined,
        shopNumber: product.shop.location?.shopNumber || undefined,
        nearbyLandmark: product.shop.location?.nearbyLandmark || undefined,
        indoorDirections: product.shop.location?.indoorDirections || undefined,
        phone: product.shop.phone,
        openingHours: product.shop.openingHours || '10:00 AM - 9:00 PM',
      },
    },
    policyNotice:
      product.availableQuantity > 0
        ? `In stock (${product.availableQuantity} units available). You can place a 100% free 48-hour hold to visit ${product.shop.name} in person without paying online.`
        : 'Currently out of stock for hold at this boutique.',
  };
}
