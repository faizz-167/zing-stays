'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, Users, Calendar, ChefHat, Clock, HelpCircle, Share2 } from 'lucide-react';
import type { ListingCardData } from '@/lib/types';
import Card from '@/components/ui/Card';
import TrustBadge from '@/components/ui/TrustBadge';
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

function formatAvailability(availableFrom?: string | null): string {
  if (!availableFrom) return 'Ready to move';
  const date = new Date(availableFrom);
  if (isNaN(date.getTime())) return 'Ready to move';
  if (date <= new Date()) return 'Ready to move';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function InfoChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-xs font-medium text-muted-foreground">
      {children}
    </span>
  );
}

function DetailTile({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border-l-2 border-accent/20 bg-muted/30 p-3 transition-colors hover:bg-muted/50">
      <div className="flex-shrink-0 mt-0.5">
        <Icon className="h-4 w-4 text-accent/70" strokeWidth={1.5} />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="font-medium text-foreground text-sm truncate">{value}</span>
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

interface ListingCardProps {
  listing: ListingCardData;
  variant?: 'full' | 'compact';
}

export default function ListingCard({ listing, variant = 'full' }: ListingCardProps) {
  const router = useRouter();
  const thumb = listing.images[0] ?? null;
  const priceSuffix = listing.intent === 'buy' ? '' : '/mo';
  const hasLocalityLink = listing.citySlug && listing.localitySlug;
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

  function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: listing.title,
        url: `${window.location.origin}/listings/${listing.id}`,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/listings/${listing.id}`);
    }
  }

  const preferredTenantsValue =
    listing.preferredTenants && listing.preferredTenants !== 'any'
      ? listing.preferredTenants.charAt(0).toUpperCase() + listing.preferredTenants.slice(1)
      : 'Anyone';

  const availability = formatAvailability(listing.availableFrom);
  const mealsValue = listing.foodIncluded ? 'Included' : 'Not Provided';
  const isShared = listing.propertyType === 'pg' || listing.propertyType === 'hostel';

  /* ─────────────────── COMPACT VARIANT (Homepage grid) ─────────────────── */
  if (variant === 'compact') {
    return (
      <Card
        hoverEffect
        className="group overflow-hidden flex flex-col p-0 transition-all duration-300 cursor-pointer border hover:border-accent/30 hover:shadow-xl hover:-translate-y-1.5"
        role="link"
        tabIndex={0}
        onClick={navigateToListing}
        onKeyDown={handleCardKeyDown}
        aria-label={listing.title}
      >
        {/* Image */}
        <div className="relative w-full h-[200px] overflow-hidden bg-muted/50">
          {thumb ? (
            <Image
              src={thumb}
              alt={listing.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/50 font-medium text-xs uppercase tracking-wider">
              No Photo
            </div>
          )}

          {/* Price Overlay */}
          <div className="absolute bottom-3 right-3 bg-foreground/90 backdrop-blur-sm text-background px-2.5 py-1 rounded-lg shadow-lg">
            <span className="font-display text-base font-semibold">
              ₹{listing.price.toLocaleString('en-IN')}
            </span>
            {priceSuffix && (
              <span className="text-background/70 text-[11px] ml-0.5">{priceSuffix}</span>
            )}
          </div>

          {listing.intent === 'rent' && (
            <div className="absolute top-3 left-3 rounded-md bg-background/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground shadow-sm">
              For Rent
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col flex-grow p-4">
          <h3 className="font-display text-base font-medium text-foreground truncate mb-1">
            {listing.title}
          </h3>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{listing.locality}, {listing.city}</span>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-4">
            <InfoChip>{formatPropertyType(listing.propertyType)}</InfoChip>
            <InfoChip>{formatRoomType(listing.roomType)}</InfoChip>
            {listing.genderPref && listing.genderPref !== 'any' && (
              <InfoChip>{listing.genderPref === 'male' ? 'Boys' : 'Girls'}</InfoChip>
            )}
          </div>

          {/* Compact details row */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {preferredTenantsValue}
            </span>
            <span className="w-px h-3 bg-border" />
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {availability}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end mt-auto" onClick={stopCardClick}>
            <FavoriteButton
              listingId={listing.id}
              city={listing.city}
              locality={listing.locality}
              compact
            />
          </div>
        </div>
      </Card>
    );
  }

  /* ─────────────────── FULL VARIANT (Listings page) ─────────────────── */
  return (
    <Card
      hoverEffect
      className="group overflow-hidden flex flex-col p-0 transition-all duration-300 pointer-events-auto cursor-pointer border hover:border-accent/30 hover:shadow-xl hover:-translate-y-1.5"
      role="link"
      tabIndex={0}
      onClick={navigateToListing}
      onKeyDown={handleCardKeyDown}
      aria-label={listing.title}
    >
      {/* ─── HEADER ─── */}
      <div className="px-5 py-4 bg-background">
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-medium text-foreground truncate">
              {listing.title}
            </h3>
            <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{listing.locality}, {listing.city}</span>
              {hasLocalityLink && (
                <Link
                  href={`/${listing.citySlug}/${listing.localitySlug}`}
                  className="flex-shrink-0 text-accent hover:text-accent-secondary transition-colors text-xs ml-1"
                  onClick={stopCardClick}
                >
                  Explore →
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Tags Row */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          <InfoChip>{formatPropertyType(listing.propertyType)}</InfoChip>
          <InfoChip>{formatRoomType(listing.roomType)}</InfoChip>
          {listing.genderPref && listing.genderPref !== 'any' && (
            <InfoChip>{listing.genderPref === 'male' ? 'Boys' : 'Girls'}</InfoChip>
          )}
          {listing.intent === 'buy' && <InfoChip>For Sale</InfoChip>}
        </div>
      </div>

      {/* ─── MEDIA & DETAILS ─── */}
      <div className="flex flex-col md:flex-row p-4 gap-4 bg-card flex-grow border-t border-border/50">
        {/* Image */}
        <div className="relative w-full md:w-[260px] lg:w-[280px] h-[220px] md:h-auto flex-shrink-0 rounded-xl overflow-hidden bg-muted/50">
          {thumb ? (
            <Image
              src={thumb}
              alt={listing.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 280px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/50 font-medium text-xs uppercase tracking-wider">
              No Photo
            </div>
          )}

          {/* Price Tag Overlay */}
          <div className="absolute bottom-3 right-3 bg-foreground/90 backdrop-blur-sm text-background px-3 py-1.5 rounded-lg shadow-lg">
            <span className="font-display text-lg font-semibold">
              ₹{listing.price.toLocaleString('en-IN')}
            </span>
            {priceSuffix && (
              <span className="text-background/70 text-xs ml-0.5">{priceSuffix}</span>
            )}
          </div>

          {listing.intent === 'rent' && (
            <div className="absolute top-3 left-3 rounded-md bg-background/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground shadow-sm">
              For Rent
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex min-w-0 flex-col flex-1 gap-3">
          {/* 2×2 Detail Grid */}
          <div className="grid grid-cols-2 gap-2 flex-grow">
            <DetailTile
              icon={Users}
              value={preferredTenantsValue}
              label="Preferred Tenants"
            />
            <DetailTile
              icon={Calendar}
              value={availability}
              label={availability === 'Ready to move' ? 'Availability' : 'Available From'}
            />
            <DetailTile
              icon={isShared ? ChefHat : HelpCircle}
              value={isShared ? mealsValue : (listing.furnishing ? listing.furnishing.charAt(0).toUpperCase() + listing.furnishing.slice(1) : 'Not Specified')}
              label={isShared ? 'Food Facility' : 'Furnishing'}
            />
            <DetailTile
              icon={Clock}
              value={listing.deposit != null && listing.deposit > 0 ? `₹${listing.deposit.toLocaleString('en-IN')}` : 'None'}
              label="Deposit"
            />
          </div>

          {/* Badges + Actions */}
          <div className="flex flex-col gap-2.5 mt-auto">
            {listing.badges.length > 0 && (
              <div className="hidden md:flex flex-wrap gap-1.5">
                {listing.badges.filter(isTrustBadge).map((badge) => (
                  <TrustBadge key={badge} type={badge} />
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 w-full" onClick={stopCardClick}>
              <button
                type="button"
                onClick={handleShare}
                className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                aria-label="Share listing"
              >
                <Share2 className="h-4 w-4" />
              </button>
              <div className="flex-shrink-0">
                <FavoriteButton
                  listingId={listing.id}
                  city={listing.city}
                  locality={listing.locality}
                  compact
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
