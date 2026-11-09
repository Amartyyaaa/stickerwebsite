/**
 * Warnings logged when the live server starts, for settings that are missing
 * or unsafe. The admin dashboard's go-live checklist shows the same things.
 */
export function startupWarnings(env: Record<string, string | undefined>): string[] {
  const out: string[] = [];
  const site = env.NEXT_PUBLIC_SITE_URL ?? '';
  const local = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(site);
  if (!site.startsWith('https://') && !local) out.push('NEXT_PUBLIC_SITE_URL should be the store’s https address, like https://printyourvibe.in.');
  if ((env.BETTER_AUTH_SECRET ?? '').length < 32) out.push('BETTER_AUTH_SECRET is missing or too short, so sign-in won’t be safe. DEPLOY.md, step 4, shows how to make one.');
  if (env.PAYMENTS_MOCK === '1' && !local) out.push('PAYMENTS_MOCK is set but ignored on a real address. Remove it from .env.production.');
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) out.push('Razorpay keys are not set, so shoppers pay Cash on Delivery (no smallest order, custom prints included).');
  if (!env.RESEND_API_KEY) {
    out.push(
      env.VERCEL
        ? 'RESEND_API_KEY is not set, so no emails are sent. Shopper sign-in is hidden; admin sign-in codes are written to this log.'
        : 'RESEND_API_KEY is not set, so emails are saved to data/outbox instead of being sent. Shopper sign-in is hidden; get admin sign-in codes with: sudo pyv code',
    );
  }
  if (!env.ADMIN_EMAILS?.trim()) out.push('ADMIN_EMAILS is empty, so nobody can open the admin panel.');
  // A hosted database (Turso) keeps its own backups.
  const hosted = /^libsql:|^https?:/.test(env.DATABASE_URL || env.TURSO_DATABASE_URL || '');
  if (!hosted && (!env.R2_BUCKET || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY)) out.push('Backups to Cloudflare R2 are not set up, so nightly backups stay on this server (DEPLOY.md, step 8).');
  if (env.VERCEL && !hosted) out.push('On Vercel the database must be hosted: set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN (VERCEL.md). A database file there is wiped between requests.');
  if (env.VERCEL && !env.BLOB_READ_WRITE_TOKEN) out.push('On Vercel, photos need Vercel Blob: connect a Blob store to the project (VERCEL.md). Without it, uploaded photos are lost.');
  return out;
}
