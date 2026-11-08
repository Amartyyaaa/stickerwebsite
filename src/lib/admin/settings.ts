import 'server-only';
import { eq, inArray, and } from 'drizzle-orm';
import { photoSrc, photoUploadId } from '@/lib/catalog/images';
import { db } from '@/lib/db/client';
import * as s from '@/lib/db/schema';
import { withDefaults, type HomeHero, type StoreSettings } from '@/lib/settings';
import { readSettingsForm, type SettingsForm } from './settings-form';

/** Settings as stored right now (not the cached copy the store pages use). */
export async function currentSettings(): Promise<StoreSettings> {
  const row = await db.query.settings.findFirst({ where: eq(s.settings.key, 'store') });
  return withDefaults(row?.value as Partial<StoreSettings> | undefined);
}

async function write(next: StoreSettings): Promise<void> {
  await db.insert(s.settings).values({ key: 'store', value: next }).onConflictDoUpdate({ target: s.settings.key, set: { value: next } });
}

export type SettingsSaveResult = { ok: true } | { ok: false; error: string; field?: string };

export async function saveSettings(form: SettingsForm): Promise<SettingsSaveResult> {
  const [current, types] = await Promise.all([currentSettings(), db.select({ id: s.productTypes.id }).from(s.productTypes)]);
  const r = readSettingsForm(form, current, types.map((t) => t.id));
  if (!r.ok) return r;
  await write(r.settings);
  return { ok: true };
}

/** A link on the home page: a page of this store (starting with /) or a full https:// address. */
const okHref = (h: string) => (/^\/(?!\/)[^\s]*$/.test(h) || /^https:\/\/[^\s]+$/.test(h)) && h.length <= 300;

export async function saveHome(input: HomeHero): Promise<SettingsSaveResult> {
  const clean = (v: string) => v.replace(/\s+/g, ' ').trim();
  const hero: HomeHero = {
    eyebrow: clean(input.eyebrow),
    title: clean(input.title),
    body: clean(input.body),
    primary: { label: clean(input.primary.label), href: input.primary.href.trim() },
    secondary: { label: clean(input.secondary.label), href: input.secondary.href.trim() },
    image: input.image,
  };
  if (hero.eyebrow.length > 40) return { ok: false, error: 'Keep the small line above the title under 40 characters.', field: 'eyebrow' };
  if (hero.title.length < 2 || hero.title.length > 60) return { ok: false, error: 'Write a title of up to 60 characters.', field: 'title' };
  if (hero.body.length > 200) return { ok: false, error: 'Keep the text under 200 characters.', field: 'body' };
  if (!hero.primary.label || hero.primary.label.length > 30 || !okHref(hero.primary.href)) {
    return { ok: false, error: 'The main button needs a label (up to 30 characters) and a link like /shop or /v/anime.', field: 'primary' };
  }
  if (hero.secondary.label || hero.secondary.href) {
    if (!hero.secondary.label || hero.secondary.label.length > 30 || !okHref(hero.secondary.href)) {
      return { ok: false, error: 'Give the second button a label and a link, or leave both empty.', field: 'secondary' };
    }
  }
  if (hero.image) {
    const id = photoUploadId(hero.image);
    const found = id ? await db.query.uploads.findFirst({ columns: { id: true }, where: and(inArray(s.uploads.id, [id]), eq(s.uploads.kind, 'product'), eq(s.uploads.status, 'ready')) }) : null;
    if (!found) return { ok: false, error: 'That image is missing. Upload it again.', field: 'image' };
    hero.image = photoSrc(found.id);
  }
  await write({ ...(await currentSettings()), home: hero });
  return { ok: true };
}
