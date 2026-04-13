'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Chip } from '@/components/ui/Chip';
import { api } from '@/lib/api';
import { Search, MapPin, ChevronDown, Clock, Loader2, SlidersHorizontal, X } from 'lucide-react';
import { useRecentSearches, RecentSearch } from '@/hooks/useRecentSearches';
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
  const { recentSearches, addSearch } = useRecentSearches();

  const [intent, setIntent] = useState<'rent' | 'buy'>('rent');
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [cityLocalities, setCityLocalities] = useState<Locality[]>([]);
  const [selectedLocalities, setSelectedLocalities] = useState<Locality[]>([]);
  const [localityInput, setLocalityInput] = useState('');
  
  // Dropdowns & Popovers
  const [showLocalityDropdown, setShowLocalityDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const [nearbyLocalities, setNearbyLocalities] = useState<Locality[]>([]);
  const [selectedRoomTypes, setSelectedRoomTypes] = useState<string[]>([]);
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>('');
  
  // Loading UX
  const [isSearching, setIsSearching] = useState(false);
  const [citiesError, setCitiesError] = useState(false);
  const [localitiesError, setLocalitiesError] = useState(false);

  // Refs for click-outside handles
  const inputRef = useRef<HTMLInputElement>(null);
  const cityDropdownRef = useRef<HTMLDivElement>(null);
  const localityDropdownRef = useRef<HTMLDivElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch initial data
  useEffect(() => {
    api
      .get<{ data: City[] }>('/cities')
      .then((d) => {
        const fetchedCities = d.data ?? [];
        setCities(fetchedCities);
        // Smart Default: Pre-select Bangalore or the first city if available
        if (fetchedCities.length > 0 && !selectedCity) {
          const defaultCity = fetchedCities.find(c => c.slug === 'bangalore') || fetchedCities[0];
          setSelectedCity(defaultCity);
        }
      })
      .catch(() => { setCitiesError(true); });
  }, []);

  // Fetch localities for selected city
  useEffect(() => {
    if (!selectedCity) return;
    let cancelled = false;
    setLocalitiesError(false);
    api
      .get<{ data: Locality[] }>(`/localities?cityId=${selectedCity.id}`)
      .then((d) => {
        if (!cancelled) setCityLocalities(d.data ?? []);
      })
      .catch(() => { if (!cancelled) setLocalitiesError(true); });
    return () => { cancelled = true; };
  }, [selectedCity]);

  // Fetch nearby localities when at least one is selected
  useEffect(() => {
    if (selectedLocalities.length === 0) {
      setNearbyLocalities([]);
      return;
    }
    let cancelled = false;
    api
      .get<{ nearby: Locality[] }>(`/places/nearby?localityId=${selectedLocalities[0].id}`)
      .then((d) => {
        if (!cancelled) setNearbyLocalities(d.nearby ?? []);
      })
      .catch(() => { if (!cancelled) setNearbyLocalities([]); });
    return () => { cancelled = true; };
  }, [selectedLocalities]);

  // Click outside listener for all custom dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(target)) {
        setShowCityDropdown(false);
      }
      if (localityDropdownRef.current && !localityDropdownRef.current.contains(target)) {
        setShowLocalityDropdown(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(target)) {
        setShowFilters(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handlers
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
    setSelectedRoomTypes([]); // reset dependent sub-filters
  };

  const addLocality = (locality: Locality) => {
    if (selectedLocalities.length >= MAX_LOCALITIES) return;
    if (selectedLocalities.find(l => l.id === locality.id)) return;
    setSelectedLocalities(prev => [...prev, locality]);
    setLocalityInput('');
    setShowLocalityDropdown(false);
    inputRef.current?.focus();
  };

  const removeLocality = (id: number) => {
    setSelectedLocalities(prev => prev.filter(l => l.id !== id));
  };

  const toggleRoomType = (rt: string) => {
    setSelectedRoomTypes(prev =>
      prev.includes(rt) ? prev.filter(r => r !== rt) : [...prev, rt],
    );
  };

  const handleCitySelect = (city: City) => {
    setSelectedCity(city);
    setCityLocalities([]);
    setSelectedLocalities([]);
    setNearbyLocalities([]);
    setLocalityInput('');
    setShowCityDropdown(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const loadRecentSearch = (search: RecentSearch) => {
    setIntent(search.intent);
    if (search.city) setSelectedCity(cities.find(c => c.id === search.city?.id) || { ...search.city, slug: '' });
    setSelectedLocalities(search.localities.map(l => ({ ...l, slug: '' })));
    setSelectedPropertyType(search.propertyType || '');
    setSelectedRoomTypes(search.roomTypes || []);
    setShowLocalityDropdown(false);
  };

  const handleSearch = () => {
    setIsSearching(true);
    
    // Save to recent searches
    addSearch({
      intent,
      city: selectedCity ? { id: selectedCity.id, name: selectedCity.name } : null,
      localities: selectedLocalities.map(l => ({ id: l.id, name: l.name })),
      roomTypes: selectedRoomTypes,
      propertyType: selectedPropertyType,
    });

    const params = new URLSearchParams();
    params.set('intent', intent);
    if (selectedCity) params.set('cityId', String(selectedCity.id));
    selectedLocalities.forEach(l => params.append('localityId', String(l.id)));
    selectedRoomTypes.forEach(rt => params.append('roomType', rt));
    if (selectedPropertyType) params.set('propertyType', selectedPropertyType);
    
    // Slight artificial delay to show off the loading interaction, then navigate
    setTimeout(() => {
      router.push(`/listings?${params.toString()}`);
    }, 400); 
  };

  const isPgOrHostel = selectedPropertyType === 'pg' || selectedPropertyType === 'hostel';
  const subFilterOptions = intent === 'buy' || !isPgOrHostel ? BHK_OPTIONS : OCCUPANCY_OPTIONS;
  
  const filteredLocalities = localityInput
    ? cityLocalities.filter(
        l => l.name.toLowerCase().includes(localityInput.toLowerCase()) && !selectedLocalities.find(s => s.id === l.id)
      )
    : [];

  const filterCount = selectedRoomTypes.length + (selectedPropertyType ? 1 : 0);

  return (
    <div className="w-full max-w-[800px] mx-auto z-50 relative">
      {/* ─── Intent Tabs (Premium Airbnb Style) ─── */}
      <div className="flex justify-center mb-0 sm:justify-start sm:ml-4">
        <div className="flex bg-card/90 backdrop-blur-sm rounded-t-xl px-2 pt-2 border-x border-t border-border/80 shadow-md">
          {(['rent', 'buy'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => handleIntentChange(tab)}
              className={`
                relative px-6 py-3 text-sm font-semibold transition-all duration-300
                ${intent === tab
                  ? 'text-accent'
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
            >
              {tab === 'rent' ? 'Rent' : 'Buy'}
              {intent === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent rounded-t-full shadow-[0_-2px_8px_rgba(184,134,11,0.4)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Unified Composite Search Bar ─── */}
      <div className="flex flex-col sm:flex-row items-stretch bg-card shadow-lg shadow-black/5 rounded-xl sm:rounded-tl-none rounded-tl-xl sm:rounded-tr-xl border border-border/80 relative z-50">
        
        {/* 1. City selector */}
        <div ref={cityDropdownRef} className="relative sm:w-[160px] flex-shrink-0 border-b sm:border-b-0 sm:border-r border-border/50">
          <button
            type="button"
            onClick={() => setShowCityDropdown(!showCityDropdown)}
            className="flex items-center justify-between w-full h-[56px] px-5 py-3 text-sm hover:bg-muted/30 transition-colors focus:outline-none focus:bg-muted/50 rounded-tl-xl rounded-tr-xl sm:rounded-tr-none"
          >
            <div className="flex items-center gap-2.5 truncate">
              <MapPin className="h-4 w-4 text-accent flex-shrink-0" />
              <span className={cn('truncate', selectedCity ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                {selectedCity?.name ?? 'Select City'}
              </span>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform duration-200", showCityDropdown && "rotate-180")} />
          </button>

          {showCityDropdown && (
            <div className="absolute top-full left-0 mt-2 w-[220px] bg-card border border-border rounded-xl shadow-xl py-2 z-[200] animate-in fade-in-0 zoom-in-95 duration-150">
              <div className="px-3 pb-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50">
                Popular Cities
              </div>
              {citiesError ? (
                <div className="px-4 py-3 text-sm text-destructive text-center">Failed to load cities. Please try again.</div>
              ) : cities.map(city => (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => handleCitySelect(city)}
                  className={cn(
                    "w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-accent/5",
                    selectedCity?.id === city.id ? 'text-accent font-medium bg-accent/5 border-l-2 border-accent' : 'text-foreground border-l-2 border-transparent'
                  )}
                >
                  {city.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2. Locality search input */}
        <div ref={localityDropdownRef} className="relative flex-1 flex flex-col justify-center min-h-[56px] bg-card transition-colors focus-within:bg-accent/5">
          <div className="flex flex-wrap items-center gap-1.5 px-4 py-2 w-full">
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
                  setShowLocalityDropdown(true);
                }}
                onFocus={() => setShowLocalityDropdown(true)}
                placeholder={selectedLocalities.length === 0 ? 'Search up to 3 localities or landmarks' : 'Add another locality...'}
                className="flex-1 min-w-[200px] h-8 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
                disabled={!selectedCity}
              />
            )}
          </div>

          {/* Smart Suggestions Dropdown */}
          {showLocalityDropdown && (
            <div className="absolute top-[102%] left-0 sm:-left-[160px] right-0 sm:right-auto sm:w-[480px] bg-card border border-border rounded-xl shadow-xl py-2 z-[200] animate-in fade-in slide-in-from-top-2 duration-200 h-auto max-h-[380px] overflow-hidden flex flex-col">
              
              {!selectedCity ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  Please select a city first.
                </div>
              ) : localitiesError ? (
                <div className="p-4 text-sm text-destructive text-center">
                  Failed to load localities. Please try again.
                </div>
              ) : localityInput ? (
                // Autocomplete Results
                <div className="overflow-y-auto">
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Search Results</div>
                  {filteredLocalities.length > 0 ? (
                    filteredLocalities.map(loc => (
                      <button
                        key={loc.id}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); addLocality(loc); }}
                        className="w-full text-left px-5 py-3 text-sm hover:bg-muted/50 transition-colors flex items-center gap-3 border-b border-border/30 last:border-0"
                      >
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">{loc.name}</span>
                        {/* Fake contextual hints since we don't have real data for this yet */}
                        <span className="text-xs text-muted-foreground ml-auto bg-muted px-2 py-0.5 rounded-full">Explore</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-5 py-4 text-sm text-muted-foreground text-center">No localities found matching "{localityInput}"</div>
                  )}
                </div>
              ) : (
                // Smart Defaults & Recent Searches when empty
                <div className="overflow-y-auto">
                  {recentSearches.length > 0 && selectedLocalities.length === 0 && (
                    <div className="mb-4">
                      <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/20">Recent Searches</div>
                      {recentSearches.map(search => (
                        <button
                          key={search.id}
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); loadRecentSearch(search); }}
                          className="w-full text-left px-5 py-3 text-sm hover:bg-muted/50 transition-colors flex items-center gap-3 border-b border-border/30 last:border-0"
                        >
                          <div className="bg-muted p-1.5 rounded-full flex-shrink-0">
                            <Clock className="h-3.5 w-3.5 text-foreground/70" />
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <span className="font-medium text-foreground truncate">
                              {search.localities.map(l => l.name).join(', ') || search.city?.name || 'All Locations'}
                            </span>
                            <span className="text-xs text-muted-foreground truncate">
                              {search.intent === 'rent' ? 'For Rent' : 'For Sale'} 
                              {search.roomTypes.length > 0 && ` • w/${search.roomTypes.join(', ')}`}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Nearby Localities Suggestion (if localities selected) */}
                  {selectedLocalities.length > 0 && nearbyLocalities.length > 0 && (
                    <div>
                        <div className="px-4 py-2 text-xs font-semibold text-accent uppercase tracking-wider bg-accent/5">Nearby suggestions</div>
                        {nearbyLocalities.filter(l => !selectedLocalities.find(sl => sl.id === l.id)).slice(0, 5).map(loc => (
                          <button
                            key={loc.id}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); addLocality(loc); }}
                            className="w-full text-left px-5 py-3 text-sm hover:bg-accent/5 transition-colors flex items-center gap-3 border-b border-border/30"
                          >
                            <MapPin className="h-4 w-4 text-accent/70" />
                            <span className="text-foreground">{loc.name}</span>
                          </button>
                        ))}
                    </div>
                  )}

                  {/* Popular Localities (Fallback) */}
                  {selectedLocalities.length === 0 && cityLocalities.length > 0 && (
                    <div>
                      <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/20">Popular in {selectedCity.name}</div>
                      {cityLocalities.slice(0, 5).map(loc => (
                        <button
                          key={loc.id}
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); addLocality(loc); }}
                          className="w-full text-left px-5 py-3 text-sm hover:bg-muted/50 transition-colors flex items-center gap-3 border-b border-border/30 last:border-0"
                        >
                          <MapPin className="h-4 w-4 text-muted-foreground/70" />
                          <span className="text-foreground">{loc.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Progressive Disclosure Filters & Search CTA */}
        <div className="flex border-t sm:border-t-0 border-border/50 sm:w-[220px]">
          
          {/* Advanced Filters Button */}
          <div ref={filterDropdownRef} className="relative flex-shrink-0 flex items-center justify-center border-r border-border/50">
             <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "h-[56px] px-5 flex items-center gap-2 text-sm font-medium transition-colors hover:bg-muted/30 focus:outline-none",
                  showFilters || filterCount > 0 ? "text-accent bg-accent/5" : "text-muted-foreground"
                )}
             >
               <SlidersHorizontal className="h-4 w-4" />
               <span className="hidden lg:inline">Filters</span>
               {filterCount > 0 && (
                 <span className="flex items-center justify-center bg-accent text-accent-foreground text-xs font-bold rounded-full w-5 h-5 ml-1">
                   {filterCount}
                 </span>
               )}
             </button>

             {/* Filters Popover */}
             {showFilters && (
               <div className="absolute top-[102%] right-0 sm:right-auto sm:-left-[100px] w-[320px] bg-card border border-border shadow-[0_12px_40px_rgba(0,0,0,0.12)] rounded-xl z-[200] animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between p-4 border-b border-border/50">
                    <h3 className="font-semibold text-foreground">Filters</h3>
                    <button type="button" onClick={() => setShowFilters(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="p-5 space-y-6">
                    {/* Property Filter */}
                    {intent === 'rent' && (
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-foreground">Property type</label>
                        <div className="grid grid-cols-2 gap-2">
                          {PROPERTY_TYPES_RENT.map(({ value, label }) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => handlePropertyTypeChange(value)}
                              className={cn(
                                "py-2 px-3 text-sm rounded-lg border text-center transition-all duration-200",
                                selectedPropertyType === value 
                                  ? "bg-accent/10 border-accent text-accent shadow-sm" 
                                  : "border-border hover:border-muted-foreground/30 text-muted-foreground"
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Room / Sharing Type */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-foreground">
                         {isPgOrHostel && intent === 'rent' ? 'Sharing type' : 'Room type'}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {subFilterOptions.map(opt => {
                          const isActive = selectedRoomTypes.includes(opt);
                          return (
                            <button
                               key={opt}
                               type="button"
                               onClick={() => toggleRoomType(opt)}
                               className={cn(
                                "py-1.5 px-3 text-sm rounded-full border transition-all duration-200",
                                isActive
                                  ? "bg-accent text-accent-foreground border-accent shadow-sm"
                                  : "bg-background border-border text-foreground hover:border-muted-foreground/30"
                              )}
                            >
                               {ROOM_TYPE_LABELS[opt] ?? opt}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-t border-border/50 bg-muted/10 flex justify-between items-center rounded-b-xl">
                    <button 
                      type="button" 
                      className="text-sm font-medium text-muted-foreground hover:text-foreground underline underline-offset-4"
                      onClick={() => {
                        setSelectedPropertyType('');
                        setSelectedRoomTypes([]);
                      }}
                    >
                      Clear all
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setShowFilters(false)}
                      className="px-5 py-2 bg-foreground text-background text-sm font-semibold rounded-lg hover:bg-foreground/90 transition-colors"
                    >
                      Apply
                    </button>
                  </div>
               </div>
             )}
          </div>

          {/* Search Button */}
          <button
            type="button"
            onClick={handleSearch}
            disabled={isSearching}
            className="flex-1 flex items-center justify-center gap-2 bg-accent text-accent-foreground h-[56px] text-base font-bold sm:rounded-r-xl rounded-br-xl sm:rounded-bl-none rounded-bl-xl hover:bg-accent-secondary transition-all focus:outline-none disabled:opacity-80 group overflow-hidden relative"
          >
            {/* Glossy overlay effect built in */}
            <div className="absolute inset-0 bg-white/20 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-500 ease-out" />
            
            {isSearching ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Search className="h-5 w-5" />
            )}
            <span className="relative z-10">{isSearching ? 'Searching...' : 'Search'}</span>
          </button>
          
        </div>
      </div>
    </div>
  );
}
