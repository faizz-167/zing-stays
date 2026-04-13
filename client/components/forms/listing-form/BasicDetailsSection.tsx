import { Controller, type Control, type FieldErrors, type UseFormRegister, type UseFormSetValue } from 'react-hook-form';
import Input from '@/components/ui/Input';
import SectionLabel from '@/components/ui/SectionLabel';
import type { ListingFormValues, ListingInput } from '@/lib/schemas/listing';
import type { CityOption, LocalityOption } from './shared';

interface BasicDetailsSectionProps {
  control: Control<ListingFormValues, unknown, ListingInput>;
  register: UseFormRegister<ListingFormValues>;
  setValue: UseFormSetValue<ListingFormValues>;
  errors: FieldErrors<ListingFormValues>;
  cityId: number | undefined;
  cityOptions: CityOption[];
  localityOptions: LocalityOption[];
}

export default function BasicDetailsSection({
  control,
  register,
  setValue,
  errors,
  cityId,
  cityOptions,
  localityOptions,
}: BasicDetailsSectionProps) {
  return (
    <section>
      <SectionLabel>Basic Details</SectionLabel>
      <div className="space-y-4">
        <div>
          <label className="mb-2 block font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
            Listing Title *
          </label>
          <Input placeholder="e.g. Furnished Single Room near MG Road" {...register('title')} />
          {errors.title && <p className="mt-1 font-sans text-xs text-red-600">{errors.title.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
              City *
            </label>
            <Controller
              name="cityId"
              control={control}
              render={({ field }) => (
                <select
                  className="h-12 w-full rounded-md border border-input bg-transparent px-4 font-sans text-base focus:outline-none focus:ring-2 focus:ring-ring"
                  value={typeof field.value === 'number' ? field.value : ''}
                  onChange={(e) => {
                    field.onChange(e.target.value ? parseInt(e.target.value, 10) : undefined);
                    setValue('localityId', undefined);
                  }}
                >
                  <option value="">{cityOptions.length > 0 ? 'Select city...' : 'Loading cities...'}</option>
                  {cityOptions.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.cityId && <p className="mt-1 font-sans text-xs text-red-600">{errors.cityId.message}</p>}
          </div>
          <div>
            <label className="mb-2 block font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
              Locality *
            </label>
            <Controller
              name="localityId"
              control={control}
              render={({ field }) => (
                <select
                  className="h-12 w-full rounded-md border border-input bg-transparent px-4 font-sans text-base focus:outline-none focus:ring-2 focus:ring-ring"
                  value={typeof field.value === 'number' ? field.value : ''}
                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                  disabled={!cityId || localityOptions.length === 0}
                >
                  <option value="">
                    {!cityId ? 'Select city first' : localityOptions.length > 0 ? 'Select locality...' : 'No localities available'}
                  </option>
                  {localityOptions.map((locality) => (
                    <option key={locality.id} value={locality.id}>
                      {locality.name}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.localityId && <p className="mt-1 font-sans text-xs text-red-600">{errors.localityId.message}</p>}
          </div>
        </div>

        <div>
          <label className="mb-2 block font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
            Listing Intent *
          </label>
          <select
            className="h-12 w-full rounded-md border border-input bg-transparent px-4 font-sans text-base focus:outline-none focus:ring-2 focus:ring-ring"
            {...register('intent')}
          >
            <option value="rent">For Rent</option>
            <option value="buy">For Sale</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
            Landmark (optional)
          </label>
          <Input placeholder="e.g. Near Forum Mall" {...register('landmark')} />
        </div>

        <div>
          <label className="mb-2 block font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
            Address *
          </label>
          <Input placeholder="Street, building, area..." {...register('address')} />
          {errors.address && <p className="mt-1 font-sans text-xs text-red-600">{errors.address.message}</p>}
        </div>

        <div>
          <label className="mb-2 block font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
            Monthly Rent (Rs) *
          </label>
          <Input type="number" placeholder="8000" {...register('price')} />
          {errors.price && <p className="mt-1 font-sans text-xs text-red-600">{errors.price.message}</p>}
        </div>
      </div>
    </section>
  );
}
