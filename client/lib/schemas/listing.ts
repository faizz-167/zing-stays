import { z } from 'zod';

export const occupancyRoomTypes = ['single', 'double', 'multiple'] as const;
export const bhkRoomTypes = ['1bhk', '2bhk', '3bhk', '4bhk'] as const;
export const roomTypeValues = [...occupancyRoomTypes, ...bhkRoomTypes] as const;
export const propertyTypeValues = ['pg', 'hostel', 'apartment', 'flat'] as const;
export const furnishingValues = ['furnished', 'semi', 'unfurnished'] as const;
export const preferredTenantValues = ['students', 'working', 'family', 'any'] as const;

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value === null ? undefined : value;
  }

  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}, z.string().optional());

const optionalNonNegativeNumber = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'number' && Number.isNaN(value)) {
    return undefined;
  }

  return value;
}, z.coerce.number().int().min(0).optional());

const optionalDateString = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date').optional());

function isRoomTypeAllowedForPropertyType(
  roomType: (typeof roomTypeValues)[number],
  propertyType: (typeof propertyTypeValues)[number],
): boolean {
  if (propertyType === 'pg' || propertyType === 'hostel') {
    return occupancyRoomTypes.includes(roomType as (typeof occupancyRoomTypes)[number]);
  }

  return bhkRoomTypes.includes(roomType as (typeof bhkRoomTypes)[number]);
}

export const listingSchema = z.object({
  title: z.string().trim().min(5, 'Title must be at least 5 characters').max(200),
  cityId: z.coerce.number().int().positive('Select a city'),
  localityId: z.coerce.number().int().positive('Select a locality'),
  intent: z.enum(['buy', 'rent']).default('rent'),
  price: z.coerce.number().int().min(500, 'Minimum ₹500/month').max(500000),
  roomType: z.enum(roomTypeValues),
  propertyType: z.enum(propertyTypeValues),
  deposit: optionalNonNegativeNumber,
  areaSqft: optionalNonNegativeNumber,
  availableFrom: optionalDateString,
  furnishing: z.enum(furnishingValues).optional(),
  preferredTenants: z.enum(preferredTenantValues).default('any'),
  description: optionalTrimmedString.pipe(z.string().max(2000).optional()),
  landmark: optionalTrimmedString.pipe(z.string().max(200).optional()),
  address: z.string().trim().min(1, 'Address is required').max(500),
  foodIncluded: z.boolean().default(false),
  genderPref: z.enum(['male', 'female', 'any']).default('any'),
  amenities: z.array(z.string()).default([]),
  rules: optionalTrimmedString,
  images: z.array(z.string()).default([]),
}).superRefine((data, ctx) => {
  if (!isRoomTypeAllowedForPropertyType(data.roomType, data.propertyType)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['roomType'],
      message:
        data.propertyType === 'pg' || data.propertyType === 'hostel'
          ? 'PG/Hostel listings must use Single, Double, or Multiple room types.'
          : 'Apartment/Flat listings must use BHK room types.',
    });
  }
}).transform((data) => ({
  ...data,
  availableFrom: data.availableFrom
    ? new Date(`${data.availableFrom}T00:00:00.000Z`).toISOString()
    : undefined,
}));

export type ListingFormValues = z.input<typeof listingSchema>;
export type ListingInput = z.output<typeof listingSchema>;
