/**
 * Rules for product details, shared by the product form and the CSV import
 * so both accept exactly the same things. Pure functions, unit-tested.
 */
import { photoSrc, photoUploadId } from '@/lib/catalog/images';
import type { OptionGroup, PriceProfile } from '@/lib/catalog/types';
import { UPLOAD_ID_RE } from '@/lib/custom/types';
import { mergeProfile, priceRange } from '@/lib/pricing/engine';
import { MAX_SLUG, SLUG_RE, slugify, uniqueSlug } from '@/lib/slug';

export const LIMITS = {
  nameMin: 2,
  nameMax: 80,
  description: 2000,
  tags: 300,
  /** Main vibe plus up to four more. */
  vibes: 5,
  images: 8,
  popularity: 1_000_000,
  /** Prices in paise: ₹1 to ₹1,00,000. */
  priceMin: 100,
  priceMax: 10_000_000,
  importRows: 10_000,
  importBytes: 5 * 1024 * 1024,
} as const;

export interface TypeInfo {
  id: string;
  name: string;
  singular: string;
  description: string;
  options: OptionGroup[];
  price: PriceProfile;
}

export const cleanName = (s: string) => s.replace(/\s+/g, ' ').trim();

export function nameError(name: string): string | null {
  if (name.length < LIMITS.nameMin) return 'Enter a product name.';
  if (name.length > LIMITS.nameMax) return `Keep the name under ${LIMITS.nameMax} characters.`;
  return null;
}

export function slugError(slug: string): string | null {
  if (!slug) return 'Enter a web address for the product.';
  if (slug.length > MAX_SLUG) return `Keep the web address under ${MAX_SLUG} characters.`;
  if (!SLUG_RE.test(slug)) return 'Use lowercase letters, numbers and dashes, like pit-lane-poster.';
  return null;
}

/** The web address a new product gets: its name and product type, like "pit-lane-wall-poster". */
export const autoSlug = (name: string, singular: string) => slugify(`${name} ${singular}`);

/** Lowercase search words, without repeats. Commas, semicolons and spaces all separate tags. */
export function cleanTags(s: string): string {
  const words = new Set<string>();
  for (const raw of s.toLowerCase().split(/[\s,;|]+/)) {
    const w = raw.replace(/[^\p{L}\p{N}&+#-]/gu, '');
    if (w) words.add(w);
  }
  let out = '';
  for (const w of words) {
    if (out.length + w.length + 1 > LIMITS.tags) break;
    out = out ? `${out} ${w}` : w;
  }
  return out;
}

/** "₹1,299.50" → 129950 paise. null for an empty value, NaN for anything that isn't an amount. Negative amounts only when `allowNegative`. */
export function parseRupees(input: string | undefined | null, allowNegative = false): number | null {
  const t = (input ?? '').replace(/[₹,\s]/g, '').replace(/^rs\.?/i, '').replace(/^\+/, '');
  if (!t) return null;
  const re = allowNegative ? /^-?\d+(\.\d{1,2})?$/ : /^\d+(\.\d{1,2})?$/;
  if (!re.test(t)) return NaN;
  return Math.round(Number(t) * 100);
}

export function priceError(paise: number): string | null {
  if (Number.isNaN(paise)) return 'Enter the price in rupees, like 249.';
  if (paise < LIMITS.priceMin) return 'The price should be at least ₹1.';
  if (paise > LIMITS.priceMax) return 'The price should be under ₹1,00,000.';
  return null;
}

/** 24900 → "249", 24950 → "249.50". For form fields and the CSV. */
export const rupeesText = (paise: number) => (paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2));

/** A type's own starting price: its cheapest combination of options. */
export const typeStartingPrice = (t: Pick<TypeInfo, 'price' | 'options'>) => priceRange(t.price, t.options).min;

/**
 * A product's own starting price, stored as a change to the type's base price
 * so every option still costs the same amount more or less than the cheapest.
 */
export function overrideFor(t: Pick<TypeInfo, 'price' | 'options'>, startingPrice: number | null): Partial<PriceProfile> | null {
  if (startingPrice === null) return null;
  return { base: t.price.base + (startingPrice - typeStartingPrice(t)) };
}

/** The lowest price a product can be bought for, kept on the product for sorting and filters. */
export const startingPriceOf = (t: Pick<TypeInfo, 'price' | 'options'>, override: Partial<PriceProfile> | null) => priceRange(mergeProfile(t.price, override), t.options).min;

/* ---------- CSV import and export ---------- */

export const CSV_COLUMNS = ['id', 'slug', 'name', 'type', 'vibes', 'description', 'tags', 'price_from_rupees', 'popularity', 'images', 'active'] as const;
export type CsvColumn = (typeof CSV_COLUMNS)[number];

/** Other names people may use for a column, for example from another store's export. */
const ALIASES: Record<string, CsvColumn> = {
  title: 'name',
  product_name: 'name',
  handle: 'slug',
  url_slug: 'slug',
  category: 'type',
  product_type: 'type',
  vibe: 'vibes',
  collections: 'vibes',
  base_price_rupees: 'price_from_rupees',
  price: 'price_from_rupees',
  price_rupees: 'price_from_rupees',
  image: 'images',
  photos: 'images',
  visible: 'active',
  shown: 'active',
};

export interface ExistingProduct {
  id: number;
  slug: string;
  name: string;
  typeId: string;
  /** Every vibe, the main one first. */
  vibes: string[];
  description: string;
  tags: string;
  priceOverride: Partial<PriceProfile> | null;
  popularity: number;
  images: string[];
  /** Demo products have generated artwork, so they can be shown without photos. */
  hasArt: boolean;
  isActive: boolean;
}

/** Everything saved for one product, from the form or a CSV row. */
export interface ProductWrite {
  slug: string;
  name: string;
  typeId: string;
  /** Every vibe, the main one first. */
  vibes: string[];
  description: string;
  tags: string;
  priceOverride: Partial<PriceProfile> | null;
  priceFrom: number;
  popularity: number;
  images: string[];
  isActive: boolean;
}

export interface ImportContext {
  types: TypeInfo[];
  vibes: Array<{ id: string; name: string }>;
  products: ExistingProduct[];
  /** Product photos by lowercase file name (the newest upload wins) and by upload id. */
  photosByName: Map<string, string>;
  photoIds: Set<string>;
}

export type ImportRow =
  | { row: number; kind: 'new' | 'update'; label: string; id?: number; product: ProductWrite; changes: string[] }
  | { row: number; kind: 'unchanged'; label: string; id: number }
  | { row: number; kind: 'error'; label: string; errors: string[] };

export interface ImportCheck {
  /** Set when the file as a whole can't be used. */
  error?: string;
  /** Column names that were not recognised and are left out. */
  ignored: string[];
  rows: ImportRow[];
  counts: Record<ImportRow['kind'], number>;
}

const TRUE = new Set(['yes', 'y', 'true', '1', 'shown', 'show', 'visible', 'active', 'on']);
const FALSE = new Set(['no', 'n', 'false', '0', 'hidden', 'hide', 'off']);

const headerKey = (h: string) =>
  h
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

export function checkImport(table: string[][], ctx: ImportContext): ImportCheck {
  const counts = { new: 0, update: 0, unchanged: 0, error: 0 };
  const empty = (error: string): ImportCheck => ({ error, ignored: [], rows: [], counts });
  const [header, ...body] = table;
  if (!header) return empty('The file is empty.');

  const columns = new Map<CsvColumn, number>();
  const ignored: string[] = [];
  for (const [i, raw] of header.entries()) {
    const key = headerKey(raw);
    const col = (CSV_COLUMNS as readonly string[]).includes(key) ? (key as CsvColumn) : ALIASES[key];
    if (!col) {
      if (raw.trim()) ignored.push(raw.trim());
      continue;
    }
    if (columns.has(col)) return empty(`The column "${col}" appears twice. Keep one of them.`);
    columns.set(col, i);
  }
  if (!columns.has('id') && !columns.has('slug') && !columns.has('name')) {
    return empty(`The first row should name the columns: ${CSV_COLUMNS.join(', ')}. Download the template to start from.`);
  }
  const dataRows = body.filter((r) => r.some((c) => c.trim()));
  if (dataRows.length === 0) return empty('There are no products in the file, only the column names.');
  if (dataRows.length > LIMITS.importRows) return empty(`That’s ${dataRows.length.toLocaleString('en-IN')} products. Import up to ${LIMITS.importRows.toLocaleString('en-IN')} at a time.`);

  const typeBy = new Map<string, TypeInfo>();
  for (const t of ctx.types) for (const k of [t.id, t.name.toLowerCase(), t.singular.toLowerCase()]) typeBy.set(k, t);
  const typeById = new Map(ctx.types.map((t) => [t.id, t]));
  const vibeBy = new Map<string, string>();
  for (const v of ctx.vibes) {
    vibeBy.set(v.id, v.id);
    vibeBy.set(v.name.toLowerCase(), v.id);
  }
  const byId = new Map(ctx.products.map((p) => [p.id, p]));
  const bySlug = new Map(ctx.products.map((p) => [p.slug, p]));
  /** Web addresses taken by rows earlier in this file. */
  const claimed = new Map<string, number>();
  const touched = new Map<number, number>();
  /** New products by type and name, to catch the same product listed twice. */
  const sameName = new Map<string, number>();

  const rows: ImportRow[] = [];
  body.forEach((cells, index) => {
    if (!cells.some((c) => c.trim())) return;
    const row = index + 2;
    const has = (c: CsvColumn) => columns.has(c);
    const cell = (c: CsvColumn) => (cells[columns.get(c)!] ?? '').trim();
    const given = (c: CsvColumn) => has(c) && cell(c) !== '';
    const errors: string[] = [];

    let existing: ExistingProduct | undefined;
    if (given('id')) {
      const id = Number(cell('id'));
      if (!Number.isInteger(id) || id <= 0) errors.push('The id should be a whole number, or empty for a new product.');
      else {
        existing = byId.get(id);
        if (!existing) errors.push(`No product has id ${id}. Leave the id empty to add a new product.`);
      }
    } else if (given('slug')) existing = bySlug.get(cell('slug').toLowerCase());

    const name = has('name') ? cleanName(cell('name')) : (existing?.name ?? '');
    const nameIssue = nameError(name);
    if (nameIssue) errors.push(nameIssue);

    let type: TypeInfo | undefined = existing ? typeById.get(existing.typeId) : undefined;
    if (given('type')) {
      type = typeBy.get(cell('type').toLowerCase());
      if (!type) errors.push(`Unknown type “${cell('type')}”. Use a type id from the template, like ${ctx.types[0]?.id ?? 'wall-posters'}.`);
    } else if (!existing) errors.push(`Add the product type, like ${ctx.types[0]?.id ?? 'wall-posters'}.`);

    // A row with neither id nor web address matches the product it made last time (same name and type),
    // so importing the same file twice doesn't add everything twice.
    if (!existing && !given('id') && !given('slug') && type && !nameIssue) {
      const twin = bySlug.get(autoSlug(name, type.singular));
      const key = `${type.id}|${name.toLowerCase()}`;
      if (twin && twin.typeId === type.id && twin.name.toLowerCase() === name.toLowerCase()) existing = twin;
      else if (sameName.has(key)) errors.push(`Row ${sameName.get(key)} adds a product with the same name and type. Give one a different name, or its own web address in the slug column.`);
      else sameName.set(key, row);
    }
    if (existing && touched.has(existing.id)) errors.push(`Row ${touched.get(existing.id)} already changes this product.`);
    else if (existing) touched.set(existing.id, row);

    let vibes = existing?.vibes ?? [];
    if (given('vibes')) {
      const list: string[] = [];
      for (const raw of cell('vibes').split(/[;,|]/)) {
        const v = raw.trim();
        if (!v) continue;
        const id = vibeBy.get(v.toLowerCase());
        if (!id) errors.push(`Unknown vibe “${v}”. Add it on the Vibes page first, or use an existing one.`);
        else if (!list.includes(id)) list.push(id);
      }
      if (list.length > LIMITS.vibes) errors.push(`Use up to ${LIMITS.vibes} vibes.`);
      vibes = list;
    }
    if (vibes.length === 0 && !errors.some((e) => e.startsWith('Unknown vibe'))) errors.push(`Add at least one vibe, like ${ctx.vibes[0]?.id ?? 'anime'}.`);

    const description = has('description') ? cell('description') : (existing?.description ?? '');
    if (description.length > LIMITS.description) errors.push(`Keep the description under ${LIMITS.description.toLocaleString('en-IN')} characters.`);
    const tags = has('tags') ? cleanTags(cell('tags')) : (existing?.tags ?? '');

    let startingPrice: number | null | undefined;
    if (has('price_from_rupees')) {
      startingPrice = parseRupees(cell('price_from_rupees'));
      if (startingPrice !== null) {
        const issue = priceError(startingPrice);
        if (issue) errors.push(issue);
      }
    }

    let popularity = existing?.popularity ?? 0;
    if (given('popularity')) {
      const n = Number(cell('popularity'));
      if (!Number.isInteger(n) || n < 0 || n > LIMITS.popularity) errors.push('Popularity should be a whole number from 0 to 10,00,000.');
      else popularity = n;
    }

    let images = existing?.images ?? [];
    let photoMissing = false;
    if (given('images')) {
      const list: string[] = [];
      for (const raw of cell('images').split('|')) {
        const entry = raw.trim();
        if (!entry) continue;
        // A photo address (as the export writes it), an upload id, or the file name of an uploaded photo.
        const id = photoUploadId(entry.replace(/^https?:\/\/[^/]+/i, '')) ?? (UPLOAD_ID_RE.test(entry) ? entry : null);
        let src = id && ctx.photoIds.has(id) ? photoSrc(id) : null;
        const named = src ? undefined : ctx.photosByName.get(entry.toLowerCase());
        if (named) src = photoSrc(named);
        if (!src) {
          photoMissing = true;
          errors.push(`Photo “${entry}” isn’t uploaded yet. Upload it in step 1, then check the file again.`);
        } else if (!list.includes(src)) list.push(src);
      }
      if (list.length > LIMITS.images) errors.push(`Use up to ${LIMITS.images} photos per product.`);
      images = list;
    }

    let isActive = existing?.isActive ?? true;
    if (given('active')) {
      const v = cell('active').toLowerCase();
      if (TRUE.has(v)) isActive = true;
      else if (FALSE.has(v)) isActive = false;
      else errors.push('Write yes or no in the active column.');
    }
    if (isActive && images.length === 0 && !photoMissing && !existing?.hasArt) errors.push('Add a photo in the images column, or write no in the active column to keep it hidden.');

    let slug = existing?.slug ?? '';
    const isTaken = (s: string) => (bySlug.has(s) && bySlug.get(s)!.id !== existing?.id) || claimed.has(s);
    if (given('slug') && cell('slug').toLowerCase() !== existing?.slug) {
      const wanted = cell('slug').toLowerCase();
      const issue = slugError(wanted);
      if (issue) errors.push(issue);
      else if (isTaken(wanted)) errors.push(claimed.has(wanted) ? `Row ${claimed.get(wanted)} uses the web address “${wanted}” too.` : `Another product already uses the web address “${wanted}”.`);
      slug = wanted;
    } else if (!existing && type && !nameIssue) slug = uniqueSlug(autoSlug(name, type.singular), isTaken);

    const label = name || existing?.name || slug || `Row ${row}`;
    if (errors.length || !type) {
      rows.push({ row, kind: 'error', label, errors: errors.length ? errors : ['Add the product type.'] });
      counts.error++;
      return;
    }
    claimed.set(slug, row);

    const priceOverride = startingPrice === undefined ? (existing?.priceOverride ?? null) : overrideFor(type, startingPrice);
    const product: ProductWrite = {
      slug,
      name,
      typeId: type.id,
      vibes,
      description,
      tags,
      priceOverride,
      priceFrom: startingPriceOf(type, priceOverride),
      popularity,
      images,
      isActive,
    };

    if (!existing) {
      rows.push({ row, kind: 'new', label, product, changes: [] });
      counts.new++;
      return;
    }
    const changes: string[] = [];
    if (product.name !== existing.name) changes.push('name');
    if (product.slug !== existing.slug) changes.push('web address');
    if (product.typeId !== existing.typeId) changes.push('type');
    if (!sameList(product.vibes, existing.vibes)) changes.push('vibes');
    if (product.description !== existing.description) changes.push('description');
    if (product.tags !== existing.tags) changes.push('tags');
    if (JSON.stringify(product.priceOverride) !== JSON.stringify(existing.priceOverride)) changes.push('price');
    if (product.popularity !== existing.popularity) changes.push('popularity');
    if (!sameList(product.images, existing.images)) changes.push('photos');
    if (product.isActive !== existing.isActive) changes.push(product.isActive ? 'shown' : 'hidden');
    if (changes.length === 0) {
      rows.push({ row, kind: 'unchanged', label, id: existing.id });
      counts.unchanged++;
      return;
    }
    rows.push({ row, kind: 'update', label, id: existing.id, product, changes });
    counts.update++;
  });

  return { ignored, rows, counts };
}

/** One product as a CSV row, in the same format the import reads. */
export function exportRow(p: ExistingProduct, type: TypeInfo | undefined): string[] {
  const price = p.priceOverride && type ? rupeesText(startingPriceOf(type, p.priceOverride)) : '';
  return [String(p.id), p.slug, p.name, p.typeId, p.vibes.join(';'), p.description, p.tags, price, String(p.popularity), p.images.join('|'), p.isActive ? 'yes' : 'no'];
}
