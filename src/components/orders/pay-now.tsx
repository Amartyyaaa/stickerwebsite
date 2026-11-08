'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { resumePayment } from '@/actions/checkout';
import { usePayment } from '@/components/checkout/use-payment';
import { formatINR } from '@/lib/money';

/** "Pay now" for an order that was placed but not paid yet. */
export function PayNow({ number, accessKey, amount }: { number: string; accessKey: string; amount: number }) {
  const router = useRouter();
  const pay = usePayment();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const go = async () => {
    setBusy(true);
    setMessage(null);
    const r = await resumePayment({ number, key: accessKey });
    if (!r.ok) {
      setMessage(r.error);
      setBusy(false);
      return;
    }
    const out = await pay.run({ number, key: accessKey }, r.payment);
    setBusy(false);
    if (out.status === 'paid') router.refresh();
    else setMessage(out.status === 'cancelled' ? 'Payment cancelled. You can pay whenever you’re ready.' : out.message);
  };
  return (
    <div className="grid gap-2">
      <button type="button" className="btn btn-primary" onClick={go} disabled={busy}>
        {busy ? 'Please wait…' : `Pay ${formatINR(amount)} now`}
      </button>
      {message && (
        <p role="status" className="text-sm font-semibold text-orange">
          {message}
        </p>
      )}
      {pay.sheet}
    </div>
  );
}
