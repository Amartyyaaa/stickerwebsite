import Link from 'next/link';
import { Suspense } from 'react';
import { GoLivePanel } from '@/components/admin/go-live';
import { DownloadIcon } from '@/components/icons';
import { OrderTable } from '@/components/admin/order-table';
import { AdminHeader, Panel, StatTile } from '@/components/admin/ui';
import { adminOrNull } from '@/lib/admin/guard';
import { goLiveStatus } from '@/lib/admin/go-live-status';
import { dashboard } from '@/lib/admin/orders';
import { databaseFile } from '@/lib/db/url';
import { formatINR } from '@/lib/money';

export const metadata = { title: 'Dashboard' };

async function Dashboard() {
  if (!(await adminOrNull())) return null;
  const [d, golive] = await Promise.all([dashboard(), goLiveStatus()]);
  const max = Math.max(1, ...d.week.map((w) => w.revenue));
  const day = (t: number) => new Date(t * 1000).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short' });
  const todo = [
    { label: 'COD orders to confirm', n: d.attention.toConfirm, href: '/admin/orders?tab=to_confirm' },
    { label: 'Orders to print', n: d.attention.toPrint, href: '/admin/orders?tab=to_print' },
    { label: 'Open orders with custom designs', n: d.attention.custom, href: '/admin/orders?tab=to_print' },
    { label: 'Online orders waiting for payment', n: d.attention.unpaid, href: '/admin/orders?tab=unpaid' },
    { label: 'Reviews waiting for approval', n: d.attention.reviews, href: '/admin/reviews' },
  ];
  return (
    <>
      <GoLivePanel items={golive} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Orders today" value={d.today.orders} />
        <StatTile label="Sales today" value={formatINR(d.today.revenue)} hint="Paid and Cash on Delivery orders" />
        <StatTile label="To confirm" value={d.attention.toConfirm} tone={d.attention.toConfirm ? 'warn' : undefined} hint="COD orders" />
        <StatTile label="To print" value={d.attention.toPrint} tone={d.attention.toPrint ? 'warn' : undefined} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel title="Last 7 days">
          <ul className="grid h-48 grid-cols-7 items-end gap-2" aria-label="Sales for the last 7 days">
            {d.week.map((w) => (
              <li key={w.day} className="grid h-full content-end justify-items-center gap-1 text-center">
                <span className="text-[11px] tabular-nums text-muted">{w.orders ? formatINR(w.revenue) : ''}</span>
                <span className="w-full rounded-t-[3px] bg-lime/80" style={{ height: `${Math.max(2, (w.revenue / max) * 100)}%` }} aria-hidden="true" />
                <span className="text-[11px] font-bold uppercase text-muted">{day(w.day)}</span>
                <span className="sr-only">
                  {w.orders} orders, {formatINR(w.revenue)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Needs attention">
          <ul className="grid gap-2">
            {todo.map((t) => (
              <li key={t.label}>
                <Link href={t.href} className="flex items-center justify-between rounded-[3px] border border-line px-3 py-2.5 text-sm hover:border-lime">
                  {t.label}
                  <b className={t.n ? 'text-orange' : 'text-muted'}>{t.n}</b>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <Panel
        title="Recent orders"
        className="mt-6"
        actions={
          <Link href="/admin/orders" className="text-sm font-semibold text-lime hover:underline">
            All orders
          </Link>
        }
      >
        <OrderTable rows={d.recent} />
      </Panel>
    </>
  );
}

export default function AdminHome() {
  return (
    <>
      <AdminHeader
        title="Dashboard"
        subtitle="Today’s orders and what needs doing."
        actions={
          // A plain link: the browser downloads the file. Keep a copy on your computer now and then.
          // A hosted database (Turso) keeps its own backups, so there's nothing to download then.
          databaseFile() ? (
            <a href="/api/admin/backup" className="btn btn-ghost btn-sm" download>
              <DownloadIcon size={16} /> Download a backup
            </a>
          ) : undefined
        }
      />
      <Suspense fallback={<div className="h-96" aria-busy="true" />}>
        <Dashboard />
      </Suspense>
    </>
  );
}
