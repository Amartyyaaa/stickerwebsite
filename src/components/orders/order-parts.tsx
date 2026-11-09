import { Art } from '@/components/art';
import { CheckIcon } from '@/components/icons';
import { cn } from '@/lib/cn';
import { designSummary } from '@/lib/custom/studios';
import { formatDateTime } from '@/lib/dates';
import { formatPhone } from '@/lib/india';
import { formatINR } from '@/lib/money';
import { STATUS_LABEL, timeline } from '@/lib/orders/status';
import type { AddressSnapshot, OrderItemView, OrderStatus, OrderView } from '@/lib/orders/types';

const CHIP: Record<OrderStatus, string> = {
  pending_payment: 'border-orange/60 bg-orange/10 text-orange',
  placed: 'border-cyan/50 bg-cyan/10 text-cyan',
  confirmed: 'border-cyan/50 bg-cyan/10 text-cyan',
  printing: 'border-violet/60 bg-violet/15 text-[#b9a2ff]',
  shipped: 'border-lime/60 bg-lime/10 text-lime',
  delivered: 'border-lime/60 bg-lime/10 text-lime',
  cancelled: 'border-red/50 bg-red/10 text-red',
  refunded: 'border-line-2 bg-surface-2 text-muted',
};

export function StatusChip({ status, className }: { status: OrderStatus; className?: string }) {
  return <span className={cn('inline-flex items-center rounded-[2px] border px-2 py-0.5 text-[11.5px] font-bold uppercase tracking-[0.07em]', CHIP[status], className)}>{STATUS_LABEL[status]}</span>;
}

/** The order's progress: vertical on phones, horizontal on wider screens. */
export function Timeline({ status, events }: { status: OrderStatus; events: OrderView['events'] }) {
  const steps = timeline(status, events);
  return (
    <ol className="grid gap-0 sm:flex sm:gap-0" aria-label="Order progress">
      {steps.map((st, i) => (
        <li key={`${st.status}${i}`} className="relative flex gap-3 pb-5 last:pb-0 sm:flex-1 sm:flex-col sm:gap-2 sm:pb-0">
          {i < steps.length - 1 && (
            <span
              className={cn('absolute left-[11px] top-6 h-[calc(100%-24px)] w-0.5 sm:left-6 sm:top-[11px] sm:h-0.5 sm:w-[calc(100%-24px)]', st.state === 'done' ? 'bg-lime' : 'bg-line-2')}
              aria-hidden="true"
            />
          )}
          <span
            className={cn(
              'relative z-10 grid size-6 shrink-0 place-items-center rounded-full border-2',
              st.state === 'done' && 'border-lime bg-lime text-bg',
              st.state === 'current' && (st.status === 'cancelled' || st.status === 'refunded' ? 'border-red bg-red/20' : 'border-lime bg-bg shadow-[0_0_14px_rgb(198_255_61/0.5)]'),
              st.state === 'todo' && 'border-line-2 bg-bg',
            )}
            aria-hidden="true"
          >
            {st.state === 'done' && <CheckIcon size={14} strokeWidth={3} />}
          </span>
          <span className="grid">
            <span className={cn('text-[13.5px] font-bold uppercase tracking-[0.05em]', st.state === 'todo' && 'text-muted')}>
              {st.label}
              <span className="sr-only">{st.state === 'done' ? ' (done)' : st.state === 'current' ? ' (current)' : ' (to come)'}</span>
            </span>
            {st.at && <span className="text-xs text-muted">{formatDateTime(st.at)}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function OrderItems({ items }: { items: Array<Pick<OrderItemView, 'name' | 'typeName' | 'qty' | 'art' | 'image' | 'optionLabels'> & Partial<Pick<OrderItemView, 'custom' | 'options' | 'total' | 'unit'>>> }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3 py-3">
          <span className="relative size-16 shrink-0 rounded-[4px] border border-line bg-bg p-1.5 sm:size-20">
            <Art spec={it.art} image={it.image} idPrefix={`oi${i}`} />
            {it.custom && it.custom.items.length > 1 && (
              <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-lime px-1 text-[11px] font-bold leading-5 text-bg">{it.custom.items.length}</span>
            )}
          </span>
          <span className="grid min-w-0 flex-1 content-start gap-0.5">
            <span className="font-display text-[17px] uppercase leading-tight">{it.name}</span>
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">{it.typeName}</span>
            {it.optionLabels.length > 0 && <span className="text-[13px] text-muted">{it.optionLabels.join(' · ')}</span>}
            {it.custom && it.options && <span className="break-all text-[13px] text-ink/85">{designSummary(it.custom, it.options)}</span>}
          </span>
          <span className="shrink-0 text-right text-sm">
            <span className="block text-muted">× {it.qty}</span>
            {it.total !== undefined && <b className="tabular-nums">{formatINR(it.total)}</b>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function OrderTotals({ order }: { order: Pick<OrderView, 'subtotal' | 'discounts' | 'shipping' | 'codFee' | 'platformFee' | 'prepaidDiscount' | 'total'> }) {
  const row = (label: string, value: string, cls?: string) => (
    <div className={cn('flex justify-between gap-4', cls)}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
  return (
    <dl className="grid gap-2 text-sm">
      {row('Subtotal', formatINR(order.subtotal), 'text-muted [&>dd]:text-ink')}
      {order.discounts.map((d) => (
        <div key={d.id}>{row(d.label, `−${formatINR(d.amount)}`, 'text-lime')}</div>
      ))}
      {row('Shipping', order.shipping ? formatINR(order.shipping) : 'Free', 'text-muted [&>dd]:text-ink')}
      {order.codFee > 0 && row('Cash on Delivery fee', formatINR(order.codFee), 'text-muted [&>dd]:text-ink')}
      {order.platformFee > 0 && row('Platform fee', formatINR(order.platformFee), 'text-muted [&>dd]:text-ink')}
      {order.prepaidDiscount > 0 && row('Online payment discount', `−${formatINR(order.prepaidDiscount)}`, 'text-lime')}
      <div className="mt-1 flex items-baseline justify-between border-t border-line pt-3">
        <dt className="font-display text-xl uppercase">Total</dt>
        <dd className="font-display text-2xl text-lime tabular-nums">{formatINR(order.total)}</dd>
      </div>
    </dl>
  );
}

export function AddressBlock({ address }: { address: AddressSnapshot }) {
  return (
    <address className="text-sm not-italic leading-relaxed">
      <b>{address.name}</b>
      <br />
      {address.line1}
      {address.line2 && (
        <>
          <br />
          {address.line2}
        </>
      )}
      {address.landmark && (
        <>
          <br />
          Near {address.landmark}
        </>
      )}
      <br />
      {address.city}, {address.state} {address.pincode}
      <br />
      <span className="text-muted">{formatPhone(address.phone)}</span>
    </address>
  );
}

/** "Shipped with …" with the tracking number and link, once the order is on its way. */
export function ShipmentNote({ shipment }: { shipment: OrderView['shipment'] }) {
  if (!shipment) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-lime/40 bg-lime/5 p-4 text-sm">
      <span>
        Shipped with <b>{shipment.courier}</b> · tracking number <b className="tabular-nums">{shipment.trackingNumber}</b>
      </span>
      {shipment.trackingUrl && (
        <a href={shipment.trackingUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
          Track parcel
        </a>
      )}
    </p>
  );
}
