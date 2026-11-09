'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { cancelMyOrderAction, submitFeedbackAction } from '@/actions/orders';
import { inputClass } from '@/components/checkout/fields';
import { cn } from '@/lib/cn';
import { CANCEL_REASONS } from '@/lib/orders/status';

type OrderRef = { number: string; key: string };

/** "Cancel order" on the shopper's order page: a dialog asks why, then cancels it. */
export function CancelOrder({ order, paid }: { order: OrderRef; paid: boolean }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [other, setOther] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const submit = async () => {
    if (!reason) return setError('Choose why you’re cancelling.');
    if (reason === 'other' && other.trim().length < 3) return setError('Tell us in a few words why you’re cancelling.');
    setBusy(true);
    setError(null);
    const r = await cancelMyOrderAction({ number: order.number, key: order.key, reason, other });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm justify-self-start text-red" onClick={() => setOpen(true)}>
        Cancel order
      </button>
      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        aria-labelledby={`${id}-title`}
        className="m-auto w-[min(92vw,460px)] max-w-none rounded-card border border-line-2 bg-surface p-0 text-ink shadow-[0_30px_80px_rgba(0,0,0,0.6)] backdrop:bg-black/75"
      >
        <form
          className="grid gap-4 p-4 sm:p-5"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <h2 id={`${id}-title`} className="font-display text-xl uppercase">
            Cancel order {order.number}?
          </h2>
          <fieldset className="grid gap-1">
            <legend className="mb-2 text-sm text-muted">Please tell us why. It helps us do better.</legend>
            {CANCEL_REASONS.map((r) => (
              <label key={r.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[3px] px-2 hover:bg-surface-2">
                <input type="radio" name={`${id}-reason`} value={r.id} checked={reason === r.id} onChange={() => (setReason(r.id), setError(null))} className="size-4 accent-[var(--color-lime)]" />
                {r.label}
              </label>
            ))}
          </fieldset>
          {reason === 'other' && (
            <label className="grid gap-1.5" htmlFor={`${id}-other`}>
              <span className="text-[12.5px] font-bold uppercase tracking-[0.07em]">Your reason</span>
              <textarea id={`${id}-other`} rows={2} maxLength={200} value={other} onChange={(e) => setOther(e.target.value)} className={cn(inputClass(), 'py-2.5')} />
            </label>
          )}
          {paid && <p className="text-sm text-muted">You paid online, so we’ll refund the full amount to the same account.</p>}
          {error && (
            <p role="alert" className="text-sm font-semibold text-red">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              Keep my order
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Cancelling…' : 'Cancel the order'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

const WORDS = ['', 'Poor', 'Not great', 'Okay', 'Good', 'Loved it'];

/** "How was shopping with us?" on the order page, right after ordering: stars and an optional comment. */
export function OrderFeedback({ order }: { order: OrderRef }) {
  const id = useId();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!rating) return setError('Choose from 1 to 5 stars.');
    setBusy(true);
    setError(null);
    const r = await submitFeedbackAction({ number: order.number, key: order.key, rating, comment });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setDone(true);
  };

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-card border border-line bg-surface p-4 sm:p-5">
      <h2 id={`${id}-title`} className="section-title mb-1">
        How was shopping with us?
      </h2>
      {done ? (
        <p role="status" className="text-sm text-lime">
          Thank you! Your feedback helps us make PrintYourVibe better.
        </p>
      ) : (
        <form
          className="grid gap-3"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <p className="text-sm text-muted">Rate your shopping experience. Once your order arrives, you can review the products too.</p>
          <fieldset>
            <legend className="sr-only">Your rating</legend>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="cursor-pointer">
                  <input type="radio" name={`${id}-rating`} value={n} checked={rating === n} onChange={() => (setRating(n), setError(null))} className="peer sr-only" />
                  <span
                    aria-hidden="true"
                    className={cn('grid size-10 place-items-center text-[28px] leading-none transition peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-cyan', n <= rating ? 'text-lime' : 'text-line-2 hover:text-muted')}
                  >
                    ★
                  </span>
                  <span className="sr-only">
                    {n} star{n === 1 ? '' : 's'}: {WORDS[n]}
                  </span>
                </label>
              ))}
              <span className="ml-2 text-sm text-muted">{WORDS[rating]}</span>
            </div>
          </fieldset>
          <label className="grid gap-1.5" htmlFor={`${id}-comment`}>
            <span className="text-[12.5px] font-bold uppercase tracking-[0.07em]">
              Anything to add? <span className="font-semibold normal-case tracking-normal text-muted">(optional)</span>
            </span>
            <textarea id={`${id}-comment`} rows={2} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} className={cn(inputClass(), 'py-2.5')} />
          </label>
          {error && (
            <p role="alert" className="text-sm font-semibold text-red">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary justify-self-start" disabled={busy}>
            {busy ? 'Sending…' : 'Send feedback'}
          </button>
        </form>
      )}
    </section>
  );
}
