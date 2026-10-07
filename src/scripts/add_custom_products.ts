import path from 'path';
import fs from 'fs';
import prisma from '../config/prisma.js';
import { storageService } from '../storage/storageService.js';
import { IMAGE_UPLOAD_DIR } from '../config/constants.js';

async function main() {
  console.log('🌱 Uploading 2 product images to Cloudinary / Storage Provider and updating database...');

  // Find a shop to attach the products to
  let shop = await prisma.shop.findFirst();
  if (!shop) {
    console.error('No existing shop found in database.');
    process.exit(1);
  }

  // Find or create category for Dress
  let dressCategory = await prisma.category.findFirst({
    where: { OR: [{ slug: 'dresses' }, { slug: 'one-pieces' }, { slug: 'sarees' }, { slug: 'mekhela-chador' }] },
  });

  if (!dressCategory) {
    dressCategory = await prisma.category.create({
      data: {
        name: 'Dresses & One-Pieces',
        slug: 'dresses',
        description: 'Elegant one-piece ethnic and contemporary dresses.',
        displayOrder: 10,
      },
    });
  }

  // Find or create category for Tops / Jersey
  let topsCategory = await prisma.category.findFirst({
    where: { OR: [{ slug: 'tops' }, { slug: 't-shirts' }, { slug: 'kurta-pajama' }, { slug: 'indo-western' }] },
  });

  if (!topsCategory) {
    topsCategory = await prisma.category.create({
      data: {
        name: 'Tops & Jerseys',
        slug: 'tops',
        description: 'Casual and sportswear tops, jerseys, and blouses.',
        displayOrder: 11,
      },
    });
  }

  // Prepare multer-like file object for image2.png
  const image2Path = path.resolve(process.cwd(), IMAGE_UPLOAD_DIR, 'image2.png');
  let image2Url = '/uploads/image2.png';

  if (fs.existsSync(image2Path)) {
    const mockFile2: Express.Multer.File = {
      fieldname: 'image',
      originalname: 'image2.png',
      encoding: '7bit',
      mimetype: 'image/png',
      size: fs.statSync(image2Path).size,
      destination: path.dirname(image2Path),
      filename: 'image2.png',
      path: image2Path,
      buffer: Buffer.from([]),
      stream: null as any,
    };

    console.log('☁️ Uploading image2.png to storage provider...');
    const result2 = await storageService.uploadImage(mockFile2);
    image2Url = result2.url;
    console.log('✅ Image 2 URL:', image2Url);
  }

  // Prepare multer-like file object for image3.png
  const image3Path = path.resolve(process.cwd(), IMAGE_UPLOAD_DIR, 'image3.png');
  let image3Url = '/uploads/image3.png';

  if (fs.existsSync(image3Path)) {
    const mockFile3: Express.Multer.File = {
      fieldname: 'image',
      originalname: 'image3.png',
      encoding: '7bit',
      mimetype: 'image/png',
      size: fs.statSync(image3Path).size,
      destination: path.dirname(image3Path),
      filename: 'image3.png',
      path: image3Path,
      buffer: Buffer.from([]),
      stream: null as any,
    };

    console.log('☁️ Uploading image3.png to storage provider...');
    const result3 = await storageService.uploadImage(mockFile3);
    image3Url = result3.url;
    console.log('✅ Image 3 URL:', image3Url);
  }

  // Create Product 1
  const product1Sku = `DRS-EMERALD-${Date.now()}`;
  const product1 = await prisma.product.create({
    data: {
      sku: product1Sku,
      name: 'Emerald Green Botanical Floral Midi Dress',
      slug: `emerald-green-botanical-floral-midi-dress-${Date.now()}`,
      description: 'Hand-tailored vintage botanical floral dress in emerald green with pleated flare skirt and quarter sleeves. Flat-lay studio photography, 100% pure organic cotton linen blend.',
      price: 3999,
      discountPercent: 15,
      discountedPrice: 3399,
      shopId: shop.id,
      categoryId: dressCategory.id,
      material: 'Organic Cotton-Linen Blend',
      color: 'Emerald Green & Ivory',
      size: 'Medium (M)',
      totalQuantity: 10,
      availableQuantity: 10,
      isFeatured: true,
      tags: ['flat-lay', 'dress', 'green', 'floral', 'botanical'],
      images: {
        create: [
          {
            url: image2Url,
            altText: 'Emerald Green Botanical Floral Midi Dress Flat Lay',
            isPrimary: true,
            order: 0,
          },
        ],
      },
    },
    include: { images: true },
  });

  console.log('🎉 Created Product 1:', product1.name);
  console.log('   ID:', product1.id);
  console.log('   Image URL in DB:', product1.images[0]?.url);

  // Create Product 2
  const product2Sku = `TSH-BRAZIL-${Date.now()}`;
  const product2 = await prisma.product.create({
    data: {
      sku: product2Sku,
      name: 'Brazil National Football Team Jersey #10',
      slug: `brazil-national-football-team-jersey-10-${Date.now()}`,
      description: 'Iconic Canary Yellow Brazil #10 team jersey with green collar trim and CBF crest emblem. Lightweight Dri-FIT performance mesh fabric.',
      price: 2499,
      discountPercent: 20,
      discountedPrice: 1999,
      shopId: shop.id,
      categoryId: topsCategory.id,
      material: 'Dri-FIT Breathable Mesh',
      color: 'Canary Yellow & Emerald Green',
      size: 'Large (L)',
      totalQuantity: 15,
      availableQuantity: 15,
      isFeatured: true,
      tags: ['flat-lay', 'top', 'jersey', 'yellow', 'brazil'],
      images: {
        create: [
          {
            url: image3Url,
            altText: 'Brazil National Football Team Jersey #10 Flat Lay',
            isPrimary: true,
            order: 0,
          },
        ],
      },
    },
    include: { images: true },
  });

  console.log('🎉 Created Product 2:', product2.name);
  console.log('   ID:', product2.id);
  console.log('   Image URL in DB:', product2.images[0]?.url);
}

main()
  .catch((e) => {
    console.error('Error uploading product images:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
