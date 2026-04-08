import { z } from 'zod';

export const listingSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  city: z.string().min(2, 'City required'),
  locality: z.string().min(2, 'Locality required'),
  price: z.coerce.number().int().min(500, 'Minimum ₹500/month').max(500000),
  roomType: z.enum(['single', 'double', 'shared']),
  propertyType: z.enum(['pg', 'hostel', 'apartment', 'flat']),
  description: z.string().max(2000).optional(),
  landmark: z.string().max(200).optional(),
  address: z.string().optional(),
  foodIncluded: z.boolean().default(false),
  genderPref: z.enum(['male', 'female', 'any']).default('any'),
  amenities: z.array(z.string()).default([]),
  rules: z.string().optional(),
  images: z.array(z.string()).default([]),
});

export type ListingInput = z.infer<typeof listingSchema>;
