import { Suspense } from 'react';
import { OrderTable } from '@/components/admin/order-table';
import { AdminHeader, Pager, Tabs } from '@/components/admin/ui';
import { inputClass, selectClass } from '@/components/checkout/fields';
import { buildQuery } from '@/lib/catalog/filters';
import { adminOrNull } from '@/lib/admin/guard';
import { listOrders, ORDER_TABS, PER_PAGE, TAB_LABEL, tabCounts, type OrderTab } from '@/lib/admin/orders';

export const metadata = { title: 'Orders' };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Orders({ searchParams }: { searchParams: PageProps<'/admin/orders'>['searchParams'] }) {
  if (!(await adminOrNull())) return null;
  const sp = await searchParams;
  const tab = (ORDER_TABS as readonly string[]).includes(first(sp.tab) ?? '') ? (first(sp.tab) as OrderTab) : 'all';
  const payment = first(sp.payment) === 'cod' ? 'cod' : first(sp.payment) === 'online' ? 'online' : undefined;
  const q = (first(sp.q) ?? '').slice(0, 80);
  const page = Math.max(1, Number.parseInt(first(sp.page) ?? '1', 10) || 1);
  const [{ rows, total }, counts] = await Promise.all([listOrders({ tab, payment, q, page }), tabCounts()]);
  const href = (p: { tab?: OrderTab; page?: number }) => `/admin/orders${buildQuery({ tab: (p.tab ?? tab) === 'all' ? undefined : (p.tab ?? tab), payment, q: q || undefined, page: p.page && p.page > 1 ? p.page : undefined })}`;
  return (
    <>
      <form action="/admin/orders" className="mb-4 flex flex-wrap gap-2">
        {tab !== 'all' && <input type="hidden" name="tab" value={tab} />}
        <label className="sr-only" htmlFor="order-search">
          Search orders
        </label>
        <input id="order-search" name="q" defaultValue={q} placeholder="Order number, email, phone or name" className={`${inputClass()} max-w-sm flex-1`} />
        <select name="payment" defaultValue={payment ?? ''} aria-label="Payment method" className={selectClass()}>
          <option value="">All payments</option>
          <option value="online">Paid online</option>
          <option value="cod">Cash on Delivery</option>
        </select>
        <button type="submit" className="btn btn-ghost btn-sm">
          Search
        </button>
      </form>
      <Tabs items={ORDER_TABS.map((t) => ({ href: href({ tab: t }), label: TAB_LABEL[t], count: counts[t], active: t === tab }))} />
      <OrderTable rows={rows} />
      <Pager page={page} perPage={PER_PAGE} total={total} href={(p) => href({ page: p })} />
    </>
  );
}

export default function AdminOrdersPage(props: PageProps<'/admin/orders'>) {
  return (
    <>
      <AdminHeader title="Orders" subtitle="Confirm COD orders, print, ship and refund." />
      <Suspense fallback={<div className="h-96" aria-busy="true" />}>
        <Orders searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
