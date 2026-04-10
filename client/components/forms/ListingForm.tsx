'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import {
  bhkRoomTypes,
  listingSchema,
  occupancyRoomTypes,
  type ListingFormValues,
  type ListingInput,
} from '@/lib/schemas/listing';
import { api } from '@/lib/api';
<<<<<<< HEAD
=======
import { useAuth } from '@/lib/auth';
import Input from '@/components/ui/Input';
>>>>>>> 5d1920d130ade9d1db7b407805e80425601798c3
import Button from '@/components/ui/Button';
import SectionLabel from '@/components/ui/SectionLabel';
import ImageUploader from './ImageUploader';
import CompletenessBar from './CompletenessBar';
<<<<<<< HEAD
import BasicDetailsSection from '@/components/forms/listing-form/BasicDetailsSection';
import PropertyDetailsSection from '@/components/forms/listing-form/PropertyDetailsSection';
import AmenitiesSection from '@/components/forms/listing-form/AmenitiesSection';
import type { CityOption, LocalityOption, RoomTypeOption } from '@/components/forms/listing-form/shared';
import { calculateListingCompleteness } from '@/lib/listingCompleteness';
=======
import PosterVerificationModal from '@/components/auth/PosterVerificationModal';

interface CityOption { id: number; name: string; slug: string; }
interface LocalityOption { id: number; name: string; slug: string; }

const AMENITY_OPTIONS = ['wifi', 'ac', 'laundry', 'parking', 'cctv', 'gym', 'kitchen', 'geyser', 'furnished', 'balcony'];
>>>>>>> 5d1920d130ade9d1db7b407805e80425601798c3

const PG_HOSTEL_ROOM_TYPES = occupancyRoomTypes.map((value) => ({
  value,
  label: value === 'multiple' ? 'Multiple Sharing' : value === 'double' ? 'Double Sharing' : 'Single',
}));

const APARTMENT_ROOM_TYPES = bhkRoomTypes.map((value) => ({
  value,
  label: value.toUpperCase(),
}));

interface ListingFormProps {
  initialData?: Partial<ListingInput>;
  listingId?: number;
}

export default function ListingForm({ initialData, listingId: listingIdProp }: ListingFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [savedDraftId, setSavedDraftId] = useState<number | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const listingId = listingIdProp ?? savedDraftId ?? undefined;
  const defaultValues = useMemo<Partial<ListingFormValues>>(() => {
    const normalizedInitialData: Partial<ListingFormValues> = {
      ...initialData,
      availableFrom:
        typeof initialData?.availableFrom === 'string'
          ? initialData.availableFrom.slice(0, 10)
          : undefined,
    };

    return {
      title: '',
      cityId: undefined,
      localityId: undefined,
      intent: 'rent',
      price: undefined,
      roomType: undefined,
      propertyType: undefined,
      deposit: undefined,
      areaSqft: undefined,
      availableFrom: undefined,
      furnishing: undefined,
      preferredTenants: 'any',
      description: undefined,
      landmark: undefined,
      address: '',
      foodIncluded: false,
      genderPref: 'any',
      amenities: [],
      rules: undefined,
      images: [],
      ...normalizedInitialData,
    };
  }, [initialData]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    resetField,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ListingFormValues, unknown, ListingInput>({
    resolver: zodResolver(listingSchema),
    defaultValues,
  });

  const watchedCityId = useWatch({ control, name: 'cityId' });
  const cityId = typeof watchedCityId === 'number' ? watchedCityId : undefined;
  const watchedPropertyType = useWatch({ control, name: 'propertyType' });
  const propertyType =
    typeof watchedPropertyType === 'string'
      ? (watchedPropertyType as ListingFormValues['propertyType'])
      : undefined;
  const formValues = useWatch({ control });
  const score = calculateListingCompleteness(formValues);

  const roomTypeOptions = useMemo<RoomTypeOption[]>(() => (
    propertyType === 'pg' || propertyType === 'hostel'
      ? PG_HOSTEL_ROOM_TYPES
      : propertyType === 'apartment' || propertyType === 'flat'
        ? APARTMENT_ROOM_TYPES
        : []
  ), [propertyType]);

  const { data: cityOptions = [] } = useQuery({
    queryKey: ['cities'],
    queryFn: () => api.get<{ data: CityOption[] }>('/cities').then((res) => res.data),
  });

  const { data: localityOptions = [] } = useQuery({
    queryKey: ['localities', cityId],
    queryFn: () => api.get<{ data: LocalityOption[] }>(`/localities?cityId=${cityId}`).then((res) => res.data),
    enabled: !!cityId,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  useEffect(() => {
    if (!propertyType) {
      return;
    }

    const allowedRoomTypes = roomTypeOptions.map((option) => option.value);
    if (formValues.roomType && !allowedRoomTypes.includes(formValues.roomType)) {
      resetField('roomType');
    }
  }, [formValues.roomType, propertyType, resetField, roomTypeOptions]);

  const onSubmit = async (data: ListingInput) => {
    setServerError(null);
    try {
      if (listingId) {
        await api.put(`/listings/${listingId}`, data);
        router.push('/dashboard/listings');
      } else {
        const created = await api.post<{ id: number }>('/listings', data);
        setSavedDraftId(created.id);
      }
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const handlePublish = async () => {
    if (!listingId) return;
    if (!user?.isPosterVerified) {
      setShowVerifyModal(true);
      return;
    }
    setPublishing(true);
    try {
      await api.patch(`/listings/${listingId}/status`, { status: 'active' });
      router.push('/dashboard/listings');
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Failed to publish listing');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <>
    {showVerifyModal && (
      <PosterVerificationModal
        onSuccess={() => {
          setShowVerifyModal(false);
          handlePublish();
        }}
        onClose={() => setShowVerifyModal(false)}
      />
    )}
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-12 max-w-2xl">
      <CompletenessBar score={score} />
<<<<<<< HEAD
      <BasicDetailsSection
        control={control}
        register={register}
        setValue={setValue}
        errors={errors}
        cityId={cityId}
        cityOptions={cityOptions}
        localityOptions={localityOptions}
      />
      <PropertyDetailsSection
        register={register}
        errors={errors}
        propertyType={propertyType}
        roomTypeOptions={roomTypeOptions}
      />
=======

      {!user?.isPosterVerified && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3">
          <span className="text-amber-500 mt-0.5 shrink-0">&#9888;</span>
          <div>
            <p className="font-sans text-sm font-medium text-amber-800">Complete verification to publish</p>
            <p className="font-sans text-xs text-amber-700 mt-0.5">
              Your listing will be saved as a draft. Verify your email and phone to make it live.
            </p>
          </div>
        </div>
      )}

      {savedDraftId && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
          <p className="font-sans text-sm font-medium text-emerald-800">Draft saved successfully.</p>
          <p className="font-sans text-xs text-emerald-700 mt-0.5">
            Use the Publish button below to make your listing live.
          </p>
        </div>
      )}

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
                    value={typeof field.value === 'number' ? field.value : ''}
                    onChange={e => {
                      field.onChange(e.target.value ? parseInt(e.target.value, 10) : undefined);
                      setValue('localityId', undefined);
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
                    value={typeof field.value === 'number' ? field.value : ''}
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
            <Input type="number" placeholder="8000" {...register('price')} />
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
              <Input type="number" placeholder="e.g. 20000" {...register('deposit')} />
              {errors.deposit && <p className="font-sans text-xs text-red-600 mt-1">{errors.deposit.message}</p>}
            </div>
            <div>
              <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2 block">
                Area (sq ft, optional)
              </label>
              <Input type="number" placeholder="e.g. 350" {...register('areaSqft')} />
              {errors.areaSqft && <p className="font-sans text-xs text-red-600 mt-1">{errors.areaSqft.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2 block">
                Available From (optional)
              </label>
              <Input type="date" {...register('availableFrom')} />
              {errors.availableFrom && <p className="font-sans text-xs text-red-600 mt-1">{errors.availableFrom.message}</p>}
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
              {errors.furnishing && <p className="font-sans text-xs text-red-600 mt-1">{errors.furnishing.message}</p>}
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
            {errors.preferredTenants && <p className="font-sans text-xs text-red-600 mt-1">{errors.preferredTenants.message}</p>}
          </div>
        </div>
      </section>
>>>>>>> 5d1920d130ade9d1db7b407805e80425601798c3

      <section>
        <SectionLabel>Photos</SectionLabel>
        <Controller
          name="images"
          control={control}
          render={({ field }) => (
            <ImageUploader images={field.value ?? []} onChange={field.onChange} />
          )}
        />
      </section>
      <AmenitiesSection control={control} register={register} errors={errors} />

      {serverError && <p className="font-sans text-sm text-red-600">{serverError}</p>}
      <div className="flex gap-4 pt-4 border-t border-border">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : listingIdProp ? 'Save Changes' : 'Save Draft'}
        </Button>
        {(savedDraftId || listingIdProp) && (
          <Button
            type="button"
            variant="secondary"
            onClick={handlePublish}
            disabled={publishing}
          >
            {publishing ? 'Publishing...' : user?.isPosterVerified ? 'Publish Listing' : 'Publish (Verify First)'}
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
    </>
  );
}
