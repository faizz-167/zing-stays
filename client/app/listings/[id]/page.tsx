import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import ImageGallery from '@/components/listings/ImageGallery';
import ContactButton from '@/components/listings/ContactButton';
import TrustBadge from '@/components/ui/TrustBadge';
import SectionLabel from '@/components/ui/SectionLabel';

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

interface Listing {
  id: number;
  title: string;
  locality: string;
  city: string;
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
}

async function getListing(id: string): Promise<Listing | null> {
  const cookieStore = await cookies();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/listings/${id}`, {
    headers: {
      Cookie: cookieStore.toString(),
    },
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  return res.json() as Promise<Listing>;
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) notFound();

  const detailRows: [string, string][] = [
    ['Room Type', listing.roomType],
    ['Property', listing.propertyType],
    ['Food', listing.foodIncluded ? 'Included' : 'Not included'],
    [
      'Preferred for',
      listing.genderPref === 'any'
        ? 'Anyone'
        : listing.genderPref === 'male'
          ? 'Males'
          : 'Females',
    ],
  ];

  return (
    <div className="max-w-content mx-auto px-6 py-12">
      <div className="grid md:grid-cols-[1.4fr_0.6fr] gap-12">
        {/* Left */}
        <div>
          <div className="mb-4">
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-2">
              {listing.locality}, {listing.city}
            </p>
            <h1 className="font-display text-4xl leading-tight mb-4">{listing.title}</h1>
            {listing.badges && listing.badges.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {listing.badges.filter(isBadgeType).map((b) => (
                  <TrustBadge key={b} type={b} />
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
                {listing.amenities.map((a) => (
                  <div key={a} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    <span className="font-sans text-sm">{AMENITY_LABELS[a] ?? a}</span>
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
        </div>

        {/* Right — Sticky booking panel */}
        <div>
          <div className="sticky top-24 space-y-6">
            <div className="border border-border rounded-xl p-6">
              <div className="mb-6">
                <span className="font-display text-4xl text-accent">
                  &#8377;{listing.price.toLocaleString('en-IN')}
                </span>
                <span className="font-sans text-sm text-muted-foreground"> / month</span>
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
              <ContactButton listingId={listing.id} />
            </div>
            {listing.ownerName && (
              <p className="font-mono text-xs text-center text-muted-foreground uppercase tracking-wide">
                Listed by {listing.ownerName}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
