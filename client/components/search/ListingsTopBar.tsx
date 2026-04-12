'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Chip } from '@/components/ui/Chip';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

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

interface ListingsTopBarProps {
  initialCity?: City | null;
  initialLocalities?: Locality[];
}

const MAX_LOCALITIES = 3;
const MAX_NEARBY = 5;

export default function ListingsTopBar({
  initialCity = null,
  initialLocalities = [],
}: ListingsTopBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialCityIdRef = useRef(searchParams.get('cityId') ?? (initialCity ? String(initialCity.id) : null));
  const initialLocalityIdsRef = useRef(
    searchParams.getAll('localityId').length > 0
      ? searchParams.getAll('localityId')
      : initialLocalities.map((locality) => String(locality.id)),
  );

  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<City | null>(initialCity);
  const [cityLocalities, setCityLocalities] = useState<Locality[]>([]);
  const [selectedLocalities, setSelectedLocalities] = useState<Locality[]>(initialLocalities.slice(0, MAX_LOCALITIES));
  const [localityInput, setLocalityInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [nearbyLocalities, setNearbyLocalities] = useState<Locality[]>([]);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ data: City[] }>('/cities')
      .then((d) => {
        if (cancelled) return;
        const rows = d.data ?? [];
        setCities(rows);
        const cityId = initialCityIdRef.current ? Number(initialCityIdRef.current) : null;
        if (cityId && !selectedCity) {
          const city = rows.find(c => c.id === cityId) ?? null;
          if (city) setSelectedCity(city);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedCity]);

  useEffect(() => {
    if (!selectedCity) return;

    let cancelled = false;
    api
      .get<{ data: Locality[] }>(`/localities?cityId=${selectedCity.id}`)
      .then((d) => {
        if (!cancelled) {
          const rows = d.data ?? [];
          setCityLocalities(rows);
          if (selectedLocalities.length === 0 && initialLocalityIdsRef.current.length > 0) {
            const selected = rows
              .filter((l) => initialLocalityIdsRef.current.includes(String(l.id)))
              .slice(0, MAX_LOCALITIES);
            if (selected.length > 0) {
              setSelectedLocalities(selected);
            }
          }
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [selectedCity, selectedLocalities.length]);

  useEffect(() => {
    if (selectedLocalities.length === 0) {
      return;
    }

    let cancelled = false;
    api
      .get<{ nearby: Locality[] }>(`/places/nearby?localityId=${selectedLocalities[0].id}`)
      .then((d) => {
        if (!cancelled) {
          const nearby = (d.nearby ?? []).slice(0, MAX_NEARBY);
          setNearbyLocalities(nearby);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [selectedLocalities]);

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

  const isLocalitySelected = (id: number) => selectedLocalities.some(l => l.id === id);

  const intent = searchParams.get('intent') === 'buy' ? 'buy' : 'rent';

  const handleIntentChange = (nextIntent: 'rent' | 'buy') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('intent', nextIntent);
    const query = params.toString();
    router.push(query ? `/listings?${query}` : '/listings');
  };

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('intent', intent);
    if (selectedCity) params.set('cityId', String(selectedCity.id));
    else params.delete('cityId');
    params.delete('localityId');
    selectedLocalities.forEach(l => params.append('localityId', String(l.id)));

    const query = params.toString();
    router.push(query ? `/listings?${query}` : '/listings');
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(['rent', 'buy'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => handleIntentChange(tab)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                intent === tab
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {tab === 'rent' ? 'Rent' : 'Buy'}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleSearch}
          className="inline-flex items-center justify-center rounded-md bg-accent px-5 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-secondary transition-colors"
        >
          Search
        </button>
      </div>

      <div className="mt-4 flex flex-col lg:flex-row gap-3">
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
          <div className="flex flex-wrap gap-2 items-center min-h-[48px] border border-border rounded-md px-3 py-2 bg-background focus-within:ring-2 focus-within:ring-ring">
            {selectedLocalities.map(loc => (
              <Chip key={loc.id} label={loc.name} onRemove={() => removeLocality(loc.id)} />
            ))}
            {selectedLocalities.length < MAX_LOCALITIES && (
              <div className="flex min-w-[160px] flex-1 items-center gap-2">
                {selectedLocalities.length > 0 && (
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                    + Add area
                  </span>
                )}
                <input
                  type="text"
                  value={localityInput}
                  onChange={e => {
                    setLocalityInput(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  placeholder={selectedLocalities.length === 0 ? 'Area or locality' : 'Search another locality'}
                  className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  disabled={!selectedCity}
                />
              </div>
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
      </div>

      {selectedLocalities.length > 0 && nearbyLocalities.length > 0 && (
        <div className="mt-4">
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
    </div>
  );
}
