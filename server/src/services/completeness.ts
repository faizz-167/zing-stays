import { Listing } from '../db/schema';

// Max 100 points
export function calculateCompleteness(listing: Partial<Listing>): number {
  let score = 0;
  // Location + price + room/property type (30)
  if (listing.city) score += 10;
  if (listing.locality) score += 10;
  if (listing.price && listing.price > 0) score += 5;
  if (listing.roomType) score += 3;
  if (listing.propertyType) score += 2;
  // Images (25)
  const imgCount = listing.images?.length ?? 0;
  if (imgCount >= 1) score += 10;
  if (imgCount >= 3) score += 10;
  if (imgCount >= 6) score += 5;
  // Description (15)
  if (listing.description && listing.description.length >= 50) score += 10;
  if (listing.description && listing.description.length >= 150) score += 5;
  // Amenities (20)
  const amenityCount = listing.amenities?.length ?? 0;
  if (amenityCount >= 1) score += 5;
  if (amenityCount >= 3) score += 5;
  if (amenityCount >= 5) score += 10;
  // Extra details (10)
  if (listing.foodIncluded !== undefined) score += 3;
  if (listing.genderPref) score += 3;
  if (listing.rules) score += 2;
  if (listing.landmark) score += 2;

  return Math.min(100, score);
}

export function getTrustBadges(listing: Listing): string[] {
  const badges: string[] = [];
  badges.push('phone_verified'); // All owners verify phone on signup
  if (listing.completenessScore >= 80) badges.push('well_detailed');
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  if (listing.updatedAt > thirtyDaysAgo) badges.push('recently_updated');
  return badges;
}
