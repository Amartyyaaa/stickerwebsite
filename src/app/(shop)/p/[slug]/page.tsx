import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ProductExperience } from '@/components/pdp/product-experience';
import { RecentlyViewed } from '@/components/pdp/recently-viewed';
import { ProductGrid } from '@/components/product/product-card';
import { SectionHead } from '@/components/section-head';
import { getPopularSlugs, getProduct, getRelated, getSettings } from '@/lib/catalog/queries';
import { GROUPS } from '@/lib/catalog/types';
import { priceRange } from '@/lib/pricing/engine';
import { siteUrl } from '@/lib/site';

/** Every page here is built from cached data, so it is served as a complete static page and unknown URLs get a real 404. */
export const ensureStatic = 'navigation';

/** The most popular products are prerendered at build time; the rest render on first visit and are cached. */
export async function generateStaticParams() {
  const slugs = await getPopularSlugs(24);
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<'/p/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return { title: 'Product not found' };
  return { title: `${p.name} ${p.typeName}`, description: p.description, alternates: { canonical: `/p/${p.slug}` } };
}

async function ProductContent({ params }: { params: PageProps<'/p/[slug]'>['params'] }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  const [settings, related] = await Promise.all([getSettings(), getRelated(product.id, product.vibeId)]);
  const group = GROUPS.find((g) => g.id === product.groupId);
  const range = priceRange(product.price, product.options);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${product.name} ${product.typeName}`,
    description: product.description,
    category: product.typeSlugName,
    ...(product.images.length ? { image: product.images.map((src) => new URL(src, siteUrl()).toString()) } : {}),
    brand: { '@type': 'Brand', name: 'PrintYourVibe' },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'INR',
      lowPrice: (range.min / 100).toFixed(2),
      highPrice: (range.max / 100).toFixed(2),
      availability: 'https://schema.org/InStock',
    },
  };

  return (
    <div className="wrap py-6 md:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <nav aria-label="Breadcrumb" className="mb-5 text-[13px] text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-lime">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          {group && (
            <>
              <li>
                <Link href={`/shop?group=${group.id}`} className="hover:text-lime">
                  {group.name}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
            </>
          )}
          <li>
            <Link href={`/c/${product.typeId}`} className="hover:text-lime">
              {product.typeSlugName}
            </Link>
          </li>
        </ol>
      </nav>

      <ProductExperience product={product} delivery={settings.delivery} packs={settings.packs} />

      <section className="mt-14 grid gap-8 border-t border-line pt-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-12" aria-labelledby="about-title">
        <div>
          <h2 id="about-title" className="section-title">
            About this design
          </h2>
          <p className="mt-4 max-w-[62ch] text-[16px] leading-relaxed text-[#d4d4e0]">{product.description}</p>
        </div>
        <dl className="grid content-start gap-3 text-[15px]">
          <div className="flex justify-between gap-4 border-b border-line pb-3">
            <dt className="text-muted">Product</dt>
            <dd>{product.typeName}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-line pb-3">
            <dt className="text-muted">Vibes</dt>
            <dd className="text-right">{product.vibes.map((v) => v.name).join(', ')}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-line pb-3">
            <dt className="text-muted">Ships in</dt>
            <dd>{settings.delivery.standardDays[0]} to {settings.delivery.standardDays[1]} days across India</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Payment</dt>
            <dd>UPI, cards, netbanking or Cash on Delivery</dd>
          </div>
        </dl>
      </section>

      {related.length > 0 && (
        <section className="pt-14" aria-labelledby="related-title">
          <SectionHead id="related-title" title={`More ${product.vibeName}`} href={product.vibeShown ? `/v/${product.vibeId}` : undefined} />
          <ProductGrid products={related} idPrefix="rel" />
        </section>
      )}
      <RecentlyViewed exclude={product.id} />
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="wrap py-6 md:py-10" aria-busy="true">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-12">
        <div className="aspect-square animate-pulse rounded-card border border-line bg-surface" />
        <div className="grid content-start gap-4">
          <div className="h-4 w-32 animate-pulse rounded bg-surface-2" />
          <div className="h-14 w-3/4 animate-pulse rounded bg-surface-2" />
          <div className="h-10 w-40 animate-pulse rounded bg-surface-2" />
        </div>
      </div>
    </div>
  );
}

export default function ProductPage(props: PageProps<'/p/[slug]'>) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductContent params={props.params} />
    </Suspense>
  );
}
