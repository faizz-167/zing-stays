import assert from 'node:assert/strict';
import { calculateCompleteness, getTrustBadges } from '../services/completeness';
import type { Listing } from '../db/schema';

export function runCompletenessTests(): void {
  const score = calculateCompleteness({
    cityId: 1,
    localityId: 2,
    price: 12000,
    roomType: 'single',
    propertyType: 'pg',
    images: ['a', 'b', 'c', 'd', 'e', 'f'],
    description: 'x'.repeat(180),
    amenities: ['wifi', 'laundry', 'parking', 'cctv', 'kitchen'],
    foodIncluded: true,
    genderPref: 'any',
    rules: 'No smoking',
    landmark: 'Near metro',
  } as Partial<Listing>);

  assert.equal(score, 100);

  const listing = {
    completenessScore: 84,
    updatedAt: new Date(),
  } as Listing;

  assert.deepEqual(getTrustBadges(listing), [
    'verified_owner',
    'well_detailed',
    'recently_updated',
  ]);

  const staleListing = {
    completenessScore: 40,
    updatedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
  } as Listing;

  assert.deepEqual(getTrustBadges(staleListing), ['verified_owner']);
}
