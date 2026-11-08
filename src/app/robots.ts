import type { MetadataRoute } from 'next';
import { robotsRules } from '@/lib/seo';
import { siteUrl } from '@/lib/site';

/** robots.txt: private pages stay out of search. A store on a local address blocks everything. */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  const { allow, disallow } = robotsRules(base);
  return { rules: [{ userAgent: '*', ...(allow.length ? { allow } : {}), disallow }], ...(allow.length ? { sitemap: `${base}/sitemap.xml` } : {}) };
}
