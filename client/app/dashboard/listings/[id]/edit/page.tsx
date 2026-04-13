'use client';
import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ListingInput } from '@/lib/schemas/listing';
import SectionLabel from '@/components/ui/SectionLabel';
import ListingForm from '@/components/forms/ListingForm';

export default function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data, isPending } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => api.get<Partial<ListingInput> & { status?: string }>(`/listings/${id}`),
  });

  if (isPending) return <div className="animate-pulse h-96 bg-muted rounded-lg" />;

  return (
    <div>
      <SectionLabel>Edit Room</SectionLabel>
      <h1 className="font-display text-3xl mb-10">Update Listing</h1>
      <ListingForm initialData={data} listingId={parseInt(id)} isPublished={data?.status === 'active'} />
    </div>
  );
}
