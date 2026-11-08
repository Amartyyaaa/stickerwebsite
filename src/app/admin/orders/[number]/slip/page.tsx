import { Suspense } from 'react';
import { Paper } from '@/components/admin/paper';
import { PrintButton } from '@/components/admin/print-button';
import { adminOrNull } from '@/lib/admin/guard';
import { getSettings } from '@/lib/catalog/queries';
import { designSummary } from '@/lib/custom/studios';
import { formatDate } from '@/lib/dates';
import { formatPhone } from '@/lib/india';
import { formatINR } from '@/lib/money';
import { getOrderViewForAdmin } from '@/lib/orders/service';

export const metadata = { title: 'Packing slip' };

async function Slip({ params }: { params: PageProps<'/admin/orders/[number]/slip'>['params'] }) {
  if (!(await adminOrNull())) return null;
  const { number } = await params;
  const [found, settings] = await Promise.all([getOrderViewForAdmin(number.toUpperCase()), getSettings()]);
  if (!found) return <p>Order not found.</p>;
  const { order } = found;
  const a = order.address;
  const collect = order.paymentMethod === 'cod' && order.paymentStatus !== 'paid';
  return (
    <>
      <div className="mb-4 flex justify-end print:hidden">
        <PrintButton label="Print packing slip" />
      </div>
      <Paper>
        <div className="flex items-start justify-between gap-6 border-b-2 border-black pb-4">
          <div>
            <p className="text-2xl font-black uppercase tracking-tight">{settings.business.name || 'PrintYourVibe'}</p>
            <p className="text-sm text-[#555]">Packing slip</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black tracking-tight">{order.number}</p>
            <p className="text-sm">{formatDate(order.createdAt)}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#555]">Ship to</p>
            <p className="mt-1 text-lg font-bold">{a.name}</p>
            <p className="leading-relaxed">
              {a.line1}
              {a.line2 && <>, {a.line2}</>}
              <br />
              {a.landmark && (
                <>
                  Near {a.landmark}
                  <br />
                </>
              )}
              {a.city}, {a.state} <b>{a.pincode}</b>
              <br />
              Phone: {formatPhone(a.phone)}
            </p>
          </div>
          <div className={collect ? 'rounded border-2 border-black p-3' : ''}>
            <p className="text-xs font-bold uppercase tracking-widest text-[#555]">Payment</p>
            {collect ? (
              <p className="mt-1 text-2xl font-black">COD: collect {formatINR(order.total)}</p>
            ) : (
              <p className="mt-1 text-xl font-bold">Prepaid. Nothing to collect.</p>
            )}
          </div>
        </div>
        <table className="mt-6 w-full border-collapse text-left text-sm [&_td]:border-b [&_td]:border-[#ddd] [&_td]:py-2 [&_th]:border-b-2 [&_th]:border-black [&_th]:py-2">
          <thead>
            <tr>
              <th className="w-8">#</th>
              <th>Item</th>
              <th className="w-14 text-right">Qty</th>
              <th className="w-16 text-center">Packed</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it, i) => (
              <tr key={i}>
                <td className="align-top">{i + 1}</td>
                <td>
                  <b>{it.name}</b> <span className="text-[#555]">({it.typeName})</span>
                  <br />
                  <span className="text-[#333]">{it.optionLabels.join(' · ')}</span>
                  {it.custom && (
                    <>
                      <br />
                      <span className="text-[#333]">Custom: {designSummary(it.custom, it.options)}</span>
                    </>
                  )}
                </td>
                <td className="text-right align-top text-lg font-bold">{it.qty}</td>
                <td className="text-center align-top">☐</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-8 text-center text-sm text-[#555]">
          Thank you for shopping with {settings.business.name || 'PrintYourVibe'}!{settings.contact.whatsapp ? ` Questions? WhatsApp us on ${settings.contact.whatsapp}.` : ''}
        </p>
      </Paper>
    </>
  );
}

export default function SlipPage(props: PageProps<'/admin/orders/[number]/slip'>) {
  return (
    <Suspense fallback={null}>
      <Slip params={props.params} />
    </Suspense>
  );
}
