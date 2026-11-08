import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { JsonLd } from '@/components/json-ld';
import { ListingHeader, ListingResults, ResultsSkeleton } from '@/components/listing/listing';
import { getVibes } from '@/lib/catalog/queries';
import { breadcrumbList } from '@/lib/seo';
import { siteUrl } from '@/lib/site';

export async function generateStaticParams() {
  const vibes = await getVibes();
  return vibes.length ? vibes.map((v) => ({ vibe: v.id })) : [{ vibe: 'coming-soon' }];
}

export async function generateMetadata({ params }: PageProps<'/v/[vibe]'>): Promise<Metadata> {
  const { vibe } = await params;
  const v = (await getVibes()).find((x) => x.id === vibe);
  if (!v) return { title: 'Not found' };
  return {
    title: `${v.name} stickers and posters`,
    description: v.blurb,
    alternates: { canonical: `/v/${v.id}` },
    openGraph: { title: `${v.name} stickers and posters | PrintYourVibe`, description: v.blurb, url: `/v/${v.id}` },
  };
}

/** The title block and breadcrumbs, read inside <Suspense> like the category page (see /c/[type]). */
async function VibeHeader({ params }: Pick<PageProps<'/v/[vibe]'>, 'params'>) {
  const { vibe } = await params;
  const v = (await getVibes()).find((x) => x.id === vibe);
  if (!v) notFound();
  return (
    <>
      <JsonLd
        data={breadcrumbList(siteUrl(), [
          { name: 'Home', path: '/' },
          { name: 'Fandoms', path: '/vibes' },
          { name: v.name, path: `/v/${v.id}` },
        ])}
      />
      <ListingHeader title={v.name} kicker="Fandom" description={v.blurb} />
    </>
  );
}

/** Filters and products, which depend on the query (filters, sort, page), so they render per request. */
async function VibeResults({ params, searchParams }: PageProps<'/v/[vibe]'>) {
  const [{ vibe }, sp] = await Promise.all([params, searchParams]);
  const v = (await getVibes()).find((x) => x.id === vibe);
  if (!v) notFound();
  return <ListingResults basePath={`/v/${v.id}`} searchParams={sp} fixed={{ vibes: [v.id] }} showVibes={false} />;
}

export default function VibePage(props: PageProps<'/v/[vibe]'>) {
  return (
    <div className="wrap py-8 md:py-10">
      <Suspense fallback={<ListingHeader title="Loading" />}>
        <VibeHeader params={props.params} />
      </Suspense>
      <Suspense fallback={<ResultsSkeleton />}>
        <VibeResults {...props} />
      </Suspense>
    </div>
  );
}
