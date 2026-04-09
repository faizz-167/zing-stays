'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import SearchBar from '@/components/search/SearchBar';
import ListingFilters from '@/components/listings/ListingFilters';
import ListingCard from '@/components/listings/ListingCard';
import SectionLabel from '@/components/ui/SectionLabel';
import type { ListingCardData } from '@/lib/types';
import { useSearch } from '@/hooks/useSearch';

function ListingsContent() {
  const searchParams = useSearchParams();
  const filters = Object.fromEntries(searchParams.entries());
  const { data, isPending, error } = useSearch(filters);
  const listings = data?.hits ?? [];

  return (
    <div className="flex flex-col md:flex-row gap-12">
      <ListingFilters />
      <div className="flex-1">
        {isPending && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] bg-muted rounded-lg animate-pulse" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
    <div className="max-w-content mx-auto px-6 py-12">
      <div className="mb-10">
        <SectionLabel>Browse Rooms</SectionLabel>
        <h1 className="font-display text-4xl mb-6">Available Rooms</h1>
        <SearchBar />
      </div>
      <Suspense fallback={<div className="animate-pulse h-96 bg-muted rounded-lg" />}>
        <ListingsContent />
      </Suspense>
    </div>
  );
}
