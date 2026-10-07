import path from 'path';
import fs from 'fs';
import prisma from '../config/prisma.js';
import { storageService } from '../storage/storageService.js';
import { IMAGE_UPLOAD_DIR } from '../config/constants.js';

async function main() {
  console.log('🌱 Processing uploaded image for new product insertion...');

  const userUploadedPath = '/Users/kaustavmanideka/.gemini/antigravity-ide/brain/abf4ad79-c139-46db-93e6-775940b19c1a/.user_uploaded/media_1791364208932.jpg';

  if (!fs.existsSync(userUploadedPath)) {
    console.error('Uploaded media file not found at:', userUploadedPath);
    process.exit(1);
  }

  // Copy to server uploads dir
  const targetLocalPath = path.resolve(process.cwd(), IMAGE_UPLOAD_DIR, 'image4.jpg');
  fs.copyFileSync(userUploadedPath, targetLocalPath);
  console.log('📁 Copied uploaded media to:', targetLocalPath);

  // Upload to Cloudinary via StorageService
  const mockFile: Express.Multer.File = {
    fieldname: 'image',
    originalname: 'image4.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: fs.statSync(targetLocalPath).size,
    destination: path.dirname(targetLocalPath),
    filename: 'image4.jpg',
    path: targetLocalPath,
    buffer: Buffer.from([]),
    stream: null as any,
  };

  console.log('☁️ Uploading image to Cloudinary...');
  const uploadResult = await storageService.uploadImage(mockFile);
  const cloudinaryUrl = uploadResult.url;
  console.log('✅ Cloudinary URL generated:', cloudinaryUrl);

  // Find a shop
  let shop = await prisma.shop.findFirst();
  if (!shop) {
    console.error('No existing shop found in database.');
    process.exit(1);
  }

  // Find or create category
  let category = await prisma.category.findFirst({
    where: { OR: [{ slug: 'one-pieces' }, { slug: 'dresses' }, { slug: 'mekhela-chador' }, { slug: 'sarees' }] },
  });

  if (!category) {
    category = await prisma.category.create({
      data: {
        name: 'Ethnic Lehengas & One-Pieces',
        slug: 'ethnic-lehengas',
        description: 'Traditional and festive handcrafted lehengas and chadors.',
        displayOrder: 12,
      },
    });
  }

  // Insert Product into Prisma DB
  const sku = `LHG-YELLOW-${Date.now()}`;
  const product = await prisma.product.create({
    data: {
      sku,
      name: 'Canary Yellow & Emerald Green Zari Silk Lehenga Chador Set',
      slug: `yellow-emerald-green-zari-silk-lehenga-chador-${Date.now()}`,
      description: 'Stunning flat-lay studio photo of a handcrafted Canary Yellow & Emerald Green silk lehenga chador set featuring royal blue intricate woven zari borders and matching stitched blouse. Perfect for festive celebrations.',
      price: 5999,
      discountPercent: 18,
      discountedPrice: 4899,
      shopId: shop.id,
      categoryId: category.id,
      material: 'Pure Silk with Woven Zari Border',
      color: 'Canary Yellow & Emerald Green',
      size: 'Free Size (Stitched)',
      totalQuantity: 8,
      availableQuantity: 8,
      isFeatured: true,
      tags: ['flat-lay', 'lehenga', 'chador', 'yellow', 'green', 'ethnic', 'silk'],
      images: {
        create: [
          {
            url: cloudinaryUrl,
            altText: 'Canary Yellow & Emerald Green Zari Silk Lehenga Chador Set Flat Lay',
            isPrimary: true,
            order: 0,
          },
        ],
      },
    },
    include: { images: true },
  });

  console.log('🎉 Successfully created Product in Database!');
  console.log('   Product Name:', product.name);
  console.log('   Product ID:', product.id);
  console.log('   Saved Cloudinary URL:', product.images[0]?.url);
}

main()
  .catch((e) => {
    console.error('Error creating product:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
