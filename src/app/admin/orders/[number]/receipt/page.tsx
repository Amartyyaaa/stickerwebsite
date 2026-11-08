import { Suspense } from 'react';
import { Paper } from '@/components/admin/paper';
import { PrintButton } from '@/components/admin/print-button';
import { adminOrNull } from '@/lib/admin/guard';
import { getSettings } from '@/lib/catalog/queries';
import { formatDate } from '@/lib/dates';
import { formatPhone } from '@/lib/india';
import { formatINR } from '@/lib/money';
import { getOrderViewForAdmin } from '@/lib/orders/service';
import { PAYMENT_LABEL } from '@/lib/orders/status';

export const metadata = { title: 'Receipt' };

async function Receipt({ params }: { params: PageProps<'/admin/orders/[number]/receipt'>['params'] }) {
  if (!(await adminOrNull())) return null;
  const { number } = await params;
  const [found, settings] = await Promise.all([getOrderViewForAdmin(number.toUpperCase()), getSettings()]);
  if (!found) return <p>Order not found.</p>;
  const { order, row } = found;
  const b = settings.business;
  const a = order.address;
  const line = (label: string, value: string, strong = false) => (
    <div className={`flex justify-between gap-4 py-1 ${strong ? 'border-t-2 border-black pt-2 text-lg font-black' : ''}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
  return (
    <>
      <div className="mb-4 flex justify-end print:hidden">
        <PrintButton label="Print receipt" />
      </div>
      <Paper>
        <div className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-black pb-4">
          <div>
            <p className="text-2xl font-black uppercase tracking-tight">{b.name || 'PrintYourVibe'}</p>
            {b.address && <p className="max-w-xs whitespace-pre-line text-sm">{b.address}</p>}
            {b.gstin && <p className="text-sm">GSTIN: {b.gstin}</p>}
            <p className="text-sm">{[settings.contact.email, settings.contact.phone].filter(Boolean).join(' · ')}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black uppercase tracking-tight">Receipt</p>
            <p className="text-sm">
              Order {order.number}
              <br />
              {formatDate(order.createdAt)}
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#555]">Billed to</p>
            <p className="mt-1 font-bold">{order.name}</p>
            <p className="text-sm leading-relaxed">
              {a.line1}
              {a.line2 && <>, {a.line2}</>}, {a.city}, {a.state} {a.pincode}
              <br />
              {order.email} · {formatPhone(order.phone)}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-bold uppercase tracking-widest text-[#555]">Payment</p>
            <p className="mt-1 text-sm">
              {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid online'} · {PAYMENT_LABEL[order.paymentStatus]}
              {row.razorpayPaymentId && (
                <>
                  <br />
                  Payment ID {row.razorpayPaymentId}
                </>
              )}
            </p>
          </div>
        </div>
        <table className="mt-6 w-full border-collapse text-left text-sm [&_td]:border-b [&_td]:border-[#ddd] [&_td]:py-2 [&_th]:border-b-2 [&_th]:border-black [&_th]:py-2">
          <thead>
            <tr>
              <th>Item</th>
              <th className="text-right">Price</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it, i) => (
              <tr key={i}>
                <td>
                  <b>{it.name}</b>
                  <br />
                  <span className="text-[#555]">
                    {it.typeName} · {it.optionLabels.join(' · ')}
                  </span>
                </td>
                <td className="text-right tabular-nums">{formatINR(it.unit)}</td>
                <td className="text-right">{it.qty}</td>
                <td className="text-right tabular-nums">{formatINR(it.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="ml-auto mt-4 max-w-xs text-sm">
          {line('Subtotal', formatINR(order.subtotal))}
          {order.discounts.map((d) => (
            <div key={d.id}>{line(d.label, `−${formatINR(d.amount)}`)}</div>
          ))}
          {line('Shipping', order.shipping ? formatINR(order.shipping) : 'Free')}
          {order.codFee > 0 && line('Cash on Delivery fee', formatINR(order.codFee))}
          {order.prepaidDiscount > 0 && line('Online payment discount', `−${formatINR(order.prepaidDiscount)}`)}
          {line('Total', formatINR(order.total), true)}
          {row.refundedAmount > 0 && line('Refunded', `−${formatINR(row.refundedAmount)}`)}
        </div>
        <p className="mt-8 text-xs text-[#555]">All prices include taxes. Thank you for your order!</p>
      </Paper>
    </>
  );
}

export default function ReceiptPage(props: PageProps<'/admin/orders/[number]/receipt'>) {
  return (
    <Suspense fallback={null}>
      <Receipt params={props.params} />
    </Suspense>
  );
}
