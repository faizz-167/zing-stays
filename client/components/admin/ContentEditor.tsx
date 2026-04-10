'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { contentSchema, type ContentFormValues } from '@/lib/schemas/content';
import Button from '@/components/ui/Button';

const CONTENT_TYPES = [
  { value: 'area_guide', label: 'Area Guide' },
  { value: 'student_guide', label: 'Student Guide' },
  { value: 'comparison', label: 'Comparison' },
  { value: 'rent_advice', label: 'Rent Advice' },
  { value: 'locality_insight', label: 'Locality Insight' },
] as const;

interface City { id: number; name: string; slug: string; }
interface Locality { id: number; name: string; slug: string; cityId: number; }

interface ContentPageFull {
  id: number;
  slug: string;
  type: string;
  title: string;
  body: string;
  cityId: number | null;
  localityId: number | null;
  isPublished: boolean;
}

interface ContentEditorProps {
  mode: 'create' | 'edit';
  pageId?: number;
}

function ContentPreview({ title, body }: { title: string; body: string }) {
  return (
    <div className="prose max-w-none rounded-xl border border-border p-6">
      <h1>{title}</h1>
      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{body}</pre>
    </div>
  );
}

export default function ContentEditor({ mode, pageId }: ContentEditorProps) {
  const router = useRouter();
  const [showPreview, setShowPreview] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: citiesData } = useQuery({
    queryKey: ['cities'],
    queryFn: () => api.get<{ data: City[] }>('/cities').then((r) => r.data),
  });

  const { data: existing } = useQuery({
    queryKey: ['admin-content-page', pageId],
    queryFn: () => api.get<ContentPageFull>(`/content/admin/${pageId}`),
    enabled: mode === 'edit' && !!pageId,
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContentFormValues>({
    resolver: zodResolver(contentSchema),
    defaultValues: {
      title: '',
      slug: '',
      type: 'area_guide',
      body: '',
      isPublished: false,
      cityId: null,
      localityId: null,
    },
  });

  useEffect(() => {
    if (existing) {
      reset({
        title: existing.title,
        slug: existing.slug,
        type: existing.type as ContentFormValues['type'],
        body: existing.body,
        isPublished: existing.isPublished,
        cityId: existing.cityId,
        localityId: existing.localityId,
      });
    }
  }, [existing, reset]);

  const cityId = watch('cityId');
  const titleValue = watch('title');
  const bodyValue = watch('body');

  const { data: localitiesData } = useQuery({
    queryKey: ['localities', cityId],
    queryFn: () => api.get<{ data: Locality[] }>(`/localities?cityId=${cityId}`).then((r) => r.data),
    enabled: !!cityId,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: ContentFormValues) =>
      mode === 'create'
        ? api.post<ContentPageFull>('/content', payload)
        : api.put<ContentPageFull>(`/content/${pageId}`, payload),
    onSuccess: () => router.push('/admin/content'),
    onError: (e: unknown) => setServerError(e instanceof Error ? e.message : 'Save failed'),
  });

  const onSubmit = (data: ContentFormValues) => {
    setServerError(null);
    saveMutation.mutate(data);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl">{mode === 'create' ? 'New Page' : 'Edit Page'}</h1>
        <div className="flex gap-3">
          <Button onClick={() => setShowPreview((p) => !p)}>
            {showPreview ? 'Editor' : 'Preview'}
          </Button>
          <Button onClick={() => router.push('/admin/content')}>Cancel</Button>
        </div>
      </div>

      {showPreview ? (
        <ContentPreview title={titleValue} body={bodyValue} />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
            <input
              type="text"
              {...register('title', {
                onChange: (e) => {
                  if (mode === 'create') {
                    setValue(
                      'slug',
                      e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
                    );
                  }
                },
              })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Slug</label>
            <input
              type="text"
              {...register('slug')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
            />
            {errors.slug && <p className="mt-1 text-xs text-red-600">{errors.slug.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <select
              {...register('type')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              {CONTENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Body <span className="text-gray-400">(Markdown)</span>
            </label>
            <textarea
              {...register('body')}
              rows={20}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
              placeholder="# Heading&#10;&#10;Write your content here..."
            />
            {errors.body && <p className="mt-1 text-xs text-red-600">{errors.body.message}</p>}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                City <span className="text-gray-400">(optional)</span>
              </label>
              <Controller
                name="cityId"
                control={control}
                render={({ field }) => (
                  <select
                    value={field.value ?? ''}
                    onChange={(e) => {
                      field.onChange(e.target.value ? parseInt(e.target.value, 10) : null);
                      setValue('localityId', null);
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">— No city —</option>
                    {(citiesData ?? []).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Locality <span className="text-gray-400">(optional)</span>
              </label>
              <Controller
                name="localityId"
                control={control}
                render={({ field }) => (
                  <select
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : null)}
                    disabled={!cityId}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
                  >
                    <option value="">— No locality —</option>
                    {(localitiesData ?? []).map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                )}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Controller
              name="isPublished"
              control={control}
              render={({ field }) => (
                <input
                  type="checkbox"
                  id="isPublished"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
              )}
            />
            <label htmlFor="isPublished" className="text-sm text-gray-700">Published</label>
          </div>

          {serverError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{serverError}</p>
          )}

          <Button type="submit" disabled={isSubmitting || saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving…' : mode === 'create' ? 'Create Page' : 'Save Changes'}
          </Button>
        </form>
      )}
    </div>
  );
}
