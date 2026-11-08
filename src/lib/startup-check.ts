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
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) out.push('Razorpay keys are not set, so shoppers can only pay Cash on Delivery.');
  if (!env.RESEND_API_KEY) out.push('RESEND_API_KEY is not set, so emails (sign-in codes, order updates) are saved to data/outbox instead of being sent.');
  if (!env.ADMIN_EMAILS?.trim()) out.push('ADMIN_EMAILS is empty, so nobody can open the admin panel.');
  if (!env.R2_BUCKET || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) out.push('Backups to Cloudflare R2 are not set up (DEPLOY.md, step 8).');
  return out;
}
