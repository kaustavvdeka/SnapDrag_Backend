import prisma from '../config/prisma.js';

export class FavoriteService {
  async toggleFavorite(customerId: string, productId: string) {
    const existing = await prisma.favorite.findUnique({
      where: {
        customerId_productId: { customerId, productId },
      },
    });

    if (existing) {
      await prisma.favorite.delete({
        where: { id: existing.id },
      });
      return { isFavorited: false };
    } else {
      await prisma.favorite.create({
        data: { customerId, productId },
      });
      return { isFavorited: true };
    }
  }

  async getFavorites(customerId: string) {
    return prisma.favorite.findMany({
      where: { customerId },
      include: {
        product: {
          include: {
            images: { take: 1 },
            category: true,
            shop: {
              include: {
                location: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const favoriteService = new FavoriteService();
