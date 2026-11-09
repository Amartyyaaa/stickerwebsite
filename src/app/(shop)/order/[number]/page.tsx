import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { ChatIcon } from '@/components/icons';
import { AddressBlock, OrderItems, OrderTotals, ShipmentNote, StatusChip, Timeline } from '@/components/orders/order-parts';
import { PayNow } from '@/components/orders/pay-now';
import { ItemReview } from '@/components/orders/review-form';
import { CancelOrder, OrderFeedback } from '@/components/orders/shopper-actions';
import { shopperAccounts } from '@/lib/accounts';
import { getSettings } from '@/lib/catalog/queries';
import { formatDate } from '@/lib/dates';
import { whatsappLink } from '@/lib/india';
import { emailReady } from '@/lib/email/send';
import { formatINR } from '@/lib/money';
import { normalizeOrderNumber } from '@/lib/orders/numbers';
import { getOrderForViewer } from '@/lib/orders/service';
import { PAYMENT_LABEL, SHOPPER_CANCELLABLE } from '@/lib/orders/status';
import { FEEDBACK_STATUSES, feedbackFor } from '@/lib/orders/shopper';
import { reviewStates } from '@/lib/reviews';
import { getViewer } from '@/lib/viewer';

export const metadata: Metadata = { title: 'Your order', robots: { index: false, follow: false } };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function NotFoundOrder({ accounts }: { accounts: boolean }) {
  return (
    <div className="mx-auto grid max-w-lg justify-items-center gap-4 py-16 text-center">
      <h1 className="display text-[clamp(34px,5vw,52px)]">We couldn’t find that order</h1>
      <p className="text-muted">
        {accounts
          ? 'Open the link in your order confirmation email, sign in with the email you ordered with, or track it with your order number and phone.'
          : 'Track it with your order number and the phone number you gave.'}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/track" className="btn btn-primary">
          Track an order
        </Link>
        {accounts && (
          <Link href="/account" className="btn btn-ghost">
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}

async function OrderContent({ params, searchParams }: PageProps<'/order/[number]'>) {
  const [{ number }, sp, viewer, settings] = await Promise.all([params, searchParams, getViewer(), getSettings()]);
  const key = first(sp.key) ?? null;
  const n = normalizeOrderNumber(number);
  const order = n ? await getOrderForViewer(n, { key, viewer }) : null;
  if (!order) return <NotFoundOrder accounts={shopperAccounts()} />;

  const placed = first(sp.placed) === '1' && order.status !== 'pending_payment';
  // Delivered catalog items can be reviewed (custom-printed ones are one of a kind).
  const reviewable = order.status === 'delivered' ? order.items.filter((i) => i.productId > 0) : [];
  const reviewed = reviewable.length ? await reviewStates(order.id) : {};
  const askFeedback = FEEDBACK_STATUSES.includes(order.status) && !(await feedbackFor(order.id));
  const orderRef = { number: order.number, key: order.accessKey };
  const firstName = order.name.split(' ')[0] || order.name;
  const help = whatsappLink(settings.contact.whatsapp, `Hi PrintYourVibe! About my order ${order.number}`) ?? '/pages/contact';

  return (
    <div className="grid gap-8">
      <header className="grid gap-3 border-b border-line pb-6">
        <p className="eyebrow">{placed ? 'Thank you!' : 'Order'}</p>
        <h1 className="display text-[clamp(36px,5.4vw,64px)]">{placed ? `Thanks, ${firstName}. Your order is in.` : `Order ${order.number}`}</h1>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[15px] text-muted">
          <StatusChip status={order.status} />
          <span>
            {order.number} · placed {formatDate(order.createdAt)} · {PAYMENT_LABEL[order.paymentStatus]}
          </span>
        </p>
        {placed &&
          (emailReady() ? (
            <p className="text-[15px] text-muted">We’ve emailed a confirmation to {order.email}. Keep it: its link opens this page any time.</p>
          ) : (
            <p className="rounded-[3px] border border-lime/40 bg-lime/5 px-4 py-3 text-[15px]">
              We don’t send emails yet, so note your order number: <b className="tabular-nums">{order.number}</b>. You can check on it any time on{' '}
              <Link href="/track" className="font-semibold text-lime underline underline-offset-2">
                Track order
              </Link>{' '}
              with your phone number, or bookmark this page.
            </p>
          ))}
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-12">
        <div className="grid min-w-0 content-start gap-8">
          {order.status === 'pending_payment' && (
            <section className="grid gap-3 rounded-card border border-orange/50 bg-orange/5 p-5" aria-labelledby="pay-title">
              <h2 id="pay-title" className="font-display text-2xl uppercase">
                Waiting for payment
              </h2>
              <p className="text-sm text-muted">
                {order.paymentStatus === 'failed' ? 'The last payment attempt didn’t go through. ' : ''}Pay {formatINR(order.total)} to send this order to print. Unpaid orders are cancelled after 24 hours.
              </p>
              <PayNow number={order.number} accessKey={order.accessKey} amount={order.total} />
            </section>
          )}
          {order.paymentMethod === 'cod' && order.status === 'placed' && (
            <p className="rounded-card border border-cyan/40 bg-cyan/5 p-4 text-sm">
              <b>Cash on Delivery:</b> please keep {formatINR(order.total)} ready when your parcel arrives. We’ll message you on {help.startsWith('https://') ? 'WhatsApp' : 'your phone'} to confirm the order before we print it.
            </p>
          )}
          {askFeedback && <OrderFeedback order={orderRef} />}
          <section aria-labelledby="progress-title">
            <h2 id="progress-title" className="section-title mb-5">
              Progress
            </h2>
            <Timeline status={order.status} events={order.events} />
            {order.status === 'shipped' && (
              <div className="mt-5">
                <ShipmentNote shipment={order.shipment} />
              </div>
            )}
          </section>
          <section aria-labelledby="items-title">
            <h2 id="items-title" className="section-title mb-2">
              Items
            </h2>
            <OrderItems items={order.items} />
          </section>
          {reviewable.length > 0 && (
            <section id="reviews" aria-labelledby="reviews-title" className="scroll-mt-24 rounded-card border border-line bg-surface p-4 sm:p-5">
              <h2 id="reviews-title" className="section-title mb-1">
                Rate your order
              </h2>
              <p className="mb-4 text-sm text-muted">Your review helps other shoppers, and helps us print better.</p>
              <ul>
                {reviewable.map((i) => (
                  <ItemReview key={i.id} order={{ number: order.number, key: order.accessKey }} item={{ id: i.id, name: i.name, slug: i.slug, art: i.art, image: i.image }} state={reviewed[i.id] ?? null} />
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="grid min-w-0 content-start gap-5">
          <div className="rounded-card border border-line bg-surface p-5">
            <h2 className="mb-4 font-display text-xl uppercase">Payment</h2>
            <OrderTotals order={order} />
            <p className="mt-3 text-[13px] text-muted">
              {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid online'} · {PAYMENT_LABEL[order.paymentStatus]}
            </p>
          </div>
          <div className="rounded-card border border-line bg-surface p-5">
            <h2 className="mb-3 font-display text-xl uppercase">Delivering to</h2>
            <AddressBlock address={order.address} />
            <p className="mt-3 text-[13px] text-muted">Updates go to {order.email}</p>
          </div>
          <a href={help} {...(help.startsWith('https://') ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="btn btn-ghost">
            <ChatIcon size={18} /> Questions about this order?
          </a>
          {SHOPPER_CANCELLABLE.includes(order.status) && (
            <div className="grid gap-1">
              <CancelOrder order={orderRef} paid={order.paymentStatus === 'paid'} />
              <p className="text-[13px] text-muted">You can cancel until we start printing.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default function OrderPage(props: PageProps<'/order/[number]'>) {
  return (
    <div className="wrap py-8 md:py-10">
      <Suspense fallback={<div className="min-h-[60vh]" aria-busy="true" />}>
        <OrderContent {...props} />
      </Suspense>
    </div>
  );
}
