'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { usePostHog } from 'posthog-js/react';
import { reviewSchema, type ReviewFormValues } from '@/lib/schemas/review';

interface ReviewFormProps {
  listingId: number;
  listingOwnerId: number;
  user: { id: number } | null;
  hasContacted: boolean;
  apiBase?: string;
  onSubmitted?: () => void;
}

function StarInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none"
          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
        >
          <svg
            className={`h-7 w-7 transition-colors ${
              star <= (hovered || value) ? 'text-yellow-400' : 'text-gray-200'
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

export default function ReviewForm({
  listingId,
  listingOwnerId,
  user,
  hasContacted,
  apiBase = '/api',
  onSubmitted,
}: ReviewFormProps) {
  const posthog = usePostHog();
  const [submitted, setSubmitted] = useState(false);
  const [submittedDelayed, setSubmittedDelayed] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 0, body: '' },
  });

  const bodyValue = watch('body');

  const onSubmit = async (data: ReviewFormValues) => {
    setServerError(null);

    try {
      const res = await fetch(`${apiBase}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ listingId, rating: data.rating, body: data.body.trim() }),
      });

      if (res.status === 409) {
        setServerError('You have already reviewed this listing.');
        return;
      }
      if (res.status === 403) {
        setServerError('You must contact the owner before reviewing.');
        return;
      }
      if (res.status === 202) {
        posthog?.capture('review_submitted', { listing_id: listingId, rating: data.rating });
        setSubmittedDelayed(true);
        onSubmitted?.();
        return;
      }
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        setServerError(json.error ?? 'Failed to submit review.');
        return;
      }

      posthog?.capture('review_submitted', { listing_id: listingId, rating: data.rating });
      setSubmitted(true);
      onSubmitted?.();
    } catch {
      setServerError('Network error. Please try again.');
    }
  };

  if (!user) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-600">
          <Link href="/auth/login" className="font-medium text-blue-600 hover:underline">
            Sign in
          </Link>{' '}
          to leave a review.
        </p>
      </div>
    );
  }

  if (user.id === listingOwnerId) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-500">Owners cannot review their own listing.</p>
      </div>
    );
  }

  if (!hasContacted) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-600">Reveal the owner&apos;s contact to unlock reviews.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4">
        <p className="text-sm font-medium text-green-700">
          Review submitted — pending approval. Thank you!
        </p>
      </div>
    );
  }

  if (submittedDelayed) {
    return (
      <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
        <p className="text-sm font-medium text-yellow-700">
          Review received. It may take longer than usual to appear.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h4 className="mb-4 text-sm font-semibold text-gray-800">Write a Review</h4>

      <div className="mb-3">
        <label className="mb-1.5 block text-xs font-medium text-gray-600">Your Rating</label>
        <Controller
          name="rating"
          control={control}
          render={({ field }) => (
            <StarInput value={field.value} onChange={field.onChange} />
          )}
        />
        {errors.rating && (
          <p className="mt-1 text-xs text-red-600">{errors.rating.message}</p>
        )}
      </div>

      <div className="mb-3">
        <label className="mb-1.5 block text-xs font-medium text-gray-600">
          Your Review <span className="text-gray-400">(min 20 characters)</span>
        </label>
        <textarea
          {...register('body')}
          rows={4}
          placeholder="Share your experience with this property…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <p className="mt-0.5 text-right text-xs text-gray-400">{bodyValue.trim().length} chars</p>
        {errors.body && (
          <p className="mt-1 text-xs text-red-600">{errors.body.message}</p>
        )}
      </div>

      {serverError && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{serverError}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {isSubmitting ? 'Submitting…' : 'Submit Review'}
      </button>
    </form>
  );
}
