'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Button from '@/components/ui/Button';
import SectionLabel from '@/components/ui/SectionLabel';

export default function AdminPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  useEffect(() => {
    if (isAuthenticated && !(user as any)?.isAdmin) router.replace('/');
  }, [isAuthenticated, user, router]);

  const { data, isPending } = useQuery({
    queryKey: ['admin-listings'],
    queryFn: () => api.get<{ data: any[] }>('/admin/listings'),
    enabled: isAuthenticated && !!(user as any)?.isAdmin,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.put(`/admin/listings/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-listings'] }),
  });

  return (
    <div className="max-w-content mx-auto px-6 py-12">
      <SectionLabel>Admin</SectionLabel>
      <h1 className="font-display text-3xl mb-10">Listing Management</h1>
      {isPending ? (
        <div className="animate-pulse h-96 bg-muted rounded-lg" />
      ) : (
        <div className="space-y-3">
          {data?.data.map((l: any) => (
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
