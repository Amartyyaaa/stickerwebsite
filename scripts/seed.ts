/**
 * Seed the database.
 *
 *   npm run db:seed            base data: product types, vibes, store settings
 *   npm run db:seed -- sample  base data plus ~5,900 demo products with placeholder art
 *   npm run db:seed -- clear   remove all demo products (keeps your real ones)
 *
 * Demo products use original, generated names and artwork. Nothing is copied
 * from other stores.
 */
import { eq, inArray, sql } from 'drizzle-orm';
import type { ArtSpec, PaletteKey, PosterKind, StickerShape } from '@/lib/art/types';
import { reindexProducts } from '@/lib/catalog/search-index';
import { NAME_ADJECTIVES, NAME_SUFFIXES, PRODUCT_TYPES, VIBES, type ProductTypeDef, type VibeDef } from '@/lib/catalog/taxonomy';
import { db } from '@/lib/db/client';
import * as s from '@/lib/db/schema';
import { priceRange } from '@/lib/pricing/engine';
import { DEFAULT_SETTINGS } from '@/lib/settings';

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

async function seedBase(): Promise<void> {
  for (const [i, t] of PRODUCT_TYPES.entries()) {
    const row = {
      name: t.name,
      singular: t.singular,
      groupId: t.groupId,
      description: t.description,
      options: t.options,
      price: t.price,
      art: t.art,
      highlights: t.highlights,
      sortOrder: i,
    };
    await db
      .insert(s.productTypes)
      .values({ id: t.id, ...row })
      .onConflictDoUpdate({ target: s.productTypes.id, set: row });
  }
  for (const [i, v] of VIBES.entries()) {
    const row = { name: v.name, blurb: v.blurb, sortOrder: i, featured: Boolean(v.featured) };
    await db
      .insert(s.vibes)
      .values({ id: v.id, ...row })
      .onConflictDoUpdate({ target: s.vibes.id, set: row });
  }
  // Settings are only written once so changes made in admin are never overwritten.
  await db.insert(s.settings).values({ key: 'store', value: DEFAULT_SETTINGS }).onConflictDoNothing();
  const custom = PRODUCT_TYPES.filter((t) => t.groupId === 'custom').length;
  console.log(`Base data: ${PRODUCT_TYPES.length - custom} product types, ${custom} custom-studio types, ${VIBES.length} vibes, store settings.`);
}

async function clearSample(): Promise<number> {
  const rows = await db.select({ id: s.products.id }).from(s.products).where(eq(s.products.isSample, true));
  const ids = rows.map((r) => r.id);
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    await db.delete(s.productVibes).where(inArray(s.productVibes.productId, chunk));
    await db.delete(s.products).where(inArray(s.products.id, chunk));
  }
  return ids.length;
}

const PAIRS: Array<[PaletteKey, PaletteKey]> = [
  ['a', 'd'],
  ['f', 'c'],
  ['e', 'b'],
  ['d', 'c'],
  ['b', 'f'],
  ['a', 'e'],
  ['c', 'd'],
  ['f', 'e'],
];
const SHAPES: Array<[StickerShape, number]> = [
  ['blob', 25],
  ['badge', 20],
  ['pill', 20],
  ['star', 15],
  ['moon', 7],
  ['heart', 7],
  ['cat', 6],
];

function makePicker(rand: () => number) {
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
  const weighted = <T,>(items: ReadonlyArray<readonly [T, number]>): T => {
    const total = items.reduce((n, [, w]) => n + w, 0);
    let x = rand() * total;
    for (const [item, w] of items) {
      x -= w;
      if (x <= 0) return item;
    }
    return items[items.length - 1][0];
  };
  return { pick, weighted };
}

function stickerWord(name: string, vibe: VibeDef, rand: () => number, pick: <T>(a: readonly T[]) => T): string {
  if (rand() < 0.6) return pick(vibe.words);
  const words = name.split(/\s+/).filter((w) => w.length <= 9);
  return (words.length ? words.sort((a, b) => b.length - a.length)[0] : pick(vibe.words)).toUpperCase();
}

function artFor(type: ProductTypeDef, vibe: VibeDef, name: string, seed: number, rand: () => number): ArtSpec {
  const { pick, weighted } = makePicker(rand);
  const [c1, c2] = pick(PAIRS);
  const poster: PosterKind = vibe.posters && rand() < 0.75 ? pick(vibe.posters) : pick<PosterKind>(['speed', 'sunset', 'orbit', 'bloom', 'grid', 'wave']);
  const dark = Math.floor(rand() * 5);
  const title = name.length > 18 ? name.split(' ').slice(-2).join(' ') : name;
  switch (type.art) {
    case 'sticker':
    case 'holo':
    case 'clear':
    case 'motion':
    case 'dome':
    case 'magnet':
    case 'keychain': {
      const shape = weighted(SHAPES);
      const word = shape === 'heart' || shape === 'cat' ? undefined : stickerWord(name, vibe, rand, pick);
      return { kind: type.art, seed, shape, word, c1, c2 };
    }
    case 'decal':
      return { kind: 'decal', seed, word: pick(vibe.words), c1 };
    case 'sheet':
      return { kind: 'sheet', seed, title: name };
    case 'pack':
      return { kind: 'pack', seed, word: pick(vibe.words), c1, c2 };
    case 'polaroids':
      return { kind: 'polaroids', seed, caption: pick(vibe.words).toLowerCase(), dark };
    case 'polaroid-kit':
      return { kind: 'polaroid-kit', seed, dark };
    case 'bookmark':
      return { kind: 'bookmark', seed, title };
    case 'badge':
      return { kind: 'badge', seed, poster, title, word: rand() < 0.5 ? pick(vibe.words) : undefined, dark };
    case 'framed':
      return { kind: 'framed', seed, poster, title, dark, frame: pick(['black', 'white', 'wood'] as const) };
    default:
      return { kind: type.art, seed, poster, title, dark };
  }
}

async function seedSample(): Promise<void> {
  await seedBase();
  const removed = await clearSample();
  if (removed) console.log(`Removed ${removed} previous demo products.`);

  const rand = rng(20261107);
  const { pick, weighted } = makePicker(rand);
  const vibeWeights = VIBES.map((v) => [v, v.weight] as const);
  const now = Math.floor(Date.now() / 1000);
  const usedSlugs = new Set((await db.select({ slug: s.products.slug }).from(s.products)).map((r) => r.slug));

  let total = 0;
  for (const type of PRODUCT_TYPES) {
    const names = new Set<string>();
    const { min } = priceRange(type.price, type.options);
    const rows: Array<typeof s.products.$inferInsert & { secondVibe?: string }> = [];
    for (let i = 0; i < type.sample; i++) {
      const vibe = weighted(vibeWeights);
      let name = '';
      for (let attempt = 0; attempt < 12; attempt++) {
        const noun = pick(vibe.nouns);
        const roll = rand();
        name = roll < 0.5 ? `${pick(NAME_ADJECTIVES)} ${noun}` : roll < 0.75 ? noun : `${noun} ${pick(NAME_SUFFIXES)}`;
        if (!names.has(name)) break;
      }
      if (names.has(name)) name = `${name} ${names.size}`;
      names.add(name);

      let slug = slugify(`${name} ${type.singular}`);
      for (let n = 2; usedSlugs.has(slug); n++) slug = slugify(`${name} ${type.singular} ${n}`);
      usedSlugs.add(slug);

      const seed = Math.floor(rand() * 1_000_000);
      const art = artFor(type, vibe, name, seed, rand);
      const second = rand() < 0.25 ? pick(VIBES.filter((v) => v.id !== vibe.id)) : undefined;
      const popularity = Math.floor(1000 * Math.pow(rand(), 3)) + (vibe.featured ? 40 : 0);
      rows.push({
        slug,
        name,
        typeId: type.id,
        vibeId: vibe.id,
        description: `${name} ${type.singular.toLowerCase()} from our ${vibe.name} collection. ${type.description} ${vibe.blurb}`,
        tags: [vibe.tags, art.word?.toLowerCase(), second?.tags].filter(Boolean).join(' '),
        priceFrom: min,
        art,
        popularity,
        isSample: true,
        createdAt: now - Math.floor(rand() * 180 * 86400),
        secondVibe: second?.id,
      });
    }

    for (let i = 0; i < rows.length; i += 250) {
      const chunk = rows.slice(i, i + 250);
      const inserted = await db
        .insert(s.products)
        .values(chunk.map(({ secondVibe: _skip, ...r }) => r))
        .returning({ id: s.products.id });
      const links = inserted.flatMap((r, j) => {
        const row = chunk[j];
        const list = [{ productId: r.id, vibeId: row.vibeId }];
        if (row.secondVibe) list.push({ productId: r.id, vibeId: row.secondVibe });
        return list;
      });
      await db.insert(s.productVibes).values(links);
    }
    total += rows.length;
  }

  await reindexProducts();
  const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(s.products);
  console.log(`Demo catalog: ${total} products created (${n} products in the store).`);
}

async function main() {
  const mode = process.argv[2] ?? 'base';
  if (mode === 'base') await seedBase();
  else if (mode === 'sample') await seedSample();
  else if (mode === 'clear') {
    const removed = await clearSample();
    await reindexProducts();
    console.log(`Removed ${removed} demo products.`);
  } else throw new Error(`Unknown seed mode "${mode}". Use base, sample or clear.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
