import Link from 'next/link';
import { Suspense } from 'react';
import { Badge } from '@/components/admin/product-table';
import { AdminHeader, Pager, tableClass } from '@/components/admin/ui';
import { inputClass } from '@/components/checkout/fields';
import { CUSTOMERS_PER_PAGE, listCustomers } from '@/lib/admin/customers';
import { adminOrNull } from '@/lib/admin/guard';
import { buildQuery } from '@/lib/catalog/filters';
import { formatDate } from '@/lib/dates';
import { formatPhone } from '@/lib/india';
import { formatINR } from '@/lib/money';

export const metadata = { title: 'Customers' };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Customers({ searchParams }: { searchParams: PageProps<'/admin/customers'>['searchParams'] }) {
  if (!(await adminOrNull())) return null;
  const sp = await searchParams;
  const q = (first(sp.q) ?? '').slice(0, 80);
  const page = Math.max(1, Number.parseInt(first(sp.page) ?? '1', 10) || 1);
  const { rows, total } = await listCustomers({ q, page });
  return (
    <>
      <form action="/admin/customers" className="mb-4 flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="customer-search">
          Search customers
        </label>
        <input id="customer-search" name="q" defaultValue={q} placeholder="Email, name or phone" className={`${inputClass()} max-w-sm flex-1`} />
        <button type="submit" className="btn btn-ghost btn-sm">
          Search
        </button>
      </form>
      {rows.length === 0 ? (
        <p className="rounded-card border border-dashed border-line-2 p-8 text-center text-muted">{q ? 'No customers match.' : 'Customers appear here after their first order.'}</p>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className={`${tableClass} min-w-[720px]`}>
            <thead>
              <tr>
                <th>Customer</th>
                <th className="text-right">Orders</th>
                <th className="text-right">Spent</th>
                <th>Last order</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.email}>
                  <td>
                    <span className="block font-semibold">
                      {c.name} {c.hasAccount && <Badge tone="lime">Account</Badge>}
                    </span>
                    <span className="block text-xs text-muted">
                      {c.email} · {formatPhone(c.phone)}
                    </span>
                  </td>
                  <td className="text-right tabular-nums">{c.orders}</td>
                  <td className="text-right font-semibold tabular-nums">{formatINR(c.spent)}</td>
                  <td className="text-[13px] text-muted">{formatDate(c.lastOrder)}</td>
                  <td className="text-right">
                    <Link href={`/admin/orders${buildQuery({ q: c.email })}`} className="text-sm font-semibold text-lime hover:underline">
                      Orders
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} perPage={CUSTOMERS_PER_PAGE} total={total} href={(p) => `/admin/customers${buildQuery({ q: q || undefined, page: p > 1 ? p : undefined })}`} />
    </>
  );
}

export default function AdminCustomersPage(props: PageProps<'/admin/customers'>) {
  return (
    <>
      <AdminHeader title="Customers" subtitle="Everyone who has ordered, grouped by email, with or without an account." />
      <Suspense fallback={<div className="h-96" aria-busy="true" />}>
        <Customers searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
