import type { ListingFormValues } from '@/lib/schemas/listing';

export const LISTING_COMPLETENESS_WEIGHTS = {
  city: 10,
  locality: 10,
  price: 5,
  roomType: 3,
  propertyType: 2,
  firstImage: 10,
  threeImages: 10,
  sixImages: 5,
  shortDescription: 10,
  longDescription: 5,
  oneAmenity: 5,
  threeAmenities: 5,
  fiveAmenities: 10,
  foodIncluded: 3,
  genderPref: 3,
  rules: 2,
  landmark: 2,
} as const;

const MAX_SCORE = 100;

export function calculateListingCompleteness(data: Partial<ListingFormValues>): number {
  let score = 0;
  const description = typeof data.description === 'string' ? data.description : '';
  const amenities = Array.isArray(data.amenities) ? data.amenities : [];
  const landmark = typeof data.landmark === 'string' ? data.landmark : '';
  const rules = typeof data.rules === 'string' ? data.rules : '';

  if (data.cityId) score += LISTING_COMPLETENESS_WEIGHTS.city;
  if (data.localityId) score += LISTING_COMPLETENESS_WEIGHTS.locality;
  if (data.price) score += LISTING_COMPLETENESS_WEIGHTS.price;
  if (data.roomType) score += LISTING_COMPLETENESS_WEIGHTS.roomType;
  if (data.propertyType) score += LISTING_COMPLETENESS_WEIGHTS.propertyType;

  const imageCount = data.images?.length ?? 0;
  if (imageCount >= 1) score += LISTING_COMPLETENESS_WEIGHTS.firstImage;
  if (imageCount >= 3) score += LISTING_COMPLETENESS_WEIGHTS.threeImages;
  if (imageCount >= 6) score += LISTING_COMPLETENESS_WEIGHTS.sixImages;

  if (description.length >= 50) score += LISTING_COMPLETENESS_WEIGHTS.shortDescription;
  if (description.length >= 150) score += LISTING_COMPLETENESS_WEIGHTS.longDescription;

  const amenityCount = amenities.length;
  if (amenityCount >= 1) score += LISTING_COMPLETENESS_WEIGHTS.oneAmenity;
  if (amenityCount >= 3) score += LISTING_COMPLETENESS_WEIGHTS.threeAmenities;
  if (amenityCount >= 5) score += LISTING_COMPLETENESS_WEIGHTS.fiveAmenities;

  if (data.foodIncluded !== undefined) score += LISTING_COMPLETENESS_WEIGHTS.foodIncluded;
  if (data.genderPref) score += LISTING_COMPLETENESS_WEIGHTS.genderPref;
  if (rules) score += LISTING_COMPLETENESS_WEIGHTS.rules;
  if (landmark) score += LISTING_COMPLETENESS_WEIGHTS.landmark;

  return Math.min(MAX_SCORE, score);
}
