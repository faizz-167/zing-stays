'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Button from '@/components/ui/Button';
import OtpModal from '@/components/auth/OtpModal';

interface ContactInfo {
  phone: string;
  name?: string;
}

interface ContactButtonProps {
  listingId: number;
}

export default function ContactButton({ listingId }: ContactButtonProps) {
  const { isAuthenticated } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const revealContact = async (allowAuthenticatedRequest = isAuthenticated) => {
    if (!allowAuthenticatedRequest) {
      setShowModal(true);
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<ContactInfo>(`/listings/${listingId}/contact`, {});
      setContact(res);
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
      <p className="font-sans text-xs text-muted-foreground text-center mt-2">
        {isAuthenticated
          ? "Click to reveal owner's phone number"
          : 'Sign in to view contact details'}
      </p>
      {showModal && (
        <OtpModal
          onSuccess={() => {
            setShowModal(false);
            void revealContact(true);
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
