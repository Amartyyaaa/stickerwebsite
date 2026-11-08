import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Listing, ListingSkeleton } from '@/components/listing/listing';

export const metadata: Metadata = { title: 'Search', robots: { index: false } };

const SUGGESTED = ['f1 posters', 'anime stickers', 'polaroids', 'desi', 'space', 'coding'];

async function SearchResults({ searchParams }: { searchParams: PageProps<'/search'>['searchParams'] }) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim() ?? '';
  if (!q) {
    return (
      <div className="wrap py-10">
        <h1 className="display text-[clamp(40px,6vw,72px)]">Search</h1>
        <p className="mt-3 text-muted">Type in the search box above, or try one of these:</p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          {SUGGESTED.map((s) => (
            <Link key={s} href={`/search?q=${encodeURIComponent(s)}`} className="chip">
              {s}
            </Link>
          ))}
        </div>
      </div>
    );
  }
  return (
    <Listing
      title={`“${q}”`}
      kicker="Search results"
      basePath="/search"
      searchParams={sp}
      empty={
        <>
          Try a broader word like <Link href="/search?q=anime" className="text-lime underline">anime</Link> or{' '}
          <Link href="/search?q=poster" className="text-lime underline">poster</Link>, or browse <Link href="/vibes" className="text-lime underline">all vibes</Link>.
        </>
      }
    />
  );
}

export default function SearchPage(props: PageProps<'/search'>) {
  return (
    <Suspense fallback={<ListingSkeleton title="Searching" />}>
      <SearchResults searchParams={props.searchParams} />
    </Suspense>
  );
}
