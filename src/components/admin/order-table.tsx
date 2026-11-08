import Link from 'next/link';
import { StatusChip } from '@/components/orders/order-parts';
import type { AdminOrderRow } from '@/lib/admin/orders';
import { formatDateTime } from '@/lib/dates';
import { formatPhone } from '@/lib/india';
import { formatINR } from '@/lib/money';
import { PAYMENT_LABEL } from '@/lib/orders/status';
import { tableClass } from './ui';

export function OrderTable({ rows }: { rows: AdminOrderRow[] }) {
  if (!rows.length) return <p className="rounded-card border border-dashed border-line-2 p-8 text-center text-muted">No orders here.</p>;
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className={`${tableClass} min-w-[760px]`}>
        <thead>
          <tr>
            <th>Order</th>
            <th>Customer</th>
            <th>Items</th>
            <th className="text-right">Total</th>
            <th>Payment</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.number} className="hover:bg-surface-2/60">
              <td>
                <Link href={`/admin/orders/${o.number}`} className="font-bold text-lime hover:underline">
                  {o.number}
                </Link>
                <span className="block text-xs text-muted">{formatDateTime(o.createdAt)}</span>
              </td>
              <td>
                <span className="block font-semibold">{o.name}</span>
                <span className="block text-xs text-muted">
                  {formatPhone(o.phone)} · {o.email}
                </span>
              </td>
              <td>
                {o.itemCount}
                {o.hasCustom && <span className="ml-2 rounded-[2px] bg-violet/20 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.05em] text-[#b9a2ff]">Custom</span>}
              </td>
              <td className="text-right font-semibold tabular-nums">{formatINR(o.total)}</td>
              <td className="text-xs">
                <span className="block font-semibold uppercase tracking-[0.05em]">{o.paymentMethod === 'cod' ? 'COD' : 'Online'}</span>
                <span className="text-muted">{PAYMENT_LABEL[o.paymentStatus]}</span>
              </td>
              <td>
                <StatusChip status={o.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
