'use client';

import { useState } from 'react';
import ContactButton from '@/components/listings/ContactButton';
import FavoriteButton from '@/components/listings/FavoriteButton';
import ImageGallery from '@/components/listings/ImageGallery';
import ReviewForm from '@/components/listings/ReviewForm';
import ReviewList from '@/components/listings/ReviewList';
import TrustBadge from '@/components/ui/TrustBadge';
import SectionLabel from '@/components/ui/SectionLabel';
import EMICalculator from '@/components/utilities/EMICalculator';
import RentEstimator from '@/components/utilities/RentEstimator';

const BADGE_TYPES = ['verified_owner', 'well_detailed', 'recently_updated'] as const;
type BadgeType = (typeof BADGE_TYPES)[number];

function isBadgeType(value: string): value is BadgeType {
  return (BADGE_TYPES as readonly string[]).includes(value);
}

const AMENITY_LABELS: Record<string, string> = {
  wifi: 'WiFi',
  ac: 'Air Conditioning',
  laundry: 'Laundry',
  parking: 'Parking',
  cctv: 'CCTV Security',
  gym: 'Gym',
  kitchen: 'Kitchen Access',
};

export interface ListingDetailData {
  id: number;
  ownerId: number;
  title: string;
  locality: string;
  city: string;
  intent: 'buy' | 'rent';
  badges?: string[];
  images?: string[];
  description?: string;
  amenities?: string[];
  rules?: string;
  price: number;
  roomType: string;
  propertyType: string;
  foodIncluded: boolean;
  genderPref: string;
  ownerName?: string;
  localityId?: number;
  hasContacted?: boolean;
}

interface ListingDetailViewProps {
  listing: ListingDetailData;
  user: { id: number } | null;
  apiBase: string;
}

export default function ListingDetailView({ listing, user, apiBase }: ListingDetailViewProps) {
  const [hasContacted, setHasContacted] = useState(listing.hasContacted ?? false);

  const detailRows: [string, string][] = [
    ['Listing', listing.intent === 'buy' ? 'For Sale' : 'For Rent'],
    ['Room Type', listing.roomType],
    ['Property', listing.propertyType],
    ...(listing.intent === 'rent' ? [['Food', listing.foodIncluded ? 'Included' : 'Not included'] as [string, string]] : []),
    [
      'Preferred for',
      listing.genderPref === 'any'
        ? 'Anyone'
        : listing.genderPref === 'male'
          ? 'Males'
          : 'Females',
    ],
  ];

  const priceSuffix = listing.intent === 'buy' ? '' : ' / month';

  return (
    <div className="max-w-content mx-auto px-6 py-12">
      <div className="grid md:grid-cols-[1.4fr_0.6fr] gap-12">
        <div>
          <div className="mb-4">
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-2">
              {listing.locality}, {listing.city}
            </p>
            <h1 className="font-display text-4xl leading-tight mb-4">{listing.title}</h1>
            {listing.badges && listing.badges.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {listing.badges.filter(isBadgeType).map((badge) => (
                  <TrustBadge key={badge} type={badge} />
                ))}
              </div>
            )}
          </div>

          <ImageGallery images={listing.images ?? []} />

          {listing.description && (
            <div className="mt-10">
              <SectionLabel>About This Room</SectionLabel>
              <p className="font-sans text-base text-foreground leading-relaxed">
                {listing.description}
              </p>
            </div>
          )}

          {listing.amenities && listing.amenities.length > 0 && (
            <div className="mt-10">
              <SectionLabel>Amenities</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                {listing.amenities.map((amenity) => (
                  <div key={amenity} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    <span className="font-sans text-sm">{AMENITY_LABELS[amenity] ?? amenity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {listing.rules && (
            <div className="mt-10">
              <SectionLabel>House Rules</SectionLabel>
              <p className="font-sans text-sm text-muted-foreground leading-relaxed">
                {listing.rules}
              </p>
            </div>
          )}

          <div className="mt-10">
            <SectionLabel>Reviews</SectionLabel>
            <ReviewList listingId={listing.id} apiBase={apiBase} />
          </div>

          <div className="mt-6">
            <ReviewForm
              listingId={listing.id}
              listingOwnerId={listing.ownerId}
              user={user}
              hasContacted={hasContacted}
              apiBase={apiBase}
            />
          </div>
        </div>

        <div>
          <div className="sticky top-24 space-y-6">
            <div className="border border-border rounded-xl p-6">
              <div className="mb-6">
                <span className="font-display text-4xl text-accent">
                  &#8377;{listing.price.toLocaleString('en-IN')}
                </span>
                {priceSuffix && <span className="font-sans text-sm text-muted-foreground">{priceSuffix}</span>}
              </div>
              <div className="space-y-3 mb-6">
                {detailRows.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between items-center py-2 border-b border-border last:border-0"
                  >
                    <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                      {label}
                    </span>
                    <span className="font-sans text-sm capitalize">{value}</span>
                  </div>
                ))}
              </div>
              <div className="mb-4">
                <FavoriteButton
                  listingId={listing.id}
                  city={listing.city}
                  locality={listing.locality}
                />
              </div>
              <ContactButton
                listingId={listing.id}
                city={listing.city}
                locality={listing.locality}
                propertyType={listing.propertyType}
                onReveal={() => setHasContacted(true)}
              />
            </div>
            {listing.ownerName && (
              <p className="font-mono text-xs text-center text-muted-foreground uppercase tracking-wide">
                Listed by {listing.ownerName}
              </p>
            )}
            {listing.intent === 'rent' && listing.localityId && (
              <RentEstimator localityId={listing.localityId} apiBase={apiBase} />
            )}
            <EMICalculator defaultPrincipal={listing.intent === 'buy' ? listing.price : listing.price * 12} />
          </div>
        </div>
      </div>
    </div>
  );
}
