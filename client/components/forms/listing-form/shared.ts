export interface CityOption {
  id: number;
  name: string;
  slug: string;
}

export interface LocalityOption {
  id: number;
  name: string;
  slug: string;
}

export interface RoomTypeOption {
  value: string;
  label: string;
}

export const AMENITY_OPTIONS = [
  'wifi',
  'ac',
  'laundry',
  'parking',
  'cctv',
  'gym',
  'kitchen',
  'geyser',
  'furnished',
  'balcony',
] as const;
