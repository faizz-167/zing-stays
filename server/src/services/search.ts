import { Meilisearch } from 'meilisearch';

export const searchClient = new Meilisearch({
  host: process.env.MEILISEARCH_HOST!,
  apiKey: process.env.MEILISEARCH_API_KEY,
});

export const listingsIndex = searchClient.index('listings');

export async function setupSearchIndex(): Promise<void> {
  await listingsIndex.updateFilterableAttributes([
    'city', 'locality', 'room_type', 'property_type',
    'food_included', 'gender_pref', 'price', 'status',
  ]);
  await listingsIndex.updateSortableAttributes(['price', 'completeness_score', 'created_at']);
  await listingsIndex.updateSearchableAttributes(['title', 'description', 'city', 'locality', 'landmark']);
}

export interface SearchDoc {
  id: number;
  title: string;
  city: string;
  locality: string;
  landmark?: string;
  price: number;
  room_type: string;
  property_type: string;
  food_included: boolean;
  gender_pref: string;
  images: string[];
  completeness_score: number;
  status: string;
  created_at: string;
}

export async function indexListing(doc: SearchDoc): Promise<void> {
  await listingsIndex.addDocuments([doc]);
}

export async function removeListing(id: number): Promise<void> {
  await listingsIndex.deleteDocument(id);
}
