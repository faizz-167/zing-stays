'use client';
import { useFavorites } from '@/hooks/useFavorites';
import type { ListingCardData } from '@/lib/types';
import ListingCard from '@/components/listings/ListingCard';
import SectionLabel from '@/components/ui/SectionLabel';

export default function FavoritesPage() {
  const { data, isPending } = useFavorites();
  const listings = data?.data ?? [];

  return (
    <div>
      <SectionLabel>Saved Rooms</SectionLabel>
      <h1 className="font-display text-3xl mb-10">Your Favorites</h1>
      {isPending ? (
        <div className="animate-pulse h-48 bg-muted rounded-lg" />
      ) : listings.length === 0 ? (
        <p className="text-center py-16 font-display text-xl text-muted-foreground">No saved listings yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {listings.map((l: ListingCardData) => (
            <ListingCard key={l.id} listing={{ ...l, badges: [] }} />
          ))}
        </div>
      )}
    </div>
  );
}
