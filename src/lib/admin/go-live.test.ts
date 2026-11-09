import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@/lib/settings';
import { startupWarnings } from '@/lib/startup-check';
import { goLiveChecklist, type GoLiveInput } from './go-live';

const NOW = 1_800_000_000;
const ready: GoLiveInput = {
  env: { siteUrl: 'https://printyourvibe.in', authSecretLength: 44, razorpayKeyId: 'rzp_live_abc', razorpaySecret: true, webhookSecret: true, paymentsMock: false, resendKey: true, mailFrom: 'PrintYourVibe <orders@printyourvibe.in>', backups: true },
  settings: {
    contact: { ...DEFAULT_SETTINGS.contact, email: 'hello@printyourvibe.in', whatsapp: '+91 98765 43210' },
    business: { ...DEFAULT_SETTINGS.business, address: '12, MG Road, Bengaluru', grievanceName: 'Asha Rao', grievanceDesignation: 'Founder' },
  },
  placeholders: [],
  demoProducts: 0,
  realProducts: 120,
  ops: { backup: { at: NOW - 3600, ok: true, message: 'Database saved' }, maintenance: { at: NOW - 7200, ok: true, message: 'ok' } },
  now: NOW,
};
const failing = (i: GoLiveInput) => goLiveChecklist(i).filter((x) => !x.ok).map((x) => x.id);

describe('go-live checklist', () => {
  it('is all ticked for a store that’s ready', () => {
    expect(failing(ready)).toEqual([]);
  });
  it('flags a fresh local install', () => {
    const fresh: GoLiveInput = {
      ...ready,
      env: { siteUrl: 'http://localhost:3000', authSecretLength: 0, razorpayKeyId: '', razorpaySecret: false, webhookSecret: false, paymentsMock: false, resendKey: false, mailFrom: 'PrintYourVibe <orders@yourdomain.in>', backups: false },
      settings: { ...DEFAULT_SETTINGS, contact: { ...DEFAULT_SETTINGS.contact, email: '', whatsapp: '', whatsappAlt: '' } },
      placeholders: [{ title: 'About PrintYourVibe', placeholders: ['[Tell your story here]'] }],
      demoProducts: 5910,
      realProducts: 0,
      ops: {},
    };
    expect(failing(fresh)).toEqual(['site', 'auth', 'payments', 'email', 'contact', 'business', 'grievance', 'policies', 'products', 'demo', 'backups', 'offsite', 'maintenance']);
  });
  it('lets a store open without Razorpay, Resend and R2, listing them for later', () => {
    const items = goLiveChecklist({
      ...ready,
      env: { ...ready.env, razorpayKeyId: '', razorpaySecret: false, webhookSecret: false, resendKey: false, mailFrom: '', backups: false },
      ops: { ...ready.ops, backup: { at: NOW - 3600, ok: true, message: 'Database saved on this server only', local: true } },
    });
    const later = items.filter((i) => i.later).map((i) => i.id);
    expect(later).toEqual(['payments', 'email', 'offsite']);
    expect(items.filter((i) => !i.later && !i.ok)).toEqual([]);
    expect(items.find((i) => i.id === 'webhook')).toBeUndefined();
    expect(items.find((i) => i.id === 'email')!.detail).toMatch(/sudo pyv code/);
  });
  it('trusts a hosted database to keep its own backups', () => {
    const items = goLiveChecklist({ ...ready, env: { ...ready.env, backups: false, hostedDatabase: true }, ops: { maintenance: ready.ops.maintenance } });
    expect(items.find((i) => i.id === 'backups')).toMatchObject({ ok: true, detail: expect.stringMatching(/Turso/) });
    expect(items.find((i) => i.id === 'offsite')).toBeUndefined();
  });
  it('still asks for a proper from-address once email is set up', () => {
    const email = goLiveChecklist({ ...ready, env: { ...ready.env, mailFrom: 'PrintYourVibe <orders@yourdomain.in>' } }).find((x) => x.id === 'email')!;
    expect(email).toMatchObject({ ok: false, detail: expect.stringMatching(/MAIL_FROM/) });
    expect(email.later).toBeUndefined();
  });
  it('explains payment problems', () => {
    const pay = (env: Partial<GoLiveInput['env']>) => goLiveChecklist({ ...ready, env: { ...ready.env, ...env } }).find((x) => x.id === 'payments')!;
    expect(pay({ razorpayKeyId: 'rzp_test_abc' }).detail).toMatch(/test keys/);
    expect(pay({ paymentsMock: true }).detail).toMatch(/PAYMENTS_MOCK/);
    expect(pay({ razorpayKeyId: '' })).toMatchObject({ later: true, detail: expect.stringMatching(/Cash on Delivery/) });
    expect(pay({ paymentsMock: true }).later).toBeUndefined();
  });
  it('notices old or failed backups', () => {
    const backup = (b: GoLiveInput['ops']['backup']) => goLiveChecklist({ ...ready, ops: { ...ready.ops, backup: b } }).find((x) => x.id === 'backups')!;
    expect(backup({ at: NOW - 3 * 86400, ok: true, message: 'ok' })).toMatchObject({ ok: false, detail: expect.stringMatching(/3 days ago/) });
    expect(backup({ at: NOW - 600, ok: false, message: 'Uploading db failed: 403' })).toMatchObject({ ok: false, detail: expect.stringMatching(/403/) });
  });
});


describe('start-up warnings', () => {
  it('stay quiet when everything is set', () => {
    expect(
      startupWarnings({ NEXT_PUBLIC_SITE_URL: 'https://printyourvibe.in', BETTER_AUTH_SECRET: 'x'.repeat(44), RAZORPAY_KEY_ID: 'rzp_live_a', RAZORPAY_KEY_SECRET: 's', RESEND_API_KEY: 're_x', ADMIN_EMAILS: 'a@b.in', R2_BUCKET: 'b', R2_ACCESS_KEY_ID: 'k', R2_SECRET_ACCESS_KEY: 's' }),
    ).toEqual([]);
  });
  it('flag a test-payment setting left on the live site', () => {
    const w = startupWarnings({ NEXT_PUBLIC_SITE_URL: 'https://printyourvibe.in', PAYMENTS_MOCK: '1' });
    expect(w.some((x) => x.includes('PAYMENTS_MOCK'))).toBe(true);
    expect(startupWarnings({ NEXT_PUBLIC_SITE_URL: 'http://localhost:3100', PAYMENTS_MOCK: '1' }).some((x) => x.includes('PAYMENTS_MOCK'))).toBe(false);
  });
});
