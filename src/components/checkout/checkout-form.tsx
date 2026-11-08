'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { placeOrder } from '@/actions/checkout';
import { Art } from '@/components/art';
import { QuoteSummary } from '@/components/cart/cart-parts';
import { requestLines, useQuote } from '@/components/cart/use-quote';
import { AlertIcon, CardIcon, CheckIcon, TruckIcon } from '@/components/icons';
import { cn } from '@/lib/cn';
import { designSummary } from '@/lib/custom/studios';
import { deliveryWindow, formatDeliveryDate, isPincode } from '@/lib/delivery';
import { AddressInput, ContactInput, fieldErrors, formatPhone } from '@/lib/india';
import { formatINR } from '@/lib/money';
import type { PaymentStart } from '@/lib/orders/checkout-types';
import { codCheck } from '@/lib/orders/cod';
import type { StoreSettings } from '@/lib/settings';
import { useCart } from '@/lib/store/cart';
import { AddressFields, EMPTY_ADDRESS, type AddressDraft } from './address-fields';
import { described, Field, inputClass } from './fields';
import { usePayment } from './use-payment';

export interface SavedAddress extends AddressDraft {
  id: number;
  phone: string;
  isDefault: boolean;
}

type Mode = 'razorpay' | 'mock' | 'off';
type Settings = Pick<StoreSettings, 'cod' | 'delivery' | 'prepaidDiscount'>;

const newKey = () => (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).replace(/[^A-Za-z0-9]/g, '').slice(0, 40);
const pickAddress = (a: SavedAddress): AddressDraft => ({ name: a.name, line1: a.line1, line2: a.line2, landmark: a.landmark, city: a.city, state: a.state, pincode: a.pincode });

function Section({ n, title, children, aside }: { n: number; title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-surface/60 p-4 sm:p-6" aria-labelledby={`step-${n}`}>
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`step-${n}`} className="flex items-baseline gap-2.5 font-display text-2xl uppercase">
          <span className="text-lime">{n}</span> {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function CheckoutForm({ viewer, addresses, settings, mode }: { viewer: { email: string } | null; addresses: SavedAddress[]; settings: Settings; mode: Mode }) {
  const router = useRouter();
  const clear = useCart((s) => s.clear);
  const first = addresses.find((a) => a.isDefault) ?? addresses[0];
  const [contact, setContact] = useState({ email: viewer?.email ?? '', phone: first?.phone ?? '' });
  const [address, setAddress] = useState<AddressDraft>(first ? pickAddress(first) : EMPTY_ADDRESS);
  const [chosen, setChosen] = useState<number | 'new'>(first?.id ?? 'new');
  const [save, setSave] = useState(true);
  const [payment, setPayment] = useState<'online' | 'cod'>(mode === 'off' ? 'cod' : 'online');
  const [nonce, setNonce] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: 'error' | 'info'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [pending, setPending] = useState<{ number: string; key: string; start: PaymentStart } | null>(null);
  const attempt = useRef<{ sig: string; key: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const pay = usePayment();
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponText, setCouponText] = useState('');
  const [coupon, setCoupon] = useState('');
  const email = contact.email.trim();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const { data, loading, lines, hydrated } = useQuote({ payment, nonce, coupon: coupon || undefined, email: coupon && emailOk ? email : undefined });
  const s = data?.summary;
  const couponState = coupon && !loading ? s?.coupon : undefined;
  const applyCoupon = () => {
    const code = couponText.trim().toUpperCase().replace(/\s+/g, '');
    if (code) setCoupon(code);
  };
  // COD depends only on the order value (items after offers, plus shipping), which is the same whichever method is picked.
  const cod = s ? codCheck(settings, s.subtotal - s.discountTotal + s.shipping, lines.some((l) => l.custom)) : ({ ok: true } as const);
  if (payment === 'cod' && !cod.ok && mode !== 'off') setPayment('online');
  const effective = payment;
  const blocked = mode === 'off' && !cod.ok;

  if (leaving) {
    return <p className="py-20 text-center text-muted">Opening your order…</p>;
  }
  if (hydrated && lines.length === 0) {
    return (
      <div className="grid justify-items-center gap-4 py-20 text-center">
        <p className="font-display text-3xl uppercase">Your cart is empty</p>
        <p className="text-muted">Add something you love, then come back to check out.</p>
        <Link href="/shop" className="btn btn-primary">
          Browse designs
        </Link>
      </div>
    );
  }

  const finish = (number: string, key: string) => {
    setLeaving(true);
    clear();
    router.push(`/order/${number}?key=${encodeURIComponent(key)}&placed=1`);
  };

  const runPayment = async (p: { number: string; key: string; start: PaymentStart }) => {
    setPending(p);
    setBusy(true);
    setMessage(null);
    const out = await pay.run({ number: p.number, key: p.key }, p.start);
    if (out.status === 'paid') return finish(p.number, p.key);
    setBusy(false);
    setMessage(
      out.status === 'cancelled'
        ? { tone: 'info', text: `Payment cancelled. Your order ${p.number} is saved: pay below to complete it.` }
        : { tone: 'error', text: out.message },
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!s || loading || busy || blocked) return;
    const c = ContactInput.safeParse(contact);
    const a = AddressInput.omit({ phone: true }).safeParse(address);
    const local = { ...(c.success ? {} : fieldErrors(c.error, 'contact.')), ...(a.success ? {} : fieldErrors(a.error, 'address.')) };
    if (Object.keys(local).length) {
      setErrors(local);
      setMessage({ tone: 'error', text: 'Please check the highlighted details.' });
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    const sig = JSON.stringify([lines.map((l) => [l.key, l.qty]), effective, contact, address, coupon]);
    if (attempt.current?.sig !== sig) attempt.current = { sig, key: newKey() };
    setBusy(true);
    setErrors({});
    setMessage(null);
    const res = await placeOrder({
      lines: requestLines(lines),
      payment: effective,
      contact,
      address,
      saveAddress: Boolean(viewer) && save && chosen === 'new',
      expectedTotal: s.total,
      idempotencyKey: attempt.current.key,
      // Only a code the price check accepted; one that doesn't apply is simply left out.
      coupon: s.coupon?.applied ? s.coupon.code : undefined,
    });
    if (!res.ok) {
      setBusy(false);
      setErrors(res.fields ?? {});
      setMessage({ tone: 'error', text: res.error });
      if (res.refresh) setNonce((n) => n + 1);
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    if (res.payment.mode === 'cod') return finish(res.number, res.key);
    await runPayment({ number: res.number, key: res.key, start: res.payment });
  };

  /** Clear a field's error as soon as the shopper edits it. */
  const clearErrors = (prefix: string, before: Record<string, string>, after: Record<string, string>) => {
    const changed = Object.keys(after).filter((k) => after[k] !== before[k]);
    if (changed.length && changed.some((k) => errors[`${prefix}.${k}`])) {
      setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !changed.some((c) => k === `${prefix}.${c}`))));
    }
  };
  const updateContact = (next: typeof contact) => {
    clearErrors('contact', contact, next);
    setContact(next);
  };
  const updateAddress = (next: AddressDraft) => {
    clearErrors('address', { ...address }, { ...next });
    setAddress(next);
  };

  const pin = address.pincode;
  const window_ = isPincode(pin) ? deliveryWindow(pin, settings.delivery) : null;
  const pincodeHint = window_ ? `Usually delivered ${formatDeliveryDate(new Date(), window_[0])} to ${formatDeliveryDate(new Date(), window_[1])}` : undefined;
  const total = s?.total ?? 0;
  const err = (k: string) => errors[k];

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-10">
      <div className="grid min-w-0 content-start gap-5">
        {mode === 'mock' && (
          <p className="flex items-start gap-2 rounded-[3px] border border-orange/50 bg-orange/10 px-3.5 py-2.5 text-[13.5px] font-semibold text-orange">
            <AlertIcon size={18} className="mt-px shrink-0" />
            Test mode: online payments open a test screen and no money moves. Add your Razorpay keys to take real payments.
          </p>
        )}
        <Section
          n={1}
          title="Contact"
          aside={
            viewer ? (
              <span className="text-[13px] text-muted">Signed in as {viewer.email}</span>
            ) : (
              <Link href="/account?next=/checkout" className="text-[13px] font-semibold text-lime underline underline-offset-2">
                Sign in for faster checkout
              </Link>
            )
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="contact-email" label="Email" error={err('contact.email')} hint="For your order confirmation and updates">
              <input
                id="contact-email"
                type="email"
                autoComplete="email"
                value={contact.email}
                onChange={(e) => updateContact({ ...contact, email: e.target.value })}
                className={inputClass(err('contact.email'))}
                {...described('contact-email', err('contact.email'), 'For your order confirmation and updates')}
              />
            </Field>
            <Field id="contact-phone" label="Mobile number" error={err('contact.phone')} hint="For delivery and WhatsApp updates">
              <div className="flex">
                <span className="grid min-h-11 place-items-center rounded-l-[2px] border border-r-0 border-line-2 bg-surface-2 px-3 text-[15px] text-muted">+91</span>
                <input
                  id="contact-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  value={contact.phone}
                  onChange={(e) => updateContact({ ...contact, phone: e.target.value.replace(/[^\d ]/g, '').slice(0, 12) })}
                  placeholder="98765 43210"
                  className={cn(inputClass(err('contact.phone')), 'rounded-l-none')}
                  {...described('contact-phone', err('contact.phone'), 'For delivery and WhatsApp updates')}
                />
              </div>
            </Field>
          </div>
        </Section>

        <Section n={2} title="Delivery address">
          {addresses.length > 0 && (
            <fieldset className="mb-5 grid gap-2.5">
              <legend className="mb-2 text-[12.5px] font-bold uppercase tracking-[0.07em]">Your saved addresses</legend>
              {addresses.map((a) => (
                <label key={a.id} className={cn('flex cursor-pointer gap-3 rounded-[3px] border p-3 text-sm', chosen === a.id ? 'border-lime bg-lime/5' : 'border-line-2 hover:border-[#5a5a78]')}>
                  <input
                    type="radio"
                    name="saved-address"
                    checked={chosen === a.id}
                    onChange={() => {
                      setChosen(a.id);
                      setAddress(pickAddress(a));
                      setContact((c) => ({ ...c, phone: a.phone }));
                    }}
                    className="mt-1 accent-lime"
                  />
                  <span>
                    <b>{a.name}</b> · {formatPhone(a.phone)}
                    <br />
                    <span className="text-muted">
                      {[a.line1, a.line2, a.city, `${a.state} ${a.pincode}`].filter(Boolean).join(', ')}
                    </span>
                  </span>
                </label>
              ))}
              <label className={cn('flex cursor-pointer items-center gap-3 rounded-[3px] border p-3 text-sm font-semibold', chosen === 'new' ? 'border-lime bg-lime/5' : 'border-line-2 hover:border-[#5a5a78]')}>
                <input
                  type="radio"
                  name="saved-address"
                  checked={chosen === 'new'}
                  onChange={() => {
                    setChosen('new');
                    setAddress(EMPTY_ADDRESS);
                  }}
                  className="accent-lime"
                />
                Use a new address
              </label>
            </fieldset>
          )}
          <AddressFields
            value={address}
            onChange={(a) => {
              updateAddress(a);
              if (chosen !== 'new') setChosen('new');
            }}
            errors={errors}
            pincodeHint={pincodeHint}
          />
          {viewer && chosen === 'new' && (
            <label className="mt-4 flex items-center gap-2.5 text-sm">
              <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} className="size-4 accent-lime" />
              Save this address to my account
            </label>
          )}
        </Section>

        <Section n={3} title="Payment">
          <fieldset className="grid gap-3">
            <legend className="sr-only">How would you like to pay?</legend>
            <label
              className={cn(
                'flex gap-3 rounded-[3px] border p-4',
                mode === 'off' ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                effective === 'online' && mode !== 'off' ? 'border-lime bg-lime/5' : 'border-line-2',
              )}
            >
              <input type="radio" name="payment" value="online" disabled={mode === 'off'} checked={effective === 'online' && mode !== 'off'} onChange={() => setPayment('online')} className="mt-1 accent-lime" />
              <span className="grid gap-0.5">
                <span className="flex items-center gap-2 font-bold">
                  <CardIcon size={18} className="text-lime" /> Pay online
                  {settings.prepaidDiscount.percent > 0 && (
                    <span className="rounded-[2px] bg-lime px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-bg">Extra {settings.prepaidDiscount.percent}% off</span>
                  )}
                </span>
                <span className="text-[13.5px] text-muted">{mode === 'off' ? 'Online payment isn’t set up yet.' : 'UPI, cards, netbanking and wallets, secured by Razorpay.'}</span>
              </span>
            </label>
            <label className={cn('flex gap-3 rounded-[3px] border p-4', cod.ok ? 'cursor-pointer' : 'cursor-not-allowed opacity-60', effective === 'cod' ? 'border-lime bg-lime/5' : 'border-line-2')}>
              <input type="radio" name="payment" value="cod" disabled={!cod.ok} checked={effective === 'cod'} onChange={() => setPayment('cod')} className="mt-1 accent-lime" />
              <span className="grid gap-0.5">
                <span className="flex items-center gap-2 font-bold">
                  <TruckIcon size={18} className="text-lime" /> Cash on Delivery
                </span>
                <span className="text-[13.5px] text-muted">{cod.ok ? `Pay in cash when it arrives. ${formatINR(settings.cod.fee)} COD fee.` : cod.reason}</span>
              </span>
            </label>
          </fieldset>
          {blocked && <p className="mt-3 text-sm font-semibold text-orange">Online payment isn’t set up yet and Cash on Delivery isn’t available for this order. Please contact us to order.</p>}
        </Section>
      </div>

      <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start" aria-label="Order summary">
        <div className="grid gap-4 rounded-card border border-line bg-surface p-4 sm:p-5">
          <h2 className="font-display text-2xl uppercase">Your order</h2>
          <ul className="grid max-h-[340px] gap-3 overflow-y-auto pr-1">
            {lines.map((l) => {
              const priced = data?.lines.find((x) => x.key === l.key);
              return (
                <li key={l.key} className="flex gap-3 text-sm">
                  <span className="relative size-14 shrink-0 rounded-[4px] border border-line bg-bg p-1">
                    <Art spec={l.art} image={l.image} idPrefix="co" />
                    <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-surface-2 px-1 text-[11px] font-bold leading-5 tabular-nums">{l.qty}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate">{l.name}</b>
                    <span className="block truncate text-[12.5px] text-muted">{(priced?.optionLabels ?? l.optionLabels).join(' · ')}</span>
                    {l.custom && <span className="block truncate text-[12.5px] text-muted">{designSummary(l.custom, l.options)}</span>}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">{formatINR((priced?.unit ?? l.unit) * l.qty)}</span>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-line pt-3">
            {couponState?.applied ? (
              <p className="flex flex-wrap items-center justify-between gap-2 text-sm" role="status">
                <span className="inline-flex items-center gap-1.5 font-semibold text-lime">
                  <CheckIcon size={16} /> {couponState.code} applied{couponState.freeShipping ? ': free shipping' : `: you save ${formatINR(couponState.amount)}`}
                </span>
                <button
                  type="button"
                  className="text-[13px] text-muted underline underline-offset-2 hover:text-ink"
                  onClick={() => {
                    setCoupon('');
                    setCouponText('');
                  }}
                >
                  Remove
                </button>
              </p>
            ) : couponOpen || coupon ? (
              <div className="grid gap-1.5">
                <label htmlFor="coupon-code" className="text-[12.5px] font-bold uppercase tracking-[0.07em]">
                  Coupon code
                </label>
                <div className="flex gap-2">
                  <input
                    id="coupon-code"
                    value={couponText}
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    maxLength={24}
                    onChange={(e) => setCouponText(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        applyCoupon();
                      }
                    }}
                    className={cn(inputClass(couponState?.reason), 'min-h-10 uppercase tracking-[0.06em]')}
                    {...described('coupon-code', couponState?.reason)}
                  />
                  <button type="button" className="btn btn-ghost btn-sm" disabled={!couponText.trim() || (Boolean(coupon) && loading)} onClick={applyCoupon}>
                    {coupon && loading ? 'Checking…' : 'Apply'}
                  </button>
                </div>
                {couponState?.reason && (
                  <p id="coupon-code-error" className="text-[13px] font-semibold text-red" role="alert">
                    {couponState.reason}
                  </p>
                )}
              </div>
            ) : (
              <button type="button" className="text-sm font-semibold text-lime underline underline-offset-2" onClick={() => setCouponOpen(true)}>
                Have a coupon?
              </button>
            )}
          </div>
          <QuoteSummary data={data} loading={loading} note={false} />
          {message && (
            <p role={message.tone === 'error' ? 'alert' : 'status'} className={cn('rounded-[3px] border px-3 py-2 text-[13.5px] font-semibold', message.tone === 'error' ? 'border-red/50 bg-red/10 text-red' : 'border-cyan/40 bg-cyan/5 text-cyan')}>
              {message.text}
            </p>
          )}
          {pending && !busy && effective === 'online' ? (
            <button type="button" className="btn btn-primary w-full" onClick={() => runPayment(pending)}>
              Pay {formatINR(pending.start.mode === 'cod' ? total : pending.start.amount)} for {pending.number}
            </button>
          ) : (
            <button type="submit" className="btn btn-primary w-full" disabled={!s || loading || busy || blocked}>
              {busy ? 'Please wait…' : effective === 'online' ? `Pay ${s ? formatINR(total) : ''}` : `Place order · ${s ? formatINR(total) : ''}`}
            </button>
          )}
          <ul className="grid gap-1.5 text-[12.5px] text-muted">
            <li className="flex items-start gap-2">
              <CheckIcon size={15} className="mt-px shrink-0 text-lime" /> Prices are checked again when you place the order.
            </li>
            <li className="flex items-start gap-2">
              <CheckIcon size={15} className="mt-px shrink-0 text-lime" />
              <span>
                By placing your order you agree to our{' '}
                <Link href="/pages/terms" className="underline underline-offset-2 hover:text-ink">
                  terms
                </Link>{' '}
                and{' '}
                <Link href="/pages/returns" className="underline underline-offset-2 hover:text-ink">
                  returns policy
                </Link>
                .
              </span>
            </li>
          </ul>
        </div>
      </aside>
      {pay.sheet}
    </form>
  );
}
