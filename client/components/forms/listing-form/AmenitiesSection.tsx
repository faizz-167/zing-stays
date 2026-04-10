import { Controller, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import SectionLabel from '@/components/ui/SectionLabel';
import type { ListingFormValues, ListingInput } from '@/lib/schemas/listing';
import { AMENITY_OPTIONS } from './shared';

interface AmenitiesSectionProps {
  control: Control<ListingFormValues, unknown, ListingInput>;
  register: UseFormRegister<ListingFormValues>;
  errors: FieldErrors<ListingFormValues>;
}

export default function AmenitiesSection({ control, register, errors }: AmenitiesSectionProps) {
  return (
    <section>
      <SectionLabel>Amenities</SectionLabel>
      <div className="space-y-4">
        <div>
          <label className="mb-2 block font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
            Description
          </label>
          <textarea
            rows={4}
            placeholder="Describe the room, neighbourhood, and what makes it great..."
            {...register('description')}
            className="w-full resize-none rounded-md border border-input bg-transparent px-4 py-3 font-sans text-base focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {errors.description && <p className="mt-1 font-sans text-xs text-red-600">{errors.description.message}</p>}
        </div>

        <div>
          <label className="mb-3 block font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
            Amenities
          </label>
          <Controller
            name="amenities"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-2 gap-2">
                {AMENITY_OPTIONS.map((amenity) => (
                  <label key={amenity} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={(field.value ?? []).includes(amenity)}
                      onChange={(e) =>
                        field.onChange(
                          e.target.checked
                            ? [...(field.value ?? []), amenity]
                            : (field.value ?? []).filter((value) => value !== amenity),
                        )
                      }
                      className="h-4 w-4 accent-accent"
                    />
                    <span className="font-sans text-sm capitalize">{amenity}</span>
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
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className="h-4 w-4 accent-accent"
                />
                <span className="font-sans text-sm">Food Included</span>
              </label>
            )}
          />
          <div>
            <label className="mb-2 block font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
              Gender Preference
            </label>
            <select
              className="h-10 w-full rounded-md border border-input bg-transparent px-3 font-sans text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              {...register('genderPref')}
            >
              <option value="any">Any</option>
              <option value="male">Male Only</option>
              <option value="female">Female Only</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-2 block font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
            House Rules
          </label>
          <textarea
            rows={2}
            placeholder="e.g. No smoking, No pets, Visitors allowed till 10pm..."
            {...register('rules')}
            className="w-full resize-none rounded-md border border-input bg-transparent px-4 py-3 font-sans text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
    </section>
  );
}
