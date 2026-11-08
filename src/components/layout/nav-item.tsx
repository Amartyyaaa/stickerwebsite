'use client';

import { useState } from 'react';
import { ChevronIcon } from '@/components/icons';

/**
 * A desktop menu that opens on hover and on keyboard focus (see `.nav-item` in globals.css).
 * Escape hides it and puts focus back on its button; it can open again once the pointer
 * or focus leaves and comes back.
 */
export function NavItem({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  const [closed, setClosed] = useState(false);
  return (
    <div
      className="nav-item"
      data-closed={closed || undefined}
      onKeyDown={(e) => {
        if (e.key !== 'Escape' || closed) return;
        setClosed(true);
        e.currentTarget.querySelector('button')?.focus();
      }}
      onMouseLeave={() => setClosed(false)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setClosed(false);
      }}
    >
      <button type="button" className="inline-flex items-center gap-1 whitespace-nowrap rounded-[2px] px-2.5 py-2 text-[13.5px] font-semibold uppercase tracking-[0.07em] hover:bg-surface-2" aria-haspopup="true">
        {label}
        <ChevronIcon size={15} className="chev transition" />
      </button>
      <div
        className={`mega absolute left-7 right-7 top-[calc(100%-2px)] z-50 gap-7 rounded-card border border-line-2 bg-surface p-6 shadow-[0_30px_60px_rgba(0,0,0,0.55)] ${wide ? 'grid-cols-4' : 'grid-cols-[1fr_1fr_1.15fr]'}`}
      >
        {children}
      </div>
    </div>
  );
}
