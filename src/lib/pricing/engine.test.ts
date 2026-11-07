import { describe, expect, it } from 'vitest';
import type { OptionGroup, PriceProfile } from '@/lib/catalog/types';
import { DEFAULT_SETTINGS, type StoreSettings } from '@/lib/settings';
import { bestPackSaving, defaultOptions, lineKey, normalizeOptions, packEligible, packStatus, priceRange, quote, unitPrice, type PricedLine } from './engine';

const posterGroups: OptionGroup[] = [
  { key: 'size', label: 'Size', values: [{ value: 'A4', label: 'A4' }, { value: 'A3', label: 'A3' }, { value: 'A2', label: 'A2' }] },
  { key: 'paper', label: 'Paper', values: [{ value: 'matte', label: 'Matte' }, { value: 'glossy', label: 'Glossy' }] },
  { key: 'frame', label: 'Frame', values: [{ value: 'none', label: 'No frame' }, { value: 'black', label: 'Black' }, { value: 'wood', label: 'Wood' }] },
];

const posterProfile: PriceProfile = {
  base: 9900,
  deltas: {
    size: { A4: 0, A3: 5000, A2: 15000 },
    paper: { matte: 0, glossy: 2000 },
    frame: { none: 0, black: { by: 'size', map: { A4: 20000, A3: 25000, A2: 40000 } }, wood: { by: 'size', map: { A4: 25000, A3: 30000, A2: 45000 } } },
  },
};

const settings: StoreSettings = DEFAULT_SETTINGS;

const sticker = (id: number, qty: number, unit = 2900, options: Record<string, string> = { size: 'S', finish: 'matte' }): PricedLine => ({
  key: lineKey(id, options),
  productId: id,
  typeId: 'laptop-stickers',
  options,
  qty,
  unit,
});

describe('unit prices', () => {
  it('adds flat and size-dependent deltas', () => {
    expect(unitPrice(posterProfile, { size: 'A4', paper: 'matte', frame: 'none' })).toBe(9900);
    expect(unitPrice(posterProfile, { size: 'A3', paper: 'glossy', frame: 'none' })).toBe(16900);
    expect(unitPrice(posterProfile, { size: 'A3', paper: 'matte', frame: 'black' })).toBe(39900);
    expect(unitPrice(posterProfile, { size: 'A2', paper: 'matte', frame: 'wood' })).toBe(69900);
  });

  it('finds the cheapest and dearest combination', () => {
    expect(priceRange(posterProfile, posterGroups)).toEqual({ min: 9900, max: 71900 });
  });
});

describe('options', () => {
  it('fills defaults and rejects unknown values', () => {
    expect(defaultOptions(posterGroups)).toEqual({ size: 'A4', paper: 'matte', frame: 'none' });
    expect(normalizeOptions(posterGroups, { size: 'A2' })).toEqual({ size: 'A2', paper: 'matte', frame: 'none' });
    expect(normalizeOptions(posterGroups, { size: 'A9' })).toBeNull();
  });

  it('requires a choice for required groups', () => {
    const groups: OptionGroup[] = [{ key: 'model', label: 'Model', required: true, values: [{ value: 'x', label: 'X' }] }];
    expect(normalizeOptions(groups, {})).toBeNull();
    expect(normalizeOptions(groups, { model: 'x' })).toEqual({ model: 'x' });
  });

  it('builds stable line keys regardless of option order', () => {
    expect(lineKey(7, { b: '2', a: '1' })).toBe(lineKey(7, { a: '1', b: '2' }));
  });
});

describe('sticker packs', () => {
  const tiers = settings.packs.tiers;

  it('does nothing below the first tier', () => {
    expect(bestPackSaving(new Array(9).fill(2900), tiers)).toEqual({ saving: 0, bundled: 0 });
  });

  it('prices exactly 10 stickers at the pack price', () => {
    expect(bestPackSaving(new Array(10).fill(2900), tiers)).toEqual({ saving: 29000 - 19900, bundled: 10 });
  });

  it('puts the most expensive stickers in the pack and charges the rest normally', () => {
    const units = [...new Array(10).fill(3900), 2900, 2900].sort((a, b) => b - a);
    const { saving, bundled } = bestPackSaving(units, tiers);
    expect(bundled).toBe(10);
    expect(saving).toBe(39000 - 19900);
  });

  it('picks the cheaper combination of tiers', () => {
    // 20 stickers: one 20-pack (₹349) beats two 10-packs (₹398).
    expect(bestPackSaving(new Array(20).fill(2900), tiers)).toEqual({ saving: 58000 - 34900, bundled: 20 });
  });

  it('only counts eligible sizes and finishes in the cart quote', () => {
    const q = quote([sticker(1, 6), sticker(2, 4), sticker(3, 5, 6900, { size: 'L', finish: 'holographic' })], settings);
    expect(q.discounts.find((d) => d.id === 'packs')?.amount).toBe(29000 - 19900);
  });

  it('tells the shopper how many more stickers unlock a pack', () => {
    const q = quote([sticker(1, 7)], settings);
    expect(q.hints.find((h) => h.id === 'packs')?.text).toBe('Add 3 more stickers to get 10 for ₹199');
  });
});

describe('cart quote', () => {
  const poster = (id: number, qty: number, unit: number): PricedLine => ({ key: `p${id}`, productId: id, typeId: 'wall-posters', options: {}, qty, unit });

  it('makes the cheapest of every 4 posters free', () => {
    const q = quote([poster(1, 2, 14900), poster(2, 2, 9900)], settings);
    expect(q.discounts.find((d) => d.id === 'posters-buy-3-get-1')?.amount).toBe(9900);
  });

  it('charges shipping below the free-shipping threshold and not above it', () => {
    const small = quote([sticker(1, 2)], settings);
    expect(small.shipping).toBe(settings.shipping.fee);
    expect(small.total).toBe(5800 + settings.shipping.fee);
    const big = quote([poster(1, 1, 49900)], settings);
    expect(big.shipping).toBe(0);
  });

  it('adds the COD fee or the online discount', () => {
    const lines = [poster(1, 1, 49900)];
    expect(quote(lines, settings, { payment: 'cod' }).codFee).toBe(settings.cod.fee);
    const online = quote(lines, settings, { payment: 'online' });
    expect(online.prepaidDiscount).toBe(Math.min(settings.prepaidDiscount.max, Math.round((49900 * 0.05) / 100) * 100));
    expect(online.prepaidDiscount % 100).toBe(0);
    expect(online.total).toBe(49900 - online.prepaidDiscount);
  });

  it('returns zeros for an empty cart', () => {
    const q = quote([], settings);
    expect(q).toMatchObject({ itemCount: 0, subtotal: 0, shipping: 0, total: 0 });
  });
});

describe('packStatus', () => {
  const line = (key: string, qty: number, options: Record<string, string> = { size: 'S', finish: 'matte' }, typeId = 'laptop-stickers') => ({
    key,
    productId: 1,
    typeId,
    options,
    qty,
    unit: 2900,
  });

  it('counts only eligible stickers and finds the next tier', () => {
    const st = packStatus([line('a', 4), line('b', 3, { size: 'L', finish: 'matte' }), line('c', 2, { size: 'S', finish: 'holographic' }), line('d', 5, {}, 'wall-posters')], DEFAULT_SETTINGS);
    expect(st.count).toBe(4);
    expect(st.reached).toBeNull();
    expect(st.next).toEqual({ qty: 10, price: 19900 });
    expect(st.saving).toBe(0);
  });

  it('reports the tier reached and the saving', () => {
    const st = packStatus([line('a', 7), line('b', 5, { size: 'XS', finish: 'glossy' }, 'phone-bottle-stickers')], DEFAULT_SETTINGS);
    expect(st.count).toBe(12);
    expect(st.reached?.qty).toBe(10);
    expect(st.next?.qty).toBe(20);
    expect(st.saving).toBeGreaterThan(0);
    expect(packEligible({ typeId: 'phone-bottle-stickers', options: { size: 'XS', finish: 'glossy' } }, DEFAULT_SETTINGS)).toBe(true);
  });
});
