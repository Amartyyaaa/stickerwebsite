import Link from 'next/link';
import { CheckIcon, CloseIcon } from '@/components/icons';
import type { GoLiveItem } from '@/lib/admin/go-live';
import { cn } from '@/lib/cn';

/** "Before you go live": what's still missing for launch, each with what to do about it. */
export function GoLivePanel({ items }: { items: GoLiveItem[] }) {
  const done = items.filter((i) => i.ok).length;
  if (done === items.length) {
    return (
      <p className="mb-6 flex items-center gap-2 rounded-card border border-lime/40 bg-lime/5 px-4 py-3 text-sm font-semibold text-lime">
        <CheckIcon size={18} /> Everything’s set for launch: payments, emails, policies and daily backups.
      </p>
    );
  }
  return (
    <section className="mb-6 rounded-card border border-orange/40 bg-surface p-4 sm:p-5" aria-labelledby="golive-title">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="golive-title" className="font-display text-xl uppercase">
          Before you go live
        </h2>
        <p className="text-sm text-muted">
          <b className="text-ink">{done}</b> of {items.length} done
        </p>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
        <div className="h-full rounded-full bg-lime" style={{ width: `${(done / items.length) * 100}%` }} />
      </div>
      <ul className="grid gap-2 md:grid-cols-2">
        {items.map((i) => (
          <li key={i.id} className={cn('flex gap-3 rounded-[3px] border p-3 text-sm', i.ok ? 'border-line' : 'border-orange/30 bg-orange/5')}>
            <span className={cn('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full', i.ok ? 'bg-lime/15 text-lime' : 'bg-orange/15 text-orange')} aria-hidden="true">
              {i.ok ? <CheckIcon size={13} /> : <CloseIcon size={12} />}
            </span>
            <span className="min-w-0">
              <span className="block font-semibold">
                <span className="sr-only">{i.ok ? 'Done: ' : 'To do: '}</span>
                {i.label}
              </span>
              <span className="block break-words text-[13px] text-muted">{i.detail}</span>
              {!i.ok && i.href && (
                <Link href={i.href} className="mt-1 inline-block text-[13px] font-semibold text-lime hover:underline">
                  Fix it →
                </Link>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
