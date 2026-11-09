import type { Options } from '@/lib/pricing/engine';
import type { Size } from './crop';
import type { DpiThresholds } from './quality';
import type { CustomDesign, StudioKind } from './types';

/**
 * The three custom studios: which product type prices them, how big things
 * print, and how many images one cart line holds. Shared by the studio pages,
 * the cart and the quote API.
 */

export interface StudioDef {
  kind: StudioKind;
  typeId: string;
  href: string;
  tab: string;
  title: string;
  /** Short line under the page title. */
  blurb: string;
  /** Page description for search engines. */
  description: string;
  /** Pixels per printed inch that count as sharp, and as acceptable. */
  dpi: DpiThresholds;
}

export const STUDIO_KINDS: readonly StudioKind[] = ['stickers', 'polaroids', 'posters'];

export const STUDIOS: Record<StudioKind, StudioDef> = {
  stickers: {
    kind: 'stickers',
    typeId: 'custom-stickers',
    href: '/custom/stickers',
    tab: 'Stickers',
    title: 'Custom stickers',
    blurb: 'Upload a logo, drawing or photo. Pick a shape and finish, and see your sticker before you order.',
    description: 'Make custom stickers from your own image: die-cut, circle or square, in matte or glossy vinyl. Printed in India.',
    dpi: { great: 250, ok: 150 },
  },
  polaroids: {
    kind: 'polaroids',
    typeId: 'custom-polaroids',
    href: '/custom/polaroids',
    tab: 'Polaroids',
    title: 'Custom polaroids',
    blurb: 'Turn your photos into polaroid-style prints. Crop each one and add a caption.',
    description: 'Print your photos as polaroid-style prints with captions, in sets of 10 to 50, with clips and fairy lights. Delivered across India.',
    dpi: { great: 250, ok: 150 },
  },
  posters: {
    kind: 'posters',
    typeId: 'custom-posters',
    href: '/custom/posters',
    tab: 'Posters',
    title: 'Custom posters',
    blurb: 'Turn a photo or artwork into a poster from A4 to A2, and see it on a wall before you order.',
    description: 'Print your photo or artwork as a poster in A4, A3, A2 or 12 × 18 in, with black, white or wood frames. Delivered across India.',
    dpi: { great: 150, ok: 100 },
  },
};

export const isStudioKind = (k: string): k is StudioKind => (STUDIO_KINDS as readonly string[]).includes(k);

export const studioForType = (typeId: string): StudioDef | undefined => STUDIO_KINDS.map((k) => STUDIOS[k]).find((s) => s.typeId === typeId);

const STICKER_IN: Record<string, number> = { S: 2, M: 3, L: 4 };
const POLAROID_AREA: Record<string, Size> = { classic: { w: 3.1, h: 3.1 }, mini: { w: 1.8, h: 2.4 } };
const POSTER_IN: Record<string, Size> = {
  A4: { w: 8.27, h: 11.69 },
  A3: { w: 11.69, h: 16.54 },
  A2: { w: 16.54, h: 23.39 },
  '12x18': { w: 12, h: 18 },
};

/** Most images one cart line can hold: a polaroid set holds its set size, everything else one image. */
export function maxItems(kind: StudioKind, o: Options): number {
  if (kind !== 'polaroids') return 1;
  const n = Number(o.pack);
  return Number.isInteger(n) && n > 0 ? n : 10;
}

/** Width ÷ height of the frame an image is cropped to, or null when it keeps its own outline (die-cut stickers). */
export function frameAspect(kind: StudioKind, o: Options): number | null {
  if (kind === 'stickers') return o.shape === 'die-cut' || !o.shape ? null : 1;
  const a = printArea(kind, o);
  return a.w / a.h;
}

/**
 * Printed size, in inches, of the image area. Die-cut stickers keep the
 * image's own proportions with the longest side at the chosen size.
 */
export function printArea(kind: StudioKind, o: Options, img?: Size): Size {
  if (kind === 'stickers') {
    const side = STICKER_IN[o.size] ?? 2;
    if ((o.shape === 'die-cut' || !o.shape) && img) {
      return img.w >= img.h ? { w: side, h: (side * img.h) / img.w } : { w: (side * img.w) / img.h, h: side };
    }
    return { w: side, h: side };
  }
  if (kind === 'polaroids') return POLAROID_AREA[o.size] ?? POLAROID_AREA.classic;
  const p = POSTER_IN[o.size] ?? POSTER_IN.A4;
  return o.orientation === 'landscape' ? { w: p.h, h: p.w } : p;
}

/** Physical poster sizes in centimetres, for the to-scale wall preview. */
export function posterCm(o: Options): Size {
  const p = printArea('posters', o);
  return { w: p.w * 2.54, h: p.h * 2.54 };
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** One-line description of a design for the cart, for example "7 photos · 3 captions". */
export function designSummary(design: CustomDesign, o: Options): string {
  const items = design.items;
  if (design.kind === 'polaroids') {
    const captions = items.filter((i) => i.caption?.trim()).length;
    const fill = maxItems('polaroids', o) - items.length;
    return [plural(items.length, 'photo'), captions ? plural(captions, 'caption') : null, fill > 0 ? `${fill} filled with copies` : null].filter(Boolean).join(' · ');
  }
  const name = items[0]?.upload.name ?? 'Your design';
  return design.kind === 'posters' ? `${name} · ${o.orientation === 'landscape' ? 'Landscape' : 'Portrait'}` : name;
}
