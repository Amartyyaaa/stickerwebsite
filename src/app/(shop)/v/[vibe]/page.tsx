import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Listing, ListingSkeleton } from '@/components/listing/listing';
import { getVibes } from '@/lib/catalog/queries';

export async function generateStaticParams() {
  const vibes = await getVibes();
  return vibes.length ? vibes.map((v) => ({ vibe: v.id })) : [{ vibe: 'coming-soon' }];
}

export async function generateMetadata({ params }: PageProps<'/v/[vibe]'>): Promise<Metadata> {
  const { vibe } = await params;
  const v = (await getVibes()).find((x) => x.id === vibe);
  if (!v) return { title: 'Not found' };
  return { title: `${v.name} stickers and posters`, description: v.blurb };
}

async function VibeListing({ params, searchParams }: PageProps<'/v/[vibe]'>) {
  const [{ vibe }, sp] = await Promise.all([params, searchParams]);
  const v = (await getVibes()).find((x) => x.id === vibe);
  if (!v) notFound();
  return <Listing title={v.name} kicker="Fandom" description={v.blurb} basePath={`/v/${v.id}`} searchParams={sp} fixed={{ vibes: [v.id] }} showVibes={false} />;
}

export default function VibePage(props: PageProps<'/v/[vibe]'>) {
  return (
    <Suspense fallback={<ListingSkeleton title="Loading" />}>
      <VibeListing {...props} />
    </Suspense>
  );
}
