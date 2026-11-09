import 'server-only';
import { and, asc, desc, eq, inArray, ne, sql, type SQL } from 'drizzle-orm';
import { cacheLife, cacheTag } from 'next/cache';
import type { ArtSpec } from '@/lib/art/types';
import { db } from '@/lib/db/client';
import * as s from '@/lib/db/schema';
import { defaultOptions, mergeProfile, optionLabels, unitPrice } from '@/lib/pricing/engine';
import { withDefaults, type StoreSettings } from '@/lib/settings';
import { searchTokens, toFtsQuery } from './fts';
import { cardImage, fullImage } from './images';
import type { ListingFilters, ListingResult, OptionGroup, PriceProfile, ProductCard, ProductDetail, ProductType, QuickAdd, Vibe } from './types';

/**
 * Catalog reads. Every function is cached ('use cache') and tagged "catalog",
 * so pages are served from the cache and the admin panel can refresh them
 * with revalidateTag('catalog') after a change.
 */

export const PER_PAGE = 24;
/** Products added within this many seconds of the newest product get a "New" badge. */
const NEW_WINDOW = 21 * 86400;
const MAX_PAGES = 20;

type CardRow = {
  id: number;
  slug: string;
  name: string;
  type_id: string;
  type_name: string;
  vibe_id: string;
  price_from: number;
  art: string | null;
  images: string | null;
  created_at: number;
};

const CARD_COLUMNS = sql`p.id, p.slug, p.name, p.type_id, t.singular AS type_name, p.vibe_id, p.price_from, p.art, p.images, p.created_at`;

function parseJson<T>(v: string | null): T | null {
  if (!v) return null;
  try {
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
}

type QuickMap = Record<string, QuickAdd | null>;

function toCard(r: CardRow, newCutoff: number, quick: QuickMap): ProductCard {
  const images = parseJson<string[]>(r.images);
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    typeId: r.type_id,
    typeName: r.type_name,
    vibeId: r.vibe_id,
    priceFrom: r.price_from,
    art: parseJson<ArtSpec>(r.art),
    image: cardImage(images?.[0]),
    isNew: r.created_at >= newCutoff,
    quick: quick[r.type_id] ?? null,
  };
}

/** Default options and price per product type, for the quick "Add" button on cards. */
async function quickByType(): Promise<QuickMap> {
  const types = await getTypes();
  const map: QuickMap = {};
  for (const t of types) {
    if (t.options.some((g) => g.required)) {
      map[t.id] = null;
      continue;
    }
    const options = defaultOptions(t.options);
    map[t.id] = { options, labels: optionLabels(t.options, options), unit: unitPrice(t.price, options) };
  }
  return map;
}

async function newCutoff(): Promise<number> {
  const [row] = await db.all<{ newest: number | null }>(sql`SELECT max(created_at) AS newest FROM products WHERE is_active = 1`);
  return (row?.newest ?? 0) - NEW_WINDOW;
}

export async function getSettings(): Promise<StoreSettings> {
  'use cache';
  cacheLife('hours');
  cacheTag('settings');
  const row = await db.query.settings.findFirst({ where: eq(s.settings.key, 'store') });
  return withDefaults(row?.value as Partial<StoreSettings> | undefined);
}

export async function getTypes(): Promise<ProductType[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('catalog');
  const rows = await db
    .select()
    .from(s.productTypes)
    .where(and(eq(s.productTypes.isActive, true), ne(s.productTypes.groupId, 'custom')))
    .orderBy(asc(s.productTypes.sortOrder));
  return rows.map(({ isActive: _a, ...t }) => t);
}

/** A custom-studio product type (hidden from menus and listings), with its options and price profile. */
export async function getCustomType(id: string): Promise<ProductType | null> {
  'use cache';
  cacheLife('hours');
  cacheTag('catalog');
  const row = await db.query.productTypes.findFirst({
    where: and(eq(s.productTypes.id, id), eq(s.productTypes.groupId, 'custom'), eq(s.productTypes.isActive, true)),
  });
  if (!row) return null;
  const { isActive: _a, ...t } = row;
  return t;
}

/** Custom-studio types in a cart, for pricing. Not cached: prices must be current. */
export async function getQuoteTypes(ids: string[]): Promise<ProductType[]> {
  const clean = [...new Set(ids)].slice(0, 20);
  if (!clean.length) return [];
  const rows = await db
    .select()
    .from(s.productTypes)
    .where(and(inArray(s.productTypes.id, clean), eq(s.productTypes.groupId, 'custom'), eq(s.productTypes.isActive, true)));
  return rows.map(({ isActive: _a, ...t }) => t);
}

export async function getVibes(): Promise<Vibe[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('catalog');
  const rows = await db.select().from(s.vibes).where(eq(s.vibes.isActive, true)).orderBy(asc(s.vibes.sortOrder));
  return rows.map(({ isActive: _a, ...v }) => v);
}

/** Number of live products per product type and per vibe. */
export async function getCounts(): Promise<{ types: Record<string, number>; vibes: Record<string, number>; total: number }> {
  'use cache';
  cacheLife('hours');
  cacheTag('catalog');
  const byType = await db.all<{ id: string; n: number }>(sql`SELECT p.type_id AS id, count(*) AS n FROM products p JOIN product_types t ON t.id = p.type_id WHERE p.is_active = 1 AND t.is_active = 1 GROUP BY p.type_id`);
  const byVibe = await db.all<{ id: string; n: number }>(
    sql`SELECT pv.vibe_id AS id, count(*) AS n FROM product_vibes pv JOIN products p ON p.id = pv.product_id JOIN product_types t ON t.id = p.type_id WHERE p.is_active = 1 AND t.is_active = 1 GROUP BY pv.vibe_id`,
  );
  const types = Object.fromEntries(byType.map((r) => [r.id, r.n]));
  return { types, vibes: Object.fromEntries(byVibe.map((r) => [r.id, r.n])), total: byType.reduce((n, r) => n + r.n, 0) };
}

const list = (values: string[]) => sql.join(values.map((v) => sql`${v}`), sql`, `);

/**
 * Whether products_fts is a real FTS5 index. A hosted database without FTS5 gets a plain
 * table with the same columns instead (scripts/db-migrate.ts), searched with a simple
 * word match: fine for a few thousand products.
 */
let ftsIndex: Promise<boolean> | undefined;
const hasFtsIndex = () =>
  (ftsIndex ??= db
    .all<{ sql: string | null }>(sql`SELECT sql FROM sqlite_master WHERE name = 'products_fts'`)
    .then((rows) => /fts5/i.test(rows[0]?.sql ?? ''))
    .catch(() => true));

export async function listProducts(f: ListingFilters): Promise<ListingResult> {
  'use cache';
  cacheLife('hours');
  cacheTag('catalog');
  const page = Math.min(Math.max(1, Math.floor(f.page ?? 1)), MAX_PAGES);
  const limit = page * PER_PAGE;
  const words = f.q ? searchTokens(f.q) : [];
  if (f.q && !words.length) return { items: [], total: 0, page, perPage: PER_PAGE };
  const fts = words.length && (await hasFtsIndex()) ? toFtsQuery(f.q!) : null;

  const where: SQL[] = [sql`p.is_active = 1 AND t.is_active = 1`];
  if (f.types?.length) where.push(sql`p.type_id IN (${list(f.types)})`);
  if (f.vibes?.length) where.push(sql`EXISTS (SELECT 1 FROM product_vibes pv WHERE pv.product_id = p.id AND pv.vibe_id IN (${list(f.vibes)}))`);
  if (f.min !== undefined) where.push(sql`p.price_from >= ${f.min}`);
  if (f.max !== undefined) where.push(sql`p.price_from <= ${f.max}`);
  if (fts) where.push(sql`products_fts MATCH ${fts}`);
  else
    for (const w of words) {
      where.push(sql`lower(coalesce(products_fts.name, '') || ' ' || coalesce(products_fts.tags, '') || ' ' || coalesce(products_fts.type_name, '') || ' ' || coalesce(products_fts.vibe_names, '')) LIKE ${`%${w}%`}`);
    }

  const from = words.length
    ? sql`products p JOIN product_types t ON t.id = p.type_id JOIN products_fts ON products_fts.rowid = p.id`
    : sql`products p JOIN product_types t ON t.id = p.type_id`;
  const sort = f.sort ?? (words.length ? 'relevance' : 'popular');
  const order =
    sort === 'new'
      ? sql`p.created_at DESC, p.id DESC`
      : sort === 'price-asc'
        ? sql`p.price_from ASC, p.popularity DESC, p.id DESC`
        : sort === 'price-desc'
          ? sql`p.price_from DESC, p.popularity DESC, p.id DESC`
          : sort === 'relevance' && fts
            ? sql`products_fts.rank ASC, p.popularity DESC`
            : sql`p.popularity DESC, p.id DESC`;
  const whereSql = sql.join(where, sql` AND `);

  const [rows, [{ n }], cutoff, quick] = await Promise.all([
    db.all<CardRow>(sql`SELECT ${CARD_COLUMNS} FROM ${from} WHERE ${whereSql} ORDER BY ${order} LIMIT ${limit}`),
    db.all<{ n: number }>(sql`SELECT count(*) AS n FROM ${from} WHERE ${whereSql}`),
    newCutoff(),
    quickByType(),
  ]);
  return { items: rows.map((r) => toCard(r, cutoff, quick)), total: n, page, perPage: PER_PAGE };
}

/** One popular product per product type, for varied home-page rows. */
async function onePerType(typeIds: string[], orderBy: SQL): Promise<ProductCard[]> {
  const [cutoff, quick] = await Promise.all([newCutoff(), quickByType()]);
  const rows = await db.all<CardRow & { rk: number }>(sql`
    SELECT * FROM (
      SELECT ${CARD_COLUMNS}, row_number() OVER (PARTITION BY p.type_id ORDER BY ${orderBy}) AS rk
      FROM products p JOIN product_types t ON t.id = p.type_id
      WHERE p.is_active = 1 AND t.is_active = 1 AND p.type_id IN (${list(typeIds)})
    ) WHERE rk = 1`);
  const byType = new Map(rows.map((r) => [r.type_id, toCard(r, cutoff, quick)]));
  return typeIds.map((id) => byType.get(id)).filter((c): c is ProductCard => Boolean(c));
}

export async function getHomeRows(): Promise<{ trending: ProductCard[]; fresh: ProductCard[] }> {
  'use cache';
  cacheLife('hours');
  cacheTag('catalog');
  const trending = await onePerType(
    ['laptop-stickers', 'wall-posters', 'car-bike-stickers', 'polaroid-sets', 'framed-posters', 'diary-sticker-sheets', 'phone-bottle-stickers', 'bookmarks'],
    sql`p.popularity DESC`,
  );
  const fresh = await onePerType(
    ['sticker-packs', 'split-posters', 'postcards', 'phone-bottle-stickers', 'poster-sets', 'polaroid-wall-kits', 'mini-posters', 'phone-skins'],
    sql`p.created_at DESC`,
  );
  return { trending, fresh };
}

export async function getProduct(slug: string): Promise<ProductDetail | null> {
  'use cache';
  cacheLife('hours');
  cacheTag('catalog');
  const row = await db
    .select({
      id: s.products.id,
      slug: s.products.slug,
      name: s.products.name,
      typeId: s.products.typeId,
      vibeId: s.products.vibeId,
      description: s.products.description,
      tags: s.products.tags,
      priceOverride: s.products.priceOverride,
      priceFrom: s.products.priceFrom,
      art: s.products.art,
      images: s.products.images,
      createdAt: s.products.createdAt,
      typeName: s.productTypes.singular,
      typePlural: s.productTypes.name,
      groupId: s.productTypes.groupId,
      options: s.productTypes.options,
      price: s.productTypes.price,
      highlights: s.productTypes.highlights,
      typeDescription: s.productTypes.description,
      vibeName: s.vibes.name,
      vibeActive: s.vibes.isActive,
    })
    .from(s.products)
    .innerJoin(s.productTypes, eq(s.productTypes.id, s.products.typeId))
    .innerJoin(s.vibes, eq(s.vibes.id, s.products.vibeId))
    .where(and(eq(s.products.slug, slug), eq(s.products.isActive, true), eq(s.productTypes.isActive, true)))
    .get();
  if (!row) return null;
  const [vibes, cutoff, quick] = await Promise.all([
    db
      .select({ id: s.vibes.id, name: s.vibes.name })
      .from(s.productVibes)
      .innerJoin(s.vibes, eq(s.vibes.id, s.productVibes.vibeId))
      .where(and(eq(s.productVibes.productId, row.id), eq(s.vibes.isActive, true))),
    newCutoff(),
    quickByType(),
  ]);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    typeId: row.typeId,
    typeName: row.typeName,
    typeSlugName: row.typePlural,
    vibeId: row.vibeId,
    vibeName: row.vibeName,
    vibeShown: row.vibeActive,
    vibes,
    priceFrom: row.priceFrom,
    art: row.art,
    image: cardImage(row.images?.[0]),
    images: (row.images ?? []).map(fullImage),
    isNew: row.createdAt >= cutoff,
    quick: quick[row.typeId] ?? null,
    // Products added without a description use their type's.
    description: row.description || `${row.name} ${row.typeName.toLowerCase()}. ${row.typeDescription}`,
    tags: row.tags,
    groupId: row.groupId,
    options: row.options,
    price: mergeProfile(row.price, row.priceOverride),
    highlights: row.highlights,
  };
}

export async function getRelated(productId: number, vibeId: string): Promise<ProductCard[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('catalog');
  const [rows, cutoff, quick] = await Promise.all([
    db.all<CardRow>(sql`
      SELECT ${CARD_COLUMNS} FROM products p JOIN product_types t ON t.id = p.type_id
      WHERE p.is_active = 1 AND t.is_active = 1 AND p.id != ${productId}
        AND EXISTS (SELECT 1 FROM product_vibes pv WHERE pv.product_id = p.id AND pv.vibe_id = ${vibeId})
      ORDER BY p.popularity DESC LIMIT 8`),
    newCutoff(),
    quickByType(),
  ]);
  return rows.map((r) => toCard(r, cutoff, quick));
}

export async function getCardsByIds(ids: number[]): Promise<ProductCard[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('catalog');
  const clean = [...new Set(ids.filter((n) => Number.isInteger(n) && n > 0))].slice(0, 60);
  if (!clean.length) return [];
  const [rows, cutoff, quick] = await Promise.all([
    db.all<CardRow>(
      sql`SELECT ${CARD_COLUMNS} FROM products p JOIN product_types t ON t.id = p.type_id WHERE p.is_active = 1 AND t.is_active = 1 AND p.id IN (${sql.join(
        clean.map((n) => sql`${n}`),
        sql`, `,
      )})`,
    ),
    newCutoff(),
    quickByType(),
  ]);
  const byId = new Map(rows.map((r) => [r.id, toCard(r, cutoff, quick)]));
  return clean.map((id) => byId.get(id)).filter((c): c is ProductCard => Boolean(c));
}

export interface Suggestions {
  products: ProductCard[];
  types: Array<{ id: string; name: string }>;
  vibes: Array<{ id: string; name: string }>;
}

export async function getSuggestions(q: string): Promise<Suggestions> {
  'use cache';
  cacheLife('hours');
  cacheTag('catalog');
  if (!searchTokens(q).length) return { products: [], types: [], vibes: [] };
  const like = `%${q.trim().toLowerCase().replace(/[%_]/g, '')}%`;
  const [products, types, vibes] = await Promise.all([
    listProducts({ q, sort: 'relevance', page: 1 }).then((r) => r.items.slice(0, 6)),
    db.all<{ id: string; name: string }>(sql`SELECT id, name FROM product_types WHERE is_active = 1 AND group_id != 'custom' AND (lower(name) LIKE ${like} OR lower(singular) LIKE ${like}) ORDER BY sort_order LIMIT 3`),
    db.all<{ id: string; name: string }>(sql`SELECT id, name FROM vibes WHERE is_active = 1 AND lower(name) LIKE ${like} ORDER BY sort_order LIMIT 3`),
  ]);
  return { products, types, vibes };
}

export async function getPopularSlugs(limit: number): Promise<string[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('catalog');
  const rows = await db.select({ slug: s.products.slug }).from(s.products).where(eq(s.products.isActive, true)).orderBy(desc(s.products.popularity)).limit(limit);
  return rows.map((r) => r.slug);
}

export interface QuoteProduct {
  id: number;
  slug: string;
  name: string;
  typeId: string;
  typeName: string;
  options: OptionGroup[];
  price: PriceProfile;
  art: ArtSpec | null;
  image: string | null;
}

/** Products in a cart, with everything the server needs to price them. Not cached: prices must be current. */
export async function getQuoteProducts(ids: number[]): Promise<QuoteProduct[]> {
  const clean = [...new Set(ids.filter((n) => Number.isInteger(n) && n > 0))].slice(0, 100);
  if (!clean.length) return [];
  const rows = await db
    .select({
      id: s.products.id,
      slug: s.products.slug,
      name: s.products.name,
      typeId: s.products.typeId,
      typeName: s.productTypes.singular,
      options: s.productTypes.options,
      price: s.productTypes.price,
      priceOverride: s.products.priceOverride,
      art: s.products.art,
      images: s.products.images,
    })
    .from(s.products)
    .innerJoin(s.productTypes, eq(s.productTypes.id, s.products.typeId))
    .where(and(inArray(s.products.id, clean), eq(s.products.isActive, true), eq(s.productTypes.isActive, true)));
  return rows.map(({ priceOverride, images, ...r }) => ({ ...r, price: mergeProfile(r.price, priceOverride), image: cardImage(images?.[0]) }));
}

/** The most popular product's artwork for each vibe, used as cover art on /vibes. */
export async function getVibeCovers(): Promise<Record<string, ArtSpec | null>> {
  'use cache';
  cacheLife('hours');
  cacheTag('catalog');
  const rows = await db.all<{ vibe_id: string; art: string | null }>(sql`
    SELECT vibe_id, art FROM (
      SELECT p.vibe_id, p.art, row_number() OVER (PARTITION BY p.vibe_id ORDER BY p.popularity DESC) AS rk
      FROM products p WHERE p.is_active = 1 AND p.art IS NOT NULL AND json_extract(p.art, '$.kind') IN ('sticker', 'holo', 'motion', 'dome')
    ) WHERE rk = 1`);
  return Object.fromEntries(rows.map((r) => [r.vibe_id, parseJson<ArtSpec>(r.art)]));
}

export interface SitemapProduct {
  slug: string;
  createdAt: number;
  images: string[];
}

/** Every product in the store, for the sitemap. */
export async function getSitemapProducts(): Promise<SitemapProduct[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('catalog');
  const rows = await db.all<{ slug: string; created_at: number; images: string | null }>(sql`
    SELECT p.slug, p.created_at, p.images FROM products p JOIN product_types t ON t.id = p.type_id
    WHERE p.is_active = 1 AND t.is_active = 1 ORDER BY p.popularity DESC, p.id`);
  return rows.map((r) => ({ slug: r.slug, createdAt: r.created_at, images: (parseJson<string[]>(r.images) ?? []).map(fullImage) }));
}
