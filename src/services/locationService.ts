import prisma from '../config/prisma.js';

export class LocationService {
  async getCities() {
    const locations = await prisma.shopLocation.findMany({
      select: { city: true, state: true },
      distinct: ['city'],
    });

    const counts = await prisma.shopLocation.groupBy({
      by: ['city'],
      _count: {
        shopId: true,
      },
    });

    return locations.map(loc => {
      const match = counts.find(c => c.city.toLowerCase() === loc.city.toLowerCase());
      return {
        city: loc.city,
        state: loc.state,
        shopCount: match?._count.shopId || 0,
      };
    });
  }

  async getMalls(city?: string) {
    const where: any = {};
    if (city) {
      where.city = { equals: city, mode: 'insensitive' };
    }

    return prisma.mall.findMany({
      where,
      include: {
        floors: {
          orderBy: { floorNumber: 'asc' },
        },
        _count: {
          select: { shops: true },
        },
      },
    });
  }

  async getMallById(mallId: string) {
    return prisma.mall.findUnique({
      where: { id: mallId },
      include: {
        floors: true,
        shops: {
          include: {
            shop: {
              include: {
                _count: { select: { products: true } },
              },
            },
          },
        },
      },
    });
  }
}

export const locationService = new LocationService();
