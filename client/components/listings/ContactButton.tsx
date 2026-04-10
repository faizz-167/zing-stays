'use client';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { usePostHog } from 'posthog-js/react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Button from '@/components/ui/Button';

interface ContactInfo {
  phone: string;
  name?: string;
}

interface ContactButtonProps {
  listingId: number;
  city?: string;
  locality?: string;
  propertyType?: string;
  onReveal?: () => void;
}

export default function ContactButton({ listingId, city, locality, propertyType, onReveal }: ContactButtonProps) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const posthog = usePostHog();
  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const revealContact = async (allowAuthenticatedRequest = isAuthenticated) => {
    if (!allowAuthenticatedRequest) {
      router.push(`/auth/login?redirect=${encodeURIComponent(pathname || `/listings/${listingId}`)}`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<ContactInfo>(`/listings/${listingId}/contact`, {});
      setContact(res);
      onReveal?.();
      posthog?.capture('contact_revealed', {
        listing_id: listingId,
        city,
        locality,
        property_type: propertyType,
        page_type: 'listing_detail',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve contact details');
    } finally {
      setLoading(false);
    }
  };

  if (contact) {
    return (
      <div className="p-6 border border-accent/30 bg-accent/5 rounded-lg">
        <p className="font-mono text-xs uppercase tracking-[0.1em] text-accent mb-2">
          Owner Contact
        </p>
        {contact.name && <p className="font-display text-lg mb-1">{contact.name}</p>}
        <a
          href={`tel:${contact.phone}`}
          className="font-display text-3xl text-accent hover:underline underline-offset-4"
        >
          {contact.phone}
        </a>
      </div>
    );
  }

  return (
    <>
      <Button size="lg" className="w-full" onClick={() => void revealContact()} disabled={loading}>
        {loading ? 'Loading...' : 'View Contact Details'}
      </Button>
      {error ? (
        <p className="font-sans text-xs text-red-500 text-center mt-2">{error}</p>
      ) : (
        <p className="font-sans text-xs text-muted-foreground text-center mt-2">
          {isAuthenticated
            ? "Click to reveal owner's phone number"
            : 'Sign in to view contact details'}
        </p>
      )}
    </>
  );
}
