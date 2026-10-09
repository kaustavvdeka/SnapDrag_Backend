import { PrismaClient, Role, ReservationStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive database seed for Vastrix...');

  const existingCategories = await prisma.category.count().catch(() => 0);
  if (existingCategories > 0 && process.env.FORCE_SEED !== 'true') {
    console.log(`✅ Database already seeded (${existingCategories} categories found). Skipping re-seed.`);
    return;
  }

  // Clean existing tables in proper order
  await prisma.review.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productView.deleteMany();
  await prisma.shopView.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.shopLocation.deleteMany();
  await prisma.floor.deleteMany();
  await prisma.mall.deleteMany();
  await prisma.shop.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.searchHistory.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleared existing database tables.');

  const adminPasswordHash = await bcrypt.hash('Admin@123456', 10);
  const shopkeeperPasswordHash = await bcrypt.hash('Password@123456', 10);
  const customerPasswordHash = await bcrypt.hash('Customer@123456', 10);

  // 1. Create Admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@vastrix.local',
      passwordHash: adminPasswordHash,
      name: 'System Admin',
      phone: '+91 9876543210',
      role: Role.ADMIN,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
  });

  // 2. Create Customers
  const customer1 = await prisma.user.create({
    data: {
      email: 'ananya.sharma@example.com',
      passwordHash: customerPasswordHash,
      name: 'Ananya Sharma',
      phone: '+91 9820011223',
      role: Role.CUSTOMER,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      email: 'rohit.deka@example.com',
      passwordHash: customerPasswordHash,
      name: 'Rohit Deka',
      phone: '+91 9435012345',
      role: Role.CUSTOMER,
    },
  });

  const customer3 = await prisma.user.create({
    data: {
      email: 'neha.patel@example.com',
      passwordHash: customerPasswordHash,
      name: 'Neha Patel',
      phone: '+91 9898012345',
      role: Role.CUSTOMER,
    },
  });

  console.log('👤 Created Admin & Sample Customers.');

  // 3. Create Categories
  const categoriesData = [
    {
      name: 'Mekhela Chador',
      slug: 'mekhela-chador',
      description: 'Iconic traditional two-piece Assamese attire handwoven in Muga, Paat, and Eri silk with exquisite motifs.',
      imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80',
      displayOrder: 1,
    },
    {
      name: 'Sarees',
      slug: 'sarees',
      description: 'Timeless traditional weaves including Banarasi, Kanjivaram, Paithani, Chanderi, and Bandhani sarees.',
      imageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80',
      displayOrder: 2,
    },
    {
      name: 'Lehenga & Ghagra',
      slug: 'lehenga-ghagra',
      description: 'Bridal and festive lehengas handcrafted with intricate zari, mirror work, gota patti, and silk flair.',
      imageUrl: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=600&q=80',
      displayOrder: 3,
    },
    {
      name: 'Salwar Suits & Anarkalis',
      slug: 'salwar-suits',
      description: 'Graceful straight suits, shararas, floor-length anarkalis, and festive churidar ensembles.',
      imageUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600&q=80',
      displayOrder: 4,
    },
    {
      name: 'Handloom & Regional Wear',
      slug: 'handloom-wear',
      description: 'Authentic regional weaves straight from artisan looms across Assam, Bengal, Odisha, and Varanasi.',
      imageUrl: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=600&q=80',
      displayOrder: 5,
    },
    {
      name: 'Wedding & Bridal Couture',
      slug: 'wedding-wear',
      description: 'Heirloom bridal wear, zardozi lehengas, royal red bridal sarees, and trousseau statement pieces.',
      imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80',
      displayOrder: 6,
    },
    {
      name: 'Ethnic Dresses & Gowns',
      slug: 'ethnic-dresses',
      description: 'Contemporary fusion ethnic dresses, festive jacket gowns, and flared handblock silhouettes.',
      imageUrl: 'https://images.unsplash.com/photo-1518049362265-d5b2a6467637?w=600&q=80',
      displayOrder: 7,
    },
    {
      name: 'Festival Specials',
      slug: 'festival-wear',
      description: 'Vibrant celebratory attires curated for Bihu, Durga Puja, Navratri, Diwali, and Karwa Chauth.',
      imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80',
      displayOrder: 8,
    },
  ];

  const categoryMap = new Map<string, string>();
  for (const cat of categoriesData) {
    const created = await prisma.category.create({ data: cat });
    categoryMap.set(cat.slug, created.id);
  }
  console.log(`🏷️  Created ${categoriesData.length} Categories.`);

  // 4. Create Malls and Floors
  const mallsData = [
    {
      name: 'City Center Mall',
      slug: 'city-center-guwahati',
      address: 'GS Road, Christian Basti',
      city: 'Guwahati',
      state: 'Assam',
      pincode: '781005',
      latitude: 26.1557,
      longitude: 91.7766,
      floors: [
        { floorNumber: 'G', floorName: 'Ground Floor - Main Atrium' },
        { floorNumber: '1', floorName: '1st Floor - Premium Fashion' },
        { floorNumber: '2', floorName: '2nd Floor - Ethnic & Bridal Wing' },
        { floorNumber: '3', floorName: '3rd Floor - Lifestyle & Handlooms' },
      ],
    },
    {
      name: 'Goldighi Mall',
      slug: 'goldighi-mall-silchar',
      address: 'Central Road, Nazirpatty',
      city: 'Silchar',
      state: 'Assam',
      pincode: '788001',
      latitude: 24.8333,
      longitude: 92.7789,
      floors: [
        { floorNumber: 'G', floorName: 'Ground Floor - Traditional Bazar' },
        { floorNumber: '1', floorName: '1st Floor - Silk & Weaves Pavilion' },
        { floorNumber: '2', floorName: '2nd Floor - Wedding Apparel' },
      ],
    },
    {
      name: 'South City Mall',
      slug: 'south-city-kolkata',
      address: 'Prince Anwar Shah Road, Jadavpur',
      city: 'Kolkata',
      state: 'West Bengal',
      pincode: '700068',
      latitude: 22.4998,
      longitude: 88.3615,
      floors: [
        { floorNumber: '1', floorName: '1st Floor - Bengal Handlooms' },
        { floorNumber: '2', floorName: '2nd Floor - Designer Ethnic Wing' },
      ],
    },
    {
      name: 'Omaxe Chowk Mall',
      slug: 'omaxe-chowk-delhi',
      address: 'Chandni Chowk, Old Delhi',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110006',
      latitude: 28.6562,
      longitude: 77.2307,
      floors: [
        { floorNumber: 'G', floorName: 'Ground Floor - Heritage Couture' },
        { floorNumber: '1', floorName: '1st Floor - Bridal & Zardozi Court' },
      ],
    },
    {
      name: 'Pink City Heritage Arcade',
      slug: 'pink-city-arcade-jaipur',
      address: 'Johari Bazaar Road, Badi Chaupar',
      city: 'Jaipur',
      state: 'Rajasthan',
      pincode: '302003',
      latitude: 26.9239,
      longitude: 75.8267,
      floors: [
        { floorNumber: 'G', floorName: 'Ground Floor - Royal Bandhej Bazaar' },
        { floorNumber: '1', floorName: '1st Floor - Rajputana Poshak Court' },
      ],
    },
    {
      name: 'Phoenix Palladium Mall',
      slug: 'phoenix-palladium-mumbai',
      address: '462, Senapati Bapat Marg, Lower Parel',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400013',
      latitude: 18.9930,
      longitude: 72.8258,
      floors: [
        { floorNumber: 'G', floorName: 'Ground Floor - Luxury Weaves' },
        { floorNumber: '1', floorName: '1st Floor - Designer Couture' },
        { floorNumber: '2', floorName: '2nd Floor - Traditional Bridal Wing' },
      ],
    },
    {
      name: 'Phoenix Marketcity',
      slug: 'phoenix-marketcity-bengaluru',
      address: 'Whitefield Main Rd, Devasandra Industrial Estate, Mahadevapura',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560048',
      latitude: 12.9959,
      longitude: 77.6964,
      floors: [
        { floorNumber: 'G', floorName: 'Ground Floor - Silk Emporium' },
        { floorNumber: '1', floorName: '1st Floor - South Indian Handlooms' },
        { floorNumber: '2', floorName: '2nd Floor - Wedding Grandeur' },
      ],
    },
    {
      name: 'City Centre Mall Salt Lake',
      slug: 'city-centre-saltlake-kolkata',
      address: 'DC Block, Sector 1, Bidhannagar',
      city: 'Kolkata',
      state: 'West Bengal',
      pincode: '700064',
      latitude: 22.5898,
      longitude: 88.4081,
      floors: [
        { floorNumber: 'G', floorName: 'Ground Floor - Bengal Tant & Baluchari Court' },
        { floorNumber: '1', floorName: '1st Floor - Bridal Jamdani Pavilion' },
      ],
    },
    {
      name: 'Ambience Mall Vasant Kunj',
      slug: 'ambience-mall-delhi',
      address: 'Nelson Mandela Marg, Vasant Kunj II',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110070',
      latitude: 28.5401,
      longitude: 77.1558,
      floors: [
        { floorNumber: 'G', floorName: 'Ground Floor - Royal Heritage Couture' },
        { floorNumber: '1', floorName: '1st Floor - Bridal Atrium' },
      ],
    },
    {
      name: 'Fancy Bazar Heritage Arcade',
      slug: 'fancy-bazar-heritage-guwahati',
      address: 'SRCB Road, Fancy Bazar',
      city: 'Guwahati',
      state: 'Assam',
      pincode: '781001',
      latitude: 26.1820,
      longitude: 91.7450,
      floors: [
        { floorNumber: 'G', floorName: 'Ground Floor - Sualkuchi Silk Hub' },
        { floorNumber: '1', floorName: '1st Floor - Traditional Loom Masters' },
      ],
    },
    {
      name: 'Central Point Mall',
      slug: 'central-point-mall-silchar',
      address: 'Club Road, Tarapur',
      city: 'Silchar',
      state: 'Assam',
      pincode: '788003',
      latitude: 24.8250,
      longitude: 92.7850,
      floors: [
        { floorNumber: 'G', floorName: 'Ground Floor - Handloom Center' },
        { floorNumber: '1', floorName: '1st Floor - Barak Silk Pavilion' },
      ],
    },
  ];

  const mallMap = new Map<string, { mallId: string; floors: Map<string, string> }>();

  for (const m of mallsData) {
    const mall = await prisma.mall.create({
      data: {
        name: m.name,
        slug: m.slug,
        address: m.address,
        city: m.city,
        state: m.state,
        pincode: m.pincode,
        latitude: m.latitude,
        longitude: m.longitude,
        totalFloors: m.floors.length,
      },
    });

    const floorSubMap = new Map<string, string>();
    for (const f of m.floors) {
      const floor = await prisma.floor.create({
        data: {
          mallId: mall.id,
          floorNumber: f.floorNumber,
          floorName: f.floorName,
        },
      });
      floorSubMap.set(f.floorNumber, floor.id);
    }

    mallMap.set(m.slug, { mallId: mall.id, floors: floorSubMap });
  }

  console.log(`🏬 Created ${mallsData.length} Malls with indoor floor hierarchy.`);

  // 5. Create 10 Shopkeepers and 10 Shops
  const shopsSeedData = [
    {
      ownerEmail: 'kamakhya.handloom@vastrix.local',
      ownerName: 'Pranab Bordoloi',
      shopName: 'Maa Kamakhya Traditional Handlooms',
      slug: 'maa-kamakhya-traditional-handlooms',
      description: 'Renowned destination for authentic Sualkuchi Assam Silk, pure Golden Muga Mekhela Chador, Eri shawls, and bespoke bridal handlooms crafted by master Assamese weavers.',
      logoUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=120&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&q=80',
      phone: '+91 9435123456',
      email: 'kamakhya@vastrix.local',
      openingHours: '10:00 AM - 9:30 PM (All 7 Days)',
      rating: 4.9,
      reviewCount: 142,
      location: {
        city: 'Guwahati',
        state: 'Assam',
        address: 'GS Road, Christian Basti',
        pincode: '781005',
        latitude: 26.1557,
        longitude: 91.7766,
        mallSlug: 'city-center-guwahati',
        floorNumber: '2',
        floorName: '2nd Floor - Ethnic & Bridal Wing',
        shopNumber: 'Shop 204',
        section: 'Northeast Silk Pavilion',
        nearbyLandmark: 'Directly opposite Escalator B, next to Tanishq',
        indoorDirections: 'Take the central glass elevator to Floor 2, head right past the ethnic foyer.',
      },
    },
    {
      ownerEmail: 'barak.muga@vastrix.local',
      ownerName: 'Debolina Bhattacharjee',
      shopName: 'Barak Valley Muga & Paat Haven',
      slug: 'barak-valley-muga-paat-haven',
      description: 'Specialists in classic Bengali-Assamese fusion traditional wear, Dhakai Jamdani, pure Kesha Paat Mekhela Chadors, and bridal kantha stitch masterpieces.',
      logoUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=120&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1200&q=80',
      phone: '+91 9435098765',
      email: 'barakweaves@vastrix.local',
      openingHours: '10:30 AM - 8:30 PM (Sun Closed)',
      rating: 4.8,
      reviewCount: 98,
      location: {
        city: 'Silchar',
        state: 'Assam',
        address: 'Central Road, Nazirpatty',
        pincode: '788001',
        latitude: 24.8333,
        longitude: 92.7789,
        mallSlug: 'goldighi-mall-silchar',
        floorNumber: '1',
        floorName: '1st Floor - Silk & Weaves Pavilion',
        shopNumber: 'Shop 108',
        section: 'Handloom Corner',
        nearbyLandmark: 'Adjacent to Coffee Hub on 1st Floor',
        indoorDirections: 'Walk up the first-floor main escalator, second shop on the left corridor.',
      },
    },
    {
      ownerEmail: 'kashi.weavers@vastrix.local',
      ownerName: 'Rameshwar Lal Banarasi',
      shopName: 'Kashi Weavers & Silk Emporium',
      slug: 'kashi-weavers-silk-emporium',
      description: 'Centuries of weaving legacy. Genuine GI-tagged Katan Silk Banarasi Sarees, Shikargah motifs, antique Zari bridal drapes, and traditional Tanchoi suits.',
      logoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=1200&q=80',
      phone: '+91 9839012345',
      email: 'kashi.varanasi@vastrix.local',
      openingHours: '10:00 AM - 9:00 PM',
      rating: 4.9,
      reviewCount: 220,
      location: {
        city: 'Varanasi',
        state: 'Uttar Pradesh',
        address: 'Godowlia Crossing, Dashashwamedh Road',
        pincode: '221001',
        latitude: 25.3076,
        longitude: 83.0064,
        floorName: 'Ground & 1st Floor Showroom',
        shopNumber: 'Bldg 42, Kashi Heritage Square',
        section: 'Master Weavers Gallery',
        nearbyLandmark: '200m from Dashashwamedh Ghat entrance',
        indoorDirections: 'Entrance through the grand wooden arched gateway on main Godowlia Road.',
      },
    },
    {
      ownerEmail: 'pinkcity.poshak@vastrix.local',
      ownerName: 'Sunita Rathore',
      shopName: 'Rajputana Royal Poshak & Bandhej',
      slug: 'rajputana-royal-poshak-bandhej',
      description: 'Heritage Marwari and Rajputana traditional dresses, authentic Gota Patti lehengas, pure Georgette Bandhani, Leheriya sarees, and royal wedding poshak.',
      logoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=1200&q=80',
      phone: '+91 9414012345',
      email: 'rajputana.jaipur@vastrix.local',
      openingHours: '11:00 AM - 8:30 PM',
      rating: 4.7,
      reviewCount: 115,
      location: {
        city: 'Jaipur',
        state: 'Rajasthan',
        address: 'Johari Bazaar Road, Badi Chaupar',
        pincode: '302003',
        latitude: 26.9239,
        longitude: 75.8267,
        mallSlug: 'pink-city-arcade-jaipur',
        floorNumber: '1',
        floorName: '1st Floor - Rajputana Poshak Court',
        shopNumber: 'Shop 114',
        section: 'Royal Heritage Wing',
        nearbyLandmark: 'Near Badi Chaupar exit, first floor corridor',
        indoorDirections: 'Take the decorated heritage staircase to the first floor; Shop 114 is facing the courtyard.',
      },
    },
    {
      ownerEmail: 'dakshin.silks@vastrix.local',
      ownerName: 'Meenakshi Sundaram',
      shopName: 'Dakshin Kanchi Pure Silks',
      slug: 'dakshin-kanchi-pure-silks',
      description: 'Direct weavers of traditional Kanchipuram Temple border sarees, pure mulberry silk, Korvai handweaves, and temple bridal drapes with hallmark silk certifications.',
      logoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=1200&q=80',
      phone: '+91 9840012345',
      email: 'kanchi.dakshin@vastrix.local',
      openingHours: '9:30 AM - 9:00 PM',
      rating: 4.9,
      reviewCount: 310,
      location: {
        city: 'Chennai',
        state: 'Tamil Nadu',
        address: 'Panagal Park, Usman Road, T. Nagar',
        pincode: '600017',
        latitude: 13.0418,
        longitude: 80.2337,
        floorName: 'Flagship Store, 2 Floors',
        shopNumber: 'Building 88',
        section: 'Bridal Kanchi Gallery',
        nearbyLandmark: 'Opposite Panagal Park Metro exit',
        indoorDirections: 'Ground floor displays daily weaves; 1st floor houses heirloom bridal silks.',
      },
    },
    {
      ownerEmail: 'bengal.baluchari@vastrix.local',
      ownerName: 'Anandita Roy Mukherjee',
      shopName: 'Bishnupur Baluchari & Swarnachari Kendra',
      slug: 'bishnupur-baluchari-swarnachari-kendra',
      description: 'Preserving mythological weaving heritage with mythological story borders on silk, pure Murshidabad silk, Dhaniakhali cottons, and Tussar silk sarees.',
      logoUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=120&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1200&q=80',
      phone: '+91 9830098765',
      email: 'baluchari.kolkata@vastrix.local',
      openingHours: '10:30 AM - 9:00 PM',
      rating: 4.8,
      reviewCount: 165,
      location: {
        city: 'Kolkata',
        state: 'West Bengal',
        address: 'Prince Anwar Shah Road, Jadavpur',
        pincode: '700068',
        latitude: 22.4998,
        longitude: 88.3615,
        mallSlug: 'south-city-mall-kolkata',
        floorNumber: '2',
        floorName: '2nd Floor - Designer Ethnic Wing',
        shopNumber: 'Shop 228',
        section: 'Eastern Weaves Pavilion',
        nearbyLandmark: 'Next to Fabindia and East Atrium Elevator',
        indoorDirections: 'Exit lift on 2nd floor, turn left toward the Eastern Artisan wing.',
      },
    },
    {
      ownerEmail: 'chandni.bridal@vastrix.local',
      ownerName: 'Davinder Singh Kapoor',
      shopName: 'Kapoor Heritage Bridal & Chikankari',
      slug: 'kapoor-heritage-bridal-chikankari',
      description: 'Iconic Old Delhi bridal haven for hand-embroidered Zardozi Lehengas, pure Georgette Lucknowi Chikankari shararas, and regal festive drapes.',
      logoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80',
      phone: '+91 9811099887',
      email: 'chandni.kapoor@vastrix.local',
      openingHours: '11:00 AM - 9:00 PM',
      rating: 4.7,
      reviewCount: 190,
      location: {
        city: 'Delhi',
        state: 'Delhi',
        address: 'Chandni Chowk, Old Delhi',
        pincode: '110006',
        latitude: 28.6562,
        longitude: 77.2307,
        mallSlug: 'omaxe-chowk-delhi',
        floorNumber: '1',
        floorName: '1st Floor - Bridal & Zardozi Court',
        shopNumber: 'Shop 105',
        section: 'Royal Wedding Pavilion',
        nearbyLandmark: 'Overlooking Central Fountain Court',
        indoorDirections: 'Take North Escalator to Floor 1, straight ahead into Court 105.',
      },
    },
    {
      ownerEmail: 'pragjyotish.silks@vastrix.local',
      ownerName: 'Manash Hazarika',
      shopName: 'Pragjyotish Heritage Silks & Handlooms',
      slug: 'pragjyotish-heritage-silks',
      description: 'Authentic Assamese heritage center featuring Mulberry Paat Mekhela Chadors with Kingkhap motifs, handspun Eri jackets, and ceremonial gamusas.',
      logoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&q=80',
      phone: '+91 9864012345',
      email: 'pragjyotish@vastrix.local',
      openingHours: '10:00 AM - 8:30 PM',
      rating: 4.8,
      reviewCount: 88,
      location: {
        city: 'Guwahati',
        state: 'Assam',
        address: 'Panbazar High Street',
        pincode: '781001',
        latitude: 26.1856,
        longitude: 91.7483,
        floorName: 'Ground Floor Heritage Store',
        shopNumber: 'Heritage Building 12',
        section: 'Assam Silk Guild',
        nearbyLandmark: 'Opposite Cotton University Administrative Block',
        indoorDirections: 'Main road streetfront shop with traditional Assamese jaapi emblem outside.',
      },
    },
    {
      ownerEmail: 'surat.resham@vastrix.local',
      ownerName: 'Chetan Mehta',
      shopName: 'Surat Resham & Patola Mahal',
      slug: 'surat-resham-patola-mahal',
      description: 'Exquisite double Ikat Patan Patola sarees, Surat pure silk jacquard ensembles, Bandhani ghagras, and traditional Gujarati wedding wear.',
      logoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1200&q=80',
      phone: '+91 9825012345',
      email: 'patola.surat@vastrix.local',
      openingHours: '10:00 AM - 9:00 PM',
      rating: 4.7,
      reviewCount: 79,
      location: {
        city: 'Mumbai',
        state: 'Maharashtra',
        address: 'Ranade Road, Dadar West',
        pincode: '400028',
        latitude: 19.0222,
        longitude: 72.8427,
        floorName: '1st Floor Showroom',
        shopNumber: 'Shop 22',
        section: 'Patola & Brocade Lounge',
        nearbyLandmark: 'Near Dadar Railway Station (West Exit)',
        indoorDirections: 'First floor above Central Bank building, entry from flower market side.',
      },
    },
    {
      ownerEmail: 'cachar.ethnic@vastrix.local',
      ownerName: 'Bikramaditya Paul',
      shopName: 'Cachar Ethnic Wardrobe & Silks',
      slug: 'cachar-ethnic-wardrobe-silks',
      description: 'Traditional boutique specializing in handcrafted Manipuri Phanek, Assamese Paat, Jamdani sarees, and festive festive wear for Barak Valley celebrations.',
      logoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=1200&q=80',
      phone: '+91 9435088776',
      email: 'cachar.ethnic@vastrix.local',
      openingHours: '10:00 AM - 8:00 PM',
      rating: 4.6,
      reviewCount: 64,
      location: {
        city: 'Silchar',
        state: 'Assam',
        address: 'Premtala Point, Circuit House Road',
        pincode: '788004',
        latitude: 24.8277,
        longitude: 92.7958,
        floorName: 'Ground Floor Commercial Complex',
        shopNumber: 'Shop G-04',
        section: 'Traditional Wear',
        nearbyLandmark: 'Near Premtala Kali Mandir',
        indoorDirections: 'Main entrance of Premtala Commercial Complex, first shop on ground floor.',
      },
    },
    // --- Additional Requested Cities & Shops ---
    // 11. Mumbai: Kala Niketan Paithani & Nauvari
    {
      ownerEmail: 'kala.niketan@vastrix.local',
      ownerName: 'Manjiri Deshmukh',
      shopName: 'Kala Niketan Paithani & Nauvari Couture',
      slug: 'kala-niketan-paithani-nauvari-couture',
      description: 'Exclusive Maharashtra handloom house specializing in pure silk Yeola Paithani, Peacock border Nauvari sarees, Peshwai drapes, and bespoke bridal ensembles.',
      logoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&q=80',
      phone: '+91 9820112233',
      email: 'kalaniketan.mumbai@vastrix.local',
      openingHours: '10:30 AM - 9:30 PM',
      rating: 4.9,
      reviewCount: 165,
      location: {
        city: 'Mumbai',
        state: 'Maharashtra',
        address: '462, Senapati Bapat Marg, Lower Parel',
        pincode: '400013',
        latitude: 18.9930,
        longitude: 72.8258,
        mallSlug: 'phoenix-palladium-mumbai',
        floorNumber: '2',
        floorName: '2nd Floor - Traditional Bridal Wing',
        shopNumber: 'Shop 214',
        section: 'Royal Paithani Court',
        nearbyLandmark: 'Opposite Palladium Luxury Concierge desk',
        indoorDirections: 'Take Central Glass Atrium escalator to Level 2, turn right into Bridal Wing.',
      },
    },
    // 12. Mumbai: Zaveri Heritage Silk Emporium
    {
      ownerEmail: 'zaveri.heritage@vastrix.local',
      ownerName: 'Harshil Shah',
      shopName: 'Zaveri Heritage Silk Emporium',
      slug: 'zaveri-heritage-silk-emporium',
      description: 'Generations of textile artistry in South Mumbai. Authentic Gharchola sarees, pure Katan silk weaves, bridal Bandhani dupattas, and heavy zardozi lehengas.',
      logoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1200&q=80',
      phone: '+91 9821223344',
      email: 'zaveri.heritage@vastrix.local',
      openingHours: '10:00 AM - 8:30 PM',
      rating: 4.8,
      reviewCount: 110,
      location: {
        city: 'Mumbai',
        state: 'Maharashtra',
        address: 'Kalbadevi Road, Marine Lines Area',
        pincode: '400002',
        latitude: 18.9500,
        longitude: 72.8290,
        floorName: 'Ground Floor Heritage Flagship',
        shopNumber: 'Shop 88-A',
        section: 'Bridal Heritage Square',
        nearbyLandmark: 'Near Cotton Exchange Building',
        indoorDirections: 'Grand arched brass entrance on Kalbadevi main street, opposite Zaveri Bazaar arch.',
      },
    },
    // 13. Bengaluru: Angadi Silks Heritage Lounge
    {
      ownerEmail: 'angadi.silks@vastrix.local',
      ownerName: 'Radhika K. Radhakrishnan',
      shopName: 'Angadi Silks Heritage Lounge',
      slug: 'angadi-silks-heritage-lounge',
      description: 'Master weavers of legendary South Indian bridal silks. Pure Kanchipuram mulberry silk, authentic Mysore crepe gold zari sarees, and royal temple border handlooms.',
      logoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=1200&q=80',
      phone: '+91 9845012345',
      email: 'angadi.bengaluru@vastrix.local',
      openingHours: '10:00 AM - 9:00 PM',
      rating: 5.0,
      reviewCount: 312,
      location: {
        city: 'Bengaluru',
        state: 'Karnataka',
        address: 'Whitefield Main Rd, Mahadevapura',
        pincode: '560048',
        latitude: 12.9959,
        longitude: 77.6964,
        mallSlug: 'phoenix-marketcity-bengaluru',
        floorNumber: '1',
        floorName: '1st Floor - South Indian Handlooms',
        shopNumber: 'Shop 102',
        section: 'Temple Weaves Pavilion',
        nearbyLandmark: 'Next to PVR Gold Lounge entry',
        indoorDirections: 'Take North Wing escalator to Floor 1, second storefront facing central fountain.',
      },
    },
    // 14. Bengaluru: Samyakk Bridal & Kanjivaram Haven
    {
      ownerEmail: 'samyakk.bridal@vastrix.local',
      ownerName: 'Venkatesh Murthy',
      shopName: 'Samyakk Bridal & Kanjivaram Haven',
      slug: 'samyakk-bridal-kanjivaram-haven',
      description: 'Premium ethnic wear sanctuary for traditional South Indian and contemporary Indo-Western bridal lehengas, pure Dharmavaram drapes, and designer festival salwar suits.',
      logoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=1200&q=80',
      phone: '+91 9886012345',
      email: 'samyakk.blr@vastrix.local',
      openingHours: '10:30 AM - 8:30 PM',
      rating: 4.9,
      reviewCount: 204,
      location: {
        city: 'Bengaluru',
        state: 'Karnataka',
        address: 'Richmond Road, Commercial District',
        pincode: '560025',
        latitude: 12.9698,
        longitude: 77.6080,
        floorName: 'Ground & 1st Floor Flagship',
        shopNumber: 'Samyakk Mansion No. 24',
        section: 'Bridal Couture Gallery',
        nearbyLandmark: 'Near Bangalore Club / D Souza Circle',
        indoorDirections: 'Dedicated 3-story heritage mansion storefront with valet parking.',
      },
    },
    // 15. Bengaluru: Mysore Saree Udyog Emporium
    {
      ownerEmail: 'mysore.saree@vastrix.local',
      ownerName: 'Naveen Kumar',
      shopName: 'Mysore Saree Udyog Emporium',
      slug: 'mysore-saree-udyog-emporium',
      description: 'Iconic Bangalore legacy since 1982. Pure Mysore crepe silks, Banarasi brocades, raw tussar stoles, and embroidered festive ethnic wear.',
      logoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1200&q=80',
      phone: '+91 9844098765',
      email: 'mysore.saree@vastrix.local',
      openingHours: '10:00 AM - 8:30 PM',
      rating: 4.8,
      reviewCount: 180,
      location: {
        city: 'Bengaluru',
        state: 'Karnataka',
        address: 'Commercial Street, Tasker Town',
        pincode: '560001',
        latitude: 12.9784,
        longitude: 77.6094,
        floorName: '1st & 2nd Floor Complex',
        shopNumber: 'Bldg 316',
        section: 'Silk Bazaar',
        nearbyLandmark: 'Opposite Commercial Street Police Station',
        indoorDirections: 'Take the spiral staircase to the 1st floor silk showroom.',
      },
    },
    // 16. Delhi: Frontier Raas Heritage Couture
    {
      ownerEmail: 'frontier.raas@vastrix.local',
      ownerName: 'Anil Batra',
      shopName: 'Frontier Raas Heritage Couture',
      slug: 'frontier-raas-heritage-couture',
      description: 'Grand North Indian wedding wear authority. Handcrafted zardozi bridal lehengas, Chikankari heirloom anarkalis, raw silk sherwanis, and Banarasi tissue sarees.',
      logoUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=120&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&q=80',
      phone: '+91 9811012345',
      email: 'frontierraas.delhi@vastrix.local',
      openingHours: '11:00 AM - 9:00 PM',
      rating: 4.9,
      reviewCount: 240,
      location: {
        city: 'Delhi',
        state: 'Delhi',
        address: 'Nelson Mandela Marg, Vasant Kunj II',
        pincode: '110070',
        latitude: 28.5401,
        longitude: 77.1558,
        mallSlug: 'ambience-mall-delhi',
        floorNumber: '1',
        floorName: '1st Floor - Bridal Atrium',
        shopNumber: 'Shop 118',
        section: 'Royal Bridal Court',
        nearbyLandmark: 'Adjacent to Central Atrium glass elevators',
        indoorDirections: 'Take elevator 3 to Floor 1, walk towards East Atrium.',
      },
    },
    // 17. Delhi: Meena Bazaar South Extension
    {
      ownerEmail: 'meenabazaar.delhi@vastrix.local',
      ownerName: 'Ritu Kapoor',
      shopName: 'Meena Bazaar Traditional Silks',
      slug: 'meena-bazaar-traditional-silks',
      description: 'Established 1970. Prestigious destination for wedding sarees, embroidered georgette suits, festive anarkalis, and traditional handloom dupattas.',
      logoUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=120&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=1200&q=80',
      phone: '+91 9810098765',
      email: 'meenabazaar.southex@vastrix.local',
      openingHours: '10:30 AM - 8:30 PM',
      rating: 4.7,
      reviewCount: 195,
      location: {
        city: 'Delhi',
        state: 'Delhi',
        address: 'South Extension Part 1, Main Market',
        pincode: '110049',
        latitude: 28.5708,
        longitude: 77.2223,
        floorName: 'Ground & Mezzanine Floor',
        shopNumber: 'E-14 South Ex',
        section: 'Designer Silk Court',
        nearbyLandmark: 'Near South Extension Metro Station Gate 2',
        indoorDirections: 'Prominent corner storefront in South Ex Part 1 main plaza.',
      },
    },
    // 18. Kolkata: Adi Mohini Mohan Kanjilal Heritage
    {
      ownerEmail: 'ammk.kolkata@vastrix.local',
      ownerName: 'Swapan Kanjilal',
      shopName: 'Adi Mohini Mohan Kanjilal Heritage',
      slug: 'adi-mohini-mohan-kanjilal-heritage',
      description: 'Historic College Street textile landmark. Renowned for authentic Swarnachari, Baluchari mythological weave sarees, pure Murshidabad silk, and Dhakai Jamdani.',
      logoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1200&q=80',
      phone: '+91 9830012345',
      email: 'ammk.collegest@vastrix.local',
      openingHours: '10:00 AM - 8:30 PM',
      rating: 4.9,
      reviewCount: 380,
      location: {
        city: 'Kolkata',
        state: 'West Bengal',
        address: 'College Street, Bowbazar',
        pincode: '700073',
        latitude: 22.5760,
        longitude: 88.3639,
        floorName: 'Ground & 1st Floor Heritage Mansion',
        shopNumber: 'Bldg 79/2 College Street',
        section: 'Baluchari Heritage Gallery',
        nearbyLandmark: 'Close to Calcutta University Central Campus',
        indoorDirections: 'Historic red-brick building with double wooden entrance doors on College Street.',
      },
    },
    // 19. Kolkata: Swarnachari & Baluchari Bhaban
    {
      ownerEmail: 'swarnachari.kolkata@vastrix.local',
      ownerName: 'Pratima Sen',
      shopName: 'Swarnachari & Baluchari Bhaban',
      slug: 'swarnachari-baluchari-bhaban',
      description: 'Artisanal weavers cooperative preserving traditional Bishnupur silk sarees, gold wire threadwork, Kantha embroidery, and festival Bengali cotton drapes.',
      logoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&q=80',
      phone: '+91 9831098765',
      email: 'swarnachari.saltlake@vastrix.local',
      openingHours: '10:30 AM - 9:00 PM',
      rating: 4.8,
      reviewCount: 145,
      location: {
        city: 'Kolkata',
        state: 'West Bengal',
        address: 'DC Block, Sector 1, Bidhannagar',
        pincode: '700064',
        latitude: 22.5898,
        longitude: 88.4081,
        mallSlug: 'city-centre-saltlake-kolkata',
        floorNumber: '1',
        floorName: '1st Floor - Bridal Jamdani Pavilion',
        shopNumber: 'Shop C-108',
        section: 'Bishnupur Silk Guild',
        nearbyLandmark: 'Beside Kund Area open amphitheatre',
        indoorDirections: 'Ascend escalator near Block C, first shop facing the central waterbody.',
      },
    },
    // 20. Guwahati: Silkalay Assam Silk House
    {
      ownerEmail: 'silkalay.assam@vastrix.local',
      ownerName: 'Bhaskar Saikia',
      shopName: 'Silkalay Assam Silk House',
      slug: 'silkalay-assam-silk-house',
      description: 'Premier traditional silk merchant of Assam. Pure Golden Muga, mulberry Paat, festive Eri silk Mekhela Chadors, and handloom Riha crafted in Sualkuchi.',
      logoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=1200&q=80',
      phone: '+91 9435198765',
      email: 'silkalay.guwahati@vastrix.local',
      openingHours: '9:30 AM - 8:30 PM',
      rating: 4.9,
      reviewCount: 210,
      location: {
        city: 'Guwahati',
        state: 'Assam',
        address: 'SRCB Road, Fancy Bazar',
        pincode: '781001',
        latitude: 26.1820,
        longitude: 91.7450,
        mallSlug: 'fancy-bazar-heritage-guwahati',
        floorNumber: 'G',
        floorName: 'Ground Floor - Sualkuchi Silk Hub',
        shopNumber: 'Arcade G-12',
        section: 'Pure Muga Gallery',
        nearbyLandmark: 'Near Fancy Bazar Municipal Market arch',
        indoorDirections: 'Direct street level entrance from SRCB Road, right at the arcade entrance.',
      },
    },
    // 21. Silchar: Surma Valley Tant & Benarasi Bhaban
    {
      ownerEmail: 'surma.valley@vastrix.local',
      ownerName: 'Partha Sarathi Roy',
      shopName: 'Surma Valley Tant & Benarasi Bhaban',
      slug: 'surma-valley-tant-benarasi-bhaban',
      description: 'Centuries of tradition in Barak Valley. Pure Dhakai Jamdani, Phulia Tant cottons, bridal Benarasi silks, and ceremonial drapes for Puja and weddings.',
      logoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1200&q=80',
      phone: '+91 9435212345',
      email: 'surma.silchar@vastrix.local',
      openingHours: '10:00 AM - 8:30 PM',
      rating: 4.8,
      reviewCount: 130,
      location: {
        city: 'Silchar',
        state: 'Assam',
        address: 'Club Road, Tarapur',
        pincode: '788003',
        latitude: 24.8250,
        longitude: 92.7850,
        mallSlug: 'central-point-mall-silchar',
        floorNumber: '1',
        floorName: '1st Floor - Barak Silk Pavilion',
        shopNumber: 'Shop 104',
        section: 'Jamdani Section',
        nearbyLandmark: 'Adjacent to Silchar Club main gate',
        indoorDirections: 'First floor of Central Point Mall, take central escalator and turn left.',
      },
    },
  ];

  const createdShops: any[] = [];

  for (const s of shopsSeedData) {
    // Create Shopkeeper user
    const shopkeeper = await prisma.user.create({
      data: {
        email: s.ownerEmail,
        passwordHash: shopkeeperPasswordHash,
        name: s.ownerName,
        phone: s.phone,
        role: Role.SHOPKEEPER,
        avatarUrl: s.logoUrl,
      },
    });

    let mallId: string | null = null;
    let floorId: string | null = null;

    if (s.location.mallSlug && mallMap.has(s.location.mallSlug)) {
      const mallInfo = mallMap.get(s.location.mallSlug)!;
      mallId = mallInfo.mallId;
      if (s.location.floorNumber && mallInfo.floors.has(s.location.floorNumber)) {
        floorId = mallInfo.floors.get(s.location.floorNumber)!;
      }
    }

    const shop = await prisma.shop.create({
      data: {
        name: s.shopName,
        slug: s.slug,
        description: s.description,
        logoUrl: s.logoUrl,
        bannerUrl: s.bannerUrl,
        phone: s.phone,
        email: s.email,
        openingHours: s.openingHours,
        isApproved: true,
        isActive: true,
        rating: s.rating,
        reviewCount: s.reviewCount,
        ownerId: shopkeeper.id,
        location: {
          create: {
            address: s.location.address,
            city: s.location.city,
            state: s.location.state,
            pincode: s.location.pincode,
            country: 'India',
            latitude: s.location.latitude,
            longitude: s.location.longitude,
            mallId,
            floorId,
            floorName: s.location.floorName,
            shopNumber: s.location.shopNumber,
            section: s.location.section,
            nearbyLandmark: s.location.nearbyLandmark,
            indoorDirections: s.location.indoorDirections,
          },
        },
      },
      include: { location: true },
    });

    createdShops.push(shop);
  }

  console.log(`🏪 Created ${createdShops.length} Registered Shops with Mall & Floor metadata.`);

  // 6. Generate 105+ Authentic Traditional Products
  // Curated templates across different regions and categories
  const clothingImages = {
    mekhela: [
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80',
      'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800&q=80',
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&q=80',
    ],
    saree: [
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&q=80',
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80',
      'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=800&q=80',
    ],
    lehenga: [
      'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=800&q=80',
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80',
      'https://images.unsplash.com/photo-1518049362265-d5b2a6467637?w=800&q=80',
    ],
    suit: [
      'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800&q=80',
      'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=800&q=80',
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&q=80',
    ],
  };

  const productBlueprints = [
    // MEKHELA CHADOR ITEMS
    {
      name: 'Assam Golden Muga Silk Mekhela Chador with Kingkhap Motifs',
      cat: 'mekhela-chador',
      material: 'Pure Muga Silk',
      color: 'Natural Golden Honey',
      price: 18500,
      discount: 10,
      desc: 'Authentic handwoven Golden Muga Silk Mekhela Chador woven in Sualkuchi. Features majestic Kingkhap (royal crown) zari motifs in deep maroon and antique gold.',
      tags: ['muga', 'mekhela', 'kingkhap', 'sualkuchi', 'assam silk', 'wedding'],
      shopIdx: 0,
      stock: 4,
    },
    {
      name: 'Pure Mulberry Paat Silk Mekhela Chador in Crimson Red & Gold',
      cat: 'mekhela-chador',
      material: 'Pure Paat Silk',
      color: 'Crimson Red',
      price: 12800,
      discount: 5,
      desc: 'Traditional bridal Paat Silk Mekhela Chador with dense floral creepers (lata) and peacock motifs woven across the aanchal. Soft drape, radiant sheen.',
      tags: ['paat silk', 'red mekhela', 'bridal', 'traditional', 'bihu', 'festive'],
      shopIdx: 0,
      stock: 3,
    },
    {
      name: 'Kesha Paat Lightweight Mekhela Chador with Mina Work',
      cat: 'mekhela-chador',
      material: 'Raw Silk (Kesha Paat)',
      color: 'Emerald Green & Royal Blue',
      price: 6400,
      discount: 0,
      desc: 'Crisp handloom Kesha Paat set featuring multicolor mina work in traditional geometric Assamese motifs. Lightweight and ideal for ceremonies and receptions.',
      tags: ['kesha paat', 'green', 'mina work', 'mekhela', 'handloom'],
      shopIdx: 0,
      stock: 6,
    },
    {
      name: 'Eri Silk Organic Mekhela Chador in Natural Ivory & Charcoal',
      cat: 'mekhela-chador',
      material: 'Organic Eri Peace Silk',
      color: 'Ivory Cream',
      price: 8900,
      discount: 15,
      desc: 'Eco-friendly Ahimsa (Peace) silk Mekhela Chador known for its thermal comfort and wool-like texture. Minimalist charcoal border.',
      tags: ['eri silk', 'peace silk', 'ivory', 'handloom', 'organic'],
      shopIdx: 1,
      stock: 5,
    },
    {
      name: 'Traditional Cotton Kesha Chador Set with Gero Border',
      cat: 'mekhela-chador',
      material: 'Handloom Mercerized Cotton',
      color: 'Mustard Yellow & Red',
      price: 3800,
      discount: 0,
      desc: 'Classic everyday and festival wear cotton Mekhela Chador woven with traditional broad gero borders and matching unstitched blouse piece.',
      tags: ['cotton', 'yellow', 'bihu special', 'affordable', 'mekhela'],
      shopIdx: 1,
      stock: 8,
    },
    {
      name: 'Barak Valley Dhakai Jamdani Weave Mekhela Chador',
      cat: 'mekhela-chador',
      material: 'Fine Muslin Silk Blend',
      color: 'Blush Pink',
      price: 9500,
      discount: 10,
      desc: 'Exclusive fusion of traditional Dhakai Jamdani floral jaal on a two-piece Mekhela Chador silhouette. Delicately hand-crafted by artisan weavers.',
      tags: ['jamdani', 'pink', 'barak valley', 'handcrafted', 'wedding wear'],
      shopIdx: 1,
      stock: 3,
    },
    {
      name: 'Heritage Muga Paat Bridal Set with Antique Gun-metal Zari',
      cat: 'mekhela-chador',
      material: 'Muga & Paat Blend',
      color: 'Royal Magenta',
      price: 24500,
      discount: 12,
      desc: 'Heirloom bridal treasure combining lustrous Paat silk warp with genuine Muga weft. Heavily embellished gun-metal zari aanchal.',
      tags: ['bridal', 'magenta', 'zari', 'luxury', 'heirloom'],
      shopIdx: 7,
      stock: 2,
    },
    {
      name: 'Assamese Bihu Festival Special Red & White Paat Mekhela',
      cat: 'mekhela-chador',
      material: 'Pure Paat Silk',
      color: 'Off-White & Vermilion Red',
      price: 11200,
      discount: 0,
      desc: 'The iconic cultural pride of Assam: off-white silk body adorned with vivid red miri motifs and gamocha patterns.',
      tags: ['bihu', 'red and white', 'paat', 'assam special', 'traditional'],
      shopIdx: 7,
      stock: 5,
    },

    // SAREES ITEMS
    {
      name: 'Pure Katan Silk Banarasi Saree with Kadwa Floral Jaal',
      cat: 'sarees',
      material: 'Pure Katan Silk',
      color: 'Crimson Red & Antique Gold',
      price: 16500,
      discount: 10,
      desc: 'Masterpiece pure Katan Banarasi handwoven using the tedious Kadwa technique where each leaf motif is woven individually with real zari thread.',
      tags: ['banarasi', 'katan silk', 'red saree', 'wedding', 'kadwa'],
      shopIdx: 2,
      stock: 3,
    },
    {
      name: 'Royal Shikargah Banarasi Handloom Saree in Forest Green',
      cat: 'sarees',
      material: 'Pure Silk',
      color: 'Deep Forest Green',
      price: 22000,
      discount: 15,
      desc: 'Regal Shikargah weave depicting ancient royal hunting motifs, birds, and flora in fine gold and silver brocade.',
      tags: ['shikargah', 'banarasi', 'green saree', 'heritage', 'handloom'],
      shopIdx: 2,
      stock: 2,
    },
    {
      name: 'Varanasi Organza Silk Tissue Saree with Meenakari Border',
      cat: 'sarees',
      material: 'Silk Organza Tissue',
      color: 'Dusty Rose & Champagne Gold',
      price: 9800,
      discount: 5,
      desc: 'Gossamer-light sheer organza silk with metallic luster and multicolored meenakari borders. Drapes effortlessly for cocktail and wedding events.',
      tags: ['organza', 'tissue saree', 'meenakari', 'dusty rose', 'cocktail'],
      shopIdx: 2,
      stock: 5,
    },
    {
      name: 'Authentic Kanchipuram Pure Mulberry Silk Saree (Korvai Border)',
      cat: 'sarees',
      material: 'Kanchipuram Mulberry Silk',
      color: 'Peacock Blue & Coral Orange',
      price: 27500,
      discount: 8,
      desc: 'Direct from Kanchipuram looms. Traditional Korvai technique joining contrasting temple borders with heavy gold zari pallu.',
      tags: ['kanchipuram', 'kanjivaram', 'peacock blue', 'korvai', 'silk mark'],
      shopIdx: 4,
      stock: 2,
    },
    {
      name: 'Temple Border Kanjivaram Brocade Saree in Sunshine Yellow',
      cat: 'sarees',
      material: 'Heavy Silk Brocade',
      color: 'Haldi Yellow & Rani Pink',
      price: 18900,
      discount: 0,
      desc: 'Radiant wedding haldi special drape featuring auspicious coin and chakra buttas with thick pink gold-embossed temple border.',
      tags: ['haldi saree', 'yellow', 'kanjivaram', 'temple border', 'bridal'],
      shopIdx: 4,
      stock: 4,
    },
    {
      name: 'Bishnupur Swarnachari Silk Saree depicting Mahabharata Motifs',
      cat: 'sarees',
      material: 'Swarnachari Silk',
      color: 'Royal Maroon & Gold',
      price: 15400,
      discount: 10,
      desc: 'Legendary Bengal Swarnachari woven with golden threads narrating epic scenes from Indian epics along the grand pallu.',
      tags: ['swarnachari', 'baluchari', 'bengal handloom', 'maroon', 'mythological'],
      shopIdx: 5,
      stock: 3,
    },
    {
      name: 'Handcrafted Jamdani Muslin Saree in Midnight Navy',
      cat: 'sarees',
      material: 'Fine Cotton Muslin',
      color: 'Midnight Navy Blue',
      price: 7600,
      discount: 0,
      desc: 'Delicate Bengal Jamdani saree woven by hand on bamboo looms with geometric floral lattice motifs in silver thread.',
      tags: ['jamdani', 'navy blue', 'bengal', 'handwoven', 'muslin'],
      shopIdx: 5,
      stock: 6,
    },
    {
      name: 'Jaipur Hand-Dyed Bandhani Georgette Saree with Gota Patti',
      cat: 'sarees',
      material: 'Pure Georgette',
      color: 'Vermilion Red & Bright Orange',
      price: 11500,
      discount: 12,
      desc: 'Authentic Rai-Bandhej (fine dot tie-dye) hand-crafted in Rajasthan with rich gota patti floral border work.',
      tags: ['bandhani', 'gota patti', 'georgette', 'jaipur', 'festive'],
      shopIdx: 3,
      stock: 5,
    },
    {
      name: 'Double Ikat Patan Patola Silk Saree in Jewel Crimson',
      cat: 'sarees',
      material: 'Double Ikat Pure Silk',
      color: 'Crimson & Forest Green',
      price: 36000,
      discount: 5,
      desc: 'Heirloom gem of Gujarat weaving. Masterpiece double ikat Patola with elephant, parrot, and geometric floral grids.',
      tags: ['patola', 'patan patola', 'double ikat', 'luxury', 'museum quality'],
      shopIdx: 8,
      stock: 1, // Only 1 available! Perfect for concurrency test
    },

    // LEHENGA ITEMS
    {
      name: 'Royal Heritage Velvet Zardozi Bridal Lehenga in Deep Wine',
      cat: 'lehenga-ghagra',
      material: 'Micro Velvet & Net',
      color: 'Deep Wine Burgundy',
      price: 48000,
      discount: 15,
      desc: 'Extravagant bridal lehenga featuring 16-kali flair embellished with antique dabka, nakshi, and zardozi embroidery with double dupatta.',
      tags: ['bridal lehenga', 'zardozi', 'velvet', 'wine', 'wedding'],
      shopIdx: 6,
      stock: 2,
    },
    {
      name: 'Lucknowi Chikankari Mukaish Lehenga Set in Ivory Pastel',
      cat: 'lehenga-ghagra',
      material: 'Pure Georgette',
      color: 'Pastel Ivory & Mint',
      price: 32000,
      discount: 10,
      desc: 'Fine handcrafted needlework from Awadh artisans with genuine silver mukaish work and delicate pearl embellishments.',
      tags: ['chikankari', 'lucknowi', 'ivory lehenga', 'mukaish', 'pastel'],
      shopIdx: 6,
      stock: 3,
    },
    {
      name: 'Rajputana Royal Poshak Lehenga in Shaded Rani Pink',
      cat: 'lehenga-ghagra',
      material: 'Pure Satin Silk & Organza',
      color: 'Rani Pink & Gold',
      price: 21500,
      discount: 10,
      desc: 'Traditional royal Marwari Poshak comprising Ghagra, Kanchali, Kurti, and Odhna with handcrafted danka and gota work.',
      tags: ['poshak', 'rajputana', 'rani pink', 'gota patti', 'traditional'],
      shopIdx: 3,
      stock: 4,
    },
    {
      name: 'Banarasi Brocade Silk Flared Lehenga in Mustard & Emerald',
      cat: 'lehenga-ghagra',
      material: 'Banarasi Silk Brocade',
      color: 'Mustard Yellow & Emerald Green',
      price: 17800,
      discount: 8,
      desc: 'Lightweight festive lehenga woven with grand floral jaal in gold zari, paired with contrasting tissue organza dupatta.',
      tags: ['banarasi lehenga', 'mustard', 'festive', 'brocade', 'mehendi'],
      shopIdx: 2,
      stock: 5,
    },
    {
      name: 'Navratri Mirror Work Gujarati Chaniya Choli Set',
      cat: 'lehenga-ghagra',
      material: 'Pure Cotton with Real Mirrors',
      color: 'Multicolor Vibrant',
      price: 8500,
      discount: 0,
      desc: 'Handmade Kutchi embroidery and 10-meter full flare ghagra adorned with hundreds of twinkling mirrors for festival nights.',
      tags: ['chaniya choli', 'navratri', 'mirror work', 'garba', 'gujarati'],
      shopIdx: 8,
      stock: 7,
    },

    // SALWAR SUITS & ANARKALIS
    {
      name: 'Chanderi Silk Hand-Embroidered Anarkali Suit Set',
      cat: 'salwar-suits',
      material: 'Chanderi Silk',
      color: 'Powder Blue & Silver',
      price: 7200,
      discount: 10,
      desc: 'Floor-length flared Anarkali kurta crafted in sheer Chanderi silk with thread zardozi yolk and pure silk churidar.',
      tags: ['anarkali', 'chanderi', 'powder blue', 'suit set', 'festive'],
      shopIdx: 6,
      stock: 6,
    },
    {
      name: 'Assamese Silk Sharara Set with Traditional Gero Border',
      cat: 'salwar-suits',
      material: 'Paat Silk Blend',
      color: 'Teal & Gold',
      price: 9400,
      discount: 5,
      desc: 'Contemporary ethnic silhouette merging flared Assamese silk sharara pants with a tailored short peplum kurta.',
      tags: ['sharara', 'teal', 'assam silk', 'festive', 'contemporary'],
      shopIdx: 0,
      stock: 4,
    },
    {
      name: 'Pure Georgette Lucknowi Chikankari Straight Kurta Set',
      cat: 'salwar-suits',
      material: 'Pure Georgette',
      color: 'Lilac Lavender',
      price: 5900,
      discount: 0,
      desc: 'Subtle elegance. Hand-embroidered Bakhiya and Phanda stitches with matching cotton slip and palazzo pants.',
      tags: ['chikankari', 'lavender', 'straight suit', 'summer ethnic', 'casual festive'],
      shopIdx: 6,
      stock: 8,
    },
    {
      name: 'Gota Patti Festive Kurti & Gharara Set in Marigold Orange',
      cat: 'salwar-suits',
      material: 'Silk Blend',
      color: 'Marigold Orange',
      price: 6800,
      discount: 10,
      desc: 'Festive flare gharara set with intricate Jaipuri gota lace work on tiers and a vibrant printed chiffon dupatta.',
      tags: ['gharara', 'orange', 'gota patti', 'diwali special', 'kurti set'],
      shopIdx: 3,
      stock: 5,
    },

    // ETHNIC DRESSES & HANDLOOM SPECIALS
    {
      name: 'Ikat Handwoven Handloom Tiered Maxi Dress',
      cat: 'ethnic-dresses',
      material: 'Handloom Cotton Ikat',
      color: 'Indigo Blue & White',
      price: 4200,
      discount: 0,
      desc: 'Breathable artisanal tiered ethnic dress woven with Sambalpuri geometric ikat patterns with pockets and tie-up belt.',
      tags: ['ikat', 'indigo', 'cotton dress', 'handloom', 'casual'],
      shopIdx: 9,
      stock: 9,
    },
    {
      name: 'Manipuri Phanek Traditional Wrap with Handloom Innaphi',
      cat: 'handloom-wear',
      material: 'Silk Cotton Handloom',
      color: 'Lotus Pink & Moss Green',
      price: 6500,
      discount: 5,
      desc: 'Authentic traditional Manipuri ceremonial wrap featuring authentic horizontal temple stripes and sheer featherlight Innaphi stole.',
      tags: ['manipuri', 'phanek', 'innaphi', 'northeast', 'tribal handloom'],
      shopIdx: 9,
      stock: 4,
    },
  ];

  // We will expand these blueprints to 105+ unique products by generating variants with different colors, materials, cities, and realistic names
  const colorsList = [
    'Crimson Red', 'Royal Gold', 'Emerald Green', 'Peacock Blue',
    'Mustard Yellow', 'Rani Pink', 'Dusty Rose', 'Maroon',
    'Ivory Cream', 'Tangerine Orange', 'Deep Plum', 'Pastel Mint'
  ];

  const fabricsList = [
    'Pure Muga Silk', 'Mulberry Paat Silk', 'Katan Silk', 'Eri Peace Silk',
    'Chanderi Silk', 'Georgette', 'Kanchipuram Silk', 'Handloom Cotton',
    'Baluchari Silk', 'Raw Tussar'
  ];

  let productCount = 0;
  const createdProducts: any[] = [];

  // First insert all direct blueprints
  for (const bp of productBlueprints) {
    const shop = createdShops[bp.shopIdx % createdShops.length];
    const categoryId = categoryMap.get(bp.cat) || Array.from(categoryMap.values())[0];
    const discountedPrice = Math.round(bp.price * (1 - bp.discount / 100));
    const sku = `SD-${bp.cat.slice(0, 3).toUpperCase()}-${(1000 + productCount)}`;
    const slug = `${bp.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${productCount}`;

    let categoryImageKey = 'saree';
    if (bp.cat.includes('mekhela')) categoryImageKey = 'mekhela';
    else if (bp.cat.includes('lehenga')) categoryImageKey = 'lehenga';
    else if (bp.cat.includes('suit') || bp.cat.includes('dress')) categoryImageKey = 'suit';

    const images = clothingImages[categoryImageKey as keyof typeof clothingImages] || clothingImages.saree;

    const prod = await prisma.product.create({
      data: {
        sku,
        name: bp.name,
        slug,
        description: bp.desc,
        price: bp.price,
        discountPercent: bp.discount,
        discountedPrice,
        shopId: shop.id,
        categoryId,
        material: bp.material,
        color: bp.color,
        size: 'Free Size (Customizable)',
        totalQuantity: bp.stock,
        availableQuantity: bp.stock,
        reservedQuantity: 0,
        soldQuantity: 0,
        isFeatured: productCount % 4 === 0,
        tags: bp.tags,
        images: {
          create: images.map((url, idx) => ({
            url,
            isPrimary: idx === 0,
            order: idx,
          })),
        },
      },
    });

    createdProducts.push(prod);
    productCount++;
  }

  // Now procedurally generate remaining products up to 105+
  const productTypes = [
    { title: 'Zari Weave Festive Saree', cat: 'sarees', basePrice: 8500 },
    { title: 'Hand-dyed Bandhani Draped Saree', cat: 'sarees', basePrice: 6200 },
    { title: 'Traditional Paat Silk Mekhela Chador', cat: 'mekhela-chador', basePrice: 11000 },
    { title: 'Kesha Paat Everyday Mekhela Set', cat: 'mekhela-chador', basePrice: 4800 },
    { title: 'Bridal Heritage Flared Lehenga', cat: 'lehenga-ghagra', basePrice: 28000 },
    { title: 'Gota Patti Festive Ghagra Choli', cat: 'lehenga-ghagra', basePrice: 14500 },
    { title: 'Chikankari Embroidered Anarkali Ensemble', cat: 'salwar-suits', basePrice: 7500 },
    { title: 'Traditional Straight Suit with Jamdani Dupatta', cat: 'salwar-suits', basePrice: 5200 },
    { title: 'Artisanal Handloom Festive Kurti Gown', cat: 'ethnic-dresses', basePrice: 4600 },
    { title: 'Regional Ceremonial Handwoven Wrap & Dupatta', cat: 'handloom-wear', basePrice: 5800 },
    { title: 'Grand Wedding Royal Saree with Gold Border', cat: 'wedding-wear', basePrice: 22500 },
    { title: 'Auspicious Festival Special Handloom Draped Set', cat: 'festival-wear', basePrice: 7900 },
  ];

  while (productCount < 140) {
    const pt = productTypes[productCount % productTypes.length];
    const color = colorsList[productCount % colorsList.length];
    const material = fabricsList[(productCount * 3) % fabricsList.length];
    const shop = createdShops[productCount % createdShops.length];
    const categoryId = categoryMap.get(pt.cat) || Array.from(categoryMap.values())[0];

    const priceVariance = ((productCount * 47) % 25) * 200;
    const price = pt.basePrice + priceVariance;
    const discount = (productCount % 3 === 0) ? 10 : (productCount % 5 === 0) ? 15 : 0;
    const discountedPrice = Math.round(price * (1 - discount / 100));
    const sku = `SD-REG-${1000 + productCount}`;
    const name = `${color} ${material} ${pt.title}`;
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${productCount}`;

    // Diversify stock: mostly 3-8, occasional low stock of 1 or 2, occasional 0
    let stock = (productCount % 11 === 0) ? 0 : (productCount % 7 === 0) ? 1 : 2 + (productCount % 6);

    let categoryImageKey = 'saree';
    if (pt.cat.includes('mekhela')) categoryImageKey = 'mekhela';
    else if (pt.cat.includes('lehenga')) categoryImageKey = 'lehenga';
    else if (pt.cat.includes('suit') || pt.cat.includes('dress')) categoryImageKey = 'suit';

    const images = clothingImages[categoryImageKey as keyof typeof clothingImages] || clothingImages.saree;

    const prod = await prisma.product.create({
      data: {
        sku,
        name,
        slug,
        description: `Authentic ${material} traditional creation crafted with meticulous artisan care in ${color}. Highly sought-after local collection piece at ${shop.name}.`,
        price,
        discountPercent: discount,
        discountedPrice,
        shopId: shop.id,
        categoryId,
        material,
        color,
        size: 'Free Size',
        totalQuantity: Math.max(stock, 1),
        availableQuantity: stock,
        reservedQuantity: 0,
        soldQuantity: productCount % 4,
        isFeatured: productCount % 7 === 0,
        tags: [color.toLowerCase(), material.toLowerCase(), pt.cat, 'traditional', 'authentic'],
        images: {
          create: images.map((url, idx) => ({
            url,
            isPrimary: idx === 0,
            order: idx,
          })),
        },
      },
    });

    createdProducts.push(prod);
    productCount++;
  }

  // 6b. Canary Yellow & Emerald Green Zari Silk Lehenga Chador Set with Cloudinary Studio Cutout
  const featuredLehengaCategory = categoryMap.get('mekhela-chador') || Array.from(categoryMap.values())[0];
  const featuredLehengaShop = createdShops[0]; // Maa Kamakhya Traditional Handlooms

  const customLehenga = await prisma.product.create({
    data: {
      sku: 'LHG-YELLOW-BRAZIL-2026',
      name: 'Canary Yellow & Emerald Green Zari Silk Lehenga Chador Set',
      slug: 'yellow-emerald-green-zari-silk-lehenga-chador-set',
      description: 'Stunning studio cutout of a handcrafted Canary Yellow & Emerald Green silk lehenga chador set featuring royal blue intricate woven zari borders and matching stitched blouse. Perfect for festive celebrations and AI Virtual Try-On.',
      price: 5999,
      discountPercent: 18,
      discountedPrice: 4899,
      shopId: featuredLehengaShop.id,
      categoryId: featuredLehengaCategory,
      material: 'Pure Silk with Woven Zari Border',
      color: 'Canary Yellow & Emerald Green',
      size: 'Free Size (Stitched)',
      totalQuantity: 8,
      availableQuantity: 7,
      reservedQuantity: 0,
      soldQuantity: 1,
      isFeatured: true,
      tags: ['flat-lay', 'lehenga', 'chador', 'yellow', 'green', 'ethnic', 'silk', 'studio-cutout'],
      images: {
        create: [
          {
            url: 'https://res.cloudinary.com/dppvd6ctv/image/upload/v1791569464/vastrix/products/canary_yellow_lehenga_chador_cutout.png',
            altText: 'Canary Yellow & Emerald Green Zari Silk Lehenga Chador Set Studio Cutout',
            isPrimary: true,
            order: 0,
          },
          {
            url: 'https://res.cloudinary.com/dppvd6ctv/image/upload/v1791364382/snapdrag/products/image4.jpg',
            altText: 'Canary Yellow & Emerald Green Zari Silk Lehenga Chador Set Studio Flat Lay',
            isPrimary: false,
            order: 1,
          },
        ],
      },
    },
  });
  createdProducts.push(customLehenga);

  console.log(`👗 Created ${createdProducts.length} Realistic Traditional Clothing Products with stock & image relations.`);

  // 7. Create Sample In-Store Reservations
  const sampleReservations = [
    {
      code: 'TRAD-8F42K',
      customer: customer1,
      product: createdProducts[0],
      qty: 1,
      status: ReservationStatus.CONFIRMED,
      visitHoursAhead: 24,
      notes: 'Visiting tomorrow afternoon to inspect texture and pallu length.',
    },
    {
      code: 'TRAD-3M91P',
      customer: customer2,
      product: createdProducts[1],
      qty: 1,
      status: ReservationStatus.READY_FOR_VISIT,
      visitHoursAhead: 6,
      notes: 'Planning to purchase for cousin wedding.',
    },
    {
      code: 'TRAD-7K22V',
      customer: customer3,
      product: createdProducts[8],
      qty: 1,
      status: ReservationStatus.PENDING,
      visitHoursAhead: 36,
      notes: 'Please keep aside for physical inspection.',
    },
    {
      code: 'TRAD-5B18Z',
      customer: customer1,
      product: createdProducts[4],
      qty: 1,
      status: ReservationStatus.COMPLETED,
      visitHoursAhead: -48,
      notes: 'Inspected and purchased offline at shop.',
    },
  ];

  for (const r of sampleReservations) {
    const visitDate = new Date();
    visitDate.setHours(visitDate.getHours() + r.visitHoursAhead);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    await prisma.reservation.create({
      data: {
        reservationCode: r.code,
        customerId: r.customer.id,
        shopId: r.product.shopId,
        productId: r.product.id,
        quantity: r.qty,
        unitPrice: r.product.discountedPrice,
        status: r.status,
        preferredVisitDate: visitDate,
        preferredVisitTime: '3:00 PM - 5:00 PM',
        notes: r.notes,
        expiresAt,
        completedAt: r.status === ReservationStatus.COMPLETED ? new Date() : null,
      },
    });

    // Adjust product reservation counter
    if (r.status === ReservationStatus.CONFIRMED || r.status === ReservationStatus.READY_FOR_VISIT || r.status === ReservationStatus.PENDING) {
      await prisma.product.update({
        where: { id: r.product.id },
        data: {
          availableQuantity: { decrement: r.qty },
          reservedQuantity: { increment: r.qty },
        },
      });
    } else if (r.status === ReservationStatus.COMPLETED) {
      await prisma.product.update({
        where: { id: r.product.id },
        data: {
          soldQuantity: { increment: r.qty },
        },
      });
    }
  }

  console.log(`🎟️  Created ${sampleReservations.length} Sample Reservations with accurate inventory balances.`);

  // 8. Create Favorites and Reviews
  await prisma.favorite.create({
    data: {
      customerId: customer1.id,
      productId: createdProducts[0].id,
    },
  });

  await prisma.favorite.create({
    data: {
      customerId: customer1.id,
      productId: createdProducts[8].id,
    },
  });

  await prisma.review.create({
    data: {
      customerId: customer1.id,
      shopId: createdShops[0].id,
      productId: createdProducts[0].id,
      rating: 5,
      comment: 'Found the exact Muga Silk Mekhela Chador here on Vastrix. The shop had it ready in 15 mins for physical inspection. Outstanding quality!',
    },
  });

  console.log('🌟 Seed data generation completed successfully!');
  console.log('----------------------------------------------------');
  console.log('Login credentials:');
  console.log('Admin:       admin@vastrix.local / Admin@123456');
  console.log('Shopkeeper:  kamakhya.handloom@vastrix.local / Password@123456');
  console.log('Customer:    ananya.sharma@example.com / Customer@123456');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
