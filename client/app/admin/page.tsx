'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { AdminListing } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import SectionLabel from '@/components/ui/SectionLabel';

export default function AdminPage() {
  const { user, isAuthenticated, isReady } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const isAdmin = !!user?.isAdmin;
  const [reindexMessage, setReindexMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace('/auth');
      return;
    }
    if (!isAdmin) {
      router.replace('/');
    }
  }, [isAdmin, isAuthenticated, isReady, router]);

  const { data, isPending } = useQuery({
    queryKey: ['admin-listings'],
    queryFn: () => api.get<{ data: AdminListing[] }>('/admin/listings'),
    enabled: isReady && isAuthenticated && isAdmin,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.put(`/admin/listings/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-listings'] }),
  });

  const reindexMutation = useMutation({
    mutationFn: () => api.post<{ ok: true }>('/admin/search/reindex', {}),
    onMutate: () => {
      setReindexMessage(null);
    },
    onSuccess: () => {
      setReindexMessage('Search index rebuilt successfully.');
    },
    onError: (error: Error) => {
      setReindexMessage(error.message || 'Reindex failed.');
    },
  });

  if (!isReady || !isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <div className="max-w-content mx-auto px-6 py-12">
      <SectionLabel>Admin</SectionLabel>
      <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="font-display text-3xl">Listing Management</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Rebuild the search index manually after a restart when needed.
          </p>
          {reindexMessage && (
            <p
              className={`mt-2 text-sm ${
                reindexMutation.isError ? 'text-red-600' : 'text-emerald-700'
              }`}
            >
              {reindexMessage}
            </p>
          )}
        </div>
        <Button
          variant="secondary"
          onClick={() => reindexMutation.mutate()}
          disabled={reindexMutation.isPending}
        >
          {reindexMutation.isPending ? 'Reindexing...' : 'Reindex Search'}
        </Button>
      </div>
      {isPending ? (
        <div className="animate-pulse h-96 bg-muted rounded-lg" />
      ) : (
        <div className="space-y-3">
          {data?.data.map((l) => (
            <div key={l.id} className="flex items-center justify-between p-4 border border-border rounded-lg gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-display truncate">{l.title}</p>
                <p className="font-mono text-xs text-muted-foreground uppercase">
                  {l.city} · {l.status} · Score: {l.completenessScore}%
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {l.status !== 'active' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => statusMutation.mutate({ id: l.id, status: 'active' })}
                  >
                    Activate
                  </Button>
                )}
                {l.status !== 'inactive' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => statusMutation.mutate({ id: l.id, status: 'inactive' })}
                    className="text-red-600"
                  >
                    Deactivate
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
