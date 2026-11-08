/** The store's public address, without a trailing slash. Used in emails and links that leave the site. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

/** True on a development or test copy (http://localhost or 127.0.0.1), never on the live site. */
export const isLocalSite = () => /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(siteUrl());

/** Emails listed in ADMIN_EMAILS (comma-separated) can open the admin panel. */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
