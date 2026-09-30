import { z } from 'zod';

export const createShopSchema = z.object({
  name: z.string().min(2, 'Shop name is required'),
  description: z.string().optional(),
  phone: z.string().min(8, 'Valid phone number is required'),
  email: z.string().email().optional(),
  openingHours: z.string().default('10:00 AM - 9:00 PM'),
  logoUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),

  // Location fields
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().min(4, 'Pincode is required'),
  country: z.string().default('India'),
  latitude: z.number(),
  longitude: z.number(),

  // Mall/Floor specific fields
  mallId: z.string().uuid().optional().nullable(),
  floorNumber: z.string().optional().nullable(),
  floorName: z.string().optional().nullable(),
  shopNumber: z.string().optional().nullable(),
  section: z.string().optional().nullable(),
  nearbyLandmark: z.string().optional().nullable(),
  indoorDirections: z.string().optional().nullable(),
});

export const updateShopSchema = createShopSchema.partial();
