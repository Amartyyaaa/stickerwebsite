/**
 * The category price table: what the admin edits, and turning it back into a
 * price profile. The structure (which options exist, and which prices depend
 * on another option) stays as it is in code; only the amounts change.
 */
import type { Delta, OptionGroup, PriceProfile } from '@/lib/catalog/types';
import { formatINR } from '@/lib/money';
import { priceRange } from '@/lib/pricing/engine';
import { LIMITS, parseRupees, rupeesText } from './product-rules';

/** Amounts as the admin types them, in rupees. A dependent price has one amount per value of the option it depends on. */
export type PriceInput = {
  base: string;
  amounts: Record<string, Record<string, string | Record<string, string>>>;
};

export interface PriceRow {
  value: string;
  label: string;
  /** For a price that depends on another option: that option's key. */
  by?: string;
}

/** Which option a value's price depends on, if any. */
function dependsOn(price: PriceProfile, group: string, value: string): string | undefined {
  const d = price.deltas?.[group]?.[value];
  return d && typeof d === 'object' ? d.by : undefined;
}

/** The values of the option a dependent price is keyed by (falling back to the keys already in the table). */
export function byValues(options: OptionGroup[], price: PriceProfile, group: string, value: string): Array<{ value: string; label: string }> {
  const d = price.deltas?.[group]?.[value];
  if (!d || typeof d !== 'object') return [];
  const by = options.find((g) => g.key === d.by);
  return by ? by.values.map((v) => ({ value: v.value, label: v.label })) : Object.keys(d.map).map((k) => ({ value: k, label: k }));
}

export function priceRows(options: OptionGroup[], price: PriceProfile, group: OptionGroup): PriceRow[] {
  return group.values.map((v) => ({ value: v.value, label: v.label, by: dependsOn(price, group.key, v.value) }));
}

/** Groups that have prices set at all. The rest cost the same whichever value is chosen. */
export const pricedGroups = (options: OptionGroup[], price: PriceProfile) => options.filter((g) => price.deltas?.[g.key] && Object.keys(price.deltas[g.key]).length > 0);

/** The form's starting values, in rupees. */
export function toPriceInput(options: OptionGroup[], price: PriceProfile): PriceInput {
  const amounts: PriceInput['amounts'] = {};
  for (const g of options) {
    const table = price.deltas?.[g.key];
    const row: Record<string, string | Record<string, string>> = {};
    for (const v of g.values) {
      const d = table?.[v.value];
      if (d && typeof d === 'object') {
        row[v.value] = Object.fromEntries(byValues(options, price, g.key, v.value).map((b) => [b.value, rupeesText(d.map[b.value] ?? 0)]));
      } else row[v.value] = rupeesText(d ?? 0);
    }
    amounts[g.key] = row;
  }
  return { base: rupeesText(price.base), amounts };
}

export type PriceResult = { ok: true; price: PriceProfile } | { ok: false; error: string };

/** Read the admin's amounts back into a price profile, keeping the existing structure. */
export function fromPriceInput(options: OptionGroup[], current: PriceProfile, input: PriceInput): PriceResult {
  const base = parseRupees(input.base);
  if (base === null || Number.isNaN(base)) return { ok: false, error: 'Enter the base price in rupees, like 99.' };
  if (base > LIMITS.priceMax) return { ok: false, error: 'The base price should be under ₹1,00,000.' };

  const amount = (raw: string | undefined, fallback: number, what: string): number | string => {
    if (raw === undefined) return fallback;
    const n = parseRupees(raw, true);
    if (n === null) return 0;
    if (Number.isNaN(n) || Math.abs(n) > LIMITS.priceMax) return `Check the amount for ${what}. Use rupees, like 50 or -20.`;
    return n;
  };

  const deltas: NonNullable<PriceProfile['deltas']> = {};
  for (const g of options) {
    const old = current.deltas?.[g.key];
    const sent = input.amounts?.[g.key] ?? {};
    const table: Record<string, Delta> = {};
    let any = Boolean(old && Object.keys(old).length);
    for (const v of g.values) {
      const d = old?.[v.value];
      const raw = sent[v.value];
      if (d && typeof d === 'object') {
        const map: Record<string, number> = {};
        for (const b of byValues(options, current, g.key, v.value)) {
          const n = amount(typeof raw === 'object' ? raw[b.value] : undefined, d.map[b.value] ?? 0, `${g.label}: ${v.label} with ${b.label}`);
          if (typeof n === 'string') return { ok: false, error: n };
          map[b.value] = n;
        }
        table[v.value] = { by: d.by, map };
      } else {
        const n = amount(typeof raw === 'string' ? raw : undefined, typeof d === 'number' ? d : 0, `${g.label}: ${v.label}`);
        if (typeof n === 'string') return { ok: false, error: n };
        table[v.value] = n;
        if (n !== 0) any = true;
      }
    }
    if (any) deltas[g.key] = table;
  }

  const price: PriceProfile = Object.keys(deltas).length ? { base, deltas } : { base };
  const { min } = priceRange(price, options);
  if (min < LIMITS.priceMin) return { ok: false, error: `With these amounts the cheapest choice would cost ${formatINR(Math.max(0, min))}. Every choice should cost at least ₹1.` };
  return { ok: true, price };
}
