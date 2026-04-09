export interface ListingCardData {
  id: number;
  title: string;
  city: string;
  locality: string;
  cityId?: number | null;
  localityId?: number | null;
  intent?: 'buy' | 'rent';
  price: number;
  roomType: string;
  propertyType: string;
  images: string[];
  badges: string[];
  foodIncluded: boolean;
}

export interface SearchListingHit {
  id: number;
  title: string;
  city: string;
  locality: string;
  price: number;
  room_type: string;
  property_type: string;
  food_included: boolean;
  images?: string[];
  badges?: string[];
}

export interface OwnerListing extends ListingCardData {
  ownerId: number;
  completenessScore: number;
  status: 'draft' | 'active' | 'inactive';
}

export interface AdminListing {
  id: number;
  title: string;
  city: string;
  status: 'draft' | 'active' | 'inactive';
  completenessScore: number;
}
