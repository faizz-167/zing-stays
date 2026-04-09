'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { listingSchema, ListingInput } from '@/lib/schemas/listing';
import { api } from '@/lib/api';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import SectionLabel from '@/components/ui/SectionLabel';
import ImageUploader from './ImageUploader';
import CompletenessBar from './CompletenessBar';

interface CityOption { id: number; name: string; slug: string; }
interface LocalityOption { id: number; name: string; slug: string; }

const AMENITY_OPTIONS = ['wifi', 'ac', 'laundry', 'parking', 'cctv', 'gym', 'kitchen', 'geyser', 'furnished', 'balcony'];

function calcLocalScore(data: Partial<ListingInput>): number {
  let s = 0;
  if (data.city) s += 10;
  if (data.locality) s += 10;
  if (data.price) s += 5;
  if (data.roomType) s += 3;
  if (data.propertyType) s += 2;
  const imgs = data.images?.length ?? 0;
  if (imgs >= 1) s += 10;
  if (imgs >= 3) s += 10;
  if (imgs >= 6) s += 5;
  if (data.description && data.description.length >= 50) s += 10;
  if (data.description && data.description.length >= 150) s += 5;
  const am = data.amenities?.length ?? 0;
  if (am >= 1) s += 5;
  if (am >= 3) s += 5;
  if (am >= 5) s += 10;
  if (data.foodIncluded !== undefined) s += 3;
  if (data.genderPref) s += 3;
  if (data.rules) s += 2;
  if (data.landmark) s += 2;
  return Math.min(100, s);
}

interface ListingFormProps {
  initialData?: Partial<ListingInput>;
  listingId?: number;
}

export default function ListingForm({ initialData, listingId }: ListingFormProps) {
  const router = useRouter();
  const [data, setData] = useState<Partial<ListingInput>>(
    initialData ?? { amenities: [], images: [], foodIncluded: false, genderPref: 'any', intent: 'rent' }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [cityOptions, setCityOptions] = useState<CityOption[]>([]);
  const [localityOptions, setLocalityOptions] = useState<LocalityOption[]>([]);

  useEffect(() => {
    api.get<{ data: CityOption[] }>('/cities').then(res => setCityOptions(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!data.cityId) { setLocalityOptions([]); return; }
    api.get<{ data: LocalityOption[] }>(`/localities?cityId=${data.cityId}`)
      .then(res => setLocalityOptions(res.data))
      .catch(() => {});
  }, [data.cityId]);

  const set = (key: keyof ListingInput, value: unknown) =>
    setData(prev => ({ ...prev, [key]: value }));

  const score = calcLocalScore(data);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = listingSchema.safeParse(data);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach(issue => {
        if (issue.path[0]) errs[issue.path[0] as string] = issue.message;
      });
      setErrors(errs);
      return;
    }
    setSaving(true);
    try {
      if (listingId) {
        await api.put(`/listings/${listingId}`, result.data);
      } else {
        await api.post('/listings', result.data);
      }
      router.push('/dashboard/listings');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setErrors({ form: message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-12 max-w-2xl">
      <CompletenessBar score={score} />

      <section>
        <SectionLabel>Basic Details</SectionLabel>
        <div className="space-y-4">
          <div>
            <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2 block">
              Listing Title *
            </label>
            <Input
              placeholder="e.g. Furnished Single Room near MG Road"
              value={data.title ?? ''}
              onChange={e => set('title', e.target.value)}
            />
            {errors.title && <p className="font-sans text-xs text-red-600 mt-1">{errors.title}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2 block">
                City *
              </label>
              {cityOptions.length > 0 ? (
                <select
                  className="h-12 w-full px-4 bg-transparent border border-input rounded-md font-sans text-base focus:outline-none focus:ring-2 focus:ring-ring"
                  value={data.cityId ?? ''}
                  onChange={e => {
                    const selected = cityOptions.find(c => c.id === parseInt(e.target.value, 10));
                    set('cityId', selected?.id);
                    set('city', selected?.name ?? '');
                    set('localityId', undefined);
                    set('locality', '');
                  }}
                >
                  <option value="">Select city...</option>
                  {cityOptions.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              ) : (
                <Input
                  placeholder="e.g. Bangalore"
                  value={data.city ?? ''}
                  onChange={e => set('city', e.target.value)}
                />
              )}
              {errors.city && <p className="font-sans text-xs text-red-600 mt-1">{errors.city}</p>}
            </div>
            <div>
              <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2 block">
                Locality *
              </label>
              {localityOptions.length > 0 ? (
                <select
                  className="h-12 w-full px-4 bg-transparent border border-input rounded-md font-sans text-base focus:outline-none focus:ring-2 focus:ring-ring"
                  value={data.localityId ?? ''}
                  onChange={e => {
                    const selected = localityOptions.find(l => l.id === parseInt(e.target.value, 10));
                    set('localityId', selected?.id);
                    set('locality', selected?.name ?? '');
                  }}
                >
                  <option value="">Select locality...</option>
                  {localityOptions.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              ) : (
                <Input
                  placeholder={data.cityId ? 'No localities yet' : 'Select city first'}
                  value={data.locality ?? ''}
                  onChange={e => set('locality', e.target.value)}
                  disabled={!!data.cityId && localityOptions.length === 0}
                />
              )}
              {errors.locality && <p className="font-sans text-xs text-red-600 mt-1">{errors.locality}</p>}
            </div>
          </div>
          <div>
            <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2 block">
              Listing Intent *
            </label>
            <select
              className="h-12 w-full px-4 bg-transparent border border-input rounded-md font-sans text-base focus:outline-none focus:ring-2 focus:ring-ring"
              value={data.intent ?? 'rent'}
              onChange={e => set('intent', e.target.value as ListingInput['intent'])}
            >
              <option value="rent">For Rent</option>
              <option value="buy">For Sale</option>
            </select>
          </div>
          <div>
            <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2 block">
              Landmark (optional)
            </label>
            <Input
              placeholder="e.g. Near Forum Mall"
              value={data.landmark ?? ''}
              onChange={e => set('landmark', e.target.value)}
            />
          </div>
          <div>
            <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2 block">
              Monthly Rent (₹) *
            </label>
            <Input
              type="number"
              placeholder="8000"
              value={data.price ?? ''}
              onChange={e => set('price', parseInt(e.target.value))}
            />
            {errors.price && <p className="font-sans text-xs text-red-600 mt-1">{errors.price}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2 block">
                Room Type *
              </label>
              <select
                className="h-12 w-full px-4 bg-transparent border border-input rounded-md font-sans text-base focus:outline-none focus:ring-2 focus:ring-ring"
                value={data.roomType ?? ''}
                onChange={e => set('roomType', e.target.value as ListingInput['roomType'])}
              >
                <option value="">Select...</option>
                <option value="single">Single</option>
                <option value="double">Double Sharing</option>
                <option value="shared">Multiple Sharing</option>
              </select>
              {errors.roomType && <p className="font-sans text-xs text-red-600 mt-1">{errors.roomType}</p>}
            </div>
            <div>
              <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2 block">
                Property Type *
              </label>
              <select
                className="h-12 w-full px-4 bg-transparent border border-input rounded-md font-sans text-base focus:outline-none focus:ring-2 focus:ring-ring"
                value={data.propertyType ?? ''}
                onChange={e => set('propertyType', e.target.value as ListingInput['propertyType'])}
              >
                <option value="">Select...</option>
                <option value="pg">PG</option>
                <option value="hostel">Hostel</option>
                <option value="apartment">Apartment</option>
                <option value="flat">Flat</option>
              </select>
              {errors.propertyType && <p className="font-sans text-xs text-red-600 mt-1">{errors.propertyType}</p>}
            </div>
          </div>
        </div>
      </section>

      <section>
        <SectionLabel>Photos</SectionLabel>
        <ImageUploader images={data.images ?? []} onChange={imgs => set('images', imgs)} />
      </section>

      <section>
        <SectionLabel>More Details</SectionLabel>
        <div className="space-y-4">
          <div>
            <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2 block">
              Description
            </label>
            <textarea
              rows={4}
              placeholder="Describe the room, neighbourhood, and what makes it great..."
              value={data.description ?? ''}
              onChange={e => set('description', e.target.value)}
              className="w-full px-4 py-3 bg-transparent border border-input rounded-md font-sans text-base resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.description && <p className="font-sans text-xs text-red-600 mt-1">{errors.description}</p>}
          </div>
          <div>
            <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-3 block">
              Amenities
            </label>
            <div className="grid grid-cols-2 gap-2">
              {AMENITY_OPTIONS.map(a => (
                <label key={a} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.amenities?.includes(a) ?? false}
                    onChange={e =>
                      set(
                        'amenities',
                        e.target.checked
                          ? [...(data.amenities ?? []), a]
                          : (data.amenities ?? []).filter(x => x !== a)
                      )
                    }
                    className="accent-accent w-4 h-4"
                  />
                  <span className="font-sans text-sm capitalize">{a}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.foodIncluded ?? false}
                onChange={e => set('foodIncluded', e.target.checked)}
                className="accent-accent w-4 h-4"
              />
              <span className="font-sans text-sm">Food Included</span>
            </label>
            <div>
              <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2 block">
                Gender Preference
              </label>
              <select
                className="h-10 w-full px-3 bg-transparent border border-input rounded-md font-sans text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={data.genderPref ?? 'any'}
                onChange={e => set('genderPref', e.target.value as ListingInput['genderPref'])}
              >
                <option value="any">Any</option>
                <option value="male">Male Only</option>
                <option value="female">Female Only</option>
              </select>
            </div>
          </div>
          <div>
            <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2 block">
              House Rules
            </label>
            <textarea
              rows={2}
              placeholder="e.g. No smoking, No pets, Visitors allowed till 10pm..."
              value={data.rules ?? ''}
              onChange={e => set('rules', e.target.value)}
              className="w-full px-4 py-3 bg-transparent border border-input rounded-md font-sans text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </section>

      {errors.form && <p className="font-sans text-sm text-red-600">{errors.form}</p>}
      <div className="flex gap-4 pt-4 border-t border-border">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : listingId ? 'Save Changes' : 'Publish Listing'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
