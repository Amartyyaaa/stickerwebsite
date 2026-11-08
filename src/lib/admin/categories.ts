import 'server-only';
import { asc, eq, sql } from 'drizzle-orm';
import { reindexProducts } from '@/lib/catalog/search-index';
import type { GroupId, OptionGroup, PriceProfile } from '@/lib/catalog/types';
import { db } from '@/lib/db/client';
import * as s from '@/lib/db/schema';
import { fromPriceInput, type PriceInput } from './price-table';
import { typeStartingPrice } from './product-rules';
import { refreshPricesForType } from './products';

/** Product types ("categories" in the admin): their names, visibility, order and price tables. */

export interface CategoryRow {
  id: string;
  name: string;
  groupId: GroupId;
  isActive: boolean;
  products: number;
  startingPrice: number;
}

export interface Category {
  id: string;
  name: string;
  singular: string;
  groupId: GroupId;
  description: string;
  highlights: string[];
  isActive: boolean;
  options: OptionGroup[];
  price: PriceProfile;
  products: number;
}

export async function listCategories(): Promise<CategoryRow[]> {
  const [types, counts] = await Promise.all([
    db.select().from(s.productTypes).orderBy(asc(s.productTypes.sortOrder)),
    db.all<{ id: string; n: number }>(sql`SELECT type_id AS id, count(*) AS n FROM products GROUP BY type_id`),
  ]);
  const n = new Map(counts.map((c) => [c.id, c.n]));
  return types.map((t) => ({ id: t.id, name: t.name, groupId: t.groupId, isActive: t.isActive, products: n.get(t.id) ?? 0, startingPrice: typeStartingPrice(t) }));
}

export async function getCategory(id: string): Promise<Category | null> {
  const t = await db.query.productTypes.findFirst({ where: eq(s.productTypes.id, id) });
  if (!t) return null;
  const [{ n }] = await db.all<{ n: number }>(sql`SELECT count(*) AS n FROM products WHERE type_id = ${id}`);
  return { id: t.id, name: t.name, singular: t.singular, groupId: t.groupId, description: t.description, highlights: t.highlights, isActive: t.isActive, options: t.options, price: t.price, products: n };
}

export interface CategoryInput {
  name: string;
  singular: string;
  description: string;
  highlights: string[];
  isActive: boolean;
  price: PriceInput;
}

export type Result = { ok: true } | { ok: false; error: string };

export async function saveCategory(id: string, input: CategoryInput): Promise<Result> {
  const t = await db.query.productTypes.findFirst({ where: eq(s.productTypes.id, id) });
  if (!t) return { ok: false, error: 'This type no longer exists.' };
  const name = input.name.replace(/\s+/g, ' ').trim();
  const singular = input.singular.replace(/\s+/g, ' ').trim();
  if (name.length < 2 || name.length > 60) return { ok: false, error: 'Give the type a name of up to 60 characters.' };
  if (singular.length < 2 || singular.length > 60) return { ok: false, error: 'Give the name for one item, like “Wall poster”.' };
  const description = input.description.trim();
  if (description.length > 400) return { ok: false, error: 'Keep the description under 400 characters.' };
  const highlights = input.highlights.map((h) => h.replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (highlights.length > 6 || highlights.some((h) => h.length > 120)) return { ok: false, error: 'Use up to 6 highlights of up to 120 characters each.' };

  const price = fromPriceInput(t.options, t.price, input.price);
  if (!price.ok) return price;

  await db
    .update(s.productTypes)
    .set({
      name,
      singular,
      description,
      highlights,
      // The custom studios always stay on: their pages need their type.
      isActive: t.groupId === 'custom' ? true : input.isActive,
      price: price.price,
    })
    .where(eq(s.productTypes.id, id));
  await refreshPricesForType(id);
  if (name !== t.name || singular !== t.singular) {
    const ids = await db.select({ id: s.products.id }).from(s.products).where(eq(s.products.typeId, id));
    await reindexProducts(ids.map((r) => r.id));
  }
  return { ok: true };
}

/** Move a type one place up or down within its group (the order menus and the shop page use). */
export async function moveCategory(id: string, dir: -1 | 1): Promise<Result> {
  const all = await db.select({ id: s.productTypes.id, groupId: s.productTypes.groupId }).from(s.productTypes).orderBy(asc(s.productTypes.sortOrder), asc(s.productTypes.id));
  const i = all.findIndex((t) => t.id === id);
  if (i < 0) return { ok: false, error: 'This type no longer exists.' };
  let j = i + dir;
  while (j >= 0 && j < all.length && all[j].groupId !== all[i].groupId) j += dir;
  if (j < 0 || j >= all.length) return { ok: true };
  [all[i], all[j]] = [all[j], all[i]];
  await db.transaction(async (tx) => {
    for (const [n, t] of all.entries()) await tx.update(s.productTypes).set({ sortOrder: n }).where(eq(s.productTypes.id, t.id));
  });
  return { ok: true };
}
