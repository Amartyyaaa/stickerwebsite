import type { ListingFilters, SortKey } from './types';

export const PRICE_BANDS = [
  { id: 'under-100', label: 'Under ₹100', min: undefined, max: 9999 },
  { id: '100-300', label: '₹100 to ₹300', min: 10000, max: 30000 },
  { id: '300-600', label: '₹300 to ₹600', min: 30001, max: 60000 },
  { id: '600-plus', label: '₹600 and up', min: 60001, max: undefined },
] as const;

export const SORTS: ReadonlyArray<{ id: SortKey; label: string }> = [
  { id: 'popular', label: 'Popular' },
  { id: 'new', label: 'Newest' },
  { id: 'price-asc', label: 'Price: low to high' },
  { id: 'price-desc', label: 'Price: high to low' },
];

export type SearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const csv = (v: string | string[] | undefined) =>
  (first(v) ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter((x) => /^[a-z0-9-]{1,60}$/.test(x))
    .slice(0, 30);

export interface ParsedFilters extends ListingFilters {
  price?: string;
}

/** Read listing filters from the URL. `fixed` values (like the current category) always win. */
export function parseFilters(sp: SearchParams, fixed: Partial<ListingFilters> = {}): ParsedFilters {
  const types = csv(sp.type);
  const vibes = csv(sp.vibe);
  const priceId = first(sp.price);
  const band = PRICE_BANDS.find((b) => b.id === priceId);
  const sortId = first(sp.sort);
  const sort = [...SORTS.map((s) => s.id), 'relevance'].includes(sortId as SortKey) ? (sortId as SortKey) : undefined;
  const page = Number.parseInt(first(sp.page) ?? '1', 10);
  const q = (first(sp.q) ?? '').trim().slice(0, 80);
  return {
    types: fixed.types ?? (types.length ? types : undefined),
    vibes: fixed.vibes ?? (vibes.length ? vibes : undefined),
    q: fixed.q ?? (q || undefined),
    min: band?.min,
    max: band?.max,
    price: band?.id,
    sort,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** Build a query string, dropping empty values. */
export function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : '';
}
