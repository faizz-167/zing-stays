'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Button from '@/components/ui/Button';

interface ContentPageSummary {
  id: number;
  slug: string;
  type: string;
  title: string;
  isPublished: boolean;
  cityId: number | null;
  localityId: number | null;
  publishedAt: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  area_guide: 'Area Guide',
  student_guide: 'Student Guide',
  comparison: 'Comparison',
  rent_advice: 'Rent Advice',
  locality_insight: 'Locality Insight',
};

export default function AdminContentPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: pages, isPending } = useQuery({
    queryKey: ['admin-content'],
    queryFn: () => api.get<ContentPageSummary[]>('/content/admin'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/content/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-content'] }),
  });

  return (
    <div className="max-w-content mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl">Content Pages</h1>
        <Button onClick={() => router.push('/admin/content/new')}>+ New Page</Button>
      </div>

      {isPending && <p className="text-muted-foreground">Loading…</p>}

      {pages && pages.length === 0 && (
        <p className="text-muted-foreground">No content pages yet. Create your first one.</p>
      )}

      {pages && pages.length > 0 && (
        <div className="space-y-3">
          {pages.map((page) => (
            <div key={page.id} className="flex items-center justify-between rounded-xl border border-border bg-white p-4">
              <div>
                <p className="font-medium text-gray-800">{page.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  <span className="font-mono">{page.slug}</span>
                  {' · '}
                  {TYPE_LABELS[page.type] ?? page.type}
                  {' · '}
                  {page.isPublished ? (
                    <span className="text-green-600">Published</span>
                  ) : (
                    <span className="text-yellow-600">Draft</span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => router.push(`/admin/content/${page.id}/edit`)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (confirm(`Delete "${page.title}"?`)) {
                      deleteMutation.mutate(page.id);
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
