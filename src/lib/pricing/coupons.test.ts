import { describe, expect, it } from 'vitest';
import { couponState, istDate, istDayStart, readCouponForm, toCouponForm, type CouponForm } from '@/lib/admin/coupon-form';
import { formatINR } from '@/lib/money';
import { DEFAULT_SETTINGS } from '@/lib/settings';
import { couponAmount, couponProblem, describeCoupon, normalizeCode, type CouponRecord } from './coupons';
import { quote, type PricedLine } from './engine';

const NOW = 1_800_000_000;
const base: CouponRecord = { code: 'WELCOME10', kind: 'percent', value: 10, minOrder: 0, maxDiscount: null, isActive: true, startsAt: null, endsAt: null, usageLimit: null, perCustomer: null, usedCount: 0 };
const poster = (qty: number, unit = 19900): PricedLine => ({ key: `p${unit}`, productId: 1, typeId: 'framed-posters', options: {}, qty, unit });
// No pack or buy-x-get-y offers here, so only the coupon changes the price.
const settings = { ...DEFAULT_SETTINGS, bxgy: [] };

describe('coupon checks', () => {
  it('accepts a live code', () => {
    expect(couponProblem(base, { now: NOW })).toBeNull();
    expect(normalizeCode(' welcome 10 ')).toBe('WELCOME10');
  });
  it('explains dates, limits and switched-off codes', () => {
    expect(couponProblem(null, { now: NOW })).toContain('isn’t valid');
    expect(couponProblem({ ...base, isActive: false }, { now: NOW })).toContain('isn’t valid');
    expect(couponProblem({ ...base, startsAt: NOW + 86400 }, { now: NOW })).toMatch(/works from/);
    expect(couponProblem({ ...base, endsAt: NOW - 1 }, { now: NOW })).toMatch(/expired on/);
    expect(couponProblem({ ...base, usageLimit: 5, usedCount: 5 }, { now: NOW })).toMatch(/fully used/);
    expect(couponProblem({ ...base, perCustomer: 1 }, { now: NOW, usesByEmail: 1 })).toMatch(/already used/);
    expect(couponProblem({ ...base, perCustomer: 2 }, { now: NOW, usesByEmail: 1 })).toBeNull();
  });
});

describe('coupon amounts', () => {
  it('rounds percent coupons to whole rupees and caps them', () => {
    expect(couponAmount(base, 45_550)).toBe(4600);
    expect(couponAmount({ ...base, maxDiscount: 3000 }, 45_550)).toBe(3000);
  });
  it('never takes off more than the order', () => {
    expect(couponAmount({ ...base, kind: 'flat', value: 50_000 }, 19_900)).toBe(19_900);
  });
  it('describes the offer', () => {
    expect(describeCoupon({ ...base, maxDiscount: 20000 }, formatINR)).toBe('10% off (up to ₹200)');
    expect(describeCoupon({ ...base, kind: 'shipping' }, formatINR)).toBe('Free shipping');
  });
});

describe('coupons in the quote', () => {
  it('comes after other offers, as its own discount line', () => {
    const q = quote([poster(2)], settings, { coupon: base });
    expect(q.discounts).toEqual([{ id: 'coupon', label: 'Coupon WELCOME10', amount: 4000 }]);
    expect(q.total).toBe(39_800 - 4000 + settings.shipping.fee);
    expect(q.coupon).toMatchObject({ applied: true, amount: 4000 });
  });
  it('reports the minimum order instead of applying', () => {
    const q = quote([poster(1)], settings, { coupon: { ...base, minOrder: 49_900 } });
    expect(q.discounts).toEqual([]);
    expect(q.coupon?.applied).toBe(false);
    expect(q.coupon?.reason).toContain('₹300 more');
  });
  it('free shipping waives the fee', () => {
    const plain = quote([poster(1)], settings);
    expect(plain.shipping).toBe(settings.shipping.fee);
    const q = quote([poster(1)], settings, { coupon: { ...base, kind: 'shipping', value: 0 } });
    expect(q.shipping).toBe(0);
    expect(q.total).toBe(19_900);
    expect(q.coupon?.freeShipping).toBe(true);
  });
  it('a coupon can bring an order below free shipping', () => {
    const q = quote([poster(1, 52_000)], settings, { coupon: { ...base, kind: 'flat', value: 5000 } });
    expect(q.shipping).toBe(settings.shipping.fee);
  });
  it('the online discount applies to the price after the coupon', () => {
    const q = quote([poster(4)], settings, { coupon: base, payment: 'online' });
    // ₹796 less 10% is ₹716.40; 5% of that rounds to ₹36, under the ₹50 cap.
    expect(q.prepaidDiscount).toBe(3600);
  });
});


const form: CouponForm = { code: ' welcome10 ', kind: 'percent', value: '10', minOrder: '299', maxDiscount: '200', startsOn: '2026-11-01', endsOn: '2026-11-30', usageLimit: '100', perCustomer: '1', isActive: true, note: '' };

describe('coupon form', () => {
  it('reads rupees, dates in Indian time and limits', () => {
    const r = readCouponForm(form);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.values).toMatchObject({ code: 'WELCOME10', value: 10, minOrder: 29_900, maxDiscount: 20_000, usageLimit: 100, perCustomer: 1 });
    // 1 Nov 2026 00:00 in India is 31 Oct 18:30 UTC; the code lasts to the end of 30 Nov.
    expect(r.values.startsAt).toBe(Date.UTC(2026, 9, 31, 18, 30) / 1000);
    expect(r.values.endsAt).toBe(Date.UTC(2026, 10, 30, 18, 30) / 1000 - 1);
    expect(toCouponForm(r.values)).toMatchObject({ code: 'WELCOME10', minOrder: '299', startsOn: '2026-11-01', endsOn: '2026-11-30' });
  });
  it('explains mistakes', () => {
    expect(readCouponForm({ ...form, code: 'x' })).toMatchObject({ ok: false, field: 'code' });
    expect(readCouponForm({ ...form, value: '95' })).toMatchObject({ ok: false, field: 'value' });
    expect(readCouponForm({ ...form, kind: 'flat', value: '500', minOrder: '299' })).toMatchObject({ ok: false, field: 'value' });
    expect(readCouponForm({ ...form, endsOn: '2026-10-01' })).toMatchObject({ ok: false, field: 'endsOn' });
    expect(readCouponForm({ ...form, startsOn: '2026-02-30' })).toMatchObject({ ok: false, field: 'startsOn' });
    expect(readCouponForm({ ...form, usageLimit: '0' })).toMatchObject({ ok: false, field: 'usageLimit' });
  });
  it('free shipping needs no amount', () => {
    const r = readCouponForm({ ...form, kind: 'shipping', value: '' });
    expect(r.ok && r.values.value).toBe(0);
  });
  it('dates round-trip', () => {
    expect(istDate(istDayStart('2026-03-15')!)).toBe('2026-03-15');
  });
  it('labels the state', () => {
    const c = { isActive: true, startsAt: null, endsAt: null, usageLimit: null, usedCount: 0 };
    expect(couponState(c, NOW)).toBe('live');
    expect(couponState({ ...c, isActive: false }, NOW)).toBe('off');
    expect(couponState({ ...c, endsAt: NOW - 1 }, NOW)).toBe('expired');
    expect(couponState({ ...c, usageLimit: 3, usedCount: 3 }, NOW)).toBe('used-up');
    expect(couponState({ ...c, startsAt: NOW + 10 }, NOW)).toBe('scheduled');
  });
});
