'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Button from '@/components/ui/Button';

const CONTENT_TYPES = [
  { value: 'area_guide', label: 'Area Guide' },
  { value: 'student_guide', label: 'Student Guide' },
  { value: 'comparison', label: 'Comparison' },
  { value: 'rent_advice', label: 'Rent Advice' },
  { value: 'locality_insight', label: 'Locality Insight' },
] as const;

interface City {
  id: number;
  name: string;
  slug: string;
}

interface Locality {
  id: number;
  name: string;
  slug: string;
  cityId: number;
}

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

interface ContentFormState {
  title: string;
  slug: string;
  type: string;
  body: string;
  isPublished: boolean;
  cityId: number | null;
  localityId: number | null;
}

const EMPTY_FORM_STATE: ContentFormState = {
  title: '',
  slug: '',
  type: 'area_guide',
  body: '',
  isPublished: false,
  cityId: null,
  localityId: null,
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ContentPreview({ title, body }: { title: string; body: string }) {
  return (
    <div className="prose max-w-none rounded-xl border border-border p-6">
      <h1>{title}</h1>
      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{body}</pre>
    </div>
  );
}

interface CityLocalitySelectsProps {
  cityId: number | null;
  localityId: number | null;
  cities: City[];
  localities: Locality[];
  onChange: (cityId: number | null, localityId: number | null) => void;
}

function CityLocalitySelects({ cityId, localityId, cities, localities, onChange }: CityLocalitySelectsProps) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          City <span className="text-gray-400">(optional)</span>
        </label>
        <select
          value={cityId ?? ''}
          onChange={(e) => {
            const value = e.target.value;
            onChange(value ? parseInt(value, 10) : null, null);
          }}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">— No city —</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Locality <span className="text-gray-400">(optional)</span>
        </label>
        <select
          value={localityId ?? ''}
          onChange={(e) => onChange(cityId, e.target.value ? parseInt(e.target.value, 10) : null)}
          disabled={!cityId}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
        >
          <option value="">— No locality —</option>
          {localities.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

interface ContentFormFieldsProps {
  formState: ContentFormState;
  mode: 'create' | 'edit';
  updateDraft: (updater: (current: ContentFormState) => ContentFormState) => void;
}

function ContentFormFields({ formState, mode, updateDraft }: ContentFormFieldsProps) {
  return (
    <>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
        <input
          type="text"
          value={formState.title}
          onChange={(e) => {
            const value = e.target.value;
            updateDraft((current) => ({
              ...current,
              title: value,
              slug:
                mode === 'create'
                  ? value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                  : current.slug,
            }));
          }}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Slug</label>
        <input
          type="text"
          value={formState.slug}
          onChange={(e) => updateDraft((current) => ({ ...current, slug: e.target.value }))}
          required
          pattern="[a-z0-9-]+"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
        <select
          value={formState.type}
          onChange={(e) => updateDraft((current) => ({ ...current, type: e.target.value }))}
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
          value={formState.body}
          onChange={(e) => updateDraft((current) => ({ ...current, body: e.target.value }))}
          rows={20}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
          placeholder="# Heading&#10;&#10;Write your content here..."
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isPublished"
          checked={formState.isPublished}
          onChange={(e) => updateDraft((current) => ({ ...current, isPublished: e.target.checked }))}
          className="h-4 w-4 rounded border-gray-300"
        />
        <label htmlFor="isPublished" className="text-sm text-gray-700">Published</label>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main editor — orchestrates state and renders sub-components
// ---------------------------------------------------------------------------

export default function ContentEditor({ mode, pageId }: ContentEditorProps) {
  const router = useRouter();
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ContentFormState | null>(null);

  const { data: citiesData } = useQuery({
    queryKey: ['cities'],
    queryFn: () => api.get<{ data: City[] }>('/cities').then((r) => r.data),
  });

  const { data: existing } = useQuery({
    queryKey: ['admin-content-page', pageId],
    queryFn: () => api.get<ContentPageFull>(`/content/admin/${pageId}`),
    enabled: mode === 'edit' && !!pageId,
  });

  const existingFormState = useMemo<ContentFormState | null>(() => {
    if (!existing) return null;
    return {
      title: existing.title,
      slug: existing.slug,
      type: existing.type,
      body: existing.body,
      isPublished: existing.isPublished,
      cityId: existing.cityId,
      localityId: existing.localityId,
    };
  }, [existing]);

  const formState = draft ?? existingFormState ?? EMPTY_FORM_STATE;

  const { data: localitiesData } = useQuery({
    queryKey: ['localities', formState.cityId],
    queryFn: () =>
      api.get<{ data: Locality[] }>(`/localities?cityId=${formState.cityId}`).then((r) => r.data),
    enabled: !!formState.cityId,
  });

  const updateDraft = useCallback(
    (updater: (current: ContentFormState) => ContentFormState) => {
      setDraft((currentDraft) => updater(currentDraft ?? existingFormState ?? EMPTY_FORM_STATE));
    },
    [existingFormState],
  );

  const saveMutation = useMutation({
    mutationFn: (payload: object) =>
      mode === 'create'
        ? api.post<ContentPageFull>('/content', payload)
        : api.put<ContentPageFull>(`/content/${pageId}`, payload),
    onSuccess: () => router.push('/admin/content'),
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Save failed'),
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      saveMutation.mutate(formState);
    },
    [formState, saveMutation],
  );

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
        <ContentPreview title={formState.title} body={formState.body} />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <ContentFormFields formState={formState} mode={mode} updateDraft={updateDraft} />
          <CityLocalitySelects
            cityId={formState.cityId}
            localityId={formState.localityId}
            cities={citiesData ?? []}
            localities={localitiesData ?? []}
            onChange={(newCityId, newLocalityId) =>
              updateDraft((c) => ({ ...c, cityId: newCityId, localityId: newLocalityId }))
            }
          />
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving…' : mode === 'create' ? 'Create Page' : 'Save Changes'}
          </Button>
        </form>
      )}
    </div>
  );
}
