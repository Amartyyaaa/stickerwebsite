import Link from 'next/link';
import { Art } from '@/components/art';
import type { ArtSpec } from '@/lib/art/types';

/** Placeholder for pages that later build steps fill in. */
export function ComingSoon({ kicker, title, body, points, art, step }: { kicker: string; title: string; body: string; points: string[]; art: ArtSpec; step: string }) {
  return (
    <div className="wrap grid items-center gap-10 py-10 md:grid-cols-[1.1fr_1fr] md:py-16">
      <div>
        <p className="eyebrow">{kicker}</p>
        <h1 className="display mt-2 text-[clamp(42px,6vw,76px)]">{title}</h1>
        <p className="mt-4 max-w-xl text-[17px] text-muted">{body}</p>
        <ul className="mt-6 grid gap-2.5">
          {points.map((p) => (
            <li key={p} className="flex gap-2.5 text-[15px]">
              <span className="mt-2 size-1.5 shrink-0 bg-lime" aria-hidden="true" />
              {p}
            </li>
          ))}
        </ul>
        <p className="mt-6 inline-block rounded-[3px] border border-orange/50 bg-orange/10 px-3 py-2 text-sm font-semibold text-orange">{step}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/shop" className="btn btn-primary">
            Browse designs
          </Link>
          <Link href="/cart" className="btn btn-ghost">
            View cart
          </Link>
        </div>
      </div>
      <div className="mx-auto w-full max-w-[420px]" aria-hidden="true">
        <Art spec={art} idPrefix="soon" />
      </div>
    </div>
  );
}
