import Link from 'next/link';

interface BudgetBandLinksProps {
  cityId: number;
  citySlug?: string;
  localityId?: number;
  localitySlug?: string;
  minPrice: number;
  maxPrice: number;
}

const ALL_BANDS = [5000, 8000, 10000, 15000, 20000] as const;

function getRelevantBands(minPrice: number): number[] {
  return ALL_BANDS.filter((b) => b > minPrice);
}

export default function BudgetBandLinks({
  cityId,
  citySlug,
  localityId,
  localitySlug,
  minPrice,
  maxPrice,
}: BudgetBandLinksProps) {
  if (maxPrice === 0) return null;
  const bands = getRelevantBands(minPrice);
  if (bands.length === 0) return null;

  function bandHref(band: number): string {
    if (citySlug && localitySlug) {
      return `/${citySlug}/${localitySlug}/under-${band}`;
    }
    const params = new URLSearchParams({
      cityId: String(cityId),
      intent: 'rent',
      maxPrice: String(band),
    });
    if (localityId) params.set('localityId', String(localityId));
    return `/listings?${params.toString()}`;
  }

  return (
    <div>
      <h2 className="font-display text-xl mb-4">Browse by Budget</h2>
      <div className="flex flex-wrap gap-3">
        {bands.map((band) => (
          <Link
            key={band}
            href={bandHref(band)}
            className="px-4 py-2 border border-border rounded-lg font-sans text-sm hover:border-accent hover:text-accent transition-colors"
          >
            Under ₹{band.toLocaleString('en-IN')}
          </Link>
        ))}
      </div>
    </div>
  );
}
