import { and, eq, inArray, sql } from 'drizzle-orm';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import { RETIRED_TYPES, VIBE_MOVES, VIBES } from '@/lib/catalog/taxonomy';
import * as s from '@/lib/db/schema';
import { DEFAULT_SETTINGS, type StoreSettings } from '@/lib/settings';

type DB = LibSQLDatabase<typeof s>;

/**
 * One-time changes to a store that is already running, applied by `npm run db:seed` (which runs on
 * every deploy). Each change runs once: the version reached is saved in the settings table.
 *
 * Version 2 (November 2026): the 21 themes, and fewer product types.
 * - Products in earlier themes move to the new ones (VIBE_MOVES), and those themes are deleted.
 *   Themes you added in admin are left alone.
 * - Product types the store no longer sells (RETIRED_TYPES) are deleted with their demo products.
 *   If you had added your own products to one, those products and the type are hidden instead.
 * - Empty contact details are filled in, and settings that point to removed themes or types are updated.
 * The caller then makes the demo products again for the new themes, and rebuilds the search index.
 */
export const STORE_VERSION = 2;
const VERSION_KEY = 'store_version';

export interface StoreUpdateResult {
  /** The version the store was at before. */
  from: number;
  applied: boolean;
  /** Whether the store had demo products when the update ran (they're made again for the new themes). */
  hadDemo: boolean;
  notes: string[];
}

export async function applyStoreUpdates(db: DB): Promise<StoreUpdateResult> {
  const saved = await db.select().from(s.settings).where(eq(s.settings.key, VERSION_KEY));
  const from = saved.length ? Number(saved[0].value) || 1 : 1;
  if (from >= STORE_VERSION) return { from, applied: false, hadDemo: false, notes: [] };

  const notes: string[] = [];
  const [{ demo }] = await db.select({ demo: sql<number>`count(*)` }).from(s.products).where(eq(s.products.isSample, true));

  // Themes: the new ones are written as defined in code (seedBase only adds missing ones).
  for (const [i, v] of VIBES.entries()) {
    await db
      .insert(s.vibes)
      .values({ id: v.id, name: v.name, blurb: v.blurb, sortOrder: i, featured: Boolean(v.featured), isActive: true })
      .onConflictDoUpdate({ target: s.vibes.id, set: { name: v.name, blurb: v.blurb, sortOrder: i, featured: Boolean(v.featured), isActive: true } });
  }
  let moved = 0;
  let removedVibes = 0;
  for (const [oldId, newId] of Object.entries(VIBE_MOVES)) {
    const exists = await db.select({ id: s.vibes.id }).from(s.vibes).where(eq(s.vibes.id, oldId));
    if (!exists.length) continue;
    moved += (await db.update(s.products).set({ vibeId: newId }).where(eq(s.products.vibeId, oldId)).returning({ id: s.products.id })).length;
    await db.run(sql`INSERT OR IGNORE INTO product_vibes (product_id, vibe_id) SELECT product_id, ${newId} FROM product_vibes WHERE vibe_id = ${oldId}`);
    await db.delete(s.productVibes).where(eq(s.productVibes.vibeId, oldId));
    await db.delete(s.vibes).where(eq(s.vibes.id, oldId));
    removedVibes++;
  }
  if (removedVibes) notes.push(`${removedVibes} earlier theme(s) replaced; ${moved} product(s) moved to the new themes`);

  // Product types the store no longer sells.
  for (const typeId of RETIRED_TYPES) {
    const exists = await db.select({ id: s.productTypes.id }).from(s.productTypes).where(eq(s.productTypes.id, typeId));
    if (!exists.length) continue;
    const demoIds = (await db.select({ id: s.products.id }).from(s.products).where(and(eq(s.products.typeId, typeId), eq(s.products.isSample, true)))).map((r) => r.id);
    for (let i = 0; i < demoIds.length; i += 500) {
      const chunk = demoIds.slice(i, i + 500);
      await db.delete(s.productVibes).where(inArray(s.productVibes.productId, chunk));
      await db.delete(s.products).where(inArray(s.products.id, chunk));
    }
    const own = await db.update(s.products).set({ isActive: false }).where(eq(s.products.typeId, typeId)).returning({ id: s.products.id });
    if (own.length) {
      await db.update(s.productTypes).set({ isActive: false }).where(eq(s.productTypes.id, typeId));
      notes.push(`${typeId}: hidden, with your ${own.length} product(s) in it`);
    } else {
      await db.delete(s.productTypes).where(eq(s.productTypes.id, typeId));
      notes.push(`${typeId}: removed`);
    }
  }

  // Store settings: fill what's empty, and stop pointing at removed themes and types.
  const row = await db.select().from(s.settings).where(eq(s.settings.key, 'store'));
  if (row.length) {
    const next = updateSettings(row[0].value as Partial<StoreSettings>);
    if (next.changed) {
      await db.update(s.settings).set({ value: next.settings }).where(eq(s.settings.key, 'store'));
      notes.push(...next.notes);
    }
  }

  await db
    .insert(s.settings)
    .values({ key: VERSION_KEY, value: STORE_VERSION })
    .onConflictDoUpdate({ target: s.settings.key, set: { value: STORE_VERSION } });
  return { from, applied: true, hadDemo: Number(demo) > 0, notes };
}

const OLD_HOME_TITLE = 'Pit lane poster series';

/** The settings part of the update, kept separate so it can be checked on its own. */
export function updateSettings(stored: Partial<StoreSettings>): { settings: Partial<StoreSettings>; changed: boolean; notes: string[] } {
  const next = structuredClone(stored);
  const notes: string[] = [];

  const contact = { ...DEFAULT_SETTINGS.contact, ...next.contact };
  const filled = (Object.keys(DEFAULT_SETTINGS.contact) as Array<keyof StoreSettings['contact']>).filter((k) => !next.contact?.[k]?.trim() && DEFAULT_SETTINGS.contact[k]);
  for (const k of filled) contact[k] = DEFAULT_SETTINGS.contact[k];
  if (filled.length) {
    next.contact = contact;
    notes.push(`contact details filled in: ${filled.join(', ')}`);
  }

  if (next.home) {
    if (next.home.title === OLD_HOME_TITLE) {
      // Still the banner the store started with: use the new one, keeping any photo.
      next.home = { ...DEFAULT_SETTINGS.home, image: next.home.image ?? null };
      notes.push('home banner updated to the new themes');
    } else {
      for (const button of [next.home.primary, next.home.secondary]) {
        if (!button?.href) continue;
        const href = moveThemeLink(button.href);
        if (href !== button.href) {
          notes.push(`home banner link ${button.href} now goes to ${href}`);
          button.href = href;
        }
      }
    }
  }

  const retired = new Set(RETIRED_TYPES);
  if (next.packs?.types?.some((t) => retired.has(t))) {
    next.packs = { ...next.packs, types: next.packs.types.filter((t) => !retired.has(t)) };
    notes.push('sticker pack offer: removed product types taken out');
  }
  if (next.bxgy?.some((o) => o.types.some((t) => retired.has(t)))) {
    next.bxgy = next.bxgy.map((o) => ({ ...o, types: o.types.filter((t) => !retired.has(t)) }));
    notes.push('buy X get Y offers: removed product types taken out');
  }

  return { settings: next, changed: notes.length > 0, notes };
}

/** `/v/f1-motorsport?type=wall-posters` becomes `/v/sports?type=wall-posters`. */
function moveThemeLink(href: string): string {
  return href.replace(/^\/v\/([a-z0-9-]+)/, (whole, id: string) => (VIBE_MOVES[id] ? `/v/${VIBE_MOVES[id]}` : whole));
}
