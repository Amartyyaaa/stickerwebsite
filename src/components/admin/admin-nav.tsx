'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

export const ADMIN_NAV: Array<{ href: string; label: string }> = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/vibes', label: 'Vibes' },
];

/** Side navigation on wide screens, a scrolling row of links on phones. */
export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:grid lg:gap-0.5 lg:overflow-visible lg:px-0">
      {ADMIN_NAV.map((n) => {
        const active = n.href === '/admin' ? path === '/admin' : path === n.href || path.startsWith(`${n.href}/`);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'whitespace-nowrap rounded-[3px] px-3 py-2 text-[13.5px] font-semibold uppercase tracking-[0.06em] transition',
              active ? 'bg-lime/10 text-lime' : 'text-muted hover:bg-surface-2 hover:text-ink',
            )}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
