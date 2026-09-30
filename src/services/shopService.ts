import prisma from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export class ShopService {
  async listShops(query: { city?: string; search?: string; mallId?: string; isApproved?: boolean }) {
    const where: any = {
      isActive: true,
    };

    if (query.isApproved !== undefined) {
      where.isApproved = query.isApproved;
    } else {
      where.isApproved = true; // default public only sees approved
    }

    if (query.city) {
      where.location = {
        city: { equals: query.city, mode: 'insensitive' },
      };
    }

    if (query.mallId) {
      where.location = {
        ...where.location,
        mallId: query.mallId,
      };
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return prisma.shop.findMany({
      where,
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
            products: true,
          },
        },
      },
    });
  }

  async getShopById(idOrSlug: string, trackView?: { ip?: string; userAgent?: string }) {
    const shop = await prisma.shop.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        location: {
          include: {
            mall: {
              include: {
                floors: true,
              },
            },
            floor: true,
          },
        },
        products: {
          where: { isActive: true },
          include: {
            images: { take: 1 },
            category: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            products: true,
            reservations: true,
            reviews: true,
          },
        },
      },
    });

    if (!shop) {
      throw new AppError('Shop not found', 404, 'SHOP_NOT_FOUND');
    }

    if (trackView && (trackView.ip || trackView.userAgent)) {
      prisma.shopView
        .create({
          data: {
            shopId: shop.id,
            ipAddress: trackView.ip,
            userAgent: trackView.userAgent,
          },
        })
        .catch(console.error);
    }

    return shop;
  }

  async createShop(ownerId: string, data: any) {
    const existing = await prisma.shop.findFirst({
      where: { ownerId },
    });

    if (existing) {
      throw new AppError('You already have a registered shop on this account', 400, 'SHOP_ALREADY_EXISTS');
    }

    const slug = `${data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-4)}`;

    const shop = await prisma.shop.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        phone: data.phone,
        email: data.email,
        openingHours: data.openingHours || '10:00 AM - 9:00 PM',
        logoUrl: data.logoUrl,
        bannerUrl: data.bannerUrl,
        isApproved: false, // Pending admin review
        ownerId,
        location: {
          create: {
            address: data.address,
            city: data.city,
            state: data.state,
            pincode: data.pincode,
            country: data.country || 'India',
            latitude: data.latitude,
            longitude: data.longitude,
            mallId: data.mallId || null,
            floorName: data.floorName || data.floorNumber || null,
            shopNumber: data.shopNumber || null,
            section: data.section || null,
            nearbyLandmark: data.nearbyLandmark || null,
            indoorDirections: data.indoorDirections || null,
          },
        },
      },
      include: {
        location: {
          include: { mall: true },
        },
      },
    });

    return shop;
  }

  async updateShop(ownerId: string, shopId: string, data: any) {
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      include: { location: true },
    });

    if (!shop) {
      throw new AppError('Shop not found', 404, 'SHOP_NOT_FOUND');
    }

    if (shop.ownerId !== ownerId) {
      throw new AppError('Unauthorized to update this shop', 403, 'FORBIDDEN');
    }

    const updated = await prisma.shop.update({
      where: { id: shopId },
      data: {
        name: data.name,
        description: data.description,
        phone: data.phone,
        email: data.email,
        openingHours: data.openingHours,
        logoUrl: data.logoUrl,
        bannerUrl: data.bannerUrl,
        location: {
          upsert: {
            create: {
              address: data.address || '',
              city: data.city || '',
              state: data.state || '',
              pincode: data.pincode || '',
              country: data.country || 'India',
              latitude: data.latitude || 0,
              longitude: data.longitude || 0,
              mallId: data.mallId || null,
              floorName: data.floorName || null,
              shopNumber: data.shopNumber || null,
              section: data.section || null,
              nearbyLandmark: data.nearbyLandmark || null,
              indoorDirections: data.indoorDirections || null,
            },
            update: {
              address: data.address,
              city: data.city,
              state: data.state,
              pincode: data.pincode,
              latitude: data.latitude,
              longitude: data.longitude,
              mallId: data.mallId,
              floorName: data.floorName,
              shopNumber: data.shopNumber,
              section: data.section,
              nearbyLandmark: data.nearbyLandmark,
              indoorDirections: data.indoorDirections,
            },
          },
        },
      },
      include: {
        location: {
          include: { mall: true },
        },
      },
    });

    return updated;
  }

  async getShopkeeperDashboardStats(shopkeeperUserId: string) {
    const shop = await prisma.shop.findFirst({
      where: { ownerId: shopkeeperUserId },
      include: {
        products: true,
        reservations: true,
      },
    });

    if (!shop) {
      throw new AppError('Shop not found for this user', 404, 'SHOP_NOT_FOUND');
    }

    const totalProducts = shop.products.length;
    const availableProducts = shop.products.filter(p => p.availableQuantity > 0).length;
    const lowStockProducts = shop.products.filter(p => p.availableQuantity > 0 && p.availableQuantity <= 2).length;
    const outOfStockProducts = shop.products.filter(p => p.availableQuantity === 0).length;

    const totalReservations = shop.reservations.length;
    const pendingReservations = shop.reservations.filter(r => r.status === 'PENDING').length;
    const confirmedReservations = shop.reservations.filter(r => r.status === 'CONFIRMED' || r.status === 'READY_FOR_VISIT').length;
    const completedReservations = shop.reservations.filter(r => r.status === 'COMPLETED').length;

    const totalViews = await prisma.shopView.count({ where: { shopId: shop.id } });
    const productViews = await prisma.productView.count({
      where: { product: { shopId: shop.id } },
    });

    // Recent 7 days reservations activity
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentReservations = await prisma.reservation.findMany({
      where: {
        shopId: shop.id,
        createdAt: { gte: sevenDaysAgo },
      },
      include: {
        product: { select: { name: true, discountedPrice: true } },
        customer: { select: { name: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    return {
      shop,
      stats: {
        totalProducts,
        availableProducts,
        lowStockProducts,
        outOfStockProducts,
        totalReservations,
        pendingReservations,
        confirmedReservations,
        completedReservations,
        totalViews,
        productViews,
      },
      recentReservations,
    };
  }
}

export const shopService = new ShopService();
