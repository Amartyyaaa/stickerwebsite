'use client';

import { CheckIcon } from '@/components/icons';
import { QtyStepper } from '@/components/cart/cart-parts';
import { cn } from '@/lib/cn';
import { MAX_NOTE } from '@/lib/custom/types';
import { formatINR } from '@/lib/money';

/** Price, quantity, the optional note to the printer, and Add to cart. */
export function StudioSummary({
  unit,
  qty,
  onQty,
  each,
  reason,
  onAdd,
  note,
  onNote,
  label,
  payNote,
}: {
  unit: number;
  qty: number;
  onQty: (n: number) => void;
  /** Price per piece, for example per sticker in a pack. */
  each?: string;
  /** Why the design can't be added yet, if it can't. */
  reason: string | null;
  onAdd: () => void;
  note: string;
  onNote: (s: string) => void;
  label: string;
  /** How a custom print can be paid for. */
  payNote: string;
}) {
  return (
    <div className="grid gap-4 rounded-card border border-line bg-surface p-4 sm:p-5">
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-display text-[38px] leading-none text-lime tabular-nums" aria-live="polite">
          {formatINR(unit * qty)}
        </span>
        <span className="text-[13px] text-muted">
          {[qty > 1 ? `${formatINR(unit)} each` : null, each, 'Inclusive of all taxes'].filter(Boolean).join(' · ')}
        </span>
      </p>
      <details className="group">
        <summary className="cursor-pointer text-[13.5px] font-semibold text-muted hover:text-ink">Add a note for us (optional)</summary>
        <label className="mt-2 grid gap-1.5">
          <span className="sr-only">Note for the printer</span>
          <textarea
            value={note}
            maxLength={MAX_NOTE}
            onChange={(e) => onNote(e.target.value)}
            rows={3}
            placeholder="For example: please cut close to the outline."
            className="w-full rounded-[2px] border border-line-2 bg-bg px-3 py-2 text-[15px] placeholder:text-muted focus:border-lime focus:outline-none"
          />
          <span className="text-right text-xs text-muted tabular-nums">
            {note.length}/{MAX_NOTE}
          </span>
        </label>
      </details>
      <div className="flex flex-wrap items-center gap-3">
        <QtyStepper value={qty} onChange={(n) => onQty(Math.max(1, n))} label={label} />
        <button type="button" className={cn('btn btn-primary flex-1')} disabled={Boolean(reason)} onClick={onAdd}>
          Add to cart
        </button>
      </div>
      {reason && <p className="-mt-1 text-sm font-semibold text-orange">{reason}</p>}
      <ul className="grid gap-1.5 border-t border-line pt-3 text-[13.5px] text-muted">
        <li className="flex items-start gap-2">
          <CheckIcon size={17} className="mt-px shrink-0 text-lime" /> We check every design before printing, and message you if anything needs fixing.
        </li>
        <li className="flex items-start gap-2">
          <CheckIcon size={17} className="mt-px shrink-0 text-lime" /> {payNote}
        </li>
      </ul>
    </div>
  );
}
