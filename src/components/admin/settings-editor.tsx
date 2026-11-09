'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { saveSettingsAction } from '@/actions/admin/settings';
import { Field, inputClass } from '@/components/checkout/fields';
import { CloseIcon, PlusIcon } from '@/components/icons';
import type { SettingsForm } from '@/lib/admin/settings-form';
import { cn } from '@/lib/cn';

type Err = { field?: string; text: string } | null;
const idOf = (field: string) => `st-${field.replace(/\./g, '-')}`;
const small = 'max-w-[150px]';

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 rounded-card border border-line bg-surface p-4 sm:p-5">
      <div>
        <h2 className="font-display text-xl uppercase">{title}</h2>
        {hint && <p className="mt-1 max-w-[70ch] text-sm text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Check({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex items-start gap-3 text-[15px]">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 size-4 accent-[var(--color-lime)]" />
      <span>
        <span className="font-semibold">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

/** `onlinePayments` is false while no Razorpay keys are set: COD is then the only way to pay, with relaxed rules (see codCheck). */
export function SettingsEditor({ initial, types, onlinePayments }: { initial: SettingsForm; types: Array<{ id: string; name: string }>; onlinePayments: boolean }) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [error, setError] = useState<Err>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const up = (fn: (d: SettingsForm) => void) => {
    setF((cur) => {
      const d = structuredClone(cur);
      fn(d);
      return d;
    });
    setSaved(false);
    setError(null);
  };
  const err = (field: string) => (error?.field === field ? error.text : undefined);
  const text = (field: string, label: string, value: string, set: (d: SettingsForm, v: string) => void, opts: { hint?: string; optional?: boolean; money?: boolean; className?: string; type?: string; placeholder?: string } = {}) => (
    <Field id={idOf(field)} label={label} hint={opts.hint} optional={opts.optional} error={err(field)} className={opts.className}>
      <input
        id={idOf(field)}
        type={opts.type ?? 'text'}
        inputMode={opts.money ? 'decimal' : undefined}
        value={value}
        placeholder={opts.placeholder}
        onChange={(e) => up((d) => set(d, e.target.value))}
        className={cn(inputClass(err(field)), opts.money && small)}
        aria-invalid={err(field) ? true : undefined}
        aria-describedby={err(field) ? `${idOf(field)}-error` : opts.hint ? `${idOf(field)}-hint` : undefined}
      />
    </Field>
  );
  const days = (k: 'metroDays' | 'standardDays' | 'remoteDays', label: string) => (
    <fieldset className="grid gap-1.5" id={idOf(`delivery.${k}`)} tabIndex={-1}>
      <legend className="mb-1.5 text-[12.5px] font-bold uppercase tracking-[0.07em]">{label}</legend>
      <div className="flex items-center gap-2 text-sm text-muted">
        {[0, 1].map((i) => (
          <span key={i} className="contents">
            {i === 1 && 'to'}
            <input
              inputMode="numeric"
              aria-label={`${label}, ${i === 0 ? 'fewest' : 'most'} days`}
              value={f.delivery[k][i]}
              onChange={(e) => up((d) => (d.delivery[k][i] = e.target.value.replace(/\D/g, '')))}
              className={cn(inputClass(err(`delivery.${k}`)), 'w-16 text-center')}
            />
          </span>
        ))}
        days
      </div>
      {err(`delivery.${k}`) && <p className="text-[13px] font-semibold text-red">{err(`delivery.${k}`)}</p>}
    </fieldset>
  );

  const save = async () => {
    setBusy(true);
    const r = await saveSettingsAction(f);
    setBusy(false);
    if (!r.ok) {
      setError({ field: r.field, text: r.error });
      requestAnimationFrame(() => {
        const el = document.getElementById(r.field ? idOf(r.field) : 'st-status');
        el?.scrollIntoView({ block: 'center' });
        el?.focus();
      });
      return;
    }
    setSaved(true);
    router.refresh();
  };

  return (
    <form
      className="grid max-w-4xl gap-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <Section title="Announcement bar" hint="The messages that scroll along the top of every page. One per line, up to 5.">
        <Field id={idOf('announcement')} label="Messages" error={err('announcement')}>
          <textarea id={idOf('announcement')} rows={4} value={f.announcement} onChange={(e) => up((d) => (d.announcement = e.target.value))} className={cn(inputClass(err('announcement')), 'py-2.5')} />
        </Field>
      </Section>

      <Section title="Shipping and delivery" hint="Delivery days are shown on product pages and at checkout, by pincode.">
        <div className="grid gap-4 sm:grid-cols-2">
          {text('shipping.freeAbove', 'Free shipping above (₹)', f.shipping.freeAbove, (d, v) => (d.shipping.freeAbove = v), { money: true, hint: 'After offers and coupons. 0 makes shipping always free.' })}
          {text('shipping.fee', 'Shipping fee (₹)', f.shipping.fee, (d, v) => (d.shipping.fee = v), { money: true })}
          {text('platformFee', 'Platform fee (₹)', f.platformFee, (d, v) => (d.platformFee = v), { money: true, hint: 'Added to every order and shown in the cart before checkout. 0 for none.' })}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {days('metroDays', 'Metro cities')}
          {days('standardDays', 'Most of India')}
          {days('remoteDays', 'North-east, J&K, islands')}
        </div>
      </Section>

      <Section title="Cash on Delivery">
        {!onlinePayments && (
          <p className="rounded-[3px] border border-orange/50 bg-orange/10 px-3.5 py-2.5 text-[13.5px] font-semibold text-orange">
            Online payments aren’t set up yet, so Cash on Delivery is the only way to pay. Until you add Razorpay, COD has no smallest order and covers custom prints. The settings below apply once online payments are on.
          </p>
        )}
        <Check checked={f.cod.enabled} onChange={(v) => up((d) => (d.cod.enabled = v))} label="Offer Cash on Delivery" />
        <div className="grid gap-4 sm:grid-cols-3">
          {text('cod.fee', 'COD fee (₹)', f.cod.fee, (d, v) => (d.cod.fee = v), { money: true })}
          {text('cod.min', 'Smallest order (₹)', f.cod.min, (d, v) => (d.cod.min = v), { money: true })}
          {text('cod.max', 'Largest order (₹)', f.cod.max, (d, v) => (d.cod.max = v), { money: true })}
        </div>
        <Check
          checked={f.cod.allowCustom}
          onChange={(v) => up((d) => (d.cod.allowCustom = v))}
          label="Allow COD on custom-printed items"
          hint="Off by default: a refused parcel of someone’s own photos can’t be sold to anyone else."
        />
      </Section>

      <Section title="Online payment discount" hint={`An extra discount for paying online, to win shoppers over from COD.${onlinePayments ? '' : ' It applies once online payments are set up.'}`}>
        <div className="grid gap-4 sm:grid-cols-2">
          {text('prepaidDiscount.percent', 'Percent off', f.prepaidDiscount.percent, (d, v) => (d.prepaidDiscount.percent = v.replace(/\D/g, '')), { money: true, hint: '0 to switch it off' })}
          {text('prepaidDiscount.max', 'At most (₹)', f.prepaidDiscount.max, (d, v) => (d.prepaidDiscount.max = v), { money: true })}
        </div>
      </Section>

      <Section title="Sticker packs" hint="“Any 10 stickers for ₹199”: the shopper picks any stickers that count, and the cheapest mix of packs is applied.">
        <Check checked={f.packs.enabled} onChange={(v) => up((d) => (d.packs.enabled = v))} label="Offer sticker packs" />
        <ul className="grid gap-2">
          {f.packs.tiers.map((t, i) => (
            <li key={i} id={idOf(`packs.tiers.${i}`)} tabIndex={-1} className="grid gap-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted">Any</span>
                <input inputMode="numeric" aria-label={`Pack ${i + 1}: number of stickers`} value={t.qty} onChange={(e) => up((d) => (d.packs.tiers[i].qty = e.target.value.replace(/\D/g, '')))} className={cn(inputClass(err(`packs.tiers.${i}`)), 'w-20 text-center')} />
                <span className="text-muted">stickers for ₹</span>
                <input inputMode="decimal" aria-label={`Pack ${i + 1}: price in rupees`} value={t.price} onChange={(e) => up((d) => (d.packs.tiers[i].price = e.target.value))} className={cn(inputClass(err(`packs.tiers.${i}`)), 'w-24')} />
                <button type="button" onClick={() => up((d) => d.packs.tiers.splice(i, 1))} aria-label={`Remove pack ${i + 1}`} className="grid size-9 place-items-center text-muted hover:text-red">
                  <CloseIcon size={16} />
                </button>
              </div>
              {err(`packs.tiers.${i}`) && <p className="text-[13px] font-semibold text-red">{err(`packs.tiers.${i}`)}</p>}
            </li>
          ))}
        </ul>
        {f.packs.tiers.length < 5 && (
          <button type="button" className="btn btn-ghost btn-sm justify-self-start" onClick={() => up((d) => d.packs.tiers.push({ qty: '', price: '' }))}>
            <PlusIcon size={15} /> Add a pack size
          </button>
        )}
      </Section>

      <Section title="Buy X, get Y free" hint="The cheapest items in each group are free, like “Buy 3 posters, get 1 free”.">
        {f.bxgy.map((b, i) => (
          <div key={i} id={idOf(`bxgy.${i}`)} tabIndex={-1} className="grid gap-3 rounded-[3px] border border-line bg-bg p-3">
            <div className="flex flex-wrap items-end gap-3">
              <Field id={`st-bxgy-${i}-label`} label="Name shoppers see" className="min-w-[220px] flex-1">
                <input id={`st-bxgy-${i}-label`} value={b.label} onChange={(e) => up((d) => (d.bxgy[i].label = e.target.value))} className={inputClass(err(`bxgy.${i}`))} />
              </Field>
              <label className="grid gap-1.5 text-[12.5px] font-bold uppercase tracking-[0.07em]">
                Buy
                <input inputMode="numeric" value={b.buy} onChange={(e) => up((d) => (d.bxgy[i].buy = e.target.value.replace(/\D/g, '')))} className={cn(inputClass(), 'w-16 text-center')} />
              </label>
              <label className="grid gap-1.5 text-[12.5px] font-bold uppercase tracking-[0.07em]">
                Free
                <input inputMode="numeric" value={b.free} onChange={(e) => up((d) => (d.bxgy[i].free = e.target.value.replace(/\D/g, '')))} className={cn(inputClass(), 'w-16 text-center')} />
              </label>
            </div>
            <fieldset>
              <legend className="mb-1.5 text-[12.5px] font-bold uppercase tracking-[0.07em]">Counts for</legend>
              <div className="flex flex-wrap gap-1.5">
                {types.map((t) => {
                  const on = b.types.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      aria-pressed={on}
                      className="chip min-h-8 px-2.5 text-[12px]"
                      onClick={() => up((d) => (d.bxgy[i].types = on ? d.bxgy[i].types.filter((x) => x !== t.id) : [...d.bxgy[i].types, t.id]))}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Check checked={b.enabled} onChange={(v) => up((d) => (d.bxgy[i].enabled = v))} label="Running now" />
              <button type="button" className="text-sm text-muted hover:text-red" onClick={() => up((d) => d.bxgy.splice(i, 1))}>
                Remove this offer
              </button>
            </div>
            {err(`bxgy.${i}`) && <p className="text-[13px] font-semibold text-red">{err(`bxgy.${i}`)}</p>}
          </div>
        ))}
        {f.bxgy.length < 5 && (
          <button type="button" className="btn btn-ghost btn-sm justify-self-start" onClick={() => up((d) => d.bxgy.push({ id: '', label: '', enabled: true, types: [], buy: '2', free: '1' }))}>
            <PlusIcon size={15} /> Add an offer
          </button>
        )}
      </Section>

      <Section title="Contact" hint="Shown on the contact page, packing slips and the WhatsApp button.">
        <div className="grid gap-4 sm:grid-cols-2">
          {text('contact.email', 'Support email', f.contact.email, (d, v) => (d.contact.email = v), { type: 'email', optional: true, hint: 'New-order alerts go here unless ORDER_ALERT_EMAIL is set.' })}
          {text('contact.phone', 'Phone', f.contact.phone, (d, v) => (d.contact.phone = v), { optional: true })}
          {text('contact.whatsapp', 'WhatsApp number', f.contact.whatsapp, (d, v) => (d.contact.whatsapp = v), { optional: true, hint: 'The chat button on every page opens a chat with this number.' })}
          {text('contact.whatsappAlt', 'Second WhatsApp number', f.contact.whatsappAlt, (d, v) => (d.contact.whatsappAlt = v), { optional: true, hint: 'With two numbers, the chat button lets shoppers choose.' })}
          {text('contact.hours', 'Hours', f.contact.hours, (d, v) => (d.contact.hours = v))}
        </div>
        {text('contact.address', 'Address', f.contact.address, (d, v) => (d.contact.address = v), { optional: true })}
      </Section>

      <Section title="Social links" hint="Full links to your profiles. They appear in the footer.">
        <div className="grid gap-4 sm:grid-cols-2">
          {text('social.instagram', 'Instagram', f.social.instagram, (d, v) => (d.social.instagram = v), { optional: true, placeholder: 'https://instagram.com/yourstore' })}
          {text('social.youtube', 'YouTube', f.social.youtube, (d, v) => (d.social.youtube = v), { optional: true, placeholder: 'https://youtube.com/@yourstore' })}
          {text('social.facebook', 'Facebook', f.social.facebook, (d, v) => (d.social.facebook = v), { optional: true, placeholder: 'https://facebook.com/yourstore' })}
          {text('social.x', 'X (Twitter)', f.social.x, (d, v) => (d.social.x = v), { optional: true, placeholder: 'https://x.com/yourstore' })}
        </div>
      </Section>

      <Section title="Business details" hint="Printed on receipts, packing slips and your policy pages.">
        <div className="grid gap-4 sm:grid-cols-2">
          {text('business.name', 'Registered business name', f.business.name, (d, v) => (d.business.name = v))}
          {text('business.gstin', 'GSTIN', f.business.gstin, (d, v) => (d.business.gstin = v.toUpperCase()), { optional: true })}
        </div>
        {text('business.address', 'Business address', f.business.address, (d, v) => (d.business.address = v), { optional: true })}
        <div className="grid gap-4 sm:grid-cols-2">
          {text('business.city', 'City for legal matters', f.business.city, (d, v) => (d.business.city = v), { hint: 'The terms say courts in this city decide any dispute.' })}
          {text('business.policiesUpdated', 'Policies last reviewed', f.business.policiesUpdated, (d, v) => (d.business.policiesUpdated = v), { type: 'date', optional: true, hint: 'Shown as “Last updated” on the privacy policy and terms.' })}
          {text('business.grievanceName', 'Grievance officer', f.business.grievanceName, (d, v) => (d.business.grievanceName = v), { hint: 'Indian e-commerce rules ask online sellers to name one. Often the owner.' })}
          {text('business.grievanceDesignation', 'Their role', f.business.grievanceDesignation, (d, v) => (d.business.grievanceDesignation = v), { placeholder: 'Founder' })}
        </div>
      </Section>

      <Section title="About us" hint="Your story, shown on the About page: who you are, where you’re based and what makes your prints special.">
        <Field id={idOf('aboutStory')} label="Story" error={err('aboutStory')}>
          <textarea id={idOf('aboutStory')} rows={5} maxLength={1500} value={f.aboutStory} onChange={(e) => up((d) => (d.aboutStory = e.target.value))} className={cn(inputClass(err('aboutStory')), 'py-2.5')} />
        </Field>
      </Section>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-card sm:border">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save settings'}
        </button>
        <p id="st-status" tabIndex={-1} className={cn('text-sm font-semibold', error ? 'text-red' : 'text-lime')} role="status">
          {error ? error.text : saved ? 'Saved. The store uses the new settings now.' : ''}
        </p>
      </div>
    </form>
  );
}
