/**
 * Coupon rules. The server checks a code's dates and limits with
 * `couponProblem`; the pricing engine then checks the minimum order and works
 * out the discount, after the other offers and before shipping.
 */
import { formatDate } from '@/lib/dates';

export type CouponKind = 'percent' | 'flat' | 'shipping';

/** What the pricing engine needs to apply a code. Amounts in paise. */
export interface CouponRule {
  code: string;
  kind: CouponKind;
  /** Percent off, or an amount off in paise. */
  value: number;
  minOrder: number;
  maxDiscount: number | null;
}

export interface CouponRecord extends CouponRule {
  isActive: boolean;
  startsAt: number | null;
  endsAt: number | null;
  usageLimit: number | null;
  perCustomer: number | null;
  usedCount: number;
}

export const COUPON_CODE_RE = /^[A-Z0-9][A-Z0-9_-]{2,23}$/;

/** Upper case without spaces, the way codes are stored. */
export const normalizeCode = (input: string) => input.trim().toUpperCase().replace(/\s+/g, '');

/**
 * Why a code can't be used right now, in words for the shopper, or null when it can.
 * `usesByEmail` is how many earlier orders from this shopper used the code.
 */
export function couponProblem(c: CouponRecord | null, ctx: { now: number; usesByEmail?: number }): string | null {
  if (!c || !c.isActive) return 'That code isn’t valid. Check the spelling and try again.';
  if (c.startsAt && ctx.now < c.startsAt) return `That code works from ${formatDate(c.startsAt)}.`;
  if (c.endsAt && ctx.now > c.endsAt) return `That code expired on ${formatDate(c.endsAt)}.`;
  if (c.usageLimit !== null && c.usedCount >= c.usageLimit) return 'That code has been fully used.';
  if (c.perCustomer !== null && (ctx.usesByEmail ?? 0) >= c.perCustomer) return c.perCustomer === 1 ? 'You’ve already used that code.' : `You’ve already used that code ${c.perCustomer} times.`;
  return null;
}

/** How much a code takes off `merchandise` (the order after other offers), in paise. Free shipping takes nothing off here. */
export function couponAmount(c: CouponRule, merchandise: number): number {
  if (c.kind === 'shipping') return 0;
  if (c.kind === 'flat') return Math.min(c.value, merchandise);
  // Percent: rounded to whole rupees, like the online payment discount, and capped.
  const raw = Math.round((merchandise * c.value) / 100 / 100) * 100;
  return Math.min(raw, c.maxDiscount ?? Infinity, merchandise);
}

/** A short description of the offer, like "10% off (up to ₹200)" or "Free shipping". */
export function describeCoupon(c: Pick<CouponRule, 'kind' | 'value' | 'maxDiscount'>, inr: (paise: number) => string): string {
  if (c.kind === 'shipping') return 'Free shipping';
  if (c.kind === 'flat') return `${inr(c.value)} off`;
  return `${c.value}% off${c.maxDiscount ? ` (up to ${inr(c.maxDiscount)})` : ''}`;
}
