import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@libsql/client';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { VIBES } from '@/lib/catalog/taxonomy';
import * as s from '@/lib/db/schema';
import { DEFAULT_SETTINGS, type StoreSettings } from '@/lib/settings';
import { applyStoreUpdates, STORE_VERSION, updateSettings } from './store-update';

const dir = mkdtempSync(join(tmpdir(), 'pyv-update-'));
const client = createClient({ url: `file:${join(dir, 'store.db')}` });
const db = drizzle(client, { schema: s });

const type = (id: string) => ({
  id,
  name: id,
  singular: id,
  groupId: 'stickers' as const,
  description: '',
  options: [],
  price: { base: 2900 },
  art: 'sticker' as const,
  highlights: [],
});
const product = (slug: string, typeId: string, vibeId: string, isSample: boolean) => ({ slug, name: slug, typeId, vibeId, description: '', priceFrom: 2900, isSample, createdAt: 1 });

/** A store as it was before the themes changed: earlier themes and types, demo and own products, first settings. */
async function oldStore() {
  await db.insert(s.productTypes).values([type('laptop-stickers'), type('fridge-magnets'), type('keychains')]);
  await db.insert(s.vibes).values(
    ['anime', 'f1-motorsport', 'aesthetic', 'pets', 'my-own-theme'].map((id, i) => ({ id, name: id === 'anime' ? 'Anime' : id, blurb: '', sortOrder: i })),
  );
  const [ownLaptop, demoMagnet, ownKeychain, ownInOwnTheme] = await db
    .insert(s.products)
    .values([
      product('own-laptop', 'laptop-stickers', 'f1-motorsport', false),
      product('demo-magnet', 'fridge-magnets', 'pets', true),
      product('own-keychain', 'keychains', 'aesthetic', false),
      product('own-theme', 'laptop-stickers', 'my-own-theme', false),
    ])
    .returning({ id: s.products.id });
  await db.insert(s.productVibes).values([
    { productId: ownLaptop.id, vibeId: 'f1-motorsport' },
    { productId: ownLaptop.id, vibeId: 'aesthetic' },
    { productId: demoMagnet.id, vibeId: 'pets' },
    { productId: ownKeychain.id, vibeId: 'aesthetic' },
    { productId: ownInOwnTheme.id, vibeId: 'my-own-theme' },
  ]);
  const first: Partial<StoreSettings> = {
    ...DEFAULT_SETTINGS,
    contact: { email: '', phone: '', whatsapp: '', whatsappAlt: '', address: '', hours: 'Mon to Sat' },
    home: { ...DEFAULT_SETTINGS.home, title: 'Pit lane poster series', primary: { label: 'Shop F1 posters', href: '/v/f1-motorsport?type=wall-posters' } },
    packs: { ...DEFAULT_SETTINGS.packs, types: ['laptop-stickers', 'fridge-magnets'] },
  };
  await db.insert(s.settings).values({ key: 'store', value: first });
  return { ownLaptop: ownLaptop.id, ownKeychain: ownKeychain.id, ownInOwnTheme: ownInOwnTheme.id };
}

describe('one-time store update to the 21 themes', () => {
  let ids: Awaited<ReturnType<typeof oldStore>>;
  let result: Awaited<ReturnType<typeof applyStoreUpdates>>;

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: 'drizzle' });
    ids = await oldStore();
    result = await applyStoreUpdates(db);
  });
  afterAll(() => {
    client.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('runs once and says the store had demo products', async () => {
    expect(result).toMatchObject({ from: 1, applied: true, hadDemo: true });
    expect(await applyStoreUpdates(db)).toMatchObject({ from: STORE_VERSION, applied: false });
  });

  it('replaces the earlier themes and keeps ones added in admin', async () => {
    const themes = (await db.select({ id: s.vibes.id }).from(s.vibes)).map((v) => v.id).sort();
    expect(themes).toEqual([...VIBES.map((v) => v.id), 'my-own-theme'].sort());
    const anime = (await db.select().from(s.vibes).where(eq(s.vibes.id, 'anime')))[0];
    expect(anime).toMatchObject({ name: 'Anime', featured: true });
  });

  it('moves products and their extra themes to the new themes', async () => {
    const laptop = (await db.select().from(s.products).where(eq(s.products.id, ids.ownLaptop)))[0];
    expect(laptop.vibeId).toBe('sports');
    const links = (await db.select().from(s.productVibes).where(eq(s.productVibes.productId, ids.ownLaptop))).map((l) => l.vibeId).sort();
    expect(links).toEqual(['abstract', 'sports']);
    const own = (await db.select().from(s.products).where(eq(s.products.id, ids.ownInOwnTheme)))[0];
    expect(own).toMatchObject({ vibeId: 'my-own-theme', isActive: true });
  });

  it('removes retired product types, but only hides one that holds your own products', async () => {
    const types = await db.select({ id: s.productTypes.id, isActive: s.productTypes.isActive }).from(s.productTypes);
    expect(types.find((t) => t.id === 'fridge-magnets')).toBeUndefined();
    expect(types.find((t) => t.id === 'keychains')).toEqual({ id: 'keychains', isActive: false });
    expect(await db.select().from(s.products).where(eq(s.products.slug, 'demo-magnet'))).toEqual([]);
    const keychain = (await db.select().from(s.products).where(eq(s.products.id, ids.ownKeychain)))[0];
    expect(keychain).toMatchObject({ isActive: false, vibeId: 'abstract' });
  });

  it('fills the empty contact details and moves the first home banner to the new themes', async () => {
    const stored = (await db.select().from(s.settings).where(eq(s.settings.key, 'store')))[0].value as StoreSettings;
    expect(stored.contact).toMatchObject({ email: 'wecare.printyourvibe@gmail.com', whatsapp: '+91 80028 98685', whatsappAlt: '+91 98016 44598', hours: 'Mon to Sat' });
    expect(stored.home.primary.href).toBe('/v/jdm?type=wall-posters');
    expect(stored.packs.types).toEqual(['laptop-stickers']);
  });
});

describe('the settings part of the update', () => {
  it('keeps contact details and banner links you set yourself, moving only links to removed themes', () => {
    const mine: Partial<StoreSettings> = {
      contact: { email: 'me@shop.in', phone: '', whatsapp: '98765 43210', whatsappAlt: '', address: '', hours: '' },
      home: { ...DEFAULT_SETTINGS.home, title: 'Monsoon sale', primary: { label: 'Cricket', href: '/v/cricket' }, secondary: { label: 'Anime', href: '/v/anime?sort=new' } },
    };
    const r = updateSettings(mine);
    expect(r.settings.contact).toMatchObject({ email: 'me@shop.in', whatsapp: '98765 43210', whatsappAlt: '+91 98016 44598' });
    expect(r.settings.home).toMatchObject({ title: 'Monsoon sale', primary: { href: '/v/sports' }, secondary: { href: '/v/anime?sort=new' } });
  });

  it('changes nothing when there is nothing to change', () => {
    expect(updateSettings(structuredClone(DEFAULT_SETTINGS)).changed).toBe(false);
  });
});

describe('a store already on the 21 themes (version 2)', () => {
  const dir2 = mkdtempSync(join(tmpdir(), 'pyv-update2-'));
  const client2 = createClient({ url: `file:${join(dir2, 'store.db')}` });
  const db2 = drizzle(client2, { schema: s });
  afterAll(() => {
    client2.close();
    rmSync(dir2, { recursive: true, force: true });
  });

  it('only remakes the demo designs, leaving your themes, types, products and settings alone', async () => {
    await migrate(db2, { migrationsFolder: 'drizzle' });
    await db2.insert(s.productTypes).values([type('laptop-stickers'), type('keychains')]);
    // A theme the version 2 step would replace: it must stay, because that step doesn't run again.
    await db2.insert(s.vibes).values([{ id: 'anime', name: 'Anime', blurb: '' }, { id: 'cricket', name: 'Cricket', blurb: '' }]);
    await db2.insert(s.products).values([product('demo-one', 'laptop-stickers', 'anime', true), product('mine', 'keychains', 'cricket', false)]);
    const settings = { ...DEFAULT_SETTINGS, contact: { ...DEFAULT_SETTINGS.contact, email: '', whatsapp: '' } };
    await db2.insert(s.settings).values([{ key: 'store', value: settings }, { key: 'store_version', value: 2 }]);

    const r = await applyStoreUpdates(db2);
    expect(r).toMatchObject({ from: 2, applied: true, hadDemo: true });
    expect((await db2.select({ id: s.vibes.id }).from(s.vibes)).map((v) => v.id).sort()).toEqual(['anime', 'cricket']);
    expect((await db2.select({ id: s.productTypes.id }).from(s.productTypes)).map((t) => t.id).sort()).toEqual(['keychains', 'laptop-stickers']);
    expect((await db2.select().from(s.products).where(eq(s.products.slug, 'mine')))[0]).toMatchObject({ vibeId: 'cricket', isActive: true });
    const stored = (await db2.select().from(s.settings).where(eq(s.settings.key, 'store')))[0].value as StoreSettings;
    expect(stored.contact).toMatchObject({ email: '', whatsapp: '' });
    expect(await applyStoreUpdates(db2)).toMatchObject({ from: STORE_VERSION, applied: false });
  });
});
