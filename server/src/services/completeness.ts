import { Listing } from '../db/schema';

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

// Max 100 points
export function calculateCompleteness(listing: Partial<Listing>): number {
  let score = 0;
  // Location + price + room/property type (30)
  if (listing.cityId) score += LISTING_COMPLETENESS_WEIGHTS.city;
  if (listing.localityId) score += LISTING_COMPLETENESS_WEIGHTS.locality;
  if (listing.price && listing.price > 0) score += LISTING_COMPLETENESS_WEIGHTS.price;
  if (listing.roomType) score += LISTING_COMPLETENESS_WEIGHTS.roomType;
  if (listing.propertyType) score += LISTING_COMPLETENESS_WEIGHTS.propertyType;
  // Images (25)
  const imgCount = listing.images?.length ?? 0;
  if (imgCount >= 1) score += LISTING_COMPLETENESS_WEIGHTS.firstImage;
  if (imgCount >= 3) score += LISTING_COMPLETENESS_WEIGHTS.threeImages;
  if (imgCount >= 6) score += LISTING_COMPLETENESS_WEIGHTS.sixImages;
  // Description (15)
  if (listing.description && listing.description.length >= 50) score += LISTING_COMPLETENESS_WEIGHTS.shortDescription;
  if (listing.description && listing.description.length >= 150) score += LISTING_COMPLETENESS_WEIGHTS.longDescription;
  // Amenities (20)
  const amenityCount = listing.amenities?.length ?? 0;
  if (amenityCount >= 1) score += LISTING_COMPLETENESS_WEIGHTS.oneAmenity;
  if (amenityCount >= 3) score += LISTING_COMPLETENESS_WEIGHTS.threeAmenities;
  if (amenityCount >= 5) score += LISTING_COMPLETENESS_WEIGHTS.fiveAmenities;
  // Extra details (10)
  if (listing.foodIncluded !== undefined) score += LISTING_COMPLETENESS_WEIGHTS.foodIncluded;
  if (listing.genderPref) score += LISTING_COMPLETENESS_WEIGHTS.genderPref;
  if (listing.rules) score += LISTING_COMPLETENESS_WEIGHTS.rules;
  if (listing.landmark) score += LISTING_COMPLETENESS_WEIGHTS.landmark;

  return Math.min(100, score);
}

export function getTrustBadges(listing: Listing): string[] {
  const badges: string[] = [];
  badges.push('verified_owner');
  if (listing.completenessScore >= 80) badges.push('well_detailed');
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  if (listing.updatedAt > thirtyDaysAgo) badges.push('recently_updated');
  return badges;
}
