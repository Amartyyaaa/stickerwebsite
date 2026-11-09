/**
 * The "Before you go live" checklist on the admin dashboard. A pure function of
 * the server's settings, so it's unit-tested. It never sees secret values, only
 * whether they're set.
 */
import type { OpsStatus } from '@/lib/ops';
import type { StoreSettings } from '@/lib/settings';

export interface GoLiveInput {
  env: {
    siteUrl: string;
    authSecretLength: number;
    razorpayKeyId: string;
    razorpaySecret: boolean;
    webhookSecret: boolean;
    paymentsMock: boolean;
    resendKey: boolean;
    mailFrom: string;
    backups: boolean;
    /** The database is hosted (Turso, on Vercel), which keeps its own backups. */
    hostedDatabase?: boolean;
  };
  settings: Pick<StoreSettings, 'contact' | 'business'>;
  /** Info pages that still have [placeholders]. */
  placeholders: Array<{ title: string; placeholders: string[] }>;
  demoProducts: number;
  realProducts: number;
  ops: OpsStatus;
  /** Unix seconds. */
  now: number;
}

export interface GoLiveItem {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
  /** Where to fix it in the admin, when it's fixed there. */
  href?: string;
  /**
   * Can wait until after opening (online payments, email, backups off the server): the store
   * works without it, with limits the detail explains. Not counted in "x of N done".
   */
  later?: boolean;
}

const DAY = 86400;

function ago(sec: number): string {
  if (sec < 3600) return `${Math.max(1, Math.round(sec / 60))} minutes ago`;
  if (sec < 2 * DAY) return `${Math.round(sec / 3600)} hours ago`;
  return `${Math.round(sec / DAY)} days ago`;
}

export function goLiveChecklist(i: GoLiveInput): GoLiveItem[] {
  const { env, settings: s, ops, now } = i;
  const items: GoLiveItem[] = [];
  const add = (id: string, label: string, ok: boolean, detail: string, href?: string) => items.push({ id, label, ok, detail, href });
  const later = (id: string, label: string, detail: string) => items.push({ id, label, ok: false, detail, later: true });

  let host = '';
  try {
    host = new URL(env.siteUrl).host;
  } catch {
    /* not a web address */
  }
  const httpsSite = env.siteUrl.startsWith('https://') && !/^(localhost|127\.0\.0\.1)(:|$)/.test(host);
  add('site', 'Store address uses https', httpsSite, httpsSite ? `The store is at ${host}.` : 'Set NEXT_PUBLIC_SITE_URL in .env.production to your https address, like https://printyourvibe.in (DEPLOY.md, step 4).');

  add('auth', 'Sign-in secret is set', env.authSecretLength >= 32, env.authSecretLength >= 32 ? 'Sign-in sessions are protected.' : 'Add BETTER_AUTH_SECRET to .env.production. DEPLOY.md shows the command that makes one.');

  if (env.paymentsMock) {
    add('payments', 'Online payments are live', false, 'PAYMENTS_MOCK is set: remove it from .env.production. It’s only for testing on your own computer.');
  } else if (!env.razorpayKeyId || !env.razorpaySecret) {
    later(
      'payments',
      'Online payments (Razorpay)',
      'Shoppers pay Cash on Delivery for now, with no smallest order and custom prints included. Add Razorpay to take UPI and cards (DEPLOY.md, step 6).',
    );
  } else if (env.razorpayKeyId.startsWith('rzp_test_')) {
    add('payments', 'Online payments are live', false, 'You’re using Razorpay test keys. Once a test payment works, switch to your live keys (DEPLOY.md, step 6).');
  } else {
    add('payments', 'Online payments are live', true, 'Razorpay live keys are set.');
  }
  // The webhook only matters once Razorpay keys are in.
  if (env.razorpayKeyId && env.razorpaySecret) {
    add('webhook', 'Razorpay webhook is set up', env.webhookSecret, env.webhookSecret ? 'Payments are confirmed even if a shopper closes the page.' : 'Add the webhook in Razorpay and put its secret in RAZORPAY_WEBHOOK_SECRET (DEPLOY.md, step 6).');
  }

  if (!env.resendKey) {
    later(
      'email',
      'Emails (Resend)',
      'Nothing is emailed yet: shoppers can’t sign in (they track orders by number and phone), and new orders only show here. Get your admin sign-in code with sudo pyv code (DEPLOY.md, step 7).',
    );
  } else {
    const fromOk = /@/.test(env.mailFrom) && !/yourdomain/.test(env.mailFrom);
    add('email', 'Emails are sent', fromOk, fromOk ? `From ${env.mailFrom}.` : 'Set MAIL_FROM to an address on your domain, like PrintYourVibe <orders@yourdomain.in> (DEPLOY.md, step 7).');
  }

  const contactOk = Boolean(s.contact.email && (s.contact.whatsapp || s.contact.phone));
  add('contact', 'Support email and WhatsApp number', contactOk, contactOk ? `${s.contact.email} · ${s.contact.whatsapp || s.contact.phone}` : 'Add them in Settings → Contact. They appear on the contact page, packing slips and the chat button.', '/admin/settings');

  const businessOk = Boolean(s.business.name && s.business.address);
  add('business', 'Business name and address', businessOk, businessOk ? s.business.name : 'Add them in Settings → Business details, for receipts and the policy pages.', '/admin/settings');

  const grievanceOk = Boolean(s.business.grievanceName && s.business.grievanceDesignation);
  add('grievance', 'Grievance officer named', grievanceOk, grievanceOk ? `${s.business.grievanceName}, ${s.business.grievanceDesignation}` : 'Indian e-commerce rules ask online sellers to name one. Add it in Settings → Business details.', '/admin/settings');

  const pages = i.placeholders.map((p) => p.title);
  add('policies', 'Policy pages filled in', pages.length === 0, pages.length === 0 ? 'No [placeholders] left.' : `Still has [placeholders]: ${pages.join(', ')}. Most come from Settings; the rest are in src/content/pages.ts.`, '/admin/settings');

  add('products', 'Your own products are in', i.realProducts > 0, i.realProducts > 0 ? `${i.realProducts.toLocaleString('en-IN')} of your products are in the store.` : 'Add products one by one or import a CSV.', '/admin/products');
  add('demo', 'Demo products removed', i.demoProducts === 0, i.demoProducts === 0 ? 'Only your products are in the store.' : `${i.demoProducts.toLocaleString('en-IN')} demo products are still in the store. Remove them on the Products page.`, '/admin/products');

  // Nightly backups run either way: to Cloudflare R2, or (until it's set up) as a copy on this server.
  // A hosted database keeps its own backups, and hosted photo storage (Vercel Blob) keeps the photos.
  const b = ops.backup;
  if (env.hostedDatabase) add('backups', 'Backups', true, 'Your hosted database (Turso) keeps its own backups, and photos are kept by Vercel Blob.');
  else if (!b) add('backups', 'Nightly backups are running', false, 'No backup has run yet. The server runs one every night at 4 am, or run sudo pyv backup now.');
  else if (!b.ok) add('backups', 'Nightly backups are running', false, `The last backup failed ${ago(now - b.at)}: ${b.message}`);
  else add('backups', 'Nightly backups are running', now - b.at < 1.5 * DAY, `Last backup ${ago(now - b.at)}: ${b.message}.`);
  if (!env.backups && !env.hostedDatabase) {
    later(
      'offsite',
      'Backups off the server (Cloudflare R2)',
      'Backups are kept on this server for 14 days, so losing the server would lose them. Until R2 is set up, use Download a backup (top of this page) every week (DEPLOY.md, step 8).',
    );
  }

  const m = ops.maintenance;
  add(
    'maintenance',
    'Daily clean-up is running',
    Boolean(m?.ok && now - m.at < 1.5 * DAY),
    !m ? 'It hasn’t run yet. The server runs it every night at 3:30 am.' : m.ok ? `Last run ${ago(now - m.at)}.` : `The last run failed: ${m.message}`,
  );

  return items;
}
