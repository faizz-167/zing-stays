'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { listingSchema, type ListingInput } from '@/lib/schemas/listing';
import { api } from '@/lib/api';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import SectionLabel from '@/components/ui/SectionLabel';
import ImageUploader from './ImageUploader';
import CompletenessBar from './CompletenessBar';

interface CityOption { id: number; name: string; slug: string; }
interface LocalityOption { id: number; name: string; slug: string; }

const AMENITY_OPTIONS = ['wifi', 'ac', 'laundry', 'parking', 'cctv', 'gym', 'kitchen', 'geyser', 'furnished', 'balcony'];

const PG_HOSTEL_ROOM_TYPES = [
  { value: 'single', label: 'Single' },
  { value: 'double', label: 'Double Sharing' },
  { value: 'multiple', label: 'Multiple Sharing' },
] as const;

const APARTMENT_ROOM_TYPES = [
  { value: '1bhk', label: '1 BHK' },
  { value: '2bhk', label: '2 BHK' },
  { value: '3bhk', label: '3 BHK' },
  { value: '4bhk', label: '4 BHK' },
] as const;

function calcLocalScore(data: Partial<ListingInput>): number {
  let s = 0;
  if (data.cityId) s += 10;
  if (data.localityId) s += 10;
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
  const [cityOptions, setCityOptions] = useState<CityOption[]>([]);
  const [localityOptions, setLocalityOptions] = useState<LocalityOption[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ListingInput>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      amenities: [],
      images: [],
      foodIncluded: false,
      genderPref: 'any',
      intent: 'rent',
      preferredTenants: 'any',
      ...initialData,
    },
  });

  const cityId = watch('cityId');
  const propertyType = watch('propertyType');
  const images = watch('images');
  const formValues = watch();
  const score = calcLocalScore(formValues);

  const roomTypeOptions = (propertyType === 'pg' || propertyType === 'hostel')
    ? PG_HOSTEL_ROOM_TYPES
    : (propertyType === 'apartment' || propertyType === 'flat')
      ? APARTMENT_ROOM_TYPES
      : [];

  useEffect(() => {
    api.get<{ data: CityOption[] }>('/cities').then(res => setCityOptions(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!cityId) { setLocalityOptions([]); return; }
    api.get<{ data: LocalityOption[] }>(`/localities?cityId=${cityId}`)
      .then(res => setLocalityOptions(res.data))
      .catch(() => {});
  }, [cityId]);

  const onSubmit = async (data: ListingInput) => {
    setServerError(null);
    try {
      if (listingId) {
        await api.put(`/listings/${listingId}`, data);
      } else {
        await api.post('/listings', data);
      }
      router.push('/dashboard/listings');
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-12 max-w-2xl">
      <CompletenessBar score={score} />

      <section>
        <SectionLabel>Basic Details</SectionLabel>
        <div className="space-y-4">
          <div>
            <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2 block">
              Listing Title *
            </label>
            <Input placeholder="e.g. Furnished Single Room near MG Road" {...register('title')} />
            {errors.title && <p className="font-sans text-xs text-red-600 mt-1">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2 block">
                City *
              </label>
              <Controller
                name="cityId"
                control={control}
                render={({ field }) => (
                  <select
                    className="h-12 w-full px-4 bg-transparent border border-input rounded-md font-sans text-base focus:outline-none focus:ring-2 focus:ring-ring"
                    value={field.value ?? ''}
                    onChange={e => {
                      field.onChange(e.target.value ? parseInt(e.target.value, 10) : undefined);
                      setValue('localityId', 0);
                    }}
                  >
                    <option value="">{cityOptions.length > 0 ? 'Select city...' : 'Loading cities...'}</option>
                    {cityOptions.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
              />
              {errors.cityId && <p className="font-sans text-xs text-red-600 mt-1">{errors.cityId.message}</p>}
            </div>
            <div>
              <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2 block">
                Locality *
              </label>
              <Controller
                name="localityId"
                control={control}
                render={({ field }) => (
                  <select
                    className="h-12 w-full px-4 bg-transparent border border-input rounded-md font-sans text-base focus:outline-none focus:ring-2 focus:ring-ring"
                    value={field.value ?? ''}
                    onChange={e => field.onChange(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    disabled={!cityId || localityOptions.length === 0}
                  >
                    <option value="">
                      {!cityId ? 'Select city first' : localityOptions.length > 0 ? 'Select locality...' : 'No localities available'}
                    </option>
                    {localityOptions.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                )}
              />
              {errors.localityId && <p className="font-sans text-xs text-red-600 mt-1">{errors.localityId.message}</p>}
            </div>
          </div>

          <div>
            <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2 block">
              Listing Intent *
            </label>
            <select
              className="h-12 w-full px-4 bg-transparent border border-input rounded-md font-sans text-base focus:outline-none focus:ring-2 focus:ring-ring"
              {...register('intent')}
            >
              <option value="rent">For Rent</option>
              <option value="buy">For Sale</option>
            </select>
          </div>

          <div>
            <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2 block">
              Landmark (optional)
            </label>
            <Input placeholder="e.g. Near Forum Mall" {...register('landmark')} />
          </div>

          <div>
            <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2 block">
              Monthly Rent (₹) *
            </label>
            <Input type="number" placeholder="8000" {...register('price', { valueAsNumber: true })} />
            {errors.price && <p className="font-sans text-xs text-red-600 mt-1">{errors.price.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2 block">
                Property Type *
              </label>
              <select
                className="h-12 w-full px-4 bg-transparent border border-input rounded-md font-sans text-base focus:outline-none focus:ring-2 focus:ring-ring"
                {...register('propertyType')}
              >
                <option value="">Select...</option>
                <option value="pg">PG</option>
                <option value="hostel">Hostel</option>
                <option value="apartment">Apartment</option>
                <option value="flat">Flat</option>
              </select>
              {errors.propertyType && <p className="font-sans text-xs text-red-600 mt-1">{errors.propertyType.message}</p>}
            </div>
            <div>
              <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2 block">
                Room Type *
              </label>
              <select
                className="h-12 w-full px-4 bg-transparent border border-input rounded-md font-sans text-base focus:outline-none focus:ring-2 focus:ring-ring"
                {...register('roomType')}
                disabled={roomTypeOptions.length === 0}
              >
                <option value="">{propertyType ? 'Select...' : 'Select property type first'}</option>
                {roomTypeOptions.map(rt => (
                  <option key={rt.value} value={rt.value}>{rt.label}</option>
                ))}
              </select>
              {errors.roomType && <p className="font-sans text-xs text-red-600 mt-1">{errors.roomType.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2 block">
                Deposit (₹, optional)
              </label>
              <Input type="number" placeholder="e.g. 20000" {...register('deposit', { valueAsNumber: true })} />
            </div>
            <div>
              <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2 block">
                Area (sq ft, optional)
              </label>
              <Input type="number" placeholder="e.g. 350" {...register('areaSqft', { valueAsNumber: true })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2 block">
                Available From (optional)
              </label>
              <Input type="date" {...register('availableFrom')} />
            </div>
            <div>
              <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2 block">
                Furnishing
              </label>
              <select
                className="h-12 w-full px-4 bg-transparent border border-input rounded-md font-sans text-base focus:outline-none focus:ring-2 focus:ring-ring"
                {...register('furnishing')}
              >
                <option value="">Not specified</option>
                <option value="furnished">Furnished</option>
                <option value="semi">Semi-furnished</option>
                <option value="unfurnished">Unfurnished</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2 block">
              Preferred Tenants
            </label>
            <select
              className="h-12 w-full px-4 bg-transparent border border-input rounded-md font-sans text-base focus:outline-none focus:ring-2 focus:ring-ring"
              {...register('preferredTenants')}
            >
              <option value="any">Any</option>
              <option value="students">Students</option>
              <option value="working">Working Professionals</option>
              <option value="family">Family</option>
            </select>
          </div>
        </div>
      </section>

      <section>
        <SectionLabel>Photos</SectionLabel>
        <Controller
          name="images"
          control={control}
          render={({ field }) => (
            <ImageUploader images={field.value} onChange={field.onChange} />
          )}
        />
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
              {...register('description')}
              className="w-full px-4 py-3 bg-transparent border border-input rounded-md font-sans text-base resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.description && <p className="font-sans text-xs text-red-600 mt-1">{errors.description.message}</p>}
          </div>

          <div>
            <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-3 block">
              Amenities
            </label>
            <Controller
              name="amenities"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2">
                  {AMENITY_OPTIONS.map(a => (
                    <label key={a} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.value.includes(a)}
                        onChange={e =>
                          field.onChange(
                            e.target.checked
                              ? [...field.value, a]
                              : field.value.filter(x => x !== a)
                          )
                        }
                        className="accent-accent w-4 h-4"
                      />
                      <span className="font-sans text-sm capitalize">{a}</span>
                    </label>
                  ))}
                </div>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="foodIncluded"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={e => field.onChange(e.target.checked)}
                    className="accent-accent w-4 h-4"
                  />
                  <span className="font-sans text-sm">Food Included</span>
                </label>
              )}
            />
            <div>
              <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2 block">
                Gender Preference
              </label>
              <select
                className="h-10 w-full px-3 bg-transparent border border-input rounded-md font-sans text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                {...register('genderPref')}
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
              {...register('rules')}
              className="w-full px-4 py-3 bg-transparent border border-input rounded-md font-sans text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </section>

      {serverError && <p className="font-sans text-sm text-red-600">{serverError}</p>}
      <div className="flex gap-4 pt-4 border-t border-border">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : listingId ? 'Save Changes' : 'Publish Listing'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
