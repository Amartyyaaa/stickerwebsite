import { describe, expect, it } from 'vitest';
import { AddressInput, ContactInput, formatPhone, normalizePhone } from '@/lib/india';
import { DEFAULT_SETTINGS } from '@/lib/settings';
import { codCheck } from './cod';
import { newAccessKey, newOrderNumber, normalizeOrderNumber } from './numbers';
import { canMove, timeline } from './status';

describe('Cash on Delivery', () => {
  it('is available inside the limits without custom items', () => {
    expect(codCheck(DEFAULT_SETTINGS, 50000, false)).toEqual({ ok: true });
  });
  it('explains why it is not available', () => {
    expect(codCheck(DEFAULT_SETTINGS, 9900, false)).toMatchObject({ ok: false, reason: expect.stringMatching(/₹199 or more/) });
    expect(codCheck(DEFAULT_SETTINGS, 350000, false)).toMatchObject({ ok: false, reason: expect.stringMatching(/up to ₹3,000/) });
    expect(codCheck(DEFAULT_SETTINGS, 50000, true)).toMatchObject({ ok: false, reason: expect.stringMatching(/Custom prints/) });
    expect(codCheck({ cod: { ...DEFAULT_SETTINGS.cod, enabled: false } }, 50000, false)).toMatchObject({ ok: false, reason: expect.stringMatching(/paused/) });
  });
  it('can allow custom items when the store says so', () => {
    expect(codCheck({ cod: { ...DEFAULT_SETTINGS.cod, allowCustom: true } }, 50000, true)).toEqual({ ok: true });
  });
  it('drops the minimum and the custom-print rule while online payments are off', () => {
    const off = { online: false };
    expect(codCheck(DEFAULT_SETTINGS, 2900, false, off)).toEqual({ ok: true });
    expect(codCheck(DEFAULT_SETTINGS, 50000, true, off)).toEqual({ ok: true });
    expect(codCheck(DEFAULT_SETTINGS, 350000, false, off)).toMatchObject({ ok: false, reason: expect.stringMatching(/up to ₹3,000\. Please contact us/) });
    expect(codCheck({ cod: { ...DEFAULT_SETTINGS.cod, enabled: false } }, 50000, false, off)).toMatchObject({ ok: false, reason: expect.not.stringMatching(/pay online/) });
  });
});

describe('order numbers and keys', () => {
  it('makes readable order numbers without look-alike characters', () => {
    for (let i = 0; i < 200; i++) expect(newOrderNumber()).toMatch(/^PYV-[A-HJ-NP-Z2-9]{6}$/);
  });
  it('accepts order numbers typed in different ways', () => {
    expect(normalizeOrderNumber(' pyv-7kq2md ')).toBe('PYV-7KQ2MD');
    expect(normalizeOrderNumber('PYV7KQ2MD')).toBe('PYV-7KQ2MD');
    expect(normalizeOrderNumber('PYV-7KQ2M0')).toBeNull();
    expect(normalizeOrderNumber('hello')).toBeNull();
  });
  it('makes long random access keys', () => {
    const a = newAccessKey();
    expect(a).toMatch(/^[A-Za-z0-9_-]{24}$/);
    expect(newAccessKey()).not.toBe(a);
  });
});

describe('order status', () => {
  it('only allows the normal moves', () => {
    expect(canMove('pending_payment', 'placed')).toBe(true);
    expect(canMove('placed', 'shipped')).toBe(false);
    expect(canMove('placed', 'printing')).toBe(true);
    expect(canMove('shipped', 'cancelled')).toBe(false);
    expect(canMove('cancelled', 'refunded')).toBe(true);
  });
  it('builds the timeline with done, current and upcoming steps', () => {
    const t = timeline('confirmed', [
      { status: 'placed', at: 100 },
      { status: 'confirmed', at: 200 },
    ]);
    expect(t.map((x) => `${x.status}:${x.state}`)).toEqual(['placed:done', 'confirmed:current', 'printing:todo', 'shipped:todo', 'delivered:todo']);
    expect(t[1].at).toBe(200);
  });
  it('ends a cancelled order at the cancellation', () => {
    const t = timeline('cancelled', [
      { status: 'placed', at: 100 },
      { status: 'cancelled', at: 300 },
    ]);
    expect(t.map((x) => `${x.status}:${x.state}`)).toEqual(['placed:done', 'cancelled:current']);
  });
});

describe('checkout details', () => {
  it('cleans up Indian phone numbers', () => {
    expect(normalizePhone('+91 98765 43210')).toBe('9876543210');
    expect(normalizePhone('09876543210')).toBe('9876543210');
    expect(formatPhone('9876543210')).toBe('+91 98765 43210');
    expect(ContactInput.safeParse({ email: 'A@B.in', phone: '98765-43210' }).data).toEqual({ email: 'a@b.in', phone: '9876543210' });
    expect(ContactInput.safeParse({ email: 'a@b.in', phone: '12345 67890' }).success).toBe(false);
  });
  it('checks the address', () => {
    const ok = { name: 'Asha Rao', phone: '9876543210', line1: '12, Lake View Apartments', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' };
    expect(AddressInput.safeParse(ok).success).toBe(true);
    expect(AddressInput.safeParse({ ...ok, pincode: '056001' }).success).toBe(false);
    expect(AddressInput.safeParse({ ...ok, state: 'Atlantis' }).success).toBe(false);
    expect(AddressInput.safeParse(ok).data?.line2).toBe('');
  });
});

describe('shopper cancel reasons', () => {
  it('saves the chosen reason, or the shopper’s own words for "Other"', async () => {
    const { cancelReasonText, SHOPPER_CANCELLABLE } = await import('./status');
    expect(cancelReasonText('mistake', '')).toBe('Ordered by mistake');
    expect(cancelReasonText('other', '  Chose   the wrong size ')).toBe('Chose the wrong size');
    expect(cancelReasonText('other', 'no')).toBeNull();
    expect(cancelReasonText('made-up', 'x')).toBeNull();
    expect(SHOPPER_CANCELLABLE).toEqual(['pending_payment', 'placed', 'confirmed']);
  });
});
