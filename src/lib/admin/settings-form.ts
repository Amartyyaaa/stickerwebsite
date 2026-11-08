/**
 * The store settings form: rupees and days as typed, checked and turned into
 * the stored settings. Pure, so it's unit-tested.
 */
import { formatPhone, isIndianMobile, normalizePhone } from '@/lib/india';
import type { BuyXGetY, StoreSettings } from '@/lib/settings';
import { slugify } from '@/lib/slug';
import { parseRupees, rupeesText } from './product-rules';

type Pair = [string, string];

export interface SettingsForm {
  contact: { email: string; phone: string; whatsapp: string; address: string; hours: string };
  social: { instagram: string; youtube: string; facebook: string; x: string };
  shipping: { freeAbove: string; fee: string };
  delivery: { metroDays: Pair; standardDays: Pair; remoteDays: Pair };
  cod: { enabled: boolean; fee: string; min: string; max: string; allowCustom: boolean };
  prepaidDiscount: { percent: string; max: string };
  packs: { enabled: boolean; tiers: Array<{ qty: string; price: string }> };
  bxgy: Array<{ id: string; label: string; enabled: boolean; types: string[]; buy: string; free: string }>;
  /** One message per line. */
  announcement: string;
  business: { name: string; address: string; gstin: string; city: string; grievanceName: string; grievanceDesignation: string; policiesUpdated: string };
  aboutStory: string;
}

export type SettingsResult = { ok: true; settings: StoreSettings } | { ok: false; error: string; field: string };

const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function toSettingsForm(s: StoreSettings): SettingsForm {
  const r = (p: number) => rupeesText(p);
  const pair = (p: [number, number]): Pair => [String(p[0]), String(p[1])];
  return {
    contact: { ...s.contact },
    social: { ...s.social },
    shipping: { freeAbove: r(s.shipping.freeAbove), fee: r(s.shipping.fee) },
    delivery: { metroDays: pair(s.delivery.metroDays), standardDays: pair(s.delivery.standardDays), remoteDays: pair(s.delivery.remoteDays) },
    cod: { enabled: s.cod.enabled, fee: r(s.cod.fee), min: r(s.cod.min), max: r(s.cod.max), allowCustom: s.cod.allowCustom },
    prepaidDiscount: { percent: String(s.prepaidDiscount.percent), max: r(s.prepaidDiscount.max) },
    packs: { enabled: s.packs.enabled, tiers: s.packs.tiers.map((t) => ({ qty: String(t.qty), price: r(t.price) })) },
    bxgy: s.bxgy.map((b) => ({ id: b.id, label: b.label, enabled: b.enabled, types: [...b.types], buy: String(b.buy), free: String(b.free) })),
    announcement: s.announcement.join('\n'),
    business: { ...s.business },
    aboutStory: s.aboutStory,
  };
}

/** Read the form against the current settings (parts the form doesn't show, like the home banner, are kept). */
export function readSettingsForm(f: SettingsForm, current: StoreSettings, typeIds: string[]): SettingsResult {
  const fail = (field: string, error: string): SettingsResult => ({ ok: false, error, field });
  const money = (raw: string, field: string, label: string, max = 10_000_000): number | SettingsResult => {
    const n = parseRupees(raw);
    if (n === null || Number.isNaN(n) || n > max) return fail(field, `Enter ${label} in rupees, like 49.`);
    return n;
  };
  const whole = (raw: string, min: number, max: number): number | null => {
    if (!/^\d+$/.test(raw.trim())) return null;
    const n = Number(raw.trim());
    return n >= min && n <= max ? n : null;
  };
  const phone = (raw: string, field: string): string | SettingsResult => {
    if (!raw.trim()) return '';
    const digits = normalizePhone(raw);
    if (!isIndianMobile(digits)) return fail(field, 'Enter a 10-digit Indian mobile number.');
    return formatPhone(digits);
  };
  const link = (raw: string, field: string): string | SettingsResult => {
    const t = raw.trim();
    if (!t) return '';
    if (!/^https:\/\/[^\s/]+\.[^\s]+$/.test(t) || t.length > 200) return fail(field, 'Paste the full link, starting with https://');
    return t;
  };

  // Contact and social links.
  const email = f.contact.email.trim().toLowerCase();
  if (email && !EMAIL_RE.test(email)) return fail('contact.email', 'Enter an email like hello@yourstore.in.');
  const contactPhone = phone(f.contact.phone, 'contact.phone');
  if (typeof contactPhone !== 'string') return contactPhone;
  const whatsapp = phone(f.contact.whatsapp, 'contact.whatsapp');
  if (typeof whatsapp !== 'string') return whatsapp;
  if (f.contact.address.trim().length > 300) return fail('contact.address', 'Keep the address under 300 characters.');
  if (f.contact.hours.trim().length > 80) return fail('contact.hours', 'Keep the hours under 80 characters.');
  const social = {} as StoreSettings['social'];
  for (const k of ['instagram', 'youtube', 'facebook', 'x'] as const) {
    const v = link(f.social[k], `social.${k}`);
    if (typeof v !== 'string') return v;
    social[k] = v;
  }

  // Shipping and delivery.
  const freeAbove = money(f.shipping.freeAbove, 'shipping.freeAbove', 'the free-shipping amount');
  if (typeof freeAbove !== 'number') return freeAbove;
  const fee = money(f.shipping.fee, 'shipping.fee', 'the shipping fee', 100_000);
  if (typeof fee !== 'number') return fee;
  const delivery = {} as StoreSettings['delivery'];
  for (const k of ['metroDays', 'standardDays', 'remoteDays'] as const) {
    const [a, b] = f.delivery[k].map((x) => whole(x, 1, 30));
    if (a === null || b === null || a > b) return fail(`delivery.${k}`, 'Use whole days from 1 to 30, the first no more than the second.');
    delivery[k] = [a, b];
  }

  // Cash on Delivery and the online-payment discount.
  const codFee = money(f.cod.fee, 'cod.fee', 'the COD fee', 50_000);
  if (typeof codFee !== 'number') return codFee;
  const codMin = money(f.cod.min, 'cod.min', 'the smallest COD order');
  if (typeof codMin !== 'number') return codMin;
  const codMax = money(f.cod.max, 'cod.max', 'the largest COD order');
  if (typeof codMax !== 'number') return codMax;
  if (codMax < codMin) return fail('cod.max', 'The largest COD order should be more than the smallest.');
  const percent = whole(f.prepaidDiscount.percent, 0, 20);
  if (percent === null) return fail('prepaidDiscount.percent', 'Use a whole percent from 0 to 20.');
  const prepaidMax = money(f.prepaidDiscount.max, 'prepaidDiscount.max', 'the most it can take off', 100_000);
  if (typeof prepaidMax !== 'number') return prepaidMax;

  // Sticker packs.
  const tiers: StoreSettings['packs']['tiers'] = [];
  for (const [i, t] of f.packs.tiers.entries()) {
    if (!t.qty.trim() && !t.price.trim()) continue;
    const qty = whole(t.qty, 2, 500);
    const price = parseRupees(t.price);
    if (qty === null) return fail(`packs.tiers.${i}`, 'Each pack needs a number of stickers from 2 to 500.');
    if (price === null || Number.isNaN(price) || price < 100) return fail(`packs.tiers.${i}`, 'Each pack needs a price in rupees.');
    if (tiers.some((x) => x.qty === qty)) return fail(`packs.tiers.${i}`, `There are two packs of ${qty}.`);
    tiers.push({ qty, price });
  }
  if (tiers.length > 5) return fail('packs.tiers.5', 'Use up to 5 pack sizes.');
  if (f.packs.enabled && !tiers.length) return fail('packs.tiers.0', 'Add at least one pack size, or switch packs off.');
  tiers.sort((a, b) => a.qty - b.qty);

  // Buy X get Y free.
  const bxgy: BuyXGetY[] = [];
  for (const [i, b] of f.bxgy.entries()) {
    const label = b.label.replace(/\s+/g, ' ').trim();
    if (label.length < 3 || label.length > 60) return fail(`bxgy.${i}`, 'Give each offer a short name shoppers see, like “Buy 3 posters, get 1 free”.');
    const types = b.types.filter((t) => typeIds.includes(t));
    if (!types.length) return fail(`bxgy.${i}`, `Choose the product types “${label}” applies to.`);
    const buy = whole(b.buy, 1, 20);
    const free = whole(b.free, 1, 20);
    if (buy === null || free === null) return fail(`bxgy.${i}`, `Use whole numbers from 1 to 20 for “${label}”.`);
    let id = b.id || slugify(label) || `offer-${i + 1}`;
    while (bxgy.some((x) => x.id === id)) id = `${id}-${i + 1}`;
    bxgy.push({ id, label, enabled: b.enabled, types, buy, free });
  }
  if (bxgy.length > 5) return fail('bxgy.5', 'Use up to 5 offers.');

  const announcement = f.announcement
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  if (announcement.length > 5 || announcement.some((l) => l.length > 80)) return fail('announcement', 'Use up to 5 messages of up to 80 characters each.');

  const name = f.business.name.replace(/\s+/g, ' ').trim();
  if (name.length < 2 || name.length > 60) return fail('business.name', 'Enter the business name for receipts.');
  if (f.business.address.trim().length > 300) return fail('business.address', 'Keep the address under 300 characters.');
  const gstin = f.business.gstin.trim().toUpperCase();
  if (gstin && !GSTIN_RE.test(gstin)) return fail('business.gstin', 'A GSTIN has 15 characters, like 29ABCDE1234F1Z5. Leave it empty if you don’t have one.');
  const city = f.business.city.replace(/\s+/g, ' ').trim();
  if (city.length > 60) return fail('business.city', 'Enter just the city, like Bengaluru.');
  const grievanceName = f.business.grievanceName.replace(/\s+/g, ' ').trim();
  const grievanceDesignation = f.business.grievanceDesignation.replace(/\s+/g, ' ').trim();
  if (grievanceName.length > 80) return fail('business.grievanceName', 'Keep the name under 80 characters.');
  if (grievanceDesignation.length > 80) return fail('business.grievanceDesignation', 'Keep the role under 80 characters, like Founder.');
  const policiesUpdated = f.business.policiesUpdated.trim();
  if (policiesUpdated && !/^\d{4}-\d{2}-\d{2}$/.test(policiesUpdated)) return fail('business.policiesUpdated', 'Choose the date you last reviewed the policies.');
  const aboutStory = f.aboutStory.trim();
  if (aboutStory.length > 1500) return fail('aboutStory', 'Keep the story under 1,500 characters.');

  return {
    ok: true,
    settings: {
      ...current,
      contact: { email, phone: contactPhone, whatsapp, address: f.contact.address.trim(), hours: f.contact.hours.trim() },
      social,
      shipping: { freeAbove, fee },
      delivery,
      cod: { enabled: f.cod.enabled, fee: codFee, min: codMin, max: codMax, allowCustom: f.cod.allowCustom },
      prepaidDiscount: { percent, max: prepaidMax },
      packs: { ...current.packs, enabled: f.packs.enabled, tiers },
      bxgy,
      announcement,
      business: { name, address: f.business.address.trim(), gstin, city, grievanceName, grievanceDesignation, policiesUpdated },
      aboutStory,
    },
  };
}
