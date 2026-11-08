import type { MetadataRoute } from 'next';
import { PAGE_SLUGS } from '@/content/pages';
import { getSitemapProducts, getTypes, getVibes } from '@/lib/catalog/queries';
import { absoluteUrl } from '@/lib/seo';
import { siteUrl } from '@/lib/site';

/** Every page search engines should know about: shop pages, categories, vibes, products (with their photos) and info pages. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const url = (path: string) => absoluteUrl(base, path);
  const [types, vibes, products] = await Promise.all([getTypes(), getVibes(), getSitemapProducts()]);
  return [
    { url: url('/'), changeFrequency: 'daily', priority: 1 },
    { url: url('/shop'), changeFrequency: 'daily', priority: 0.8 },
    { url: url('/vibes'), changeFrequency: 'weekly', priority: 0.6 },
    { url: url('/build-your-pack'), changeFrequency: 'weekly', priority: 0.6 },
    ...['stickers', 'polaroids', 'posters'].map((k) => ({ url: url(`/custom/${k}`), changeFrequency: 'monthly' as const, priority: 0.7 })),
    ...types.map((t) => ({ url: url(`/c/${t.id}`), changeFrequency: 'daily' as const, priority: 0.8 })),
    ...vibes.map((v) => ({ url: url(`/v/${v.id}`), changeFrequency: 'daily' as const, priority: 0.7 })),
    ...products.map((p) => ({
      url: url(`/p/${p.slug}`),
      lastModified: new Date(p.createdAt * 1000),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
      ...(p.images.length ? { images: p.images.map((src) => url(src)) } : {}),
    })),
    ...PAGE_SLUGS.map((slug) => ({ url: url(`/pages/${slug}`), changeFrequency: 'monthly' as const, priority: 0.3 })),
  ];
}
