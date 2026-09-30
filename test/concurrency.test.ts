import { PrismaClient } from '@prisma/client';
import { reservationService } from '../src/services/reservationService.js';

const prisma = new PrismaClient();

async function testConcurrency() {
  console.log('🧪 Starting Concurrency Test: 2 customers racing for the last available item...');

  // 1. Find or create a product with availableQuantity = 1
  let testProduct = await prisma.product.findFirst({
    where: {
      availableQuantity: 1,
      isActive: true,
    },
    include: { shop: true },
  });

  if (!testProduct) {
    // If none with 1, pick any product and set its availableQuantity to 1
    const anyProduct = await prisma.product.findFirst({ where: { isActive: true } });
    if (!anyProduct) throw new Error('No product found in database');
    testProduct = await prisma.product.update({
      where: { id: anyProduct.id },
      data: { availableQuantity: 1, totalQuantity: 1, reservedQuantity: 0 },
      include: { shop: true },
    });
  }

  // 2. Fetch two different customer accounts
  const customers = await prisma.user.findMany({
    where: { role: 'CUSTOMER' },
    take: 2,
  });

  if (customers.length < 2) {
    throw new Error('Need at least 2 customer accounts for concurrency testing');
  }

  const [customerA, customerB] = customers;

  console.log(`🎯 Target Product: "${testProduct.name}" (ID: ${testProduct.id})`);
  console.log(`📦 Available Quantity Before Race: ${testProduct.availableQuantity}`);
  console.log(`👤 Customer A: ${customerA.name} (${customerA.id})`);
  console.log(`👤 Customer B: ${customerB.name} (${customerB.id})`);

  const visitDate = new Date();
  visitDate.setDate(visitDate.getDate() + 1);

  // 3. Dispatch simultaneous reservation attempts
  console.log('⚡ Launching simultaneous reservation requests...');

  const results = await Promise.allSettled([
    reservationService.createReservation(customerA.id, {
      productId: testProduct.id,
      quantity: 1,
      preferredVisitDate: visitDate,
      notes: 'Customer A race reservation',
    }),
    reservationService.createReservation(customerB.id, {
      productId: testProduct.id,
      quantity: 1,
      preferredVisitDate: visitDate,
      notes: 'Customer B race reservation',
    }),
  ]);

  const fulfilled = results.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled');
  const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');

  console.log('\n--- RESULTS ---');
  console.log(`✅ Successful Reservations: ${fulfilled.length}`);
  console.log(`❌ Rejected / Stock Out Reservations: ${rejected.length}`);

  if (fulfilled.length === 1 && rejected.length === 1) {
    console.log('🎉 PASS: Exactly 1 customer succeeded in reserving the final item!');
    console.log(`   Reservation Code: ${fulfilled[0].value.reservationCode}`);
    console.log(`   Expected Rejection Reason: ${rejected[0].reason.message}`);
  } else {
    console.error('❌ FAIL: Race condition allowed overselling or unexpected state!', {
      fulfilledCount: fulfilled.length,
      rejectedCount: rejected.length,
    });
    process.exit(1);
  }

  // Verify DB state
  const productAfter = await prisma.product.findUnique({
    where: { id: testProduct.id },
  });

  console.log(`📦 Available Quantity in DB After Race: ${productAfter?.availableQuantity} (must be 0)`);
  console.log(`📦 Reserved Quantity in DB After Race: ${productAfter?.reservedQuantity}`);

  if (productAfter?.availableQuantity === 0) {
    console.log('🔒 Database consistency verified: availableQuantity is 0, no negative stock!');
  } else {
    console.error('❌ Database state inconsistent!');
    process.exit(1);
  }

  await prisma.$disconnect();
  console.log('✨ Concurrency test passed with flying colors!\n');
}

testConcurrency().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
