import 'server-only';
import { and, asc, eq, inArray, ne, sql, type SQL } from 'drizzle-orm';
import type { ArtSpec } from '@/lib/art/types';
import { cardImage, photoSrc, photoUploadId } from '@/lib/catalog/images';
import { reindexProducts } from '@/lib/catalog/search-index';
import type { GroupId, PriceProfile } from '@/lib/catalog/types';
import { db } from '@/lib/db/client';
import * as s from '@/lib/db/schema';
import { uniqueSlug } from '@/lib/slug';
import {
  autoSlug,
  cleanName,
  cleanTags,
  exportRow,
  LIMITS,
  nameError,
  overrideFor,
  parseRupees,
  priceError,
  slugError,
  startingPriceOf,
  type ExistingProduct,
  type ImportContext,
  type ImportRow,
  type ProductWrite,
  type TypeInfo,
} from './product-rules';

/** Catalog work for the admin panel: the product list, the product form, bulk changes, and CSV import and export. */

export const PRODUCTS_PER_PAGE = 50;
export const PRODUCT_SORTS = ['new', 'popular', 'name', 'price'] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

export interface AdminProductFilters {
  q?: string;
  type?: string;
  vibe?: string;
  status?: 'shown' | 'hidden';
  source?: 'demo' | 'real';
  sort?: ProductSort;
  page: number;
}

export interface AdminProductRow {
  id: number;
  slug: string;
  name: string;
  typeName: string;
  vibeName: string;
  priceFrom: number;
  isActive: boolean;
  isSample: boolean;
  typeActive: boolean;
  popularity: number;
  art: ArtSpec | null;
  image: string | null;
}

export interface AdminType extends TypeInfo {
  groupId: GroupId;
  isActive: boolean;
}

export interface AdminVibe {
  id: string;
  name: string;
  blurb: string;
  featured: boolean;
  isActive: boolean;
  sortOrder: number;
  products: number;
}

const parse = <T,>(v: string | null): T | null => {
  if (!v) return null;
  try {
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
};

const ORDER: Record<ProductSort, SQL> = {
  new: sql`p.created_at DESC, p.id DESC`,
  popular: sql`p.popularity DESC, p.id DESC`,
  name: sql`p.name COLLATE NOCASE ASC, p.id ASC`,
  price: sql`p.price_from ASC, p.id ASC`,
};

export async function listAdminProducts(f: AdminProductFilters): Promise<{ rows: AdminProductRow[]; total: number }> {
  const where: SQL[] = [];
  const q = f.q?.trim();
  if (q) {
    const like = `%${q.toLowerCase().replace(/[%_\\]/g, '')}%`;
    const id = /^\d+$/.test(q) ? Number(q) : null;
    where.push(id ? sql`(p.id = ${id} OR lower(p.name) LIKE ${like} OR p.slug LIKE ${like})` : sql`(lower(p.name) LIKE ${like} OR p.slug LIKE ${like})`);
  }
  if (f.type) where.push(sql`p.type_id = ${f.type}`);
  if (f.vibe) where.push(sql`EXISTS (SELECT 1 FROM product_vibes pv WHERE pv.product_id = p.id AND pv.vibe_id = ${f.vibe})`);
  if (f.status) where.push(sql`p.is_active = ${f.status === 'shown' ? 1 : 0}`);
  if (f.source) where.push(sql`p.is_sample = ${f.source === 'demo' ? 1 : 0}`);
  const whereSql = where.length ? sql`WHERE ${sql.join(where, sql` AND `)}` : sql``;
  const page = Math.max(1, Math.floor(f.page));
  const [rows, [{ n }]] = await Promise.all([
    db.all<{
      id: number;
      slug: string;
      name: string;
      price_from: number;
      is_active: number;
      is_sample: number;
      popularity: number;
      art: string | null;
      images: string | null;
      type_name: string;
      type_active: number;
      vibe_name: string;
    }>(sql`
      SELECT p.id, p.slug, p.name, p.price_from, p.is_active, p.is_sample, p.popularity, p.art, p.images,
        t.singular AS type_name, t.is_active AS type_active, v.name AS vibe_name
      FROM products p JOIN product_types t ON t.id = p.type_id JOIN vibes v ON v.id = p.vibe_id
      ${whereSql} ORDER BY ${ORDER[f.sort ?? 'new']} LIMIT ${PRODUCTS_PER_PAGE} OFFSET ${(page - 1) * PRODUCTS_PER_PAGE}`),
    db.all<{ n: number }>(sql`SELECT count(*) AS n FROM products p ${whereSql}`),
  ]);
  return {
    total: n,
    rows: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      typeName: r.type_name,
      vibeName: r.vibe_name,
      priceFrom: r.price_from,
      isActive: Boolean(r.is_active),
      isSample: Boolean(r.is_sample),
      typeActive: Boolean(r.type_active),
      popularity: r.popularity,
      art: parse<ArtSpec>(r.art),
      image: cardImage(parse<string[]>(r.images)?.[0]),
    })),
  };
}

export async function productCounts(): Promise<{ total: number; shown: number; demo: number }> {
  const [row] = await db.all<{ total: number; shown: number | null; demo: number | null }>(
    sql`SELECT count(*) AS "total", sum(is_active) AS "shown", sum(is_sample) AS "demo" FROM products`,
  );
  return { total: row?.total ?? 0, shown: row?.shown ?? 0, demo: row?.demo ?? 0 };
}

/** Every product type except the custom-studio ones, hidden ones included. */
export async function adminTypes(): Promise<AdminType[]> {
  const rows = await db.select().from(s.productTypes).where(ne(s.productTypes.groupId, 'custom')).orderBy(asc(s.productTypes.sortOrder));
  return rows.map((t) => ({ id: t.id, name: t.name, singular: t.singular, description: t.description, options: t.options, price: t.price, groupId: t.groupId, isActive: t.isActive }));
}

export async function adminVibes(): Promise<AdminVibe[]> {
  const rows = await db.all<{ id: string; name: string; blurb: string; featured: number; is_active: number; sort_order: number; products: number }>(sql`
    SELECT v.id, v.name, v.blurb, v.featured, v.is_active, v.sort_order,
      (SELECT count(*) FROM product_vibes pv WHERE pv.vibe_id = v.id) AS products
    FROM vibes v ORDER BY v.sort_order, v.name`);
  return rows.map((v) => ({ id: v.id, name: v.name, blurb: v.blurb, featured: Boolean(v.featured), isActive: Boolean(v.is_active), sortOrder: v.sort_order, products: v.products }));
}

export interface AdminProduct {
  id: number;
  slug: string;
  name: string;
  typeId: string;
  vibeId: string;
  extraVibes: string[];
  description: string;
  tags: string;
  images: string[];
  /** The product's own starting price in paise, or null when it uses the type's prices. */
  startingPrice: number | null;
  priceFrom: number;
  popularity: number;
  isActive: boolean;
  isSample: boolean;
  art: ArtSpec | null;
}

export async function getAdminProduct(id: number): Promise<AdminProduct | null> {
  const row = await db.query.products.findFirst({ where: eq(s.products.id, id) });
  if (!row) return null;
  const [links, type] = await Promise.all([
    db.select({ vibeId: s.productVibes.vibeId }).from(s.productVibes).where(eq(s.productVibes.productId, id)),
    db.query.productTypes.findFirst({ where: eq(s.productTypes.id, row.typeId) }),
  ]);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    typeId: row.typeId,
    vibeId: row.vibeId,
    extraVibes: links.map((l) => l.vibeId).filter((v) => v !== row.vibeId),
    description: row.description,
    tags: row.tags,
    images: row.images ?? [],
    startingPrice: row.priceOverride && type ? startingPriceOf(type, row.priceOverride) : null,
    priceFrom: row.priceFrom,
    popularity: row.popularity,
    isActive: row.isActive,
    isSample: row.isSample,
    art: row.art,
  };
}

/* ---------- saving ---------- */

export interface ProductFormInput {
  name: string;
  slug: string;
  typeId: string;
  vibeId: string;
  extraVibes: string[];
  description: string;
  tags: string;
  images: string[];
  /** Rupees as typed. Empty means "use the type's prices". */
  startingPrice: string;
  popularity: number;
  isActive: boolean;
}

export type SaveProductResult = { ok: true; id: number; slug: string } | { ok: false; error: string; field?: keyof ProductFormInput };

/** Upload ids in `srcs` that are finished product photos. */
async function knownPhotos(ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const rows = await db
    .select({ id: s.uploads.id })
    .from(s.uploads)
    .where(and(inArray(s.uploads.id, ids), eq(s.uploads.kind, 'product'), eq(s.uploads.status, 'ready')));
  return new Set(rows.map((r) => r.id));
}

async function writeProduct(tx: Pick<typeof db, 'insert' | 'update' | 'delete'>, id: number | null, p: ProductWrite, now: number): Promise<number> {
  const values = {
    slug: p.slug,
    name: p.name,
    typeId: p.typeId,
    vibeId: p.vibes[0],
    description: p.description,
    tags: p.tags,
    priceOverride: p.priceOverride,
    priceFrom: p.priceFrom,
    images: p.images.length ? p.images : null,
    popularity: p.popularity,
    isActive: p.isActive,
    // A demo product you edit becomes one of yours, so "remove demo products" keeps it.
    isSample: false,
  };
  let productId = id;
  if (productId === null) {
    const [row] = await tx
      .insert(s.products)
      .values({ ...values, createdAt: now })
      .returning({ id: s.products.id });
    productId = row.id;
  } else {
    await tx.update(s.products).set(values).where(eq(s.products.id, productId));
    await tx.delete(s.productVibes).where(eq(s.productVibes.productId, productId));
  }
  await tx.insert(s.productVibes).values(p.vibes.map((vibeId) => ({ productId: productId!, vibeId })));
  return productId;
}

export async function saveProduct(id: number | null, input: ProductFormInput): Promise<SaveProductResult> {
  const name = cleanName(input.name);
  const nameIssue = nameError(name);
  if (nameIssue) return { ok: false, error: nameIssue, field: 'name' };

  const typeRow = await db.query.productTypes.findFirst({ where: and(eq(s.productTypes.id, input.typeId), ne(s.productTypes.groupId, 'custom')) });
  if (!typeRow) return { ok: false, error: 'Choose a product type.', field: 'typeId' };

  const vibes = [...new Set([input.vibeId, ...input.extraVibes].filter(Boolean))];
  if (!input.vibeId) return { ok: false, error: 'Choose the main vibe.', field: 'vibeId' };
  if (vibes.length > LIMITS.vibes) return { ok: false, error: `Choose up to ${LIMITS.vibes - 1} more vibes.`, field: 'extraVibes' };
  const found = await db.select({ id: s.vibes.id }).from(s.vibes).where(inArray(s.vibes.id, vibes));
  if (found.length !== vibes.length) return { ok: false, error: 'One of those vibes no longer exists. Reload the page and try again.', field: 'vibeId' };

  const existing = id ? await db.query.products.findFirst({ where: eq(s.products.id, id) }) : null;
  if (id && !existing) return { ok: false, error: 'This product was deleted.' };

  const taken = async (slug: string) => {
    const row = await db.query.products.findFirst({ columns: { id: true }, where: id ? and(eq(s.products.slug, slug), ne(s.products.id, id)) : eq(s.products.slug, slug) });
    return Boolean(row);
  };
  let slug = input.slug.trim().toLowerCase();
  if (!slug) {
    const base = autoSlug(name, typeRow.singular);
    const rows = await db.select({ slug: s.products.slug }).from(s.products).where(sql`${s.products.slug} = ${base} OR ${s.products.slug} LIKE ${`${base}-%`}`);
    const used = new Set(rows.map((r) => r.slug));
    slug = uniqueSlug(base, (x) => used.has(x));
  }
  const slugIssue = slugError(slug);
  if (slugIssue) return { ok: false, error: slugIssue, field: 'slug' };
  if (await taken(slug)) return { ok: false, error: 'Another product already uses this web address.', field: 'slug' };

  const description = input.description.trim();
  if (description.length > LIMITS.description) return { ok: false, error: `Keep the description under ${LIMITS.description} characters.`, field: 'description' };

  const starting = parseRupees(input.startingPrice);
  if (starting !== null) {
    const issue = priceError(starting);
    if (issue) return { ok: false, error: issue, field: 'startingPrice' };
  }
  if (!Number.isInteger(input.popularity) || input.popularity < 0 || input.popularity > LIMITS.popularity) return { ok: false, error: 'Popularity should be a whole number from 0 up.', field: 'popularity' };

  const ids = input.images.map(photoUploadId);
  if (ids.some((x) => !x) || ids.length > LIMITS.images) return { ok: false, error: `Use up to ${LIMITS.images} photos.`, field: 'images' };
  const ok = await knownPhotos(ids as string[]);
  if (ok.size !== new Set(ids).size) return { ok: false, error: 'A photo is missing. Remove it and upload it again.', field: 'images' };
  const images = [...new Set(ids as string[])].map(photoSrc);
  if (input.isActive && images.length === 0 && !existing?.art) return { ok: false, error: 'Add at least one photo before showing this product, or untick “Show in the store”.', field: 'images' };

  const priceOverride = overrideFor(typeRow, starting);
  const write: ProductWrite = {
    slug,
    name,
    typeId: typeRow.id,
    vibes,
    description,
    tags: cleanTags(input.tags),
    priceOverride,
    priceFrom: startingPriceOf(typeRow, priceOverride),
    popularity: input.popularity,
    images,
    isActive: input.isActive,
  };
  const productId = await db.transaction((tx) => writeProduct(tx, id, write, Math.floor(Date.now() / 1000)));
  await reindexProducts([productId]);
  return { ok: true, id: productId, slug };
}

/* ---------- bulk changes ---------- */

export type BulkAction = 'show' | 'hide' | 'delete' | 'vibe';

export async function bulkProducts(ids: number[], action: BulkAction, vibeId?: string): Promise<{ ok: true; changed: number; skipped: number } | { ok: false; error: string }> {
  const clean = [...new Set(ids)].slice(0, 500);
  if (!clean.length) return { ok: false, error: 'Select some products first.' };
  const list = sql.join(clean.map((n) => sql`${n}`), sql`, `);
  let changed = 0;
  if (action === 'show') {
    // Products without a photo or artwork stay hidden: they would show as an empty card.
    const rows = await db.all<{ id: number }>(
      sql`UPDATE products SET is_active = 1 WHERE id IN (${list}) AND (art IS NOT NULL OR (images IS NOT NULL AND json_array_length(images) > 0)) RETURNING id`,
    );
    changed = rows.length;
  } else if (action === 'hide') {
    changed = (await db.update(s.products).set({ isActive: false }).where(inArray(s.products.id, clean)).returning({ id: s.products.id })).length;
  } else if (action === 'delete') {
    changed = (await db.delete(s.products).where(inArray(s.products.id, clean)).returning({ id: s.products.id })).length;
  } else {
    const vibe = vibeId ? await db.query.vibes.findFirst({ where: eq(s.vibes.id, vibeId) }) : null;
    if (!vibe) return { ok: false, error: 'Choose a vibe.' };
    const rows = await db.select({ id: s.products.id, vibeId: s.products.vibeId }).from(s.products).where(inArray(s.products.id, clean));
    await db.transaction(async (tx) => {
      for (const r of rows) {
        // The new vibe replaces the old main vibe; extra vibes stay.
        if (r.vibeId !== vibe.id) await tx.delete(s.productVibes).where(and(eq(s.productVibes.productId, r.id), eq(s.productVibes.vibeId, r.vibeId)));
        await tx.insert(s.productVibes).values({ productId: r.id, vibeId: vibe.id }).onConflictDoNothing();
        await tx.update(s.products).set({ vibeId: vibe.id }).where(eq(s.products.id, r.id));
      }
    });
    changed = rows.length;
  }
  await reindexProducts(clean);
  return { ok: true, changed, skipped: clean.length - changed };
}

/** Remove every demo product from the sample seed. Products you edited are yours and stay. */
export async function deleteDemoProducts(): Promise<number> {
  const removed = await db.delete(s.products).where(eq(s.products.isSample, true)).returning({ id: s.products.id });
  await reindexProducts();
  return removed.length;
}

/** Work out each product's starting price again, after a type's prices change. */
export async function refreshPricesForType(typeId: string): Promise<void> {
  const type = await db.query.productTypes.findFirst({ where: eq(s.productTypes.id, typeId) });
  if (!type) return;
  await db.update(s.products).set({ priceFrom: startingPriceOf(type, null) }).where(and(eq(s.products.typeId, typeId), sql`${s.products.priceOverride} IS NULL`));
  const custom = await db
    .select({ id: s.products.id, priceOverride: s.products.priceOverride })
    .from(s.products)
    .where(and(eq(s.products.typeId, typeId), sql`${s.products.priceOverride} IS NOT NULL`));
  for (const p of custom) await db.update(s.products).set({ priceFrom: startingPriceOf(type, p.priceOverride) }).where(eq(s.products.id, p.id));
}

/* ---------- CSV import and export ---------- */

async function existingProducts(where?: SQL): Promise<ExistingProduct[]> {
  const rows = await db.all<{
    id: number;
    slug: string;
    name: string;
    type_id: string;
    vibe_id: string;
    vibes: string | null;
    description: string;
    tags: string;
    price_override: string | null;
    popularity: number;
    images: string | null;
    has_art: number;
    is_active: number;
  }>(sql`
    SELECT p.id, p.slug, p.name, p.type_id, p.vibe_id, p.description, p.tags, p.price_override, p.popularity, p.images,
      p.art IS NOT NULL AS has_art, p.is_active,
      (SELECT group_concat(pv.vibe_id, ';') FROM product_vibes pv WHERE pv.product_id = p.id) AS vibes
    FROM products p ${where ? sql`WHERE ${where}` : sql``} ORDER BY p.id`);
  return rows.map((r) => {
    const others = (r.vibes ?? '').split(';').filter((v) => v && v !== r.vibe_id);
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      typeId: r.type_id,
      vibes: [r.vibe_id, ...others.sort()],
      description: r.description,
      tags: r.tags,
      priceOverride: parse<Partial<PriceProfile>>(r.price_override),
      popularity: r.popularity,
      images: parse<string[]>(r.images) ?? [],
      hasArt: Boolean(r.has_art),
      isActive: Boolean(r.is_active),
    };
  });
}

export async function importContext(): Promise<ImportContext> {
  const [types, vibes, products, photos] = await Promise.all([
    adminTypes(),
    db.select({ id: s.vibes.id, name: s.vibes.name }).from(s.vibes),
    existingProducts(),
    db
      .select({ id: s.uploads.id, name: s.uploads.name })
      .from(s.uploads)
      .where(and(eq(s.uploads.kind, 'product'), eq(s.uploads.status, 'ready')))
      .orderBy(asc(s.uploads.createdAt)),
  ]);
  const photosByName = new Map<string, string>();
  // Oldest first, so the newest upload of a file name wins.
  for (const p of photos) photosByName.set(p.name.toLowerCase(), p.id);
  return { types, vibes, products, photosByName, photoIds: new Set(photos.map((p) => p.id)) };
}

/** Write the new and changed rows of a checked import. Returns how many were added and updated. */
export async function applyImport(rows: ImportRow[]): Promise<{ created: number; updated: number }> {
  const work = rows.filter((r): r is Extract<ImportRow, { kind: 'new' | 'update' }> => r.kind === 'new' || r.kind === 'update');
  const now = Math.floor(Date.now() / 1000);
  const touched: number[] = [];
  for (let i = 0; i < work.length; i += 200) {
    const chunk = work.slice(i, i + 200);
    await db.transaction(async (tx) => {
      for (const [j, r] of chunk.entries()) {
        // Later rows get a slightly later time, so "newest first" keeps the file's order.
        touched.push(await writeProduct(tx, r.kind === 'update' ? r.id! : null, r.product, now + i + j));
      }
    });
  }
  await reindexProducts(touched);
  return { created: work.filter((r) => r.kind === 'new').length, updated: work.filter((r) => r.kind === 'update').length };
}

export async function exportProducts(onlyReal: boolean): Promise<string[][]> {
  const [types, products] = await Promise.all([adminTypes(), existingProducts(onlyReal ? sql`p.is_sample = 0` : undefined)]);
  const byId = new Map(types.map((t) => [t.id, t]));
  return products.map((p) => exportRow(p, byId.get(p.typeId)));
}

/** Example rows for the import template, using real type and vibe ids from this store. */
export async function templateRows(): Promise<string[][]> {
  const [types, vibes] = await Promise.all([adminTypes(), db.select({ id: s.vibes.id }).from(s.vibes).orderBy(asc(s.vibes.sortOrder)).limit(3)]);
  const poster = types.find((t) => t.id === 'wall-posters') ?? types[0];
  const sticker = types.find((t) => t.id === 'laptop-stickers') ?? types[1] ?? types[0];
  const v = vibes.map((x) => x.id);
  return [
    ['', '', 'Midnight Drift', poster?.id ?? '', [v[0], v[1]].filter(Boolean).join(';'), 'A neon city at 2 am, printed on thick matte paper.', 'neon city night', '', '', 'midnight-drift.jpg|midnight-drift-wall.jpg', 'yes'],
    ['', '', 'Lucky Cat', sticker?.id ?? '', v[2] ?? v[0] ?? '', 'A waving lucky cat for your laptop.', 'cat cute', '79', '', 'lucky-cat.png', 'no'],
  ];
}

/** Product photos that no product and no order uses, older than `olderThanSec`. */
export async function deleteUnusedProductPhotos(olderThanSec: number, remove: (row: typeof s.uploads.$inferSelect) => Promise<void>): Promise<number> {
  const cutoff = Math.floor(Date.now() / 1000) - olderThanSec;
  const rows = await db.all<{ id: string }>(sql`
    SELECT u.id FROM uploads u
    WHERE u.kind = 'product' AND u.created_at < ${cutoff}
      AND NOT EXISTS (SELECT 1 FROM products p, json_each(p.images) j WHERE p.images IS NOT NULL AND j.value = '/api/uploads/' || u.id)
      AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.image LIKE '/api/uploads/' || u.id || '%')`);
  if (!rows.length) return 0;
  const full = await db.select().from(s.uploads).where(inArray(s.uploads.id, rows.map((r) => r.id)));
  for (const row of full) await remove(row);
  return full.length;
}
