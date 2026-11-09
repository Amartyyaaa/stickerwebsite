import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@/lib/settings';
import { readSettingsForm, toSettingsForm } from './settings-form';

const types = ['wall-posters', 'laptop-stickers'];

describe('settings form', () => {
  it('round-trips the defaults unchanged', () => {
    const r = readSettingsForm(toSettingsForm(DEFAULT_SETTINGS), DEFAULT_SETTINGS, types);
    expect(r).toEqual({ ok: true, settings: DEFAULT_SETTINGS });
  });
  it('reads rupees, phone numbers and messages', () => {
    const f = toSettingsForm(DEFAULT_SETTINGS);
    f.shipping.freeAbove = '599';
    f.contact.whatsapp = '098765 43210';
    f.announcement = '  Diwali sale: 20% off  \n\nFree shipping above ₹599';
    f.business.gstin = '29abcde1234f1z5';
    const r = readSettingsForm(f, DEFAULT_SETTINGS, types);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.settings.shipping.freeAbove).toBe(59_900);
    expect(r.settings.contact.whatsapp).toBe('+91 98765 43210');
    expect(r.settings.announcement).toEqual(['Diwali sale: 20% off', 'Free shipping above ₹599']);
    expect(r.settings.business.gstin).toBe('29ABCDE1234F1Z5');
    expect(r.settings.home).toEqual(DEFAULT_SETTINGS.home);
  });
  it('reads a second WhatsApp number and the platform fee', () => {
    const f = toSettingsForm(DEFAULT_SETTINGS);
    expect(f.platformFee).toBe('5');
    f.contact.whatsappAlt = '9801644598';
    f.platformFee = '10';
    const r = readSettingsForm(f, DEFAULT_SETTINGS, types);
    expect(r.ok && r.settings.contact.whatsappAlt).toBe('+91 98016 44598');
    expect(r.ok && r.settings.platformFee).toBe(1000);
    f.contact.whatsappAlt = '';
    f.platformFee = '0';
    const none = readSettingsForm(f, DEFAULT_SETTINGS, types);
    expect(none.ok && [none.settings.contact.whatsappAlt, none.settings.platformFee]).toEqual(['', 0]);
  });
  it('points at the field to fix', () => {
    const bad = (patch: (f: ReturnType<typeof toSettingsForm>) => void) => {
      const f = toSettingsForm(DEFAULT_SETTINGS);
      patch(f);
      const r = readSettingsForm(f, DEFAULT_SETTINGS, types);
      return r.ok ? null : r.field;
    };
    expect(bad((f) => (f.contact.whatsapp = '12345'))).toBe('contact.whatsapp');
    expect(bad((f) => (f.contact.whatsappAlt = '12345'))).toBe('contact.whatsappAlt');
    expect(bad((f) => (f.platformFee = 'five'))).toBe('platformFee');
    expect(bad((f) => (f.cod.max = '100'))).toBe('cod.max');
    expect(bad((f) => (f.delivery.metroDays = ['5', '3']))).toBe('delivery.metroDays');
    expect(bad((f) => (f.packs.tiers = [{ qty: '10', price: '199' }, { qty: '10', price: '149' }]))).toBe('packs.tiers.1');
    expect(bad((f) => (f.bxgy[0].types = ['mugs']))).toBe('bxgy.0');
    expect(bad((f) => (f.social.instagram = 'instagram.com/me'))).toBe('social.instagram');
    expect(bad((f) => (f.business.gstin = 'NOT-A-GSTIN'))).toBe('business.gstin');
    expect(bad((f) => (f.prepaidDiscount.percent = '25'))).toBe('prepaidDiscount.percent');
  });
});
