import 'server-only';
import { asc, eq, sql } from 'drizzle-orm';
import { reindexProducts } from '@/lib/catalog/search-index';
import { db } from '@/lib/db/client';
import * as s from '@/lib/db/schema';
import { SLUG_RE } from '@/lib/slug';
import type { Result } from './categories';

/** Vibes (collections like Anime or F1): add, edit, feature, hide, reorder and delete. */

export interface VibeInput {
  id: string;
  name: string;
  blurb: string;
  featured: boolean;
  isActive: boolean;
}

function check(v: VibeInput): string | null {
  if (!SLUG_RE.test(v.id) || v.id.length > 40) return 'The web address should use lowercase letters, numbers and dashes, like k-pop.';
  const name = v.name.trim();
  if (name.length < 2 || name.length > 40) return 'Give the vibe a name of up to 40 characters.';
  if (v.blurb.trim().length > 200) return 'Keep the description under 200 characters.';
  return null;
}

export async function createVibe(v: VibeInput): Promise<Result> {
  const issue = check(v);
  if (issue) return { ok: false, error: issue };
  if (await db.query.vibes.findFirst({ where: eq(s.vibes.id, v.id) })) return { ok: false, error: `There is already a vibe at /v/${v.id}. Choose another web address.` };
  const [{ n }] = await db.all<{ n: number | null }>(sql`SELECT max(sort_order) AS n FROM vibes`);
  await db.insert(s.vibes).values({ id: v.id, name: v.name.trim(), blurb: v.blurb.trim(), featured: v.featured, isActive: v.isActive, sortOrder: (n ?? 0) + 1 });
  return { ok: true };
}

export async function updateVibe(v: VibeInput): Promise<Result> {
  const issue = check(v);
  if (issue) return { ok: false, error: issue };
  const old = await db.query.vibes.findFirst({ where: eq(s.vibes.id, v.id) });
  if (!old) return { ok: false, error: 'This vibe no longer exists.' };
  await db.update(s.vibes).set({ name: v.name.trim(), blurb: v.blurb.trim(), featured: v.featured, isActive: v.isActive }).where(eq(s.vibes.id, v.id));
  // Vibe names are part of product search.
  if (old.name !== v.name.trim()) {
    const ids = await db.select({ id: s.productVibes.productId }).from(s.productVibes).where(eq(s.productVibes.vibeId, v.id));
    await reindexProducts(ids.map((r) => r.id));
  }
  return { ok: true };
}

export async function moveVibe(id: string, dir: -1 | 1): Promise<Result> {
  const all = await db.select({ id: s.vibes.id }).from(s.vibes).orderBy(asc(s.vibes.sortOrder), asc(s.vibes.name));
  const i = all.findIndex((v) => v.id === id);
  if (i < 0) return { ok: false, error: 'This vibe no longer exists.' };
  const j = i + dir;
  if (j < 0 || j >= all.length) return { ok: true };
  [all[i], all[j]] = [all[j], all[i]];
  await db.transaction(async (tx) => {
    for (const [n, v] of all.entries()) await tx.update(s.vibes).set({ sortOrder: n }).where(eq(s.vibes.id, v.id));
  });
  return { ok: true };
}

/** Only a vibe no product uses can be deleted; otherwise hide it. */
export async function deleteVibe(id: string): Promise<Result> {
  const [{ n }] = await db.all<{ n: number }>(sql`SELECT count(DISTINCT id) AS n FROM (SELECT product_id AS id FROM product_vibes WHERE vibe_id = ${id} UNION SELECT id FROM products WHERE vibe_id = ${id})`);
  if (n > 0) return { ok: false, error: `${n.toLocaleString('en-IN')} product${n === 1 ? ' uses' : 's use'} this vibe. Hide it instead, or move those products to another vibe first.` };
  await db.delete(s.vibes).where(eq(s.vibes.id, id));
  return { ok: true };
}
