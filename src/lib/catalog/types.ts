import type { ArtKind, ArtSpec } from '@/lib/art/types';

/** `custom` holds the custom-studio types. They are priced like any other type but never listed in menus or listings. */
export type GroupId = 'stickers' | 'posters' | 'polaroids' | 'more' | 'custom';

export const GROUPS: ReadonlyArray<{ id: Exclude<GroupId, 'custom'>; name: string; blurb: string }> = [
  { id: 'stickers', name: 'Stickers', blurb: 'Laptop, 3D, holographic, diary and more' },
  { id: 'posters', name: 'Posters', blurb: 'Wall, framed, split and collage kits' },
  { id: 'polaroids', name: 'Polaroids', blurb: 'Printed sets and wall kits' },
  { id: 'more', name: 'More', blurb: 'Bookmarks, keychains, badges and skins' },
];

export interface OptionValue {
  value: string;
  label: string;
  hint?: string;
}

export interface OptionGroup {
  key: string;
  label: string;
  values: OptionValue[];
  /** Long lists (like phone models) render as a dropdown. */
  display?: 'chips' | 'select';
  /** No default: the shopper has to choose (for example a phone model). */
  required?: boolean;
}

/** Price change for one option value, either flat or depending on another option. */
export type Delta = number | { by: string; map: Record<string, number> };

/** All amounts are in paise (₹1 = 100). */
export interface PriceProfile {
  base: number;
  deltas?: Record<string, Record<string, Delta>>;
}

export interface ProductType {
  id: string;
  name: string;
  singular: string;
  groupId: GroupId;
  description: string;
  options: OptionGroup[];
  price: PriceProfile;
  art: ArtKind;
  highlights: string[];
  sortOrder: number;
}

export interface Vibe {
  id: string;
  name: string;
  blurb: string;
  sortOrder: number;
  featured: boolean;
}

/** Default options a card's "Add" button uses. Null when the shopper must choose (for example a phone model). */
export interface QuickAdd {
  options: Record<string, string>;
  labels: string[];
  unit: number;
}

/** What a product card needs. Kept small because grids show dozens at once. */
export interface ProductCard {
  id: number;
  slug: string;
  name: string;
  typeId: string;
  typeName: string;
  vibeId: string;
  priceFrom: number;
  art: ArtSpec | null;
  image: string | null;
  isNew: boolean;
  quick: QuickAdd | null;
}

export interface ProductDetail extends ProductCard {
  description: string;
  tags: string;
  groupId: GroupId;
  typeSlugName: string;
  vibeName: string;
  vibes: Array<{ id: string; name: string }>;
  options: OptionGroup[];
  price: PriceProfile;
  highlights: string[];
}

export type SortKey = 'popular' | 'new' | 'price-asc' | 'price-desc' | 'relevance';

export interface ListingFilters {
  types?: string[];
  vibes?: string[];
  q?: string;
  /** Inclusive price band in paise. */
  min?: number;
  max?: number;
  sort?: SortKey;
  page?: number;
}

export interface ListingResult {
  items: ProductCard[];
  total: number;
  page: number;
  perPage: number;
}
