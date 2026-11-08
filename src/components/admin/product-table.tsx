'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { bulkProductsAction, deleteDemoProductsAction, type BulkResult } from '@/actions/admin/products';
import { Art } from '@/components/art';
import { selectClass } from '@/components/checkout/fields';
import type { AdminProductRow } from '@/lib/admin/products';
import { formatINR } from '@/lib/money';
import { tableClass } from './ui';

export function Badge({ children, tone = 'muted' }: { children: React.ReactNode; tone?: 'muted' | 'warn' | 'violet' | 'lime' }) {
  const tones = {
    muted: 'bg-surface-2 text-muted',
    warn: 'bg-orange/15 text-orange',
    violet: 'bg-violet/20 text-[#b9a2ff]',
    lime: 'bg-lime/10 text-lime',
  };
  return <span className={`inline-block rounded-[2px] px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.05em] ${tones[tone]}`}>{children}</span>;
}

/** The product list, with checkboxes for showing, hiding, moving or deleting several products at once. */
export function ProductTable({ rows, vibes }: { rows: AdminProductRow[]; vibes: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [vibe, setVibe] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  if (!rows.length) return <p className="rounded-card border border-dashed border-line-2 p-8 text-center text-muted">No products match. Try another search or filter.</p>;

  const allOn = rows.every((r) => selected.has(r.id));
  const toggle = (id: number) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const run = async (action: 'show' | 'hide' | 'delete' | 'vibe') => {
    const ids = [...selected];
    if (action === 'delete' && !window.confirm(`Delete ${ids.length} product${ids.length === 1 ? '' : 's'}? This can’t be undone. Past orders keep their details.`)) return;
    if (action === 'vibe' && !vibe) return setMessage({ ok: false, text: 'Choose the vibe to move them to.' });
    setBusy(true);
    setMessage(null);
    const r: BulkResult = await bulkProductsAction({ ids, action, vibeId: action === 'vibe' ? vibe : undefined });
    setBusy(false);
    if (!r.ok) return setMessage({ ok: false, text: r.error });
    const verb = { show: 'Shown', hide: 'Hidden', delete: 'Deleted', vibe: 'Moved' }[action];
    setMessage({
      ok: true,
      text: `${verb}: ${r.changed}.${r.skipped ? ` ${r.skipped} skipped${action === 'show' ? ' (they need a photo first)' : ''}.` : ''}`,
    });
    setSelected(new Set());
    router.refresh();
  };

  return (
    <div>
      <div className="z-20 -mx-4 mb-3 flex min-h-12 flex-wrap items-center gap-2 border-y border-line bg-bg/95 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-card sm:border lg:sticky lg:top-2" aria-live="polite">
        {selected.size ? (
          <>
            <span className="mr-1 text-sm font-semibold">{selected.size} selected</span>
            <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => run('show')}>
              Show
            </button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => run('hide')}>
              Hide
            </button>
            <span className="flex gap-2">
              <select aria-label="Move to vibe" value={vibe} onChange={(e) => setVibe(e.target.value)} className={`${selectClass()} min-h-[38px] py-0 text-sm`}>
                <option value="">Set main vibe…</option>
                {vibes.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              <button type="button" className="btn btn-ghost btn-sm" disabled={busy || !vibe} onClick={() => run('vibe')}>
                Move
              </button>
            </span>
            <button type="button" className="btn btn-ghost btn-sm border-red/50 text-red hover:border-red hover:text-red" disabled={busy} onClick={() => run('delete')}>
              Delete
            </button>
            <button type="button" className="ml-auto text-sm text-muted underline-offset-2 hover:text-ink hover:underline" onClick={() => setSelected(new Set())}>
              Clear
            </button>
          </>
        ) : (
          <span className="text-sm text-muted">Tick products to show, hide, move or delete several at once.</span>
        )}
        {message && <p className={`basis-full text-sm font-semibold ${message.ok ? 'text-lime' : 'text-red'}`}>{message.text}</p>}
      </div>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className={`${tableClass} min-w-[760px]`}>
          <thead>
            <tr>
              <th className="w-10">
                <input
                  type="checkbox"
                  aria-label="Select all on this page"
                  checked={allOn}
                  onChange={() => setSelected(allOn ? new Set() : new Set(rows.map((r) => r.id)))}
                  className="size-4 accent-[var(--color-lime)]"
                />
              </th>
              <th>Product</th>
              <th>Type</th>
              <th>Vibe</th>
              <th className="text-right">From</th>
              <th className="text-right">Popularity</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className={selected.has(p.id) ? 'bg-lime/5' : 'hover:bg-surface-2/60'}>
                <td>
                  <input type="checkbox" aria-label={`Select ${p.name}`} checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="size-4 accent-[var(--color-lime)]" />
                </td>
                <td>
                  <div className="flex items-center gap-3">
                    <span className="relative block size-11 shrink-0 overflow-hidden rounded-[3px] border border-line bg-bg p-0.5">
                      <Art spec={p.art} image={p.image} idPrefix={`ap${p.id}`} />
                    </span>
                    <span className="min-w-0">
                      <Link href={`/admin/products/${p.id}`} className="font-semibold hover:text-lime hover:underline">
                        {p.name}
                      </Link>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                        <span className="truncate">/{p.slug}</span>
                        {!p.isActive && <Badge tone="warn">Hidden</Badge>}
                        {!p.typeActive && <Badge tone="warn">Type hidden</Badge>}
                        {p.isSample && <Badge>Demo</Badge>}
                      </span>
                    </span>
                  </div>
                </td>
                <td className="text-[13px]">{p.typeName}</td>
                <td className="text-[13px]">{p.vibeName}</td>
                <td className="text-right font-semibold tabular-nums">{formatINR(p.priceFrom)}</td>
                <td className="text-right tabular-nums text-muted">{p.popularity.toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Removes every demo product in one go, after a confirmation. */
export function DeleteDemoButton({ count }: { count: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  return (
    <div className="grid gap-2">
      <button
        type="button"
        className="btn btn-ghost btn-sm justify-self-start border-red/50 text-red hover:border-red hover:text-red"
        disabled={busy}
        onClick={async () => {
          if (!window.confirm(`Remove all ${count.toLocaleString('en-IN')} demo products? Products you added or edited stay. This can’t be undone.`)) return;
          setBusy(true);
          const r = await deleteDemoProductsAction();
          setBusy(false);
          setNote(r.ok ? `Removed ${r.removed.toLocaleString('en-IN')} demo products.` : r.error);
          router.refresh();
        }}
      >
        Remove demo products
      </button>
      {note && <p className="text-sm font-semibold text-lime">{note}</p>}
    </div>
  );
}
