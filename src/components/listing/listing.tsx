import Link from 'next/link';
import { CloseIcon } from '@/components/icons';
import { ProductGrid } from '@/components/product/product-card';
import { buildQuery, parseFilters, PRICE_BANDS, type SearchParams } from '@/lib/catalog/filters';
import { getCounts, getTypes, getVibes, listProducts } from '@/lib/catalog/queries';
import { GROUPS, type GroupId, type ListingFilters } from '@/lib/catalog/types';
import { FilterPanel, MobileFilters, SortSelect, type FilterState } from './filter-controls';

interface HeaderProps {
  title: string;
  kicker?: string;
  description?: string;
}

interface ResultsProps {
  basePath: string;
  searchParams: SearchParams;
  /** Filters fixed by the page itself, like the product type on /c/[type]. */
  fixed?: Partial<ListingFilters>;
  showTypes?: boolean;
  showVibes?: boolean;
  empty?: React.ReactNode;
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** A listing page's title block. Category and vibe pages render it apart from the results, so it's part of the prebuilt page. */
export function ListingHeader({ title, kicker, description }: HeaderProps) {
  return (
    <header className="mb-6 border-b border-line pb-6">
      {kicker && <p className="eyebrow">{kicker}</p>}
      <h1 className="display mt-2 text-[clamp(40px,6vw,72px)]">{title}</h1>
      {description && <p className="mt-3 max-w-2xl text-[16px] text-muted">{description}</p>}
    </header>
  );
}

/** A whole listing page: title, filters and results. */
export function Listing({ title, kicker, description, ...results }: HeaderProps & ResultsProps) {
  return (
    <div className="wrap py-8 md:py-10">
      <ListingHeader title={title} kicker={kicker} description={description} />
      <ListingResults {...results} />
    </div>
  );
}

/** Filters, sort and the product grid. They depend on the address's query (filters, sort, page), so they render per request. */
export async function ListingResults({ basePath, searchParams, fixed, showTypes = true, showVibes = true, empty }: ResultsProps) {
  const [types, vibes, counts] = await Promise.all([getTypes(), getVibes(), getCounts()]);
  const groupId = first(searchParams.group);
  const group = GROUPS.find((g) => g.id === groupId);
  const f = parseFilters(searchParams, fixed);
  const groupTypes = group ? types.filter((t) => t.groupId === (group.id as GroupId)).map((t) => t.id) : undefined;
  const result = await listProducts({ types: f.types ?? groupTypes, vibes: f.vibes, q: f.q, min: f.min, max: f.max, sort: f.sort, page: f.page });

  const state: FilterState = {
    type: fixed?.types ? [] : (f.types ?? []),
    vibe: fixed?.vibes ? [] : (f.vibes ?? []),
    price: f.price,
    sort: f.sort,
    q: fixed?.q ? undefined : f.q,
    group: group?.id,
  };
  const typeOptions = showTypes
    ? types.filter((t) => !group || t.groupId === group.id).map((t) => ({ id: t.id, name: t.name, count: counts.types[t.id], groupId: t.groupId }))
    : undefined;
  const vibeOptions = showVibes ? vibes.map((v) => ({ id: v.id, name: v.name, count: counts.vibes[v.id] })) : undefined;

  const href = (next: Partial<FilterState> & { page?: number }) => {
    const m = { ...state, ...next };
    return `${basePath}${buildQuery({ q: m.q, group: m.group, type: m.type.join(','), vibe: m.vibe.join(','), price: m.price, sort: m.sort, page: next.page })}`;
  };
  const chips = [
    ...state.type.map((id) => ({ label: types.find((t) => t.id === id)?.name ?? id, href: href({ type: state.type.filter((x) => x !== id) }) })),
    ...state.vibe.map((id) => ({ label: vibes.find((v) => v.id === id)?.name ?? id, href: href({ vibe: state.vibe.filter((x) => x !== id) }) })),
    ...(state.price ? [{ label: PRICE_BANDS.find((b) => b.id === state.price)?.label ?? state.price, href: href({ price: undefined }) }] : []),
    ...(group && !fixed?.types ? [{ label: group.name, href: href({ group: undefined }) }] : []),
  ];
  const shown = result.items.length;

  return (
    <div className="lg:grid lg:grid-cols-[230px_1fr] lg:gap-10">
      <aside className="hidden lg:block" aria-label="Filters">
        <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto pb-6 pr-2">
          <FilterPanel basePath={basePath} state={state} typeOptions={typeOptions} vibeOptions={vibeOptions} />
        </div>
      </aside>
      <div className="min-w-0">
        <h2 className="sr-only">Designs</h2>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted" aria-live="polite">
            <b className="text-ink tabular-nums">{result.total.toLocaleString('en-IN')}</b> design{result.total === 1 ? '' : 's'}
          </p>
          <div className="flex items-center gap-2">
            <MobileFilters basePath={basePath} state={state} typeOptions={typeOptions} vibeOptions={vibeOptions} />
            <SortSelect basePath={basePath} state={state} />
          </div>
        </div>
        {chips.length > 0 && (
          <ul className="mb-5 flex flex-wrap gap-2" aria-label="Active filters">
            {chips.map((c) => (
              <li key={c.label}>
                <Link href={c.href} scroll={false} className="chip is-on" aria-label={`Remove filter ${c.label}`}>
                  {c.label}
                  <CloseIcon size={14} />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {shown === 0 ? (
          <div className="rounded-card border border-dashed border-line-2 px-6 py-16 text-center">
            <p className="font-display text-3xl uppercase">Nothing here yet</p>
            <div className="mt-2 text-muted">
              {empty ??
                (chips.length > 0 ? (
                  'Try removing a filter, or search for something else.'
                ) : (
                  <>
                    New designs are on the way. Meanwhile, make your own in the{' '}
                    <Link href="/custom/stickers" className="font-semibold text-lime underline underline-offset-2">
                      custom studio
                    </Link>
                    .
                  </>
                ))}
            </div>
          </div>
        ) : (
          <ProductGrid products={result.items} />
        )}
        {shown > 0 && (
          <div className="mt-8 grid justify-items-center gap-3">
            <p className="text-sm text-muted">
              Showing {shown.toLocaleString('en-IN')} of {result.total.toLocaleString('en-IN')}
            </p>
            {shown < result.total && shown < result.perPage * 20 && (
              <Link href={href({ page: result.page + 1 })} scroll={false} className="btn btn-ghost">
                Load more
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ListingSkeleton({ title }: { title: string }) {
  return (
    <div className="wrap py-8 md:py-10">
      <header className="mb-6 border-b border-line pb-6">
        <h1 className="display mt-2 text-[clamp(40px,6vw,72px)]">{title}</h1>
      </header>
      <ResultsSkeleton />
    </div>
  );
}

/** Placeholder cards in the shape of the results, shown while they load. */
export function ResultsSkeleton() {
  return (
    <div className="lg:grid lg:grid-cols-[230px_1fr] lg:gap-10" aria-busy="true">
      <div className="hidden lg:block" />
      <div className="min-w-0">
        <div className="mb-4 h-10" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="aspect-[0.78] animate-pulse rounded-card border border-line bg-surface" />
          ))}
        </div>
      </div>
    </div>
  );
}
