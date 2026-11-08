/**
 * Search-engine helpers: absolute addresses, structured data (JSON-LD) and
 * the robots rules. Pure, so they're unit-tested.
 */
import type { StoreSettings } from '@/lib/settings';

/** A full address on the store for a path, like https://printyourvibe.in/p/neon-koi. */
export const absoluteUrl = (base: string, path: string) => new URL(path, `${base}/`).toString();

export const isLocalAddress = (base: string) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(base);

/** Pages that are private or useless in search results. Product photos under /api/uploads/ stay crawlable. */
export function robotsRules(base: string): { allow: string[]; disallow: string[] } {
  if (isLocalAddress(base)) return { allow: [], disallow: ['/'] };
  return {
    allow: ['/', '/api/uploads/'],
    disallow: ['/admin', '/api/', '/cart', '/checkout', '/account', '/order/', '/track', '/wishlist', '/search'],
  };
}

export function breadcrumbList(base: string, items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: absoluteUrl(base, it.path) })),
  };
}

/** Who runs the store, and how to search it, for the home page. */
export function storeLd(base: string, s: Pick<StoreSettings, 'business' | 'contact' | 'social'>) {
  const sameAs = Object.values(s.social).filter(Boolean);
  const phone = s.contact.phone || s.contact.whatsapp;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: s.business.name || 'PrintYourVibe',
      url: absoluteUrl(base, '/'),
      logo: absoluteUrl(base, '/icon-512.png'),
      ...(sameAs.length ? { sameAs } : {}),
      ...(s.contact.email || phone
        ? { contactPoint: { '@type': 'ContactPoint', contactType: 'customer service', areaServed: 'IN', ...(s.contact.email ? { email: s.contact.email } : {}), ...(phone ? { telephone: phone.replace(/\s+/g, '') } : {}) } }
        : {}),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'PrintYourVibe',
      url: absoluteUrl(base, '/'),
      potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${absoluteUrl(base, '/search')}?q={search_term_string}` }, 'query-input': 'required name=search_term_string' },
    },
  ];
}

/** JSON for a <script type="application/ld+json">, safe to put in HTML. */
export const ldJson = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');
