import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import Input from '@/components/ui/Input';
import SectionLabel from '@/components/ui/SectionLabel';
import type { ListingFormValues } from '@/lib/schemas/listing';
import type { RoomTypeOption } from './shared';

interface PropertyDetailsSectionProps {
  register: UseFormRegister<ListingFormValues>;
  errors: FieldErrors<ListingFormValues>;
  propertyType: ListingFormValues['propertyType'] | undefined;
  roomTypeOptions: RoomTypeOption[];
}

export default function PropertyDetailsSection({
  register,
  errors,
  propertyType,
  roomTypeOptions,
}: PropertyDetailsSectionProps) {
  return (
    <section>
      <SectionLabel>Property Details</SectionLabel>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
              Property Type *
            </label>
            <select
              className="h-12 w-full rounded-md border border-input bg-transparent px-4 font-sans text-base focus:outline-none focus:ring-2 focus:ring-ring"
              {...register('propertyType')}
            >
              <option value="">Select...</option>
              <option value="pg">PG</option>
              <option value="hostel">Hostel</option>
              <option value="apartment">Apartment</option>
              <option value="flat">Flat</option>
            </select>
            {errors.propertyType && <p className="mt-1 font-sans text-xs text-red-600">{errors.propertyType.message}</p>}
          </div>
          <div>
            <label className="mb-2 block font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
              Room Type *
            </label>
            <select
              className="h-12 w-full rounded-md border border-input bg-transparent px-4 font-sans text-base focus:outline-none focus:ring-2 focus:ring-ring"
              {...register('roomType')}
              disabled={roomTypeOptions.length === 0}
            >
              <option value="">{propertyType ? 'Select...' : 'Select property type first'}</option>
              {roomTypeOptions.map((roomType) => (
                <option key={roomType.value} value={roomType.value}>
                  {roomType.label}
                </option>
              ))}
            </select>
            {errors.roomType && <p className="mt-1 font-sans text-xs text-red-600">{errors.roomType.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
              Deposit (Rs, optional)
            </label>
            <Input type="number" placeholder="e.g. 20000" {...register('deposit')} />
            {errors.deposit && <p className="mt-1 font-sans text-xs text-red-600">{errors.deposit.message}</p>}
          </div>
          <div>
            <label className="mb-2 block font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
              Area (sq ft, optional)
            </label>
            <Input type="number" placeholder="e.g. 350" {...register('areaSqft')} />
            {errors.areaSqft && <p className="mt-1 font-sans text-xs text-red-600">{errors.areaSqft.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
              Available From (optional)
            </label>
            <Input type="date" {...register('availableFrom')} />
            {errors.availableFrom && <p className="mt-1 font-sans text-xs text-red-600">{errors.availableFrom.message}</p>}
          </div>
          <div>
            <label className="mb-2 block font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
              Furnishing
            </label>
            <select
              className="h-12 w-full rounded-md border border-input bg-transparent px-4 font-sans text-base focus:outline-none focus:ring-2 focus:ring-ring"
              {...register('furnishing')}
            >
              <option value="">Not specified</option>
              <option value="furnished">Furnished</option>
              <option value="semi">Semi-furnished</option>
              <option value="unfurnished">Unfurnished</option>
            </select>
            {errors.furnishing && <p className="mt-1 font-sans text-xs text-red-600">{errors.furnishing.message}</p>}
          </div>
        </div>

        <div>
          <label className="mb-2 block font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
            Preferred Tenants
          </label>
          <select
            className="h-12 w-full rounded-md border border-input bg-transparent px-4 font-sans text-base focus:outline-none focus:ring-2 focus:ring-ring"
            {...register('preferredTenants')}
          >
            <option value="any">Any</option>
            <option value="students">Students</option>
            <option value="working">Working Professionals</option>
            <option value="family">Family</option>
          </select>
          {errors.preferredTenants && <p className="mt-1 font-sans text-xs text-red-600">{errors.preferredTenants.message}</p>}
        </div>
      </div>
    </section>
  );
}
