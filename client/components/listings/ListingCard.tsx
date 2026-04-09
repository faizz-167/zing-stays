import Image from 'next/image';
import Link from 'next/link';
import type { ListingCardData } from '@/lib/types';
import Card from '@/components/ui/Card';
import TrustBadge from '@/components/ui/TrustBadge';

const TRUST_BADGES = ['verified_owner', 'well_detailed', 'recently_updated'] as const;
type TrustBadgeType = (typeof TRUST_BADGES)[number];

function isTrustBadge(value: string): value is TrustBadgeType {
  return (TRUST_BADGES as readonly string[]).includes(value);
}

interface ListingCardProps {
  listing: ListingCardData;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const thumb = listing.images[0] ?? null;

  return (
    <Link href={`/listings/${listing.id}`}>
      <Card hoverEffect className="overflow-hidden h-full flex flex-col">
        {/* Image */}
        <div className="relative aspect-[4/3] bg-muted">
          {thumb ? (
            <Image
              src={thumb}
              alt={listing.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground font-mono text-xs uppercase tracking-wider">
              No Photo
            </div>
          )}
        </div>
        {/* Content */}
        <div className="p-5 flex flex-col flex-1">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-display text-lg leading-tight line-clamp-2">{listing.title}</h3>
            <span className="font-display text-xl text-accent flex-shrink-0">
              ₹{listing.price.toLocaleString('en-IN')}
              <span className="font-sans text-xs text-muted-foreground">/mo</span>
            </span>
          </div>
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-wide mb-3">
            {listing.locality}, {listing.city}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-auto">
            <span className="font-mono text-xs px-2 py-0.5 bg-muted border border-border rounded uppercase tracking-wide">
              {listing.roomType}
            </span>
            <span className="font-mono text-xs px-2 py-0.5 bg-muted border border-border rounded uppercase tracking-wide">
              {listing.propertyType}
            </span>
            {listing.foodIncluded && (
              <span className="font-mono text-xs px-2 py-0.5 bg-muted border border-border rounded uppercase tracking-wide">
                Meals
              </span>
            )}
          </div>
          {listing.badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border">
              {listing.badges.filter(isTrustBadge).map((badge) => (
                <TrustBadge key={badge} type={badge} />
              ))}
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
