import { describe, expect, it } from 'vitest';
import { VIBES } from '@/lib/catalog/taxonomy';
import { drawMotif, isMotif, MOTIFS } from './motifs';
import { renderArt } from './render';
import type { ArtSpec } from './types';

/** Opening and closing tags pair up, and no value came out as undefined or NaN. */
function wellFormed(svg: string): boolean {
  if (/undefined|NaN/.test(svg)) return false;
  const stack: string[] = [];
  for (const [, close, name, self] of svg.matchAll(/<(\/?)([a-zA-Z]+)[^>]*?(\/?)>/g)) {
    if (self) continue;
    if (!close) stack.push(name);
    else if (stack.pop() !== name) return false;
  }
  return stack.length === 0;
}

describe('theme symbols', () => {
  it('draw every symbol as valid SVG', () => {
    for (const m of MOTIFS) {
      const svg = drawMotif(m, 50, 50, 80, '#C6FF3D', '#15151F');
      expect(svg, m).toMatch(/^<g transform="translate\(10 10\) scale\(0\.8\)">/);
      expect(wellFormed(svg), m).toBe(true);
    }
  });

  it('give every theme symbols that exist', () => {
    for (const v of VIBES) {
      expect(v.motifs.length, v.id).toBeGreaterThan(0);
      for (const m of v.motifs) expect(isMotif(m), `${v.id}: ${m}`).toBe(true);
    }
  });

  it('show on stickers, decals, packs and posters, and leave older designs as they were', () => {
    const designs: ArtSpec[] = [
      { kind: 'sticker', seed: 1, shape: 'blob', word: 'COSMOS', c1: 'c', c2: 'd' },
      { kind: 'sticker', seed: 2, shape: 'pill', word: 'CAUTION', c1: 'e', c2: 'a' },
      { kind: 'decal', seed: 3, word: 'TOUGE', c1: 'a' },
      { kind: 'pack', seed: 4, word: 'WOOF', c1: 'a', c2: 'd' },
      ...(['speed', 'sunset', 'orbit', 'bloom', 'grid', 'wave'] as const).map((poster, i): ArtSpec => ({ kind: 'poster', seed: 5 + i, poster, title: 'Night Meet', dark: i })),
      { kind: 'framed', seed: 12, poster: 'orbit', title: 'Zero Gravity', frame: 'wood' },
    ];
    for (const spec of designs) {
      const plain = renderArt(spec);
      const withSymbol = renderArt({ ...spec, motif: 'rocket' });
      expect(withSymbol, `${spec.kind} ${spec.poster ?? spec.shape ?? ''}`).not.toBe(plain);
      expect(wellFormed(withSymbol), `${spec.kind} ${spec.poster ?? ''}`).toBe(true);
      // A stored design naming a symbol this version doesn't know is drawn without one (only the SVG ids differ).
      const ids = (svg: string) => svg.replace(/(id="|url\(#)[^")]+/g, '$1x');
      expect(ids(renderArt({ ...spec, motif: 'unicorn' as never }))).toBe(ids(plain));
    }
  });
});
