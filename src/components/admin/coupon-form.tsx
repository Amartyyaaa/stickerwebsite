'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { deleteCouponAction, saveCouponAction, setCouponActiveAction } from '@/actions/admin/coupons';
import { described, Field, inputClass } from '@/components/checkout/fields';
import type { CouponForm as Form } from '@/lib/admin/coupon-form';
import { cn } from '@/lib/cn';

const EMPTY: Form = { code: '', kind: 'percent', value: '10', minOrder: '', maxDiscount: '', startsOn: '', endsOn: '', usageLimit: '', perCustomer: '1', isActive: true, note: '' };

const KINDS: Array<{ id: Form['kind']; label: string; hint: string }> = [
  { id: 'percent', label: 'Percent off', hint: 'Like 10% off, with an optional cap' },
  { id: 'flat', label: 'Amount off', hint: 'Like ₹50 off' },
  { id: 'shipping', label: 'Free shipping', hint: 'Waives the shipping fee' },
];

export function CouponForm({ id, initial, usedCount = 0 }: { id: number | null; initial?: Form; usedCount?: number }) {
  const router = useRouter();
  const [f, setF] = useState<Form>(initial ?? EMPTY);
  const [error, setError] = useState<{ field?: keyof Form; text: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    setSaved(false);
    if (error) setError(null);
  };
  const err = (k: keyof Form) => (error?.field === k ? error.text : undefined);

  const save = async () => {
    setBusy(true);
    const r = await saveCouponAction({ id, ...f });
    setBusy(false);
    if (!r.ok) {
      setError({ field: r.field, text: r.error });
      requestAnimationFrame(() => document.getElementById(r.field ? `cp-${r.field}` : 'cp-status')?.focus());
      return;
    }
    if (!id) return router.replace('/admin/coupons?saved=1');
    setSaved(true);
    router.refresh();
  };

  return (
    <form
      className="grid max-w-3xl gap-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <section className="grid gap-4 rounded-card border border-line bg-surface p-4 sm:p-5">
        <h2 className="font-display text-xl uppercase">Offer</h2>
        <Field id="cp-code" label="Code" error={err('code')} hint="What shoppers type at checkout. Letters and numbers, like WELCOME10.">
          <input
            id="cp-code"
            value={f.code}
            maxLength={24}
            autoCapitalize="characters"
            spellCheck={false}
            onChange={(e) => set('code', e.target.value.toUpperCase().replace(/\s+/g, ''))}
            className={cn(inputClass(err('code')), 'max-w-xs font-semibold uppercase tracking-[0.08em]')}
            {...described('cp-code', err('code'), 'x')}
          />
        </Field>
        <fieldset className="grid gap-2">
          <legend className="mb-1.5 text-[12.5px] font-bold uppercase tracking-[0.07em]">Discount</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {KINDS.map((k) => (
              <label key={k.id} className={cn('flex cursor-pointer gap-2.5 rounded-[3px] border p-3', f.kind === k.id ? 'border-lime bg-lime/5' : 'border-line-2')}>
                <input type="radio" name="kind" checked={f.kind === k.id} onChange={() => set('kind', k.id)} className="mt-1 accent-lime" />
                <span className="grid gap-0.5">
                  <span className="font-semibold">{k.label}</span>
                  <span className="text-xs text-muted">{k.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-3">
          {f.kind !== 'shipping' && (
            <Field id="cp-value" label={f.kind === 'percent' ? 'Percent off' : 'Amount off (₹)'} error={err('value')}>
              <input id="cp-value" inputMode="decimal" value={f.value} onChange={(e) => set('value', e.target.value)} className={inputClass(err('value'))} {...described('cp-value', err('value'))} />
            </Field>
          )}
          {f.kind === 'percent' && (
            <Field id="cp-maxDiscount" label="At most (₹)" optional error={err('maxDiscount')}>
              <input id="cp-maxDiscount" inputMode="decimal" value={f.maxDiscount} onChange={(e) => set('maxDiscount', e.target.value)} placeholder="No cap" className={inputClass(err('maxDiscount'))} {...described('cp-maxDiscount', err('maxDiscount'))} />
            </Field>
          )}
          <Field id="cp-minOrder" label="Minimum order (₹)" optional error={err('minOrder')} hint="After other offers">
            <input id="cp-minOrder" inputMode="decimal" value={f.minOrder} onChange={(e) => set('minOrder', e.target.value)} placeholder="None" className={inputClass(err('minOrder'))} {...described('cp-minOrder', err('minOrder'), 'x')} />
          </Field>
        </div>
      </section>

      <section className="grid gap-4 rounded-card border border-line bg-surface p-4 sm:p-5">
        <h2 className="font-display text-xl uppercase">When and how often</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="cp-startsOn" label="First day" optional error={err('startsOn')}>
            <input id="cp-startsOn" type="date" value={f.startsOn} onChange={(e) => set('startsOn', e.target.value)} className={inputClass(err('startsOn'))} {...described('cp-startsOn', err('startsOn'))} />
          </Field>
          <Field id="cp-endsOn" label="Last day" optional error={err('endsOn')} hint="Works until midnight, Indian time">
            <input id="cp-endsOn" type="date" value={f.endsOn} onChange={(e) => set('endsOn', e.target.value)} className={inputClass(err('endsOn'))} {...described('cp-endsOn', err('endsOn'), 'x')} />
          </Field>
          <Field id="cp-usageLimit" label="Uses in all" optional error={err('usageLimit')} hint={usedCount ? `Used ${usedCount} time${usedCount === 1 ? '' : 's'} so far` : 'Empty for no limit'}>
            <input id="cp-usageLimit" inputMode="numeric" value={f.usageLimit} onChange={(e) => set('usageLimit', e.target.value.replace(/\D/g, ''))} className={inputClass(err('usageLimit'))} {...described('cp-usageLimit', err('usageLimit'), 'x')} />
          </Field>
          <Field id="cp-perCustomer" label="Uses per shopper" optional error={err('perCustomer')} hint="Counted by email. Empty for no limit">
            <input id="cp-perCustomer" inputMode="numeric" value={f.perCustomer} onChange={(e) => set('perCustomer', e.target.value.replace(/\D/g, ''))} className={inputClass(err('perCustomer'))} {...described('cp-perCustomer', err('perCustomer'), 'x')} />
          </Field>
        </div>
        <Field id="cp-note" label="Private note" optional error={err('note')} hint="Only you see this, like “Instagram giveaway, Nov”.">
          <input id="cp-note" value={f.note} maxLength={200} onChange={(e) => set('note', e.target.value)} className={inputClass(err('note'))} {...described('cp-note', err('note'), 'x')} />
        </Field>
        <label className="flex items-center gap-3 text-[15px]">
          <input type="checkbox" checked={f.isActive} onChange={(e) => set('isActive', e.target.checked)} className="size-4 accent-[var(--color-lime)]" />
          <span className="font-semibold">Switched on</span>
        </label>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : id ? 'Save changes' : 'Create coupon'}
        </button>
        {id && usedCount === 0 && (
          <button
            type="button"
            className="btn btn-ghost btn-sm border-red/50 text-red hover:border-red hover:text-red"
            disabled={busy}
            onClick={async () => {
              if (!window.confirm(`Delete ${f.code}?`)) return;
              const r = await deleteCouponAction({ id });
              if (!r.ok) return setError({ text: r.error });
              router.replace('/admin/coupons');
            }}
          >
            Delete
          </button>
        )}
        <p id="cp-status" tabIndex={-1} className={cn('text-sm font-semibold', error && !error.field ? 'text-red' : 'text-lime')} role="status">
          {error && !error.field ? error.text : saved ? 'Saved. It applies at checkout straight away.' : ''}
        </p>
      </div>
    </form>
  );
}

/** On/off switch in the coupon list. */
export function CouponToggle({ id, isActive, code }: { id: number; isActive: boolean; code: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="chip min-h-8 px-2.5 text-[12px]"
      aria-pressed={isActive}
      aria-label={`${code} ${isActive ? 'on' : 'off'}`}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await setCouponActiveAction({ id, isActive: !isActive });
        setBusy(false);
        router.refresh();
      }}
    >
      {isActive ? 'On' : 'Off'}
    </button>
  );
}
