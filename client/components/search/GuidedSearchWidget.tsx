'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Chip } from '@/components/ui/Chip';
import { api } from '@/lib/api';

interface City {
  id: number;
  name: string;
  slug: string;
}

interface Locality {
  id: number;
  name: string;
  slug: string;
  cityId?: number;
}

const BHK_OPTIONS = ['1bhk', '2bhk', '3bhk', '4bhk'] as const;
const OCCUPANCY_OPTIONS = ['single', 'double', 'multiple'] as const;

const ROOM_TYPE_LABELS: Record<string, string> = {
  '1bhk': '1 BHK',
  '2bhk': '2 BHK',
  '3bhk': '3 BHK',
  '4bhk': '4 BHK',
  single: 'Single',
  double: 'Double',
  multiple: 'Multiple',
};

const PROPERTY_TYPES_RENT = [
  { value: 'pg', label: 'PG' },
  { value: 'hostel', label: 'Hostel' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'flat', label: 'Flat' },
] as const;

const MAX_LOCALITIES = 3;

export default function GuidedSearchWidget() {
  const router = useRouter();

  const [intent, setIntent] = useState<'rent' | 'buy'>('rent');
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [cityLocalities, setCityLocalities] = useState<Locality[]>([]);
  const [selectedLocalities, setSelectedLocalities] = useState<Locality[]>([]);
  const [localityInput, setLocalityInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [nearbyLocalities, setNearbyLocalities] = useState<Locality[]>([]);
  const [selectedRoomTypes, setSelectedRoomTypes] = useState<string[]>([]);
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>('');

  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch cities on mount
  useEffect(() => {
    api
      .get<{ data: City[] }>('/cities')
      .then(d => setCities(d.data ?? []))
      .catch(() => {});
  }, []);

  // Fetch localities when city changes
  useEffect(() => {
    if (!selectedCity) {
      return;
    }

    let cancelled = false;
    api
      .get<{ data: Locality[] }>(`/localities?cityId=${selectedCity.id}`)
      .then((d) => {
        if (!cancelled) {
          setCityLocalities(d.data ?? []);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [selectedCity]);

  // Fetch nearby after first locality is selected
  useEffect(() => {
    if (selectedLocalities.length === 0) {
      return;
    }

    let cancelled = false;
    api
      .get<{ nearby: Locality[] }>(`/places/nearby?localityId=${selectedLocalities[0].id}`)
      .then((d) => {
        if (!cancelled) {
          setNearbyLocalities(d.nearby ?? []);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [selectedLocalities]);

  const handleIntentChange = (newIntent: 'rent' | 'buy') => {
    setIntent(newIntent);
    setSelectedRoomTypes([]);
    if (newIntent === 'buy') {
      setSelectedPropertyType('');
    }
  };

  const handlePropertyTypeChange = (pt: string) => {
    const next = selectedPropertyType === pt ? '' : pt;
    setSelectedPropertyType(next);
    // Clear room types when switching between pg/hostel and apt/flat
    setSelectedRoomTypes([]);
  };

  const isPgOrHostel = selectedPropertyType === 'pg' || selectedPropertyType === 'hostel';
  const subFilterOptions = intent === 'buy' || !isPgOrHostel ? BHK_OPTIONS : OCCUPANCY_OPTIONS;

  const filteredLocalities = localityInput
    ? cityLocalities.filter(
        l =>
          l.name.toLowerCase().includes(localityInput.toLowerCase()) &&
          !selectedLocalities.find(s => s.id === l.id),
      )
    : [];

  const addLocality = (locality: Locality) => {
    if (selectedLocalities.length >= MAX_LOCALITIES) return;
    if (selectedLocalities.find(l => l.id === locality.id)) return;
    setSelectedLocalities(prev => [...prev, locality]);
    setLocalityInput('');
    setShowDropdown(false);
  };

  const removeLocality = (id: number) => {
    setSelectedLocalities((prev) => {
      const next = prev.filter((l) => l.id !== id);
      if (next.length === 0) {
        setNearbyLocalities([]);
      }
      return next;
    });
  };

  const toggleRoomType = (rt: string) => {
    setSelectedRoomTypes(prev =>
      prev.includes(rt) ? prev.filter(r => r !== rt) : [...prev, rt],
    );
  };

  const isLocalitySelected = (id: number) => selectedLocalities.some(l => l.id === id);

  const handleSearch = () => {
    const params = new URLSearchParams();
    params.set('intent', intent);
    if (selectedCity) params.set('cityId', String(selectedCity.id));
    selectedLocalities.forEach(l => params.append('localityId', String(l.id)));
    selectedRoomTypes.forEach(rt => params.append('roomType', rt));
    if (selectedPropertyType) params.set('propertyType', selectedPropertyType);
    router.push(`/listings?${params.toString()}`);
  };

  return (
    <div className="w-full max-w-2xl bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
      {/* Row 1: Intent tabs */}
      <div className="flex gap-2">
        {(['rent', 'buy'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => handleIntentChange(tab)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
              intent === tab
                ? 'bg-accent text-accent-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'rent' ? 'Rent' : 'Buy'}
          </button>
        ))}
      </div>

      {/* Row 2: City selector + locality typeahead + search button */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={selectedCity?.id ?? ''}
          onChange={e => {
            const city = cities.find(c => c.id === Number(e.target.value)) ?? null;
            setSelectedCity(city);
            setCityLocalities([]);
            setSelectedLocalities([]);
            setNearbyLocalities([]);
            setLocalityInput('');
            setShowDropdown(false);
          }}
          className="flex-shrink-0 bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Select city</option>
          {cities.map(city => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>

        <div className="relative flex-1">
          <div className="flex flex-wrap gap-1 items-center min-h-[40px] border border-border rounded-md px-3 py-1.5 bg-background focus-within:ring-2 focus-within:ring-ring">
            {selectedLocalities.map(loc => (
              <Chip key={loc.id} label={loc.name} onRemove={() => removeLocality(loc.id)} />
            ))}
            {selectedLocalities.length < MAX_LOCALITIES && (
              <input
                ref={inputRef}
                type="text"
                value={localityInput}
                onChange={e => {
                  setLocalityInput(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                placeholder={selectedLocalities.length === 0 ? 'Area or locality' : '+ Add area'}
                className="flex-1 min-w-[100px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                disabled={!selectedCity}
              />
            )}
          </div>

          {showDropdown && filteredLocalities.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-auto">
              {filteredLocalities.map(loc => (
                <button
                  key={loc.id}
                  type="button"
                  onMouseDown={() => addLocality(loc)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors"
                >
                  {loc.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleSearch}
          className="flex-shrink-0 bg-accent text-accent-foreground rounded-md px-5 py-2 text-sm font-medium hover:bg-accent-secondary transition-colors"
        >
          Search
        </button>
      </div>

      {/* Row 3: Nearby locality chips (shown after first locality selected) */}
      {selectedLocalities.length > 0 && nearbyLocalities.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Nearby areas:</p>
          <div className="flex flex-wrap gap-2">
            {nearbyLocalities.map(loc => {
              const alreadySelected = isLocalitySelected(loc.id);
              const atMax = selectedLocalities.length >= MAX_LOCALITIES;
              return (
                <Chip
                  key={loc.id}
                  label={loc.name}
                  active={alreadySelected}
                  onClick={() => {
                    if (!alreadySelected) addLocality(loc);
                  }}
                  disabled={(atMax && !alreadySelected) || alreadySelected}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Row 4: Property type filter (rent only) */}
      {intent === 'rent' && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Property type:</p>
          <div className="flex flex-wrap gap-2">
            {PROPERTY_TYPES_RENT.map(({ value, label }) => (
              <Chip
                key={value}
                label={label}
                active={selectedPropertyType === value}
                onClick={() => handlePropertyTypeChange(value)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Row 4b: Sub-filter chips (BHK or occupancy) */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">
          {isPgOrHostel && intent === 'rent' ? 'Sharing type:' : 'Room type:'}
        </p>
        <div className="flex flex-wrap gap-2">
          {subFilterOptions.map(opt => (
            <Chip
              key={opt}
              label={ROOM_TYPE_LABELS[opt] ?? opt}
              active={selectedRoomTypes.includes(opt)}
              onClick={() => toggleRoomType(opt)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
