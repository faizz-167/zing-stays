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
import { useAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import SectionLabel from '@/components/ui/SectionLabel';
import ImageUploader from './ImageUploader';
import CompletenessBar from './CompletenessBar';
import BasicDetailsSection from '@/components/forms/listing-form/BasicDetailsSection';
import PropertyDetailsSection from '@/components/forms/listing-form/PropertyDetailsSection';
import AmenitiesSection from '@/components/forms/listing-form/AmenitiesSection';
import type { CityOption, LocalityOption, RoomTypeOption } from '@/components/forms/listing-form/shared';
import { calculateListingCompleteness } from '@/lib/listingCompleteness';
import PosterVerificationModal from '@/components/auth/PosterVerificationModal';

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
  isPublished?: boolean;
}

export default function ListingForm({ initialData, listingId: listingIdProp, isPublished }: ListingFormProps) {
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
          {(savedDraftId || (listingIdProp && !isPublished)) && (
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
