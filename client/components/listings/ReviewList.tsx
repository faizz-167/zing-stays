'use client';

import { useQuery } from '@tanstack/react-query';

interface Review {
  id: number;
  rating: number;
  body: string;
  createdAt: string;
  userName: string;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`h-4 w-4 ${star <= rating ? 'text-yellow-400' : 'text-gray-200'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

interface ReviewListProps {
  listingId: number;
  apiBase?: string;
  refreshKey?: number;
}

export default function ReviewList({ listingId, apiBase = '/api', refreshKey = 0 }: ReviewListProps) {
  const { data: reviews = [], isLoading, isError } = useQuery({
    queryKey: ['reviews', apiBase, listingId, refreshKey],
    queryFn: async () => {
      const response = await fetch(`${apiBase}/reviews/${listingId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response.json() as Promise<Review[]>;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-gray-100 p-4">
            <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
            <div className="mt-2 h-10 animate-pulse rounded bg-gray-100" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-gray-400">Could not load reviews.</p>;
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center">
        <p className="text-sm text-gray-400">No approved reviews yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div key={review.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StarRating rating={review.rating} />
              <span className="text-sm font-medium text-gray-700">{review.userName}</span>
            </div>
            <span className="text-xs text-gray-400">
              {new Date(review.createdAt).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">{review.body}</p>
        </div>
      ))}
    </div>
  );
}
