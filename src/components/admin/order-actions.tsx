'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { cancelOrderAction, moveOrderAction, refundOrderAction, saveNoteAction, shipOrderAction } from '@/actions/admin/orders';
import { described, Field, inputClass } from '@/components/checkout/fields';
import { ChatIcon } from '@/components/icons';
import { formatINR } from '@/lib/money';
import { COURIERS, trackingUrlFor } from '@/lib/orders/couriers';
import { canMove } from '@/lib/orders/status';
import type { OrderStatus, PaymentMethod, PaymentStatus } from '@/lib/orders/types';

type Result = { ok: true } | { ok: false; error: string };

export interface ActionOrder {
  id: number;
  number: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  total: number;
  refundable: number;
  phone: string;
  name: string;
  razorpay: boolean;
}

const CANCEL_REASONS = ['Customer asked to cancel', 'Couldn’t confirm the COD order', 'Design can’t be printed', 'Duplicate order'];

/** Buttons for the next steps of an order. Only moves that make sense right now are shown. */
export function OrderActions({ order }: { order: ActionOrder }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'ship' | 'cancel' | 'refund' | null>(null);
  const [courier, setCourier] = useState(COURIERS[0].name);
  const [other, setOther] = useState('');
  const [awb, setAwb] = useState('');
  const [link, setLink] = useState('');
  const [reason, setReason] = useState(CANCEL_REASONS[0]);
  const [rupees, setRupees] = useState(String(order.refundable / 100));
  const [reference, setReference] = useState('');

  const run = async (fn: () => Promise<Result>) => {
    setBusy(true);
    setError(null);
    const r = await fn();
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setMode(null);
    router.refresh();
  };
  const move = (to: 'confirmed' | 'printing' | 'delivered', note?: string) => run(() => moveOrderAction({ orderId: order.id, to, note }));
  const first = order.name.split(' ')[0] || order.name;
  const confirmText = `Hi ${first}, this is PrintYourVibe. Please reply YES to confirm your Cash on Delivery order ${order.number} of ${formatINR(order.total)}. Thank you!`;
  const autoLink = trackingUrlFor(courier, awb);
  const linkHint = autoLink ? `Filled in automatically: ${autoLink}` : 'Paste the link from the courier, if you have one.';
  const s = order.status;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {s === 'placed' && order.paymentMethod === 'cod' && (
          <>
            <a href={`https://wa.me/91${order.phone}?text=${encodeURIComponent(confirmText)}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
              <ChatIcon size={16} /> Confirm on WhatsApp
            </a>
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => move('confirmed', 'COD confirmed with the customer')}>
              Mark confirmed
            </button>
          </>
        )}
        {canMove(s, 'printing') && (s !== 'placed' || order.paymentMethod === 'online') && (
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => move('printing')}>
            Start printing
          </button>
        )}
        {canMove(s, 'shipped') && (
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => setMode('ship')}>
            Mark shipped
          </button>
        )}
        {canMove(s, 'delivered') && (
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => move('delivered')}>
            Mark delivered
          </button>
        )}
        {canMove(s, 'cancelled') && (
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setMode('cancel')}>
            Cancel order
          </button>
        )}
        {order.refundable > 0 && ['cancelled', 'delivered', 'refunded'].includes(s) && (
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setMode('refund')}>
            Refund
          </button>
        )}
      </div>

      {mode === 'ship' && (
        <form
          className="grid gap-3 rounded-[4px] border border-line-2 bg-bg p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => shipOrderAction({ orderId: order.id, courier, otherCourier: other, trackingNumber: awb, trackingUrl: link || undefined }));
          }}
        >
          <Field id="ship-courier" label="Courier">
            <select id="ship-courier" value={courier} onChange={(e) => setCourier(e.target.value)} className={inputClass()}>
              {COURIERS.map((c) => (
                <option key={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          {courier === 'Other' ? (
            <Field id="ship-other" label="Courier name">
              <input id="ship-other" value={other} onChange={(e) => setOther(e.target.value)} className={inputClass()} />
            </Field>
          ) : (
            <span />
          )}
          <Field id="ship-awb" label="Tracking (AWB) number">
            <input id="ship-awb" value={awb} onChange={(e) => setAwb(e.target.value)} className={inputClass()} autoComplete="off" />
          </Field>
          <Field id="ship-link" label="Tracking link" optional hint={linkHint}>
            <input id="ship-link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" className={inputClass()} {...described('ship-link', undefined, linkHint)} />
          </Field>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
              Save and email the customer
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMode(null)}>
              Back
            </button>
          </div>
        </form>
      )}

      {mode === 'cancel' && (
        <form
          className="grid gap-3 rounded-[4px] border border-red/40 bg-bg p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => cancelOrderAction({ orderId: order.id, reason }));
          }}
        >
          <Field id="cancel-reason" label="Reason (sent to the customer)">
            <input id="cancel-reason" list="cancel-reasons" value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass()} />
            <datalist id="cancel-reasons">
              {CANCEL_REASONS.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </Field>
          {order.paymentStatus === 'paid' && <p className="text-[13px] text-muted">This order was paid. After cancelling, use Refund to return the money.</p>}
          <div className="flex gap-2">
            <button type="submit" className="btn btn-ghost btn-sm border-red text-red" disabled={busy}>
              Cancel the order
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMode(null)}>
              Back
            </button>
          </div>
        </form>
      )}

      {mode === 'refund' && (
        <form
          className="grid gap-3 rounded-[4px] border border-line-2 bg-bg p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => refundOrderAction({ orderId: order.id, rupees: Number(rupees), reference }));
          }}
        >
          <Field id="refund-amount" label={`Amount (up to ${formatINR(order.refundable)})`}>
            <input id="refund-amount" inputMode="decimal" value={rupees} onChange={(e) => setRupees(e.target.value.replace(/[^\d.]/g, ''))} className={inputClass()} />
          </Field>
          {order.razorpay ? (
            <p className="self-end text-[13px] text-muted">The refund is sent back through Razorpay to the card, UPI or bank account that paid.</p>
          ) : (
            <Field id="refund-ref" label="Reference" optional hint="For example the UPI or bank transfer reference.">
              <input id="refund-ref" value={reference} onChange={(e) => setReference(e.target.value)} className={inputClass()} />
            </Field>
          )}
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
              {order.razorpay ? 'Refund through Razorpay' : 'Record the refund'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMode(null)}>
              Back
            </button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="text-sm font-semibold text-red">
          {error}
        </p>
      )}
    </div>
  );
}

/** Private note for the store team. */
export function AdminNote({ orderId, note }: { orderId: number; note: string }) {
  const [value, setValue] = useState(note);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  return (
    <form
      className="grid gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setState('saving');
        const r = await saveNoteAction({ orderId, note: value });
        setState(r.ok ? 'saved' : 'error');
      }}
    >
      <label htmlFor="admin-note" className="sr-only">
        Private note
      </label>
      <textarea
        id="admin-note"
        rows={4}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setState('idle');
        }}
        placeholder="Only the store team sees this."
        className="w-full rounded-[2px] border border-line-2 bg-bg px-3 py-2 text-sm focus:border-lime focus:outline-none"
      />
      <div className="flex items-center gap-3">
        <button type="submit" className="btn btn-ghost btn-sm" disabled={state === 'saving'}>
          Save note
        </button>
        <span className="text-xs text-muted" role="status">
          {state === 'saved' ? 'Saved' : state === 'error' ? 'Couldn’t save' : ''}
        </span>
      </div>
    </form>
  );
}
