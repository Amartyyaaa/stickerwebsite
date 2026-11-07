import Link from 'next/link';
import { STUDIO_KINDS, STUDIOS } from '@/lib/custom/studios';
import type { StudioKind } from '@/lib/custom/types';

export function StudioTabs({ active }: { active: StudioKind }) {
  return (
    <nav aria-label="Custom studio" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
      {STUDIO_KINDS.map((k) => (
        <Link key={k} href={STUDIOS[k].href} className="chip" aria-current={k === active ? 'page' : undefined}>
          {STUDIOS[k].tab}
        </Link>
      ))}
    </nav>
  );
}
