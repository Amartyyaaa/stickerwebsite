import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Listing, ListingSkeleton } from '@/components/listing/listing';
import { getTypes } from '@/lib/catalog/queries';

export async function generateStaticParams() {
  const types = await getTypes();
  return types.length ? types.map((t) => ({ type: t.id })) : [{ type: 'coming-soon' }];
}

export async function generateMetadata({ params }: PageProps<'/c/[type]'>): Promise<Metadata> {
  const { type } = await params;
  const t = (await getTypes()).find((x) => x.id === type);
  if (!t) return { title: 'Not found' };
  return { title: t.name, description: t.description };
}

async function TypeListing({ params, searchParams }: PageProps<'/c/[type]'>) {
  const [{ type }, sp] = await Promise.all([params, searchParams]);
  const t = (await getTypes()).find((x) => x.id === type);
  if (!t) notFound();
  return <Listing title={t.name} kicker={t.singular} description={t.description} basePath={`/c/${t.id}`} searchParams={sp} fixed={{ types: [t.id] }} showTypes={false} />;
}

export default function TypePage(props: PageProps<'/c/[type]'>) {
  return (
    <Suspense fallback={<ListingSkeleton title="Loading" />}>
      <TypeListing {...props} />
    </Suspense>
  );
}
