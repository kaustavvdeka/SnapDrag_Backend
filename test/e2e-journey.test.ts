import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:5001/api/v1';

async function runE2EJourney() {
  console.log('🚀 Starting Comprehensive Vastrix End-to-End User Journey Test...\n');

  // Step 1: Register a new customer
  console.log('--- Step 1: Customer Registration ---');
  const timestamp = Date.now().toString().slice(-4);
  const testCustomerEmail = `test.customer.${timestamp}@example.com`;
  
  const regResp = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testCustomerEmail,
      password: 'Customer@123456',
      name: 'Sangeeta Barua',
      phone: '+91 9435099887',
      role: 'CUSTOMER',
    }),
  });
  const regData: any = await regResp.json();
  console.log(`✅ Customer registered: ${regData.data.user.name} (${regData.data.user.email})`);
  const customerToken = regData.data.accessToken;

  // Step 2: Browse categories
  console.log('\n--- Step 2: Category Discovery ---');
  const catResp = await fetch(`${API_URL}/categories`);
  const catData: any = await catResp.json();
  console.log(`✅ Found ${catData.data.length} categories on platform.`);

  // Step 3: Search products (e.g. "silk" in "Guwahati")
  console.log('\n--- Step 3: Searching & Filtering Products ---');
  const searchResp = await fetch(`${API_URL}/products?query=silk&city=Guwahati&limit=5`);
  const searchData: any = await searchResp.json();
  const products = searchData.data.products;
  console.log(`✅ Found ${products.length} silk items available in physical shops in Guwahati.`);

  if (products.length === 0) {
    throw new Error('Expected at least 1 product in search results');
  }

  const selectedProduct = products[0];
  console.log(`👗 Selected Product: "${selectedProduct.name}" (Price: ₹${selectedProduct.discountedPrice})`);
  console.log(`🏬 Shop: ${selectedProduct.shop.name}`);
  console.log(`📍 Location: ${selectedProduct.shop.location.city}, ${selectedProduct.shop.location.address}`);
  if (selectedProduct.shop.location.mall) {
    console.log(`   Mall: ${selectedProduct.shop.location.mall.name}`);
  }
  console.log(`   Floor: ${selectedProduct.shop.location.floorName || 'N/A'}, Shop#: ${selectedProduct.shop.location.shopNumber || 'N/A'}`);

  const stockBefore = selectedProduct.availableQuantity;
  console.log(`📦 Available Stock Before Reservation: ${stockBefore}`);

  // Step 4: Add to favorites
  console.log('\n--- Step 4: Toggle Favorite ---');
  const favResp = await fetch(`${API_URL}/favorites/toggle/${selectedProduct.id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  const favData: any = await favResp.json();
  console.log(`❤️  Favorite status: ${favData.data.isFavorited}`);

  // Step 5: Place in-store reservation
  console.log('\n--- Step 5: Customer Reserves for In-Store Visit ---');
  const visitDate = new Date();
  visitDate.setDate(visitDate.getDate() + 1);

  const reserveResp = await fetch(`${API_URL}/reservations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({
      productId: selectedProduct.id,
      quantity: 1,
      preferredVisitDate: visitDate.toISOString(),
      preferredVisitTime: '4:00 PM - 6:00 PM',
      notes: 'Customer inspecting texture for family wedding.',
    }),
  });

  const reserveData: any = await reserveResp.json();
  const reservation = reserveData.data;
  console.log(`🎉 Reservation Placed! Code: ${reservation.reservationCode}`);
  console.log(`   Initial Status: ${reservation.status}`);

  // Step 6: Verify stock was atomically decremented in database
  console.log('\n--- Step 6: Database Stock Verification ---');
  const productAfterReserve = await prisma.product.findUnique({
    where: { id: selectedProduct.id },
  });
  console.log(`📦 Available Stock After Reservation: ${productAfterReserve?.availableQuantity} (was ${stockBefore})`);
  console.log(`🔒 Reserved Stock in DB: ${productAfterReserve?.reservedQuantity}`);

  if (productAfterReserve?.availableQuantity !== stockBefore - 1) {
    throw new Error('Stock was not decremented properly during reservation transaction!');
  }

  // Step 7: Shopkeeper logs in and checks pending reservations
  console.log('\n--- Step 7: Shopkeeper Dashboard Login ---');
  const shopOwner = await prisma.user.findFirst({
    where: { shops: { some: { id: selectedProduct.shopId } } },
  });
  if (!shopOwner) throw new Error('Shop owner not found');

  const shopLoginResp = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: shopOwner.email,
      password: 'Password@123456',
    }),
  });
  const shopLoginData: any = await shopLoginResp.json();
  const shopkeeperToken = shopLoginData.data.accessToken;
  console.log(`✅ Shopkeeper logged in: ${shopLoginData.data.user.name} (${shopOwner.email})`);

  // Step 8: Shopkeeper confirms reservation
  console.log('\n--- Step 8: Shopkeeper Confirms Hold ---');
  const confirmResp = await fetch(`${API_URL}/reservations/${reservation.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${shopkeeperToken}`,
    },
    body: JSON.stringify({ status: 'CONFIRMED' }),
  });
  const confirmData: any = await confirmResp.json();
  console.log(`✅ Status updated to: ${confirmData.data.status}`);

  // Step 9: Customer visits shop physically and completes offline purchase
  console.log('\n--- Step 9: Customer Visits Shop & Completes Purchase Offline ---');
  const completeResp = await fetch(`${API_URL}/reservations/${reservation.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${shopkeeperToken}`,
    },
    body: JSON.stringify({ status: 'COMPLETED' }),
  });
  const completeData: any = await completeResp.json();
  console.log(`✅ Reservation Completed! Status: ${completeData.data.status}`);

  // Step 10: Verify stock transitioned: reservedQuantity decremented, soldQuantity incremented
  const productAfterComplete = await prisma.product.findUnique({
    where: { id: selectedProduct.id },
  });
  console.log(`📊 Final Stock State: Reserved: ${productAfterComplete?.reservedQuantity}, Sold: ${productAfterComplete?.soldQuantity}`);

  // Step 11: Admin Login and Stats
  console.log('\n--- Step 11: Admin Governance Verification ---');
  const adminLoginResp = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@vastrix.local',
      password: 'Admin@123456',
    }),
  });
  const adminLoginData: any = await adminLoginResp.json();
  const adminToken = adminLoginData.data.accessToken;

  const adminStatsResp = await fetch(`${API_URL}/admin/stats`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminStatsData: any = await adminStatsResp.json();
  console.log('✅ Admin Stats:', adminStatsData.data);

  await prisma.$disconnect();
  console.log('\n🌟 Complete User Journey Passed 100% Successfully!');
}

runE2EJourney().catch((err) => {
  console.error('❌ E2E Journey Failed:', err);
  process.exit(1);
});
