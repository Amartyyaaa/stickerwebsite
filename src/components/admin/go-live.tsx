import Link from 'next/link';
import { CheckIcon, CloseIcon } from '@/components/icons';
import type { GoLiveItem } from '@/lib/admin/go-live';
import { cn } from '@/lib/cn';

/**
 * "Before you go live": what's still missing for launch, each with what to do about it.
 * "Later" items (online payments, email, backups off the server) don't block opening; they're
 * listed apart with what's limited until they're set up.
 */
export function GoLivePanel({ items }: { items: GoLiveItem[] }) {
  const needed = items.filter((i) => !i.later);
  const later = items.filter((i) => i.later);
  const done = needed.filter((i) => i.ok).length;
  const ready = done === needed.length;

  if (ready && later.length === 0) {
    return (
      <p className="mb-6 flex items-center gap-2 rounded-card border border-lime/40 bg-lime/5 px-4 py-3 text-sm font-semibold text-lime">
        <CheckIcon size={18} /> Everything’s set: payments, emails, policies and backups.
      </p>
    );
  }
  return (
    <section className={cn('mb-6 rounded-card border bg-surface p-4 sm:p-5', ready ? 'border-line' : 'border-orange/40')} aria-labelledby="golive-title">
      {ready ? (
        <h2 id="golive-title" className="mb-3 flex items-center gap-2 font-display text-xl uppercase text-lime">
          <CheckIcon size={20} /> Ready to open
        </h2>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="golive-title" className="font-display text-xl uppercase">
              Before you go live
            </h2>
            <p className="text-sm text-muted">
              <b className="text-ink">{done}</b> of {needed.length} done
            </p>
          </div>
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
            <div className="h-full rounded-full bg-lime" style={{ width: `${(done / needed.length) * 100}%` }} />
          </div>
          <ul className="grid gap-2 md:grid-cols-2">
            {needed.map((i) => (
              <Item key={i.id} item={i} />
            ))}
          </ul>
        </>
      )}
      {later.length > 0 && (
        <div className={ready ? '' : 'mt-5'}>
          <h3 className="mb-2 text-[12px] font-bold uppercase tracking-[0.1em] text-muted">Later: the store works without these</h3>
          <ul className="grid gap-2 md:grid-cols-2">
            {later.map((i) => (
              <Item key={i.id} item={i} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Item({ item: i }: { item: GoLiveItem }) {
  return (
    <li className={cn('flex gap-3 rounded-[3px] border p-3 text-sm', i.ok || i.later ? 'border-line' : 'border-orange/30 bg-orange/5')}>
      <span
        className={cn('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full', i.ok ? 'bg-lime/15 text-lime' : i.later ? 'bg-surface-2 text-muted' : 'bg-orange/15 text-orange')}
        aria-hidden="true"
      >
        {i.ok ? <CheckIcon size={13} /> : i.later ? <span className="size-1.5 rounded-full bg-current" /> : <CloseIcon size={12} />}
      </span>
      <span className="min-w-0">
        <span className="block font-semibold">
          <span className="sr-only">{i.ok ? 'Done: ' : i.later ? 'Later: ' : 'To do: '}</span>
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
  );
}
