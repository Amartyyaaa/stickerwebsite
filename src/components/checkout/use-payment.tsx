'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { confirmPayment, mockPayment } from '@/actions/checkout';
import { CloseIcon } from '@/components/icons';
import type { PaymentStart } from '@/lib/orders/checkout-types';
import { formatINR } from '@/lib/money';

export type PaymentOutcome = { status: 'paid' } | { status: 'cancelled' } | { status: 'failed'; message: string };

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, cb: (resp: unknown) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

let scriptPromise: Promise<boolean> | null = null;

/** Load Razorpay Checkout only when the shopper is ready to pay. */
function loadRazorpay(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  scriptPromise ??= new Promise<boolean>((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => {
      scriptPromise = null;
      resolve(false);
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

type MockChoice = 'pay' | 'decline' | 'cancel';

/** The test payment screen used when no Razorpay keys are set. */
function MockPaymentSheet({ amount, orderNumber, onChoose }: { amount: number; orderNumber: string; onChoose: (c: MockChoice) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onChoose('cancel');
      }}
      aria-labelledby="mock-pay-title"
      className="m-auto w-[min(92vw,420px)] max-w-none rounded-card border border-line-2 bg-surface p-0 text-ink shadow-[0_30px_80px_rgba(0,0,0,0.6)] backdrop:bg-black/75"
    >
      <div className="grid gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="inline-block rounded-[2px] bg-orange px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-bg">Test mode</p>
            <h2 id="mock-pay-title" className="mt-2 font-display text-2xl uppercase">
              Test payment
            </h2>
          </div>
          <button type="button" onClick={() => onChoose('cancel')} className="grid size-10 place-items-center rounded-[2px] hover:bg-surface-2" aria-label="Close the payment window">
            <CloseIcon />
          </button>
        </div>
        <p className="text-sm text-muted">
          No money moves here. This screen stands in for Razorpay until your Razorpay keys are added. Order {orderNumber}.
        </p>
        <p className="font-display text-4xl text-lime tabular-nums">{formatINR(amount)}</p>
        <div className="grid gap-2">
          <button type="button" className="btn btn-primary" onClick={() => onChoose('pay')}>
            Pay {formatINR(amount)}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => onChoose('decline')}>
            Decline payment
          </button>
        </div>
      </div>
    </dialog>
  );
}

/**
 * Runs an online payment: Razorpay Checkout when keys are set, otherwise the
 * test payment screen. Resolves when the shopper has paid, cancelled or failed.
 */
export function usePayment() {
  const [mock, setMock] = useState<{ amount: number; orderNumber: string; resolve: (c: MockChoice) => void } | null>(null);

  const run = useCallback(async (order: { number: string; key: string }, start: PaymentStart): Promise<PaymentOutcome> => {
    if (start.mode === 'cod') return { status: 'paid' };
    if (start.mode === 'mock') {
      const choice = await new Promise<MockChoice>((resolve) => setMock({ amount: start.amount, orderNumber: order.number, resolve }));
      setMock(null);
      if (choice === 'cancel') return { status: 'cancelled' };
      const r = await mockPayment({ ...order, outcome: choice === 'pay' ? 'paid' : 'failed' });
      if (!r.ok) return { status: 'failed', message: r.error };
      return choice === 'pay' ? { status: 'paid' } : { status: 'failed', message: 'The payment was declined. You can try again or choose another way to pay.' };
    }
    if (!(await loadRazorpay()) || !window.Razorpay) return { status: 'failed', message: 'We couldn’t open the payment window. Check your connection and try again.' };
    const Razorpay = window.Razorpay;
    return new Promise<PaymentOutcome>((resolve) => {
      let settled = false;
      const done = (o: PaymentOutcome) => {
        if (!settled) {
          settled = true;
          resolve(o);
        }
      };
      const rzp = new Razorpay({
        key: start.keyId,
        amount: start.amount,
        currency: 'INR',
        name: 'PrintYourVibe',
        description: `Order ${order.number}`,
        order_id: start.razorpayOrderId,
        prefill: start.prefill,
        theme: { color: '#c6ff3d' },
        handler: async (resp: RazorpayResponse) => {
          const r = await confirmPayment({ ...order, razorpayOrderId: resp.razorpay_order_id, razorpayPaymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature });
          done(r.ok ? { status: 'paid' } : { status: 'failed', message: r.error });
        },
        modal: { ondismiss: () => done({ status: 'cancelled' }) },
      });
      rzp.open();
    });
  }, []);

  const sheet = mock ? <MockPaymentSheet amount={mock.amount} orderNumber={mock.orderNumber} onChoose={(c) => mock.resolve(c)} /> : null;
  return { run, sheet };
}
