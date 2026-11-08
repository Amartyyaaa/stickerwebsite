import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { PackBuilder } from '@/components/pack/pack-builder';
import { buildQuery } from '@/lib/catalog/filters';
import { getSettings, getTypes, getVibes, listProducts } from '@/lib/catalog/queries';
import { formatINR } from '@/lib/money';

export async function generateMetadata(): Promise<Metadata> {
  const { packs } = await getSettings();
  const tiers = [...packs.tiers].sort((a, b) => a.qty - b.qty);
  return {
    title: 'Build your own sticker pack',
    description: `Mix any laptop and mini stickers into a pack: ${tiers.map((t) => `${t.qty} for ${formatINR(t.price)}`).join(', ')}. The pack price applies in your cart automatically.`,
  };
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4" aria-busy="true">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="aspect-[3/4] rounded-card border border-line bg-surface" />
      ))}
    </div>
  );
}

/** Reads the URL (vibe, sort, page) inside Suspense, so the page header stays static. */
async function PackGrid({ searchParams }: { searchParams: PageProps<'/build-your-pack'>['searchParams'] }) {
  const sp = await searchParams;
  const [settings, types, vibes] = await Promise.all([getSettings(), getTypes(), getVibes()]);
  const vibeId = first(sp.vibe);
  const vibe = vibes.find((v) => v.id === vibeId);
  const sort = first(sp.sort) === 'new' ? 'new' : 'popular';
  const page = Math.max(1, Number.parseInt(first(sp.page) ?? '1', 10) || 1);
  const result = await listProducts({ types: settings.packs.types, vibes: vibe ? [vibe.id] : undefined, sort, page });
  const packTypes = types.filter((t) => settings.packs.types.includes(t.id)).map(({ id, name, options, price }) => ({ id, name, options, price }));
  const href = (p: { vibe?: string; sort?: string; page?: number }) =>
    `/build-your-pack${buildQuery({ vibe: p.vibe, sort: p.sort === 'new' ? 'new' : undefined, page: p.page && p.page > 1 ? p.page : undefined })}`;
  const chips = vibes.filter((v) => v.featured || v.id === vibe?.id);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Filter by vibe" className="scrollbar-none -mx-4 flex min-w-0 flex-1 gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
          <Link href={href({ sort })} className="chip" aria-current={!vibe ? 'page' : undefined} scroll={false}>
            All
          </Link>
          {chips.map((v) => (
            <Link key={v.id} href={href({ vibe: v.id, sort })} className="chip" aria-current={vibe?.id === v.id ? 'page' : undefined} scroll={false}>
              {v.name}
            </Link>
          ))}
        </nav>
        <div className="flex gap-2" role="group" aria-label="Sort">
          <Link href={href({ vibe: vibe?.id })} className="chip" aria-current={sort === 'popular' ? 'page' : undefined} scroll={false}>
            Popular
          </Link>
          <Link href={href({ vibe: vibe?.id, sort: 'new' })} className="chip" aria-current={sort === 'new' ? 'page' : undefined} scroll={false}>
            Newest
          </Link>
        </div>
      </div>
      <PackBuilder products={result.items} types={packTypes} settings={settings} />
      <div className="mt-8 grid justify-items-center gap-3">
        <p className="text-sm text-muted">
          {result.total === 0
            ? vibe
              ? `No ${vibe.name} stickers in packs yet. Try another vibe.`
              : 'No stickers in packs yet. New designs are on the way.'
            : `Showing ${result.items.length.toLocaleString('en-IN')} of ${result.total.toLocaleString('en-IN')} stickers`}
        </p>
        {result.items.length < result.total && result.items.length < result.perPage * 20 && (
          <Link href={href({ vibe: vibe?.id, sort, page: result.page + 1 })} scroll={false} className="btn btn-ghost">
            Load more
          </Link>
        )}
      </div>
    </>
  );
}

export default async function PackPage({ searchParams }: PageProps<'/build-your-pack'>) {
  const { packs } = await getSettings();
  const tiers = [...packs.tiers].sort((a, b) => a.qty - b.qty);
  return (
    <div className="wrap py-8 md:py-10">
      <header className="mb-7 grid gap-6 border-b border-line pb-7 lg:grid-cols-[1.2fr_1fr] lg:items-end">
        <div>
          <p className="eyebrow">Sticker packs</p>
          <h1 className="display mt-2 text-[clamp(38px,5.4vw,66px)]">Build your own pack</h1>
          <p className="mt-3 max-w-xl text-[16px] text-muted">
            Mix any laptop and mini stickers in matte or glossy. The pack price is applied in your cart automatically, and the most expensive stickers go into the pack first.
          </p>
        </div>
        <ul className="flex flex-wrap gap-2.5 lg:justify-end">
          {tiers.map((t) => (
            <li key={t.qty} className="grid min-w-28 rounded-[4px] border border-lime bg-bg px-4 py-2.5">
              <b className="font-display text-3xl leading-none">{t.qty}</b>
              <span className="text-xs font-bold text-muted">stickers</span>
              <em className="mt-1 font-bold not-italic text-lime tabular-nums">{formatINR(t.price)}</em>
              <span className="text-[11.5px] text-muted tabular-nums">{formatINR(Math.round(t.price / t.qty))} each</span>
            </li>
          ))}
        </ul>
      </header>
      {packs.enabled && tiers.length > 0 ? (
        <Suspense fallback={<GridSkeleton />}>
          <PackGrid searchParams={searchParams} />
        </Suspense>
      ) : (
        <p className="text-muted">Sticker packs are paused right now. You can still buy any sticker on its own.</p>
      )}
    </div>
  );
}
