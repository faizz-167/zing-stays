import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface SearchFilters {
  q?: string;
  city?: string;
  locality?: string;
  room_type?: string;
  property_type?: string;
  food_included?: string;
  gender?: string;
  price_min?: string;
  price_max?: string;
}

export function useSearch(filters: SearchFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v) params.set(k, v);
  });

  return useQuery({
    queryKey: ['search', filters],
    queryFn: () => api.get<{ hits: any[] }>(`/search?${params.toString()}`),
    staleTime: 30 * 1000,
  });
}

export function useListings(filters: Omit<SearchFilters, 'q'> & { page?: number }) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined) params.set(k, String(v));
  });

  return useQuery({
    queryKey: ['listings', filters],
    queryFn: () =>
      api.get<{ data: any[]; page: number; limit: number }>(`/listings?${params.toString()}`),
    staleTime: 30 * 1000,
  });
}
