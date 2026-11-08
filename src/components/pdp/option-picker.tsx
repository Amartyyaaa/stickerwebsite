'use client';

import type { OptionGroup } from '@/lib/catalog/types';
import { cn } from '@/lib/cn';

export interface OptionNote {
  text: string;
  /** Shown in orange, for example "Low res". */
  warn?: boolean;
}

/**
 * Chips (or a dropdown for long lists) for one product option. Used on product
 * pages and in the custom studio.
 */
export function OptionPicker({
  group,
  value,
  onChange,
  notes,
  disabled,
  idPrefix = 'opt',
}: {
  group: OptionGroup;
  value: string | undefined;
  onChange: (v: string) => void;
  /** Extra line under a value, like a per-sticker price. */
  notes?: Record<string, OptionNote | undefined>;
  /** Values that can't be picked right now, with the reason. */
  disabled?: Record<string, string | undefined>;
  idPrefix?: string;
}) {
  const id = `${idPrefix}-${group.key}`;
  if (group.display === 'select') {
    return (
      <div className="grid gap-2">
        <label htmlFor={id} className="text-sm font-bold uppercase tracking-[0.08em]">
          {group.label}
        </label>
        <select
          id={id}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-11 max-w-sm rounded-[2px] border border-line-2 bg-surface px-3 text-[15px] focus:border-lime focus:outline-none"
        >
          <option value="" disabled>
            Choose your {group.label.toLowerCase()}
          </option>
          {group.values.map((v) => (
            <option key={v.value} value={v.value} disabled={Boolean(disabled?.[v.value])}>
              {v.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
  const reasons = [...new Set(group.values.map((v) => disabled?.[v.value]).filter((r): r is string => Boolean(r)))];
  return (
    <fieldset className="grid gap-2" aria-describedby={reasons.length ? `${id}-why` : undefined}>
      <legend className="mb-2 text-sm font-bold uppercase tracking-[0.08em]">{group.label}</legend>
      <div className="flex flex-wrap gap-2">
        {group.values.map((v) => {
          const checked = value === v.value;
          const off = Boolean(disabled?.[v.value]);
          const note = notes?.[v.value];
          return (
            <label key={v.value} className={cn('relative', off ? 'cursor-not-allowed' : 'cursor-pointer')}>
              <input type="radio" name={id} value={v.value} checked={checked} disabled={off} onChange={() => onChange(v.value)} className="peer sr-only" />
              <span
                className={cn(
                  'grid min-w-[76px] justify-items-center rounded-[2px] border px-3.5 py-2 text-center text-[13.5px] font-bold uppercase leading-tight tracking-[0.05em] transition peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-cyan',
                  checked ? 'border-lime bg-lime/10 text-lime shadow-[0_0_18px_rgb(198_255_61/0.2)]' : 'border-line-2 hover:border-[#5a5a78]',
                  off && 'border-line text-muted/60 line-through hover:border-line',
                )}
              >
                {v.label}
                {v.hint && <small className="text-[11.5px] font-semibold normal-case tracking-normal text-muted">{v.hint}</small>}
                {note && <small className={cn('text-[11.5px] font-semibold normal-case tracking-normal', note.warn ? 'text-orange' : 'text-muted')}>{note.text}</small>}
              </span>
            </label>
          );
        })}
      </div>
      {reasons.length > 0 && (
        <p id={`${id}-why`} className="text-[13px] text-muted">
          {reasons.join(' ')}
        </p>
      )}
    </fieldset>
  );
}
