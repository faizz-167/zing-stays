'use client';

import { useState, useCallback } from 'react';
import { usePostHog } from 'posthog-js/react';

interface ReviewFormProps {
  listingId: number;
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

export default function ReviewForm({ listingId, apiBase = '/api', onSubmitted }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const posthog = usePostHog();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (rating === 0) { setError('Please select a star rating.'); return; }
      if (body.trim().length < 20) { setError('Review must be at least 20 characters.'); return; }

      setSubmitting(true);
      setError(null);

      try {
        const res = await fetch(`${apiBase}/reviews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ listingId, rating, body: body.trim() }),
        });

        if (res.status === 409) {
          setError('You have already reviewed this listing.');
          return;
        }
        if (res.status === 403) {
          setError('You must contact the owner before reviewing.');
          return;
        }
        if (!res.ok) {
          const data = await res.json() as { error?: string };
          setError(data.error ?? 'Failed to submit review.');
          return;
        }

        posthog?.capture('review_submitted', { listing_id: listingId, rating });
        setSubmitted(true);
        onSubmitted?.();
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [rating, body, listingId, apiBase, onSubmitted, posthog],
  );

  if (submitted) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4">
        <p className="text-sm font-medium text-green-700">
          Review submitted — pending approval. Thank you!
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h4 className="mb-4 text-sm font-semibold text-gray-800">Write a Review</h4>

      <div className="mb-3">
        <label className="mb-1.5 block text-xs font-medium text-gray-600">Your Rating</label>
        <StarInput value={rating} onChange={setRating} />
      </div>

      <div className="mb-3">
        <label className="mb-1.5 block text-xs font-medium text-gray-600">
          Your Review <span className="text-gray-400">(min 20 characters)</span>
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="Share your experience with this property…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <p className="mt-0.5 text-right text-xs text-gray-400">{body.trim().length} chars</p>
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {submitting ? 'Submitting…' : 'Submit Review'}
      </button>
    </form>
  );
}
