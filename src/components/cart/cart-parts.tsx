'use client';

import Link from 'next/link';
import { Art } from '@/components/art';
import { MinusIcon, PlusIcon, TrashIcon } from '@/components/icons';
import { cn } from '@/lib/cn';
import { designSummary } from '@/lib/custom/studios';
import { formatINR } from '@/lib/money';
import type { QuoteResponse } from '@/lib/pricing/quote-types';
import { lineHref, MAX_QTY, useCart, type CartLine } from '@/lib/store/cart';

export function QtyStepper({ value, onChange, label, size = 'md' }: { value: number; onChange: (n: number) => void; label: string; size?: 'sm' | 'md' }) {
  const h = size === 'sm' ? 'h-8' : 'h-11';
  return (
    <div className={cn('inline-flex items-center rounded-[2px] border border-line-2', h)} role="group" aria-label={`Quantity for ${label}`}>
      <button type="button" className={cn('grid place-items-center text-ink hover:text-lime', size === 'sm' ? 'w-8' : 'w-11')} onClick={() => onChange(value - 1)} aria-label="Decrease quantity">
        <MinusIcon size={16} />
      </button>
      <output className="min-w-7 text-center text-sm font-bold tabular-nums" aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        className={cn('grid place-items-center text-ink hover:text-lime disabled:opacity-40', size === 'sm' ? 'w-8' : 'w-11')}
        onClick={() => onChange(value + 1)}
        disabled={value >= MAX_QTY}
        aria-label="Increase quantity"
      >
        <PlusIcon size={16} />
      </button>
    </div>
  );
}

export function CartLineRow({ line, priced, onNavigate, compact }: { line: CartLine; priced?: QuoteResponse['lines'][number]; onNavigate?: () => void; compact?: boolean }) {
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const unit = priced?.unit ?? line.unit;
  const labels = priced?.optionLabels ?? line.optionLabels;
  const href = lineHref(line);
  const photos = line.custom?.kind === 'polaroids' ? line.custom.items.length : 0;
  return (
    <li className="flex gap-3 py-4">
      <Link href={href} onClick={onNavigate} className={cn('relative shrink-0 rounded-card border border-line bg-surface p-2', compact ? 'size-20' : 'size-24 sm:size-28')} tabIndex={-1} aria-hidden="true">
        <Art spec={line.art} image={line.image} idPrefix={`cart${compact ? 'd' : 'p'}`} />
        {photos > 1 && (
          <span className="absolute -right-1.5 -top-1.5 grid min-w-6 place-items-center rounded-full bg-lime px-1.5 text-[11px] font-bold leading-6 text-bg tabular-nums">{photos}</span>
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={href} onClick={onNavigate} className="font-display text-[17px] uppercase leading-tight hover:text-lime">
              {line.name}
            </Link>
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">{line.typeName}</p>
            {labels.length > 0 && <p className="mt-0.5 text-[13px] text-muted">{labels.join(' · ')}</p>}
            {line.custom && <p className="mt-0.5 break-all text-[13px] text-ink/85">{designSummary(line.custom, line.options)}</p>}
          </div>
          <p className="shrink-0 font-bold tabular-nums">{formatINR(unit * line.qty)}</p>
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <QtyStepper value={line.qty} onChange={(n) => setQty(line.key, n)} label={line.name} size="sm" />
          <button type="button" onClick={() => remove(line.key)} className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.06em] text-muted hover:text-red">
            <TrashIcon size={15} /> Remove
          </button>
        </div>
      </div>
    </li>
  );
}

export function QuoteHints({ data, onNavigate }: { data: QuoteResponse | null; onNavigate?: () => void }) {
  if (!data?.summary.hints.length) return null;
  return (
    <ul className="grid gap-3">
      {data.summary.hints.map((h) => (
        <li key={h.id} className="text-[13px]">
          <p className={cn('font-semibold', h.done ? 'text-lime' : 'text-ink')}>
            {h.text}
            {h.id === 'packs' && !h.done && (
              <>
                {' '}
                <Link href="/build-your-pack" onClick={onNavigate} className="whitespace-nowrap text-lime underline underline-offset-2 hover:text-lime-2">
                  Build your pack
                </Link>
              </>
            )}
          </p>
          {h.progress !== undefined && (
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
              <div className="h-full rounded-full bg-lime transition-all" style={{ width: `${Math.round(Math.min(1, h.progress) * 100)}%` }} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function QuoteSummary({ data, loading, note = true }: { data: QuoteResponse | null; loading: boolean; note?: boolean }) {
  const s = data?.summary;
  return (
    <div className="grid gap-2">
      <dl className={cn('grid gap-2 text-sm transition-opacity', loading && 'opacity-60')} aria-busy={loading}>
        <div className="flex justify-between">
          <dt className="text-muted">Subtotal</dt>
          <dd className="tabular-nums">{s ? formatINR(s.subtotal) : '…'}</dd>
        </div>
        {s?.discounts.map((d) => (
          <div key={d.id} className="flex justify-between text-lime">
            <dt>{d.label}</dt>
            <dd className="tabular-nums">−{formatINR(d.amount)}</dd>
          </div>
        ))}
        <div className="flex justify-between">
          <dt className="text-muted">Shipping</dt>
          <dd className="tabular-nums">{s ? (s.shipping ? formatINR(s.shipping) : s.coupon?.freeShipping ? `Free with ${s.coupon.code}` : 'Free') : '…'}</dd>
        </div>
        {s && s.codFee > 0 && (
          <div className="flex justify-between">
            <dt className="text-muted">Cash on Delivery fee</dt>
            <dd className="tabular-nums">{formatINR(s.codFee)}</dd>
          </div>
        )}
        {s && s.prepaidDiscount > 0 && (
          <div className="flex justify-between text-lime">
            <dt>Online payment discount</dt>
            <dd className="tabular-nums">−{formatINR(s.prepaidDiscount)}</dd>
          </div>
        )}
        <div className="mt-1 flex items-baseline justify-between border-t border-line pt-3">
          <dt className="font-display text-xl uppercase">Total</dt>
          <dd className="font-display text-2xl tabular-nums text-lime">{s ? formatINR(s.total) : '…'}</dd>
        </div>
      </dl>
      {note && <p className="text-xs text-muted">Pay online for an extra 5% off, or pay Cash on Delivery. Both options are at checkout.</p>}
    </div>
  );
}
