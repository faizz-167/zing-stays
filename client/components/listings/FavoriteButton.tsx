'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useFavorites, useToggleFavorite } from '@/hooks/useFavorites';
import Button from '@/components/ui/Button';

interface FavoriteButtonProps {
  listingId: number;
  city?: string;
  locality?: string;
}

export default function FavoriteButton({ listingId, city, locality }: FavoriteButtonProps) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { data } = useFavorites();
  const { save, remove } = useToggleFavorite();
  const [error, setError] = useState<string | null>(null);

  const isSaved = useMemo(
    () => (data?.data ?? []).some((listing) => listing.id === listingId),
    [data, listingId],
  );

  const isBusy = save.isPending || remove.isPending;

  const toggleFavorite = async (allowAuthenticatedRequest = isAuthenticated) => {
    if (!allowAuthenticatedRequest) {
      router.push(`/auth/login?redirect=${encodeURIComponent(pathname || '/listings')}`);
      return;
    }

    setError(null);
    try {
      if (isSaved) {
        await remove.mutateAsync({ listingId, city, locality });
      } else {
        await save.mutateAsync({ listingId, city, locality });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update saved listings');
    }
  };

  return (
    <>
      <Button
        type="button"
        variant={isSaved ? 'primary' : 'secondary'}
        size="lg"
        className="w-full gap-2"
        onClick={() => void toggleFavorite()}
        disabled={isBusy}
      >
        <Heart className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
        {isBusy ? 'Updating...' : isSaved ? 'Saved to Favorites' : 'Save Listing'}
      </Button>
      {error ? (
        <p className="font-sans text-xs text-red-500 text-center mt-2">{error}</p>
      ) : (
        <p className="font-sans text-xs text-muted-foreground text-center mt-2">
          {isAuthenticated ? 'Save this listing to revisit it later' : 'Sign in to save this listing'}
        </p>
      )}
    </>
  );
}
