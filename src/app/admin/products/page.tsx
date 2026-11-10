import Link from 'next/link';
import { Suspense } from 'react';
import { DeleteDemoButton, ProductTable } from '@/components/admin/product-table';
import { AdminHeader, Pager, Panel } from '@/components/admin/ui';
import { inputClass, selectClass } from '@/components/checkout/fields';
import { adminOrNull } from '@/lib/admin/guard';
import { adminTypes, adminVibes, listAdminProducts, PRODUCT_SORTS, PRODUCTS_PER_PAGE, productCounts, type AdminProductFilters, type ProductSort } from '@/lib/admin/products';
import { buildQuery } from '@/lib/catalog/filters';

export const metadata = { title: 'Products' };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const SORT_LABEL: Record<ProductSort, string> = { new: 'Newest', popular: 'Popular', name: 'Name', price: 'Price' };

async function Products({ searchParams }: { searchParams: PageProps<'/admin/products'>['searchParams'] }) {
  if (!(await adminOrNull())) return null;
  const sp = await searchParams;
  const [types, vibes, counts] = await Promise.all([adminTypes(), adminVibes(), productCounts()]);
  const pick = <T extends string>(v: string | undefined, allowed: readonly T[]) => (allowed.includes(v as T) ? (v as T) : undefined);
  const f: AdminProductFilters = {
    q: (first(sp.q) ?? '').slice(0, 80) || undefined,
    type: pick(first(sp.type), types.map((t) => t.id)),
    vibe: pick(first(sp.vibe), vibes.map((v) => v.id)),
    status: pick(first(sp.status), ['shown', 'hidden'] as const),
    source: pick(first(sp.source), ['demo', 'real'] as const),
    sort: pick(first(sp.sort), PRODUCT_SORTS),
    page: Math.max(1, Number.parseInt(first(sp.page) ?? '1', 10) || 1),
  };
  const { rows, total } = await listAdminProducts(f);
  const href = (page: number) => `/admin/products${buildQuery({ q: f.q, type: f.type, vibe: f.vibe, status: f.status, source: f.source, sort: f.sort, page: page > 1 ? page : undefined })}`;
  const select = `${selectClass()} min-w-0 flex-1 sm:flex-none`;
  return (
    <>
      <p className="-mt-3 mb-5 text-sm text-muted">
        {counts.total.toLocaleString('en-IN')} products · {counts.shown.toLocaleString('en-IN')} shown in the store
        {counts.demo > 0 && ` · ${counts.demo.toLocaleString('en-IN')} demo`}
      </p>
      <form action="/admin/products" className="mb-4 flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="product-search">
          Search products
        </label>
        <input id="product-search" name="q" defaultValue={f.q} placeholder="Name, web address or id" className={`${inputClass()} min-w-[200px] max-w-sm flex-1`} />
        <select name="type" defaultValue={f.type ?? ''} aria-label="Type" className={select}>
          <option value="">All types</option>
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select name="vibe" defaultValue={f.vibe ?? ''} aria-label="Vibe" className={select}>
          <option value="">All vibes</option>
          {vibes.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={f.status ?? ''} aria-label="Shown or hidden" className={select}>
          <option value="">Shown and hidden</option>
          <option value="shown">Shown</option>
          <option value="hidden">Hidden</option>
        </select>
        <select name="source" defaultValue={f.source ?? ''} aria-label="Demo or yours" className={select}>
          <option value="">Demo and yours</option>
          <option value="real">Yours</option>
          <option value="demo">Demo</option>
        </select>
        <select name="sort" defaultValue={f.sort ?? 'new'} aria-label="Sort" className={select}>
          {PRODUCT_SORTS.map((s) => (
            <option key={s} value={s}>
              Sort: {SORT_LABEL[s]}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-ghost btn-sm">
          Apply
        </button>
        {(f.q || f.type || f.vibe || f.status || f.source || f.sort) && (
          <Link href="/admin/products" className="btn btn-sm text-muted hover:text-ink">
            Reset
          </Link>
        )}
      </form>
      <ProductTable rows={rows} vibes={vibes.map((v) => ({ id: v.id, name: v.name }))} />
      <Pager page={f.page} perPage={PRODUCTS_PER_PAGE} total={total} href={href} />
      {counts.demo > 0 && (
        <Panel title="Demo products" className="mt-8">
          <p className="mb-3 max-w-[70ch] text-sm text-muted">
            The store came with {counts.demo.toLocaleString('en-IN')} demo products with generated artwork, so you could see it working. When your own products are in, remove the demo ones in one go. Any demo product you edited counts as yours and stays.
          </p>
          <DeleteDemoButton count={counts.demo} />
        </Panel>
      )}
    </>
  );
}

export default function AdminProductsPage(props: PageProps<'/admin/products'>) {
  return (
    <>
      <AdminHeader
        title="Products"
        actions={
          <>
            <Link href="/admin/products/import" className="btn btn-ghost btn-sm">
              Import or export CSV
            </Link>
            <Link href="/admin/products/bulk" className="btn btn-ghost btn-sm">
              Add from photos
            </Link>
            <Link href="/admin/products/new" className="btn btn-primary btn-sm">
              Add product
            </Link>
          </>
        }
      />
      <Suspense fallback={<div className="h-96" aria-busy="true" />}>
        <Products searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
