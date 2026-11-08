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
    add('payments', 'Online payments are live', false, 'Add your Razorpay keys. Until then shoppers can only pay Cash on Delivery (DEPLOY.md, step 6).');
  } else if (env.razorpayKeyId.startsWith('rzp_test_')) {
    add('payments', 'Online payments are live', false, 'You’re using Razorpay test keys. Once a test payment works, switch to your live keys (DEPLOY.md, step 6).');
  } else {
    add('payments', 'Online payments are live', true, 'Razorpay live keys are set.');
  }
  add('webhook', 'Razorpay webhook is set up', env.webhookSecret, env.webhookSecret ? 'Payments are confirmed even if a shopper closes the page.' : 'Add the webhook in Razorpay and put its secret in RAZORPAY_WEBHOOK_SECRET (DEPLOY.md, step 6).');

  const mailOk = env.resendKey && /@/.test(env.mailFrom) && !/yourdomain/.test(env.mailFrom);
  add('email', 'Emails are sent', mailOk, mailOk ? `From ${env.mailFrom}.` : 'Add RESEND_API_KEY and MAIL_FROM. Without them shoppers get no sign-in codes or order emails (DEPLOY.md, step 7).');

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

  const b = ops.backup;
  if (!env.backups) add('backups', 'Daily backups are running', false, 'Set up Cloudflare R2 backups (DEPLOY.md, step 8).');
  else if (!b) add('backups', 'Daily backups are running', false, 'No backup has run yet. Run npm run backup on the server once to check it works.');
  else if (!b.ok) add('backups', 'Daily backups are running', false, `The last backup failed ${ago(now - b.at)}: ${b.message}`);
  else add('backups', 'Daily backups are running', now - b.at < 1.5 * DAY, `Last backup ${ago(now - b.at)}: ${b.message}.`);

  const m = ops.maintenance;
  add(
    'maintenance',
    'Daily clean-up is running',
    Boolean(m?.ok && now - m.at < 1.5 * DAY),
    !m ? 'It hasn’t run yet. The server runs it every night at 3:30 am.' : m.ok ? `Last run ${ago(now - m.at)}.` : `The last run failed: ${m.message}`,
  );

  return items;
}
