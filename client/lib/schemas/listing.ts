import { z } from 'zod';

const pgHostelRoomTypes = ['single', 'double', 'multiple'] as const;
const apartmentRoomTypes = ['1bhk', '2bhk', '3bhk', '4bhk'] as const;

export const listingSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  cityId: z.number().int().positive('Select a city'),
  localityId: z.number().int().positive('Select a locality'),
  intent: z.enum(['buy', 'rent']).default('rent'),
  price: z.coerce.number().int().min(500, 'Minimum ₹500/month').max(500000),
  roomType: z.enum([...pgHostelRoomTypes, ...apartmentRoomTypes]),
  propertyType: z.enum(['pg', 'hostel', 'apartment', 'flat']),
  deposit: z.coerce.number().int().min(0).optional(),
  areaSqft: z.coerce.number().int().min(0).optional(),
  availableFrom: z.string().optional(),
  furnishing: z.enum(['furnished', 'semi', 'unfurnished']).optional(),
  preferredTenants: z.enum(['students', 'working', 'family', 'any']).default('any'),
  description: z.string().max(2000).optional(),
  landmark: z.string().max(200).optional(),
  address: z.string().optional(),
  foodIncluded: z.boolean().default(false),
  genderPref: z.enum(['male', 'female', 'any']).default('any'),
  amenities: z.array(z.string()).default([]),
  rules: z.string().optional(),
  images: z.array(z.string()).default([]),
}).superRefine((data, ctx) => {
  const isPgOrHostel = data.propertyType === 'pg' || data.propertyType === 'hostel';
  const isApartment = data.propertyType === 'apartment' || data.propertyType === 'flat';

  if (isPgOrHostel && !pgHostelRoomTypes.includes(data.roomType as typeof pgHostelRoomTypes[number])) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['roomType'],
      message: 'PG/Hostel listings must use Single, Double, or Multiple room types.',
    });
  }

  if (isApartment && !apartmentRoomTypes.includes(data.roomType as typeof apartmentRoomTypes[number])) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['roomType'],
      message: 'Apartment/Flat listings must use BHK room types.',
    });
  }
});

export type ListingInput = z.infer<typeof listingSchema>;
