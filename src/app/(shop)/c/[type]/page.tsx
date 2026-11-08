import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { JsonLd } from '@/components/json-ld';
import { ListingHeader, ListingResults, ResultsSkeleton } from '@/components/listing/listing';
import { getTypes } from '@/lib/catalog/queries';
import { breadcrumbList } from '@/lib/seo';
import { siteUrl } from '@/lib/site';

export async function generateStaticParams() {
  const types = await getTypes();
  return types.length ? types.map((t) => ({ type: t.id })) : [{ type: 'coming-soon' }];
}

export async function generateMetadata({ params }: PageProps<'/c/[type]'>): Promise<Metadata> {
  const { type } = await params;
  const t = (await getTypes()).find((x) => x.id === type);
  if (!t) return { title: 'Not found' };
  return { title: t.name, description: t.description, alternates: { canonical: `/c/${t.id}` }, openGraph: { title: `${t.name} | PrintYourVibe`, description: t.description, url: `/c/${t.id}` } };
}

/**
 * The title block and breadcrumbs. They only depend on the type, so each type's prebuilt page includes them.
 * The type is read inside <Suspense>, as Next.js requires with Partial Prefetching: the route's shared shell
 * (used for every type, and rebuilt when the catalog changes) can't depend on it.
 */
async function TypeHeader({ params }: Pick<PageProps<'/c/[type]'>, 'params'>) {
  const { type } = await params;
  const t = (await getTypes()).find((x) => x.id === type);
  if (!t) notFound();
  return (
    <>
      <JsonLd data={breadcrumbList(siteUrl(), [{ name: 'Home', path: '/' }, { name: t.name, path: `/c/${t.id}` }])} />
      <ListingHeader title={t.name} kicker={t.singular} description={t.description} />
    </>
  );
}

/** Filters and products, which depend on the query (filters, sort, page), so they render per request. */
async function TypeResults({ params, searchParams }: PageProps<'/c/[type]'>) {
  const [{ type }, sp] = await Promise.all([params, searchParams]);
  const t = (await getTypes()).find((x) => x.id === type);
  if (!t) notFound();
  return <ListingResults basePath={`/c/${t.id}`} searchParams={sp} fixed={{ types: [t.id] }} showTypes={false} />;
}

export default function TypePage(props: PageProps<'/c/[type]'>) {
  return (
    <div className="wrap py-8 md:py-10">
      <Suspense fallback={<ListingHeader title="Loading" />}>
        <TypeHeader params={props.params} />
      </Suspense>
      <Suspense fallback={<ResultsSkeleton />}>
        <TypeResults {...props} />
      </Suspense>
    </div>
  );
}
