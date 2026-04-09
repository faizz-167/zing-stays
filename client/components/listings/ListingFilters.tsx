'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

const ROOM_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'single', label: 'Single' },
  { value: 'double', label: 'Double' },
  { value: 'shared', label: 'Shared' },
];

const PROPERTY_TYPES = [
  { value: '', label: 'All Properties' },
  { value: 'pg', label: 'PG' },
  { value: 'hostel', label: 'Hostel' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'flat', label: 'Flat' },
];

const INTENT_OPTIONS = [
  { value: '', label: 'All Listings' },
  { value: 'rent', label: 'For Rent' },
  { value: 'buy', label: 'For Sale' },
];

export default function ListingFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/listings?${params.toString()}`);
  };

  return (
    <aside className="w-full md:w-64 space-y-6">
      <div>
        <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2 block">
          Listing Intent
        </label>
        <div className="space-y-1">
          {INTENT_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleChange('intent', value)}
              className={`w-full text-left px-3 py-2 rounded font-sans text-sm transition-colors ${
                searchParams.get('intent') === value ||
                (!searchParams.get('intent') && !value)
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2 block">
          Price Range (₹)
        </label>
        <div className="flex gap-2">
          <Input
            placeholder="Min"
            type="number"
            defaultValue={searchParams.get('price_min') ?? ''}
            onBlur={e => handleChange('price_min', e.target.value)}
            className="text-sm h-10"
          />
          <Input
            placeholder="Max"
            type="number"
            defaultValue={searchParams.get('price_max') ?? ''}
            onBlur={e => handleChange('price_max', e.target.value)}
            className="text-sm h-10"
          />
        </div>
      </div>

      <div>
        <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2 block">
          Room Type
        </label>
        <div className="space-y-1">
          {ROOM_TYPES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleChange('room_type', value)}
              className={`w-full text-left px-3 py-2 rounded font-sans text-sm transition-colors ${
                searchParams.get('room_type') === value ||
                (!searchParams.get('room_type') && !value)
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2 block">
          Property Type
        </label>
        <div className="space-y-1">
          {PROPERTY_TYPES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleChange('property_type', value)}
              className={`w-full text-left px-3 py-2 rounded font-sans text-sm transition-colors ${
                searchParams.get('property_type') === value || (!searchParams.get('property_type') && !value)
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2 block">
          Gender Preference
        </label>
        <div className="space-y-1">
          {[
            { value: '', label: 'Any' },
            { value: 'male', label: 'Male Only' },
            { value: 'female', label: 'Female Only' },
          ].map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleChange('gender', value)}
              className={`w-full text-left px-3 py-2 rounded font-sans text-sm transition-colors ${
                searchParams.get('gender') === value
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={searchParams.get('food_included') === 'true'}
            onChange={e => handleChange('food_included', e.target.checked ? 'true' : '')}
            className="accent-accent w-4 h-4"
          />
          <span className="font-sans text-sm">Food Included</span>
        </label>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push('/listings')}
        className="w-full"
      >
        Clear Filters
      </Button>
    </aside>
  );
}
