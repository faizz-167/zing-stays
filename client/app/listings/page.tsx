'use client';
import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ListingFilters from '@/components/listings/ListingFilters';
import ListingCard from '@/components/listings/ListingCard';
import SectionLabel from '@/components/ui/SectionLabel';
import ListingsTopBar from '@/components/search/ListingsTopBar';
import type { ListingCardData } from '@/lib/types';
import { useSearch, type SearchFilters } from '@/hooks/useSearch';

const BUY_ALLOWED_PROPERTY_TYPES = ['apartment', 'flat'];
const BHK_ROOM_TYPES = ['1bhk', '2bhk', '3bhk', '4bhk'];
const OCCUPANCY_ROOM_TYPES = ['single', 'double', 'multiple'];

function canonicalizeParams(
  intent: string | null,
  propertyTypes: string[],
  roomTypes: string[],
): {
  propertyTypes: string[];
  roomTypes: string[];
  changed: boolean;
} {
  let resultPropertyTypes = [...propertyTypes];
  let resultRoomTypes = [...roomTypes];
  let changed = false;

  if (intent === 'buy') {
    // Strip pg/hostel from propertyType; if result is empty default to apartment+flat (Phase 5.14)
    const filtered = resultPropertyTypes.filter(pt => BUY_ALLOWED_PROPERTY_TYPES.includes(pt));
    if (filtered.length !== resultPropertyTypes.length) {
      changed = true;
    }
    if (filtered.length === 0) {
      resultPropertyTypes = [...BUY_ALLOWED_PROPERTY_TYPES];
      changed = true;
    } else {
      resultPropertyTypes = filtered;
    }

    // Strip occupancy values from roomType
    const filteredRt = resultRoomTypes.filter(rt => !OCCUPANCY_ROOM_TYPES.includes(rt));
    if (filteredRt.length !== resultRoomTypes.length) {
      changed = true;
      resultRoomTypes = filteredRt;
    }
  } else if (intent === 'rent' || !intent) {
    const onlyPgHostel =
      resultPropertyTypes.length > 0 &&
      resultPropertyTypes.every(pt => !BUY_ALLOWED_PROPERTY_TYPES.includes(pt));

    const onlyAptFlat =
      resultPropertyTypes.length > 0 &&
      resultPropertyTypes.every(pt => BUY_ALLOWED_PROPERTY_TYPES.includes(pt));

    if (onlyPgHostel) {
      const filteredRt = resultRoomTypes.filter(rt => !BHK_ROOM_TYPES.includes(rt));
      if (filteredRt.length !== resultRoomTypes.length) {
        changed = true;
        resultRoomTypes = filteredRt;
      }
    } else if (onlyAptFlat) {
      const filteredRt = resultRoomTypes.filter(rt => !OCCUPANCY_ROOM_TYPES.includes(rt));
      if (filteredRt.length !== resultRoomTypes.length) {
        changed = true;
        resultRoomTypes = filteredRt;
      }
    }
  }

  return { propertyTypes: resultPropertyTypes, roomTypes: resultRoomTypes, changed };
}

function ListingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const intent = searchParams.get('intent');
  const propertyTypes = searchParams.getAll('propertyType');
  const roomTypes = searchParams.getAll('roomType');
  const localityIds = searchParams.getAll('localityId');
  const cityId = searchParams.get('cityId');
  const q = searchParams.get('q');

  // New Phase 5 filter params
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const availability = searchParams.get('availability');
  const preferredTenants = searchParams.getAll('preferredTenants');
  const furnishing = searchParams.getAll('furnishing');
  const genderPref = searchParams.get('genderPref');
  const foodIncluded = searchParams.get('foodIncluded');

  const { propertyTypes: canonPropTypes, roomTypes: canonRoomTypes, changed } =
    canonicalizeParams(intent, propertyTypes, roomTypes);

  // Replace URL if canonicalization changed anything
  useEffect(() => {
    if (!changed) return;
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (intent) params.set('intent', intent);
    if (cityId) params.set('cityId', cityId);
    localityIds.forEach(id => params.append('localityId', id));
    canonPropTypes.forEach(pt => params.append('propertyType', pt));
    canonRoomTypes.forEach(rt => params.append('roomType', rt));
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (availability) params.set('availability', availability);
    preferredTenants.forEach(t => params.append('preferredTenants', t));
    furnishing.forEach(f => params.append('furnishing', f));
    if (genderPref) params.set('genderPref', genderPref);
    if (foodIncluded) params.set('foodIncluded', foodIncluded);
    router.replace(`/listings?${params.toString()}`);
  }, [
    changed, q, intent, cityId, localityIds, canonPropTypes, canonRoomTypes,
    minPrice, maxPrice, availability, preferredTenants, furnishing,
    genderPref, foodIncluded, router,
  ]);

  const filters: SearchFilters = {
    ...(q ? { q } : {}),
    ...(intent ? { intent: intent as 'buy' | 'rent' } : {}),
    ...(cityId ? { cityId } : {}),
    ...(localityIds.length > 0 ? { localityId: localityIds } : {}),
    ...(canonRoomTypes.length > 0 ? { roomType: canonRoomTypes } : {}),
    ...(canonPropTypes.length > 0 ? { propertyType: canonPropTypes } : {}),
    ...(minPrice ? { minPrice } : {}),
    ...(maxPrice ? { maxPrice } : {}),
    ...(availability ? { availability: availability as 'now' | 'soon' | 'any' } : {}),
    ...(preferredTenants.length > 0 ? { preferredTenants } : {}),
    ...(furnishing.length > 0 ? { furnishing } : {}),
    ...(genderPref ? { genderPref } : {}),
    ...(foodIncluded ? { foodIncluded } : {}),
  };

  const { data, isPending, error } = useSearch(filters);
  const listings = data?.hits ?? [];

  return (
    <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
      <ListingFilters />
      <div className="min-w-0 flex-1">
        {isPending && (
          <div className="space-y-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[32rem] rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        )}
        {error && (
          <p className="text-muted-foreground font-sans">
            Failed to load listings. Try again.
          </p>
        )}
        {!isPending && listings.length === 0 && (
          <div className="text-center py-24">
            <p className="font-display text-2xl mb-2">No rooms found</p>
            <p className="font-sans text-muted-foreground">
              Try adjusting your filters or search a different city.
            </p>
          </div>
        )}
        <div className="space-y-6">
          {listings.map((listing: ListingCardData) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ListingsPage() {
  return (
    <div className="mx-auto max-w-[82rem] px-6 py-12">
      <div className="mb-10">
        <SectionLabel>Browse Rooms</SectionLabel>
        <h1 className="font-display text-4xl mb-6">Available Rooms</h1>
        <ListingsTopBar />
      </div>
      <Suspense fallback={<div className="animate-pulse h-96 bg-muted rounded-lg" />}>
        <ListingsContent />
      </Suspense>
    </div>
  );
}
