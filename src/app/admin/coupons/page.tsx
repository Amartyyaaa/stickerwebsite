import Link from 'next/link';
import { Suspense } from 'react';
import { CouponToggle } from '@/components/admin/coupon-form';
import { Badge } from '@/components/admin/product-table';
import { AdminHeader, tableClass } from '@/components/admin/ui';
import type { CouponState } from '@/lib/admin/coupon-form';
import { listCoupons } from '@/lib/admin/coupons';
import { adminOrNull } from '@/lib/admin/guard';
import { formatDate } from '@/lib/dates';
import { formatINR } from '@/lib/money';
import { describeCoupon } from '@/lib/pricing/coupons';

export const metadata = { title: 'Coupons' };

const STATE: Record<CouponState, { label: string; tone: 'lime' | 'warn' | 'muted' | 'violet' }> = {
  live: { label: 'Live', tone: 'lime' },
  scheduled: { label: 'Scheduled', tone: 'violet' },
  expired: { label: 'Expired', tone: 'muted' },
  'used-up': { label: 'Used up', tone: 'warn' },
  off: { label: 'Off', tone: 'muted' },
};

async function Coupons({ searchParams }: { searchParams: PageProps<'/admin/coupons'>['searchParams'] }) {
  if (!(await adminOrNull())) return null;
  const [rows, sp] = await Promise.all([listCoupons(), searchParams]);
  return (
    <>
      {sp.saved === '1' && <p className="mb-4 text-sm font-semibold text-lime">Coupon created. Shoppers can use it at checkout now.</p>}
      {rows.length === 0 ? (
        <div className="rounded-card border border-dashed border-line-2 p-8 text-center">
          <p className="font-display text-2xl uppercase">No coupons yet</p>
          <p className="mt-1 text-sm text-muted">Make a welcome code, a festival sale or free shipping for your Instagram followers.</p>
          <Link href="/admin/coupons/new" className="btn btn-primary btn-sm mt-4">
            Create a coupon
          </Link>
        </div>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className={`${tableClass} min-w-[760px]`}>
            <thead>
              <tr>
                <th>Code</th>
                <th>Offer</th>
                <th>Valid</th>
                <th className="text-right">Uses</th>
                <th>State</th>
                <th className="w-16">On</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const state = STATE[c.state];
                return (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/admin/coupons/${c.id}`} className="font-bold tracking-[0.06em] text-lime hover:underline">
                        {c.code}
                      </Link>
                      {c.note && <span className="block text-xs text-muted">{c.note}</span>}
                    </td>
                    <td className="text-[13.5px]">
                      {describeCoupon(c, formatINR)}
                      {c.minOrder > 0 && <span className="block text-xs text-muted">On orders of {formatINR(c.minOrder)} or more</span>}
                    </td>
                    <td className="text-[13px] text-muted">
                      {c.startsAt || c.endsAt ? `${c.startsAt ? formatDate(c.startsAt) : 'Now'} to ${c.endsAt ? formatDate(c.endsAt) : 'no end'}` : 'Always'}
                    </td>
                    <td className="text-right tabular-nums">
                      {c.usedCount.toLocaleString('en-IN')}
                      {c.usageLimit !== null && <span className="text-muted"> / {c.usageLimit.toLocaleString('en-IN')}</span>}
                      {c.perCustomer !== null && <span className="block text-xs text-muted">{c.perCustomer} per shopper</span>}
                    </td>
                    <td>
                      <Badge tone={state.tone}>{state.label}</Badge>
                    </td>
                    <td>
                      <CouponToggle id={c.id} isActive={c.isActive} code={c.code} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function AdminCouponsPage(props: PageProps<'/admin/coupons'>) {
  return (
    <>
      <AdminHeader
        title="Coupons"
        subtitle="Codes shoppers type at checkout. A use counts when a COD order is placed or an online order is paid."
        actions={
          <Link href="/admin/coupons/new" className="btn btn-primary btn-sm">
            New coupon
          </Link>
        }
      />
      <Suspense fallback={<div className="h-64" aria-busy="true" />}>
        <Coupons searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
