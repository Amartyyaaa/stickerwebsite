/**
 * Reading the coupon form: amounts in rupees and dates in Indian time become
 * paise and Unix seconds, with a plain reason for anything that doesn't fit.
 */
import { COUPON_CODE_RE, normalizeCode, type CouponKind } from '@/lib/pricing/coupons';
import { parseRupees, rupeesText } from './product-rules';

export interface CouponForm {
  code: string;
  kind: CouponKind;
  /** Percent, or rupees for a flat amount. */
  value: string;
  minOrder: string;
  maxDiscount: string;
  /** YYYY-MM-DD in Indian time; empty for no limit. */
  startsOn: string;
  endsOn: string;
  usageLimit: string;
  perCustomer: string;
  isActive: boolean;
  note: string;
}

export interface CouponValues {
  code: string;
  kind: CouponKind;
  value: number;
  minOrder: number;
  maxDiscount: number | null;
  startsAt: number | null;
  endsAt: number | null;
  usageLimit: number | null;
  perCustomer: number | null;
  isActive: boolean;
  note: string;
}

export type CouponFormResult = { ok: true; values: CouponValues } | { ok: false; error: string; field: keyof CouponForm };

const IST_OFFSET = 19800;
const DAY = 86400;

/** Midnight at the start of a date in India, as Unix seconds. */
export function istDayStart(date: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(ms) || new Date(ms).getUTCDate() !== Number(m[3])) return null;
  return ms / 1000 - IST_OFFSET;
}

/** The date in India for Unix seconds, as YYYY-MM-DD (for the form's date fields). */
export const istDate = (sec: number) => new Date((sec + IST_OFFSET) * 1000).toISOString().slice(0, 10);

const whole = (s: string, min: number, max: number): number | null | 'bad' => {
  const t = s.trim();
  if (!t) return null;
  if (!/^\d+$/.test(t)) return 'bad';
  const n = Number(t);
  return n < min || n > max ? 'bad' : n;
};

export function readCouponForm(f: CouponForm): CouponFormResult {
  const code = normalizeCode(f.code);
  if (!COUPON_CODE_RE.test(code)) return { ok: false, error: 'Use 3 to 24 letters or numbers for the code, like WELCOME10.', field: 'code' };

  let value = 0;
  if (f.kind === 'percent') {
    const n = whole(f.value, 1, 90);
    if (n === null || n === 'bad') return { ok: false, error: 'Enter a percentage from 1 to 90.', field: 'value' };
    value = n;
  } else if (f.kind === 'flat') {
    const n = parseRupees(f.value);
    if (n === null || Number.isNaN(n) || n < 100 || n > 10_000_000) return { ok: false, error: 'Enter the amount off in rupees, like 50.', field: 'value' };
    value = n;
  }

  const minOrder = parseRupees(f.minOrder) ?? 0;
  if (Number.isNaN(minOrder) || minOrder > 10_000_000) return { ok: false, error: 'Enter the minimum order in rupees, or leave it empty.', field: 'minOrder' };
  if (f.kind === 'flat' && minOrder && value > minOrder) return { ok: false, error: 'The amount off should be less than the minimum order.', field: 'value' };

  let maxDiscount: number | null = null;
  if (f.kind === 'percent' && f.maxDiscount.trim()) {
    const n = parseRupees(f.maxDiscount);
    if (n === null || Number.isNaN(n) || n < 100) return { ok: false, error: 'Enter the most it can take off in rupees, or leave it empty.', field: 'maxDiscount' };
    maxDiscount = n;
  }

  const startsAt = f.startsOn ? istDayStart(f.startsOn) : null;
  if (f.startsOn && startsAt === null) return { ok: false, error: 'Choose a start date.', field: 'startsOn' };
  const endStart = f.endsOn ? istDayStart(f.endsOn) : null;
  if (f.endsOn && endStart === null) return { ok: false, error: 'Choose an end date.', field: 'endsOn' };
  // The code works until the end of its last day.
  const endsAt = endStart === null ? null : endStart + DAY - 1;
  if (startsAt !== null && endsAt !== null && endsAt < startsAt) return { ok: false, error: 'The last day should be on or after the first day.', field: 'endsOn' };

  const usageLimit = whole(f.usageLimit, 1, 1_000_000);
  if (usageLimit === 'bad') return { ok: false, error: 'Enter how many times it can be used in all, or leave it empty.', field: 'usageLimit' };
  const perCustomer = whole(f.perCustomer, 1, 100);
  if (perCustomer === 'bad') return { ok: false, error: 'Enter how many times each shopper can use it (1 to 100), or leave it empty.', field: 'perCustomer' };
  const note = f.note.trim();
  if (note.length > 200) return { ok: false, error: 'Keep the note under 200 characters.', field: 'note' };

  return { ok: true, values: { code, kind: f.kind, value, minOrder, maxDiscount, startsAt, endsAt, usageLimit, perCustomer, isActive: f.isActive, note } };
}

/** A stored coupon back as form values. */
export function toCouponForm(c: CouponValues): CouponForm {
  return {
    code: c.code,
    kind: c.kind,
    value: c.kind === 'percent' ? String(c.value) : c.kind === 'flat' ? rupeesText(c.value) : '',
    minOrder: c.minOrder ? rupeesText(c.minOrder) : '',
    maxDiscount: c.maxDiscount ? rupeesText(c.maxDiscount) : '',
    startsOn: c.startsAt ? istDate(c.startsAt) : '',
    endsOn: c.endsAt ? istDate(c.endsAt) : '',
    usageLimit: c.usageLimit ? String(c.usageLimit) : '',
    perCustomer: c.perCustomer ? String(c.perCustomer) : '',
    isActive: c.isActive,
    note: c.note,
  };
}

export type CouponState = 'live' | 'off' | 'scheduled' | 'expired' | 'used-up';

export function couponState(c: Pick<CouponValues, 'isActive' | 'startsAt' | 'endsAt' | 'usageLimit'> & { usedCount: number }, now: number): CouponState {
  if (!c.isActive) return 'off';
  if (c.endsAt !== null && now > c.endsAt) return 'expired';
  if (c.usageLimit !== null && c.usedCount >= c.usageLimit) return 'used-up';
  if (c.startsAt !== null && now < c.startsAt) return 'scheduled';
  return 'live';
}
