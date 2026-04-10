export const VALID_SORT_FIELDS = [
  'completeness_score:desc',
  'completeness_score:asc',
  'price:asc',
  'price:desc',
  'created_at:desc',
  'created_at:asc',
] as const;

export interface SearchFilterInput {
  city?: string;
  locality?: string;
  cityId?: number;
  localityId?: number;
  intent?: 'buy' | 'rent';
  roomType?: 'single' | 'double' | 'multiple' | '1bhk' | '2bhk' | '3bhk' | '4bhk';
  propertyType?: 'pg' | 'hostel' | 'apartment' | 'flat';
  foodIncluded?: 'true' | 'false';
  gender?: 'male' | 'female' | 'any';
  priceMin?: number;
  priceMax?: number;
}

export function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function normalizeSortField(value?: string): string {
  return VALID_SORT_FIELDS.includes(value as (typeof VALID_SORT_FIELDS)[number])
    ? value!
    : 'completeness_score:desc';
}

export function buildSearchFilters(input: SearchFilterInput): string[] {
  const filters: string[] = ['status = "active"'];

  if (input.city) filters.push(`city = "${escapeFilterValue(input.city)}"`);
  if (input.locality) filters.push(`locality = "${escapeFilterValue(input.locality)}"`);
  if (input.cityId !== undefined) filters.push(`city_id = ${input.cityId}`);
  if (input.localityId !== undefined) filters.push(`locality_id = ${input.localityId}`);
  if (input.intent) filters.push(`intent = "${input.intent}"`);
  if (input.roomType) filters.push(`room_type = "${input.roomType}"`);
  if (input.propertyType) filters.push(`property_type = "${input.propertyType}"`);
  if (input.foodIncluded === 'true') filters.push('food_included = true');
  if (input.gender) filters.push(`(gender_pref = "${input.gender}" OR gender_pref = "any")`);
  if (input.priceMin !== undefined) filters.push(`price >= ${input.priceMin}`);
  if (input.priceMax !== undefined) filters.push(`price <= ${input.priceMax}`);

  return filters;
}
