import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Listing, ListingSkeleton } from '@/components/listing/listing';
import { GROUPS } from '@/lib/catalog/types';

export const metadata: Metadata = {
  title: 'Shop all designs',
  description: 'Browse thousands of stickers, posters, polaroids and more. Filter by product, fandom and price.',
  // Filters, sort and page numbers make variations of one page; search engines should treat them as /shop.
  alternates: { canonical: '/shop' },
};

async function ShopListing({ searchParams }: { searchParams: PageProps<'/shop'>['searchParams'] }) {
  const sp = await searchParams;
  const group = GROUPS.find((g) => g.id === sp.group);
  return (
    <Listing
      title={group ? group.name : 'All designs'}
      kicker="Shop"
      description={group ? group.blurb : 'Stickers, posters, polaroids and more for every fandom and mood.'}
      basePath="/shop"
      searchParams={sp}
    />
  );
}

export default function ShopPage(props: PageProps<'/shop'>) {
  return (
    <Suspense fallback={<ListingSkeleton title="All designs" />}>
      <ShopListing searchParams={props.searchParams} />
    </Suspense>
  );
}
