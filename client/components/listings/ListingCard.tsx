'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ListingCardData } from '@/lib/types';
import Card from '@/components/ui/Card';
import TrustBadge from '@/components/ui/TrustBadge';
import ContactButton from './ContactButton';
import FavoriteButton from './FavoriteButton';

const TRUST_BADGES = ['verified_owner', 'well_detailed', 'recently_updated'] as const;
type TrustBadgeType = (typeof TRUST_BADGES)[number];

function isTrustBadge(value: string): value is TrustBadgeType {
  return (TRUST_BADGES as readonly string[]).includes(value);
}

function formatRoomType(roomType: string): string {
  const map: Record<string, string> = {
    '1bhk': '1 BHK', '2bhk': '2 BHK', '3bhk': '3 BHK', '4bhk': '4 BHK',
    single: 'Single', double: 'Double', multiple: 'Multiple',
  };
  return map[roomType] ?? roomType;
}

function formatPropertyType(propertyType: string): string {
  const map: Record<string, string> = {
    pg: 'PG', hostel: 'Hostel', apartment: 'Apartment', flat: 'Flat',
  };
  return map[propertyType] ?? propertyType;
}

function formatFurnishing(furnishing: string): string {
  const map: Record<string, string> = {
    furnished: 'Furnished', semi: 'Semi-Furnished', unfurnished: 'Unfurnished',
  };
  return map[furnishing] ?? furnishing;
}

function formatAvailability(availableFrom?: string | null): string | null {
  if (!availableFrom) return null;
  const date = new Date(availableFrom);
  if (isNaN(date.getTime())) return null;
  if (date <= new Date()) return 'Now';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-4 text-center">
      <p className="font-display text-xl text-foreground">{value}</p>
      <p className="mt-1 font-sans text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
    </div>
  );
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/80 bg-muted/40 px-4 py-3">
      <p className="font-display text-base text-foreground">{value}</p>
      <p className="mt-1 font-sans text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
    </div>
  );
}

interface ListingCardProps {
  listing: ListingCardData;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const router = useRouter();
  const thumb = listing.images[0] ?? null;
  const priceSuffix = listing.intent === 'buy' ? '' : '/mo';
  const availability = formatAvailability(listing.availableFrom);
  const hasLocalityLink = listing.citySlug && listing.localitySlug;
  const statLabel = listing.intent === 'buy' ? 'Sale Price' : 'Rent';
  const areaLabel = listing.intent === 'buy' ? 'Builtup' : 'Area';
  const furnishingValue = listing.furnishing ? formatFurnishing(listing.furnishing) : 'Not specified';
  const preferredTenantsValue =
    listing.preferredTenants && listing.preferredTenants !== 'any'
      ? `For ${listing.preferredTenants}`
      : 'Open to all';
  const genderValue =
    listing.genderPref === 'male'
      ? 'Male only'
      : listing.genderPref === 'female'
        ? 'Female only'
        : 'Any gender';
  const navigateToListing = () => router.push(`/listings/${listing.id}`);

  function stopCardClick(event: React.SyntheticEvent) {
    event.stopPropagation();
  }

  function handleCardKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      navigateToListing();
    }
  }

  return (
    <Card
      hoverEffect
      className="overflow-hidden"
      role="link"
      tabIndex={0}
      onClick={navigateToListing}
      onKeyDown={handleCardKeyDown}
      aria-label={listing.title}
    >
      <div className="border-b border-border px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-display text-xl leading-tight text-foreground sm:text-2xl">
              {listing.title}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="font-sans text-sm text-muted-foreground">
                {listing.locality}, {listing.city}
              </p>
              {listing.landmark && (
                <p className="font-sans text-sm text-muted-foreground">
                  Near {listing.landmark}
                </p>
              )}
              {hasLocalityLink && (
                <Link
                  href={`/${listing.citySlug}/${listing.localitySlug}`}
                  className="text-sm text-accent underline-offset-4 hover:underline"
                  onClick={stopCardClick}
                >
                  Explore Nearby
                </Link>
              )}
            </div>
          </div>
          <div className="shrink-0" onClick={stopCardClick}>
            <FavoriteButton
              listingId={listing.id}
              city={listing.city}
              locality={listing.locality}
              compact
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 border-b border-border md:grid-cols-3 md:divide-x md:divide-border">
        <StatCell
          label={statLabel}
          value={`₹${listing.price.toLocaleString('en-IN')}${priceSuffix}`}
        />
        <StatCell
          label="Deposit"
          value={
            listing.deposit != null && listing.deposit > 0
              ? `₹${listing.deposit.toLocaleString('en-IN')}`
              : 'Not set'
          }
        />
        <div className="col-span-2 border-t border-border md:col-span-1 md:border-t-0">
          <StatCell
            label={areaLabel}
            value={listing.areaSqft ? `${listing.areaSqft.toLocaleString('en-IN')} sqft` : formatRoomType(listing.roomType)}
          />
        </div>
      </div>

      <div className="grid gap-5 p-4 sm:p-5 md:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="relative aspect-[16/11] overflow-hidden rounded-xl bg-muted">
          {thumb ? (
            <Image
              src={thumb}
              alt={listing.title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 520px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground font-mono text-xs uppercase tracking-wider">
              No Photo
            </div>
          )}
          {listing.intent === 'rent' && (
            <div className="absolute bottom-3 left-3 rounded-full bg-accent px-3 py-1 font-mono text-xs uppercase tracking-[0.12em] text-accent-foreground">
              For Rent
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DetailTile label="Furnishing" value={furnishingValue} />
            <DetailTile
              label="Configuration"
              value={`${formatRoomType(listing.roomType)} ${formatPropertyType(listing.propertyType)}`}
            />
            <DetailTile label="Preferred Tenants" value={preferredTenantsValue} />
            <DetailTile label="Availability" value={availability ?? 'Ready to move'} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DetailTile label="Gender" value={genderValue} />
            {listing.foodIncluded ? (
              <DetailTile label="Meals" value="Food included" />
            ) : (
              <DetailTile label="Meals" value="Not included" />
            )}
          </div>

          {listing.badges.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              {listing.badges.filter(isTrustBadge).map((badge) => (
                <TrustBadge key={badge} type={badge} />
              ))}
            </div>
          )}

          <div className="mt-auto" onClick={stopCardClick}>
            <ContactButton
              listingId={listing.id}
              ownerId={listing.ownerId}
              city={listing.city}
              locality={listing.locality}
              propertyType={listing.propertyType}
              className="w-full justify-center"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
