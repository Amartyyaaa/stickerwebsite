'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useOptimistic, useState, useTransition } from 'react';
import { CheckIcon, CloseIcon, FilterIcon } from '@/components/icons';
import { buildQuery, PRICE_BANDS, SORTS } from '@/lib/catalog/filters';
import { GROUPS } from '@/lib/catalog/types';
import { cn } from '@/lib/cn';

export interface FilterState {
  type: string[];
  vibe: string[];
  price?: string;
  sort?: string;
  q?: string;
  group?: string;
}

export interface FilterOption {
  id: string;
  name: string;
  count?: number;
  groupId?: string;
}

interface Props {
  basePath: string;
  state: FilterState;
  typeOptions?: FilterOption[];
  vibeOptions?: FilterOption[];
}

/** Navigate to the new filter URL, showing the new selection immediately while results load. */
function useFilterNav(basePath: string, state: FilterState) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [view, setView] = useOptimistic(state);
  const go = (next: Partial<FilterState>) => {
    const m = { ...view, ...next };
    const query = buildQuery({ q: m.q, group: m.group, type: m.type.join(','), vibe: m.vibe.join(','), price: m.price, sort: m.sort });
    startTransition(() => {
      setView(m);
      router.push(`${basePath}${query}`, { scroll: false });
    });
  };
  return { go, pending, view };
}

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

function Check({ checked, label, count, onChange }: { checked: boolean; label: string; count?: number; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1 text-[14.5px] hover:text-lime">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={onChange} />
      <span
        className={cn(
          'grid size-[18px] shrink-0 place-items-center rounded-[3px] border peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-cyan',
          checked ? 'border-lime bg-lime text-bg' : 'border-line-2',
        )}
        aria-hidden="true"
      >
        {checked && <CheckIcon size={13} strokeWidth={3} />}
      </span>
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-xs tabular-nums text-muted">{count.toLocaleString('en-IN')}</span>}
    </label>
  );
}

export function FilterPanel({ basePath, state: current, typeOptions, vibeOptions, onDone }: Props & { onDone?: () => void }) {
  const { go, pending, view: state } = useFilterNav(basePath, current);
  const [allVibes, setAllVibes] = useState(false);
  const active = state.type.length + state.vibe.length + (state.price ? 1 : 0);
  const vibesShown = vibeOptions && (allVibes ? vibeOptions : vibeOptions.slice(0, 12));

  return (
    <div className={cn('grid gap-7 transition-opacity', pending && 'opacity-60')} aria-busy={pending}>
      {typeOptions && typeOptions.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">Product</legend>
          {GROUPS.map((g) => {
            const opts = typeOptions.filter((t) => t.groupId === g.id);
            if (!opts.length) return null;
            return (
              <div key={g.id} className="mb-3">
                <p className="mb-0.5 text-[12.5px] font-bold uppercase tracking-[0.08em]">{g.name}</p>
                {opts.map((t) => (
                  <Check key={t.id} label={t.name} count={t.count} checked={state.type.includes(t.id)} onChange={() => go({ type: toggle(state.type, t.id) })} />
                ))}
              </div>
            );
          })}
        </fieldset>
      )}
      {vibesShown && vibesShown.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">Vibe</legend>
          {vibesShown.map((v) => (
            <Check key={v.id} label={v.name} count={v.count} checked={state.vibe.includes(v.id)} onChange={() => go({ vibe: toggle(state.vibe, v.id) })} />
          ))}
          {vibeOptions && vibeOptions.length > 12 && (
            <button type="button" onClick={() => setAllVibes(!allVibes)} className="mt-1 text-[13px] font-bold uppercase tracking-[0.06em] text-lime">
              {allVibes ? 'Show fewer' : `Show all ${vibeOptions.length}`}
            </button>
          )}
        </fieldset>
      )}
      <fieldset>
        <legend className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">Price</legend>
        {[{ id: '', label: 'Any price' }, ...PRICE_BANDS].map((b) => (
          <label key={b.id} className="flex cursor-pointer items-center gap-2.5 py-1 text-[14.5px] hover:text-lime">
            <input type="radio" name="price" className="peer sr-only" checked={(state.price ?? '') === b.id} onChange={() => go({ price: b.id || undefined })} />
            <span
              className={cn(
                'grid size-[18px] place-items-center rounded-full border peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-cyan',
                (state.price ?? '') === b.id ? 'border-lime' : 'border-line-2',
              )}
              aria-hidden="true"
            >
              {(state.price ?? '') === b.id && <span className="size-2.5 rounded-full bg-lime" />}
            </span>
            {b.label}
          </label>
        ))}
      </fieldset>
      <div className="flex flex-wrap gap-2">
        {active > 0 && (
          <button type="button" onClick={() => go({ type: [], vibe: [], price: undefined })} className="btn btn-ghost btn-sm">
            Clear filters
          </button>
        )}
        {onDone && (
          <button type="button" onClick={onDone} className="btn btn-primary btn-sm flex-1">
            Show results
          </button>
        )}
      </div>
    </div>
  );
}

export function SortSelect({ basePath, state: current }: Props) {
  const { go, view: state } = useFilterNav(basePath, current);
  const options = state.q ? [{ id: 'relevance', label: 'Best match' }, ...SORTS] : SORTS;
  return (
    <label className="inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.06em] text-muted">
      Sort
      <select
        value={state.sort ?? (state.q ? 'relevance' : 'popular')}
        onChange={(e) => go({ sort: e.target.value })}
        className="min-h-10 rounded-[2px] border border-line-2 bg-surface px-2.5 text-[14px] font-semibold normal-case tracking-normal text-ink focus:border-lime focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function MobileFilters(props: Props) {
  const [open, setOpen] = useState(false);
  const active = props.state.type.length + props.state.vibe.length + (props.state.price ? 1 : 0);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-ghost btn-sm lg:hidden" aria-expanded={open}>
        <FilterIcon size={16} /> Filters{active > 0 && <span className="text-lime">({active})</span>}
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <button type="button" className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} aria-label="Close filters" tabIndex={-1} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-xl border-t border-line-2 bg-bg px-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))] pt-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-display text-2xl uppercase">Filters</p>
              <button type="button" onClick={() => setOpen(false)} className="grid size-10 place-items-center" aria-label="Close filters">
                <CloseIcon />
              </button>
            </div>
            <FilterPanel {...props} onDone={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
