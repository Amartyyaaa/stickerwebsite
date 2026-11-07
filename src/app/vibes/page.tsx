import type { Metadata } from 'next';
import Link from 'next/link';
import { Art } from '@/components/art';
import { getCounts, getVibeCovers, getVibes } from '@/lib/catalog/queries';

export const metadata: Metadata = {
  title: 'Fandoms and vibes',
  description: 'Anime, F1, cricket, K-pop, desi, aesthetic and more. Find stickers and posters for your fandom.',
};

export default async function VibesPage() {
  const [vibes, counts, covers] = await Promise.all([getVibes(), getCounts(), getVibeCovers()]);
  return (
    <div className="wrap py-8 md:py-10">
      <header className="mb-8 border-b border-line pb-6">
        <p className="eyebrow">Shop by fandom</p>
        <h1 className="display mt-2 text-[clamp(40px,6vw,72px)]">Fandoms &amp; vibes</h1>
        <p className="mt-3 max-w-2xl text-muted">Every design belongs to at least one vibe. Pick yours.</p>
      </header>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        {vibes.map((v) => (
          <li key={v.id}>
            <Link href={`/v/${v.id}`} className="group grid h-full gap-2 rounded-card border border-line bg-surface p-3 transition hover:border-lime hover:shadow-glow">
              <span className="relative block aspect-square rounded-[3px] bg-bg">
                <span className="absolute inset-[15%] transition group-hover:scale-105">
                  <Art spec={covers[v.id] ?? null} idPrefix="vb" />
                </span>
              </span>
              <span className="font-display text-xl uppercase leading-none">{v.name}</span>
              <span className="text-xs text-muted">{(counts.vibes[v.id] ?? 0).toLocaleString('en-IN')} designs</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
