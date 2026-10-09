import prisma from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { NotificationType } from '@prisma/client';

export class AdminService {
  async getPlatformStats() {
    const [
      totalUsers,
      totalCustomers,
      totalShopkeepers,
      totalShops,
      activeShops,
      pendingShops,
      totalProducts,
      totalReservations,
      completedReservations,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.user.count({ where: { role: 'SHOPKEEPER' } }),
      prisma.shop.count(),
      prisma.shop.count({ where: { isActive: true, isApproved: true } }),
      prisma.shop.count({ where: { isApproved: false } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.reservation.count(),
      prisma.reservation.count({ where: { status: 'COMPLETED' } }),
    ]);

    return {
      totalUsers,
      totalCustomers,
      totalShopkeepers,
      totalShops,
      activeShops,
      pendingShops,
      totalProducts,
      totalReservations,
      completedReservations,
    };
  }

  async getPendingShops() {
    return prisma.shop.findMany({
      where: { isApproved: false },
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true } },
        location: { include: { mall: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateShopApproval(shopId: string, approve: boolean) {
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      include: { owner: true },
    });

    if (!shop) {
      throw new AppError('Shop not found', 404, 'SHOP_NOT_FOUND');
    }

    const updated = await prisma.shop.update({
      where: { id: shopId },
      data: {
        isApproved: approve,
        isActive: approve,
      },
    });

    // Notify shopkeeper
    await prisma.notification.create({
      data: {
        userId: shop.ownerId,
        title: approve ? 'Shop Approved! 🎉' : 'Shop Approval Request Declined',
        message: approve
          ? `Congratulations! Your shop "${shop.name}" is now live on Vastrix.`
          : `Your shop registration for "${shop.name}" was not approved. Please verify your details.`,
        type: NotificationType.SHOP_APPROVAL,
        link: '/dashboard',
      },
    });

    return updated;
  }

  async getAllUsers() {
    return prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { shops: true, reservations: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async toggleUserStatus(userId: string, isActive: boolean) {
    return prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });
  }

  async getAllShops() {
    return prisma.shop.findMany({
      include: {
        owner: { select: { name: true, email: true, phone: true } },
        location: { include: { mall: true } },
        _count: { select: { products: true, reservations: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllProducts() {
    return prisma.product.findMany({
      include: {
        category: true,
        shop: { select: { name: true, location: true } },
        images: { take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async toggleProductStatus(productId: string, isActive: boolean) {
    return prisma.product.update({
      where: { id: productId },
      data: { isActive },
    });
  }

  async createCategory(data: { name: string; description?: string; imageUrl?: string }) {
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return prisma.category.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        imageUrl: data.imageUrl,
      },
    });
  }
}

export const adminService = new AdminService();
