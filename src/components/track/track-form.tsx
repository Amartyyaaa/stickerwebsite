'use client';

import { useActionState, useState } from 'react';
import { trackOrder, type TrackState } from '@/app/track/actions';
import { Field, inputClass } from '@/components/checkout/fields';
import { OrderItems, StatusChip, Timeline } from '@/components/orders/order-parts';
import { formatDate } from '@/lib/dates';
import { formatINR } from '@/lib/money';
import { PAYMENT_LABEL } from '@/lib/orders/status';

export function TrackForm({ defaultNumber }: { defaultNumber?: string }) {
  const [state, action, pending] = useActionState<TrackState, FormData>(trackOrder, null);
  // Controlled, so the fields keep their values after each lookup (React resets uncontrolled form fields).
  const [number, setNumber] = useState(defaultNumber ?? '');
  const [phone, setPhone] = useState('');
  const order = state?.ok ? state.order : null;
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-14">
      <form action={action} className="grid content-start gap-4 rounded-card border border-line bg-surface p-5 sm:p-6">
        <Field id="track-number" label="Order number" hint="Like PYV-7KQ2MD. It’s in your confirmation email.">
          <input id="track-number" name="number" required value={number} onChange={(e) => setNumber(e.target.value)} autoCapitalize="characters" placeholder="PYV-7KQ2MD" className={inputClass()} aria-describedby="track-number-hint" />
        </Field>
        <Field id="track-phone" label="Mobile number" hint="The number you gave at checkout.">
          <input id="track-phone" name="phone" type="tel" inputMode="numeric" required value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel-national" placeholder="98765 43210" className={inputClass()} aria-describedby="track-phone-hint" />
        </Field>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Looking…' : 'Track order'}
        </button>
        {state && !state.ok && (
          <p role="alert" className="text-sm font-semibold text-red">
            {state.error}
          </p>
        )}
      </form>

      <div aria-live="polite">
        {order ? (
          <div className="grid gap-6">
            <div className="grid gap-2">
              <p className="flex flex-wrap items-center gap-3">
                <span className="font-display text-3xl uppercase">{order.number}</span>
                <StatusChip status={order.status} />
              </p>
              <p className="text-sm text-muted">
                Placed {formatDate(order.createdAt)} · {order.itemCount} item{order.itemCount === 1 ? '' : 's'} · {formatINR(order.total)} · {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid online'} ({PAYMENT_LABEL[order.paymentStatus].toLowerCase()}) · to {order.city}
              </p>
            </div>
            <Timeline status={order.status} events={order.events} />
            <OrderItems items={order.items} />
            <p className="text-[13px] text-muted">For the full order with the address, open the link in your confirmation email or sign in with the email you ordered with.</p>
          </div>
        ) : (
          <div className="grid h-full place-items-center rounded-card border border-dashed border-line-2 p-10 text-center text-muted">Your order’s progress will show here.</div>
        )}
      </div>
    </div>
  );
}
