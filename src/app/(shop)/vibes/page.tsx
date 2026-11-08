import type { Metadata } from 'next';
import Link from 'next/link';
import { Art } from '@/components/art';
import type { ArtSpec, PaletteKey, StickerShape } from '@/lib/art/types';
import { getCounts, getVibeCovers, getVibes } from '@/lib/catalog/queries';

const PAIRS: Array<[PaletteKey, PaletteKey]> = [
  ['a', 'd'],
  ['f', 'c'],
  ['e', 'b'],
  ['d', 'c'],
  ['b', 'f'],
  ['a', 'e'],
];
const SHAPES: StickerShape[] = ['blob', 'badge', 'pill', 'star'];

/** A sticker with the vibe's first word, for vibes that have no designs yet. Always the same for a vibe. */
function placeholderArt(id: string, name: string): ArtSpec {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const [c1, c2] = PAIRS[h % PAIRS.length];
  const first = name.split(/[\s&]+/)[0].toUpperCase();
  const word = first.length <= 10 ? first : first.slice(0, 5);
  return { kind: 'sticker', seed: h % 100_000, shape: SHAPES[h % SHAPES.length], word, c1, c2 };
}

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
                  <Art spec={covers[v.id] ?? placeholderArt(v.id, v.name)} idPrefix="vb" />
                </span>
              </span>
              <span className="font-display text-xl uppercase leading-none">{v.name}</span>
              <span className="text-xs text-muted">{counts.vibes[v.id] ? `${counts.vibes[v.id].toLocaleString('en-IN')} designs` : 'Coming soon'}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
