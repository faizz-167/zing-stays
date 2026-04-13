import { notFound } from 'next/navigation';
import ListingDetailView, { type ListingDetailData } from '@/components/listings/ListingDetailView';
import { requireServerUser } from '@/lib/server-auth';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

async function getListing(id: string): Promise<ListingDetailData | null> {
  const cookieStore = await cookies();
  const res = await fetch(`${API_URL}/listings/${id}`, {
    headers: {
      Cookie: cookieStore.toString(),
    },
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  return res.json() as Promise<ListingDetailData>;
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const listing = await getListing(id);
  if (!listing) notFound();

  // Auth is checked client-side for gated actions (contact, favorite).
  // Server-side session cookies are unavailable in cross-origin SSR deployments.
  const authUser = await requireServerUser();

  return (
    <ListingDetailView
      listing={listing}
      user={authUser ? { id: authUser.id } : null}
      apiBase={API_URL}
    />
  );
}
