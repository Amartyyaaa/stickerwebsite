import Link from 'next/link';
import { cn } from '@/lib/cn';

/** Small building blocks shared by the admin pages. */

export function AdminHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
      <div className="min-w-0">
        <h1 className="font-display text-[clamp(30px,4vw,44px)] uppercase leading-none">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function StatTile({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: string; tone?: 'warn' }) {
  return (
    <div className={cn('rounded-card border bg-surface p-4', tone === 'warn' ? 'border-orange/50' : 'border-line')}>
      <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className={cn('mt-1 font-display text-3xl tabular-nums', tone === 'warn' && 'text-orange')}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Tabs({ items }: { items: Array<{ href: string; label: string; count?: number; active: boolean }> }) {
  return (
    <nav aria-label="Filter" className="scrollbar-none -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      {items.map((t) => (
        <Link key={t.href} href={t.href} aria-current={t.active ? 'page' : undefined} className="chip">
          {t.label}
          {t.count !== undefined && <span className="rounded-full bg-surface-2 px-1.5 text-[11px] tabular-nums text-muted">{t.count}</span>}
        </Link>
      ))}
    </nav>
  );
}

export function Pager({ page, perPage, total, href }: { page: number; perPage: number; total: number; href: (page: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pages" className="mt-5 flex items-center justify-between gap-3 text-sm">
      <span className="text-muted">
        Page {page} of {pages} · {total.toLocaleString('en-IN')} in all
      </span>
      <span className="flex gap-2">
        {page > 1 && (
          <Link href={href(page - 1)} className="btn btn-ghost btn-sm">
            Previous
          </Link>
        )}
        {page < pages && (
          <Link href={href(page + 1)} className="btn btn-ghost btn-sm">
            Next
          </Link>
        )}
      </span>
    </nav>
  );
}

export function Panel({ title, children, className, actions }: { title?: string; children: React.ReactNode; className?: string; actions?: React.ReactNode }) {
  return (
    <section className={cn('rounded-card border border-line bg-surface p-4 sm:p-5', className)}>
      {(title || actions) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="font-display text-xl uppercase">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export const tableClass = 'w-full border-collapse text-left text-sm [&_td]:border-t [&_td]:border-line [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:pb-2 [&_th]:text-[11.5px] [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-[0.08em] [&_th]:text-muted';
