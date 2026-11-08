/**
 * One pricing engine for the whole store. The product page uses it for live
 * prices, and the cart quote API runs it on the server so the browser never
 * decides what anything costs. All amounts are integers in paise.
 */
import type { Delta, OptionGroup, PriceProfile } from '@/lib/catalog/types';
import { formatINR } from '@/lib/money';
import type { PackTier, StoreSettings } from '@/lib/settings';
import { couponAmount, type CouponRule } from './coupons';

export type Options = Record<string, string>;

export function mergeProfile(base: PriceProfile, override?: Partial<PriceProfile> | null): PriceProfile {
  if (!override) return base;
  return { base: override.base ?? base.base, deltas: { ...base.deltas, ...override.deltas } };
}

export function defaultOptions(groups: OptionGroup[]): Options {
  const out: Options = {};
  for (const g of groups) if (!g.required && g.values[0]) out[g.key] = g.values[0].value;
  return out;
}

/**
 * Keep only valid option values and fill in defaults. Returns null when a
 * required option (like a phone model) is missing or a value is unknown.
 */
export function normalizeOptions(groups: OptionGroup[], input: Record<string, unknown> | undefined | null): Options | null {
  const out: Options = {};
  for (const g of groups) {
    const v = input?.[g.key];
    if (v === undefined || v === null || v === '') {
      if (g.required) return null;
      out[g.key] = g.values[0].value;
    } else if (typeof v === 'string' && g.values.some((x) => x.value === v)) {
      out[g.key] = v;
    } else {
      return null;
    }
  }
  return out;
}

function deltaValue(d: Delta | undefined, options: Options): number {
  if (d === undefined) return 0;
  if (typeof d === 'number') return d;
  return d.map[options[d.by]] ?? 0;
}

export function unitPrice(profile: PriceProfile, options: Options): number {
  let price = profile.base;
  for (const [key, table] of Object.entries(profile.deltas ?? {})) {
    const value = options[key];
    if (value !== undefined) price += deltaValue(table[value], options);
  }
  return Math.max(0, Math.round(price));
}

/** Every combination of option values (option lists are short, so this stays small). */
function* combinations(groups: OptionGroup[]): Generator<Options> {
  if (groups.length === 0) {
    yield {};
    return;
  }
  const [first, ...rest] = groups;
  for (const v of first.values) for (const tail of combinations(rest)) yield { [first.key]: v.value, ...tail };
}

export function priceRange(profile: PriceProfile, groups: OptionGroup[]): { min: number; max: number } {
  let min = Infinity;
  let max = 0;
  for (const combo of combinations(groups)) {
    const p = unitPrice(profile, combo);
    if (p < min) min = p;
    if (p > max) max = p;
  }
  return { min: Number.isFinite(min) ? min : profile.base, max };
}

/** Human-readable option summary for carts and orders, for example ["Medium · 3 in", "Matte"]. */
export function optionLabels(groups: OptionGroup[], options: Options): string[] {
  return groups
    .map((g) => {
      const v = g.values.find((x) => x.value === options[g.key]);
      if (!v) return null;
      return v.hint && g.key === 'size' ? `${v.label} · ${v.hint}` : v.label;
    })
    .filter((x): x is string => Boolean(x));
}

export function lineKey(productId: number, options: Options): string {
  const opts = Object.keys(options)
    .sort()
    .map((k) => `${k}=${options[k]}`)
    .join('&');
  return `${productId}${opts ? `?${opts}` : ''}`;
}

/* ---------- cart quote ---------- */

export interface PricedLine {
  key: string;
  productId: number;
  typeId: string;
  options: Options;
  qty: number;
  /** Unit price in paise. */
  unit: number;
}

export interface QuoteLine extends PricedLine {
  total: number;
}

export interface QuoteDiscount {
  id: string;
  label: string;
  amount: number;
}

export interface QuoteHint {
  id: string;
  text: string;
  /** 0..1 for progress bars. */
  progress?: number;
  done?: boolean;
}

/** A coupon the quote applied, or why it didn't. */
export interface QuoteCoupon {
  code: string;
  applied: boolean;
  /** Amount taken off the items (0 for free shipping). */
  amount: number;
  freeShipping: boolean;
  /** Why it wasn't applied (for example the minimum order). */
  reason?: string;
}

export interface Quote {
  lines: QuoteLine[];
  itemCount: number;
  subtotal: number;
  discounts: QuoteDiscount[];
  discountTotal: number;
  shipping: number;
  codFee: number;
  prepaidDiscount: number;
  total: number;
  hints: QuoteHint[];
  coupon: QuoteCoupon | null;
}

/** Unit prices of every eligible unit, most expensive first. */
function eligibleUnits(lines: PricedLine[], match: (l: PricedLine) => boolean): number[] {
  const units: number[] = [];
  for (const l of lines) if (match(l)) for (let i = 0; i < l.qty; i++) units.push(l.unit);
  return units.sort((a, b) => b - a);
}

/**
 * Cheapest way to pay for `units` with pack tiers. Packs cover the most
 * expensive units; the rest are charged at their normal price.
 * Returns the saving and how many units ended up in packs.
 */
export function bestPackSaving(units: number[], tiers: { qty: number; price: number }[]): { saving: number; bundled: number } {
  const n = units.length;
  if (n === 0 || tiers.length === 0) return { saving: 0, bundled: 0 };
  // packCost[k] = cheapest price for exactly k units made of whole packs.
  const packCost: number[] = new Array(n + 1).fill(Infinity);
  packCost[0] = 0;
  for (let k = 1; k <= n; k++) {
    for (const t of tiers) if (t.qty <= k && packCost[k - t.qty] + t.price < packCost[k]) packCost[k] = packCost[k - t.qty] + t.price;
  }
  const full = units.reduce((s, u) => s + u, 0);
  // suffix[k] = cost of units k..n-1 at normal price (the cheapest ones).
  const suffix: number[] = new Array(n + 1).fill(0);
  for (let i = n - 1; i >= 0; i--) suffix[i] = suffix[i + 1] + units[i];
  let best = { saving: 0, bundled: 0 };
  for (let k = 1; k <= n; k++) {
    if (!Number.isFinite(packCost[k])) continue;
    const saving = full - (packCost[k] + suffix[k]);
    if (saving > best.saving) best = { saving, bundled: k };
  }
  return best;
}

/** Whether a line counts towards build-your-own packs: the right product type, size and finish. */
export function packEligible(l: Pick<PricedLine, 'typeId' | 'options'>, s: Pick<StoreSettings, 'packs'>): boolean {
  return s.packs.types.includes(l.typeId) && Object.entries(s.packs.options).every(([k, allowed]) => !(k in l.options) || allowed.includes(l.options[k]));
}

export interface PackStatus {
  /** Stickers in the cart that count towards a pack. */
  count: number;
  saving: number;
  bundled: number;
  /** Biggest tier already reached, and the next one to aim for. */
  reached: PackTier | null;
  next: PackTier | null;
}

/** Where the cart stands on build-your-own packs, for progress bars. */
export function packStatus(lines: PricedLine[], s: StoreSettings): PackStatus {
  const tiers = [...s.packs.tiers].sort((a, b) => a.qty - b.qty);
  const units = eligibleUnits(lines, (l) => packEligible(l, s));
  const { saving, bundled } = s.packs.enabled ? bestPackSaving(units, tiers) : { saving: 0, bundled: 0 };
  return {
    count: units.length,
    saving,
    bundled,
    reached: [...tiers].reverse().find((t) => t.qty <= units.length) ?? null,
    next: tiers.find((t) => t.qty > units.length) ?? null,
  };
}

export function quote(input: PricedLine[], s: StoreSettings, opts: { payment?: 'online' | 'cod'; coupon?: CouponRule | null } = {}): Quote {
  const lines: QuoteLine[] = input.filter((l) => l.qty > 0).map((l) => ({ ...l, total: l.unit * l.qty }));
  const itemCount = lines.reduce((n, l) => n + l.qty, 0);
  const subtotal = lines.reduce((n, l) => n + l.total, 0);
  const discounts: QuoteDiscount[] = [];
  const hints: QuoteHint[] = [];

  // Build-your-own pack ("any 10 stickers for ₹199").
  if (s.packs.enabled && s.packs.tiers.length) {
    const tiers = [...s.packs.tiers].sort((a, b) => a.qty - b.qty);
    const units = eligibleUnits(lines, (l) => packEligible(l, s));
    if (units.length) {
      const { saving, bundled } = bestPackSaving(units, tiers);
      if (saving > 0) discounts.push({ id: 'packs', label: `Sticker pack price (${bundled} stickers)`, amount: saving });
      const next = tiers.find((t) => t.qty > units.length);
      if (next) {
        const need = next.qty - units.length;
        hints.push({
          id: 'packs',
          text: `Add ${need} more sticker${need === 1 ? '' : 's'} to get ${next.qty} for ${formatINR(next.price)}`,
          progress: units.length / next.qty,
        });
      } else {
        hints.push({ id: 'packs', text: `Pack price applied to ${bundled} stickers`, progress: 1, done: true });
      }
    }
  }

  // Buy X get Y free: the cheapest eligible units are free.
  for (const rule of s.bxgy) {
    if (!rule.enabled) continue;
    const units = eligibleUnits(lines, (l) => rule.types.includes(l.typeId));
    if (!units.length) continue;
    const group = rule.buy + rule.free;
    const freeCount = Math.floor(units.length / group) * rule.free;
    if (freeCount > 0) {
      const amount = units.slice(units.length - freeCount).reduce((a, b) => a + b, 0);
      discounts.push({ id: rule.id, label: rule.label, amount });
    }
    const rem = units.length % group;
    if (rem !== 0) {
      const need = group - rem;
      hints.push({ id: rule.id, text: `${rule.label}: add ${need} more`, progress: rem / group });
    }
  }

  // A coupon comes after the other offers and before shipping.
  let coupon: QuoteCoupon | null = null;
  if (opts.coupon && itemCount > 0) {
    const c = opts.coupon;
    const before = Math.max(0, subtotal - discounts.reduce((n, d) => n + d.amount, 0));
    if (before < c.minOrder) {
      coupon = { code: c.code, applied: false, amount: 0, freeShipping: false, reason: `Add ${formatINR(c.minOrder - before)} more to use ${c.code}. It needs an order of ${formatINR(c.minOrder)}.` };
    } else {
      const amount = couponAmount(c, before);
      if (amount > 0) discounts.push({ id: 'coupon', label: `Coupon ${c.code}`, amount });
      coupon = { code: c.code, applied: true, amount, freeShipping: c.kind === 'shipping' };
    }
  }

  const discountTotal = discounts.reduce((n, d) => n + d.amount, 0);
  const merchandise = Math.max(0, subtotal - discountTotal);
  const shipping = itemCount === 0 || merchandise >= s.shipping.freeAbove || coupon?.freeShipping ? 0 : s.shipping.fee;
  if (itemCount > 0) {
    if (coupon?.freeShipping) {
      hints.push({ id: 'shipping', text: `Free shipping with ${coupon.code}`, progress: 1, done: true });
    } else if (shipping > 0) {
      hints.push({
        id: 'shipping',
        text: `Add ${formatINR(s.shipping.freeAbove - merchandise)} more for free shipping`,
        progress: merchandise / s.shipping.freeAbove,
      });
    } else {
      hints.push({ id: 'shipping', text: 'You get free shipping', progress: 1, done: true });
    }
  }

  const codFee = opts.payment === 'cod' && itemCount > 0 ? s.cod.fee : 0;
  // Rounded to whole rupees so totals never show paise.
  const prepaidDiscount =
    opts.payment === 'online' && itemCount > 0 ? Math.min(s.prepaidDiscount.max, Math.round((merchandise * s.prepaidDiscount.percent) / 100 / 100) * 100) : 0;
  const total = merchandise + shipping + codFee - prepaidDiscount;

  return { lines, itemCount, subtotal, discounts, discountTotal, shipping, codFee, prepaidDiscount, total, hints, coupon };
}
