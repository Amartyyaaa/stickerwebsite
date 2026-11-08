import Link from 'next/link';
import { Suspense } from 'react';
import { AdminNote, OrderActions } from '@/components/admin/order-actions';
import { AdminHeader, Panel } from '@/components/admin/ui';
import { ChatIcon } from '@/components/icons';
import { AddressBlock, OrderItems, OrderTotals, StatusChip, Timeline } from '@/components/orders/order-parts';
import { adminOrNull } from '@/lib/admin/guard';
import { formatDateTime } from '@/lib/dates';
import { formatPhone } from '@/lib/india';
import { formatINR } from '@/lib/money';
import { refundable } from '@/lib/orders/refunds';
import { getOrderViewForAdmin, orderLink } from '@/lib/orders/service';
import { PAYMENT_LABEL } from '@/lib/orders/status';
import { paymentsMode } from '@/lib/payments/razorpay';

export const metadata = { title: 'Order' };

async function OrderDetail({ params }: { params: PageProps<'/admin/orders/[number]'>['params'] }) {
  if (!(await adminOrNull())) return null;
  const { number } = await params;
  const found = await getOrderViewForAdmin(number.toUpperCase());
  if (!found) {
    return (
      <>
        <AdminHeader title="Order not found" />
        <Link href="/admin/orders" className="btn btn-ghost btn-sm">
          Back to orders
        </Link>
      </>
    );
  }
  const { order, row } = found;
  const custom = order.items.map((it, i) => ({ it, i })).filter((x) => x.it.custom);
  return (
    <>
      <AdminHeader
        title={`Order ${order.number}`}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusChip status={order.status} />
            {formatDateTime(order.createdAt)} · {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online'} · {PAYMENT_LABEL[order.paymentStatus]}
            {row.refundedAmount > 0 && ` · refunded ${formatINR(row.refundedAmount)}`}
          </span>
        }
        actions={
          <>
            <Link href={`/admin/orders/${order.number}/slip`} className="btn btn-ghost btn-sm" target="_blank">
              Packing slip
            </Link>
            <Link href={`/admin/orders/${order.number}/receipt`} className="btn btn-ghost btn-sm" target="_blank">
              Receipt
            </Link>
            <a href={orderLink(order)} className="btn btn-ghost btn-sm" target="_blank" rel="noopener noreferrer">
              Customer’s view
            </a>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 content-start gap-6">
          <Panel title="Next steps">
            <OrderActions
              order={{
                id: order.id,
                number: order.number,
                status: order.status,
                paymentMethod: order.paymentMethod,
                paymentStatus: order.paymentStatus,
                total: order.total,
                refundable: refundable(row),
                phone: order.phone,
                name: order.name,
                razorpay: order.paymentMethod === 'online' && Boolean(row.razorpayPaymentId) && paymentsMode() === 'razorpay',
              }}
            />
          </Panel>
          {custom.length > 0 && (
            <Panel
              title="Customer files"
              actions={
                <a href={`/api/admin/files/zip/${order.number}`} className="btn btn-primary btn-sm">
                  Download all (zip)
                </a>
              }
            >
              <div className="grid gap-5">
                {custom.map(({ it, i }) => (
                  <div key={i}>
                    <p className="font-bold">
                      Item {i + 1}: {it.name} × {it.qty} <span className="font-normal text-muted">· {it.optionLabels.join(' · ')}</span>
                    </p>
                    {it.custom?.note && <p className="mt-1 text-sm text-orange">Note: {it.custom.note}</p>}
                    <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {it.custom?.items.map((d, j) => (
                        <li key={j} className="grid gap-1.5 rounded-[4px] border border-line bg-bg p-2 text-xs">
                          {/* eslint-disable-next-line @next/next/no-img-element -- customer upload preview */}
                          <img src={d.upload.thumb} alt={d.upload.name} className="aspect-square w-full rounded-[2px] bg-[#d9d9de] object-contain" loading="lazy" />
                          <span className="truncate font-semibold" title={d.upload.name}>
                            {j + 1}. {d.upload.name}
                          </span>
                          <span className="text-muted">
                            {d.upload.w} × {d.upload.h} px{d.caption ? ` · “${d.caption}”` : ''}
                          </span>
                          <span className="flex gap-3 font-semibold">
                            <a href={`/api/admin/files/original/${d.upload.id}`} className="text-lime hover:underline">
                              Original
                            </a>
                            <a href={`/api/admin/files/print/${order.number}/${i}/${j}`} className="text-lime hover:underline">
                              Print file
                            </a>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Panel>
          )}
          <Panel title="Progress">
            <Timeline status={order.status} events={order.events} />
            <ul className="mt-5 grid gap-1.5 border-t border-line pt-4 text-[13px] text-muted">
              {[...order.events].reverse().map((e, i) => (
                <li key={i}>
                  <b className="text-ink">{formatDateTime(e.at)}</b> · {e.note || e.status}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Items">
            <OrderItems items={order.items} />
          </Panel>
        </div>
        <div className="grid min-w-0 content-start gap-6">
          <Panel title="Customer">
            <p className="font-bold">{order.name}</p>
            <p className="text-sm text-muted">{order.email}</p>
            <p className="mt-1 flex flex-wrap items-center gap-3 text-sm">
              <a href={`tel:+91${order.phone}`} className="hover:underline">
                {formatPhone(order.phone)}
              </a>
              <a href={`https://wa.me/91${order.phone}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-lime hover:underline">
                <ChatIcon size={15} /> WhatsApp
              </a>
            </p>
          </Panel>
          <Panel title="Ship to">
            <AddressBlock address={order.address} />
            {order.shipment && (
              <p className="mt-3 text-sm">
                <b>{order.shipment.courier}</b> · {order.shipment.trackingNumber}
                {order.shipment.trackingUrl && (
                  <>
                    {' '}
                    ·{' '}
                    <a href={order.shipment.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-lime hover:underline">
                      Track
                    </a>
                  </>
                )}
              </p>
            )}
          </Panel>
          <Panel title="Payment">
            <OrderTotals order={order} />
            {order.couponCode && (
              <p className="mt-3 text-xs text-muted">
                Coupon{' '}
                <Link href={`/admin/orders?q=${encodeURIComponent(order.couponCode)}`} className="font-bold tracking-[0.06em] text-lime hover:underline">
                  {order.couponCode}
                </Link>
              </p>
            )}
            {row.razorpayPaymentId && <p className="mt-3 text-xs text-muted">Payment {row.razorpayPaymentId}</p>}
          </Panel>
          <Panel title="Private note">
            <AdminNote orderId={order.id} note={row.adminNote} />
          </Panel>
        </div>
      </div>
    </>
  );
}

export default function AdminOrderPage(props: PageProps<'/admin/orders/[number]'>) {
  return (
    <Suspense fallback={<div className="h-96" aria-busy="true" />}>
      <OrderDetail params={props.params} />
    </Suspense>
  );
}
