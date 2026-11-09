import { describe, expect, it } from 'vitest';
import { PRODUCT_TYPES } from '@/lib/catalog/taxonomy';
import { quote, unitPrice, type PricedLine } from '@/lib/pricing/engine';
import { DEFAULT_SETTINGS } from '@/lib/settings';
import { cropRect, cropStyle, normalizeCrop, panCrop, zoomCrop } from './crop';
import { effectiveDpi, qualityLevel } from './quality';
import { checkDesign, customLineKey } from './rules';
import { designSummary, frameAspect, maxItems, printArea, STUDIOS } from './studios';
import type { UploadInfo } from './types';

const ID = 'ZNFB5B0NRQE2DmWUrTS2dw';
const ID2 = 'j2ybjtI1-j_Lrt8dQblgzg';
const type = (id: string) => PRODUCT_TYPES.find((t) => t.id === id)!;
const upload = (name: string): UploadInfo => ({ id: ID, name, w: 1000, h: 1000, alpha: false, src: '', thumb: '' });

describe('crop', () => {
  const landscape = { w: 3000, h: 2000 };

  it('fills a square frame from the middle of a landscape image', () => {
    const r = cropRect(landscape, 1);
    expect(r.width).toBeCloseTo(2 / 3);
    expect(r.height).toBe(1);
    expect(r.left).toBeCloseTo(1 / 6);
    expect(r.top).toBe(0);
  });

  it('zooms in and keeps the window inside the image', () => {
    const r = cropRect(landscape, 1, { x: 0, y: 1, zoom: 2 });
    expect(r.width).toBeCloseTo(1 / 3);
    expect(r.height).toBeCloseTo(0.5);
    expect(r.left).toBe(0);
    expect(r.top).toBeCloseTo(0.5);
  });

  it('caps zoom and repairs bad values', () => {
    expect(cropRect(landscape, 1, { x: 0.5, y: 0.5, zoom: 9 }).height).toBeCloseTo(1 / 3);
    expect(cropRect(landscape, 1, { x: 0.5, y: 0.5, zoom: Number.NaN }).height).toBe(1);
    expect(normalizeCrop(landscape, 1, { x: -2, y: 5, zoom: 0.2 })).toEqual({ x: 0.3333, y: 0.5, zoom: 1 });
  });

  it('pans opposite to the drag and stops at the edges', () => {
    const start = { x: 0.5, y: 0.5, zoom: 1 };
    const moved = panCrop(landscape, 1, start, 0.25, 0);
    expect(moved.x).toBeCloseTo(0.5 - 0.25 * (2 / 3), 3);
    expect(panCrop(landscape, 1, start, 5, 0).x).toBeCloseTo(1 / 3, 3);
    expect(zoomCrop(landscape, 1, start, 2).zoom).toBe(2);
  });

  it('lets stickers zoom out so the whole image fits with a margin', () => {
    const square = { w: 1000, h: 1000 };
    const r = cropRect(square, 1, { x: 0.5, y: 0.5, zoom: 0.5 }, 0.5);
    expect(r).toEqual({ left: -0.5, top: -0.5, width: 2, height: 2 });
    expect(cropStyle(r)).toEqual({ width: '50%', height: '50%', left: '25%', top: '25%' });
    // Without the sticker minimum, zoom stays at 1.
    expect(cropRect(square, 1, { x: 0.5, y: 0.5, zoom: 0.5 }).width).toBe(1);
    // Zoomed out, the image can move around inside the frame but not leave it.
    expect(panCrop(square, 1, { x: 0.5, y: 0.5, zoom: 0.5 }, 1, 0, 0.5).x).toBe(0);
    expect(checkDesign('stickers', {}, [{ id: ID, crop: { x: 0.5, y: 0.5, zoom: 0.5 } }])).toBeNull();
    expect(checkDesign('posters', {}, [{ id: ID, crop: { x: 0.5, y: 0.5, zoom: 0.5 } }])).toMatch(/out of range/);
  });

  it('turns a crop into CSS for the preview image', () => {
    expect(cropStyle(cropRect(landscape, 1))).toEqual({ width: '150%', height: '100%', left: '-25%', top: '0%' });
  });
});

describe('print quality', () => {
  it('rates a 1400 px die-cut sticker at 4 in as sharp, and a 400 px one as low', () => {
    const o = { shape: 'die-cut', size: 'L' };
    expect(effectiveDpi({ w: 1400, h: 1400 }, printArea('stickers', o, { w: 1400, h: 1400 }))).toBe(350);
    const dpi = effectiveDpi({ w: 400, h: 300 }, printArea('stickers', o, { w: 400, h: 300 }));
    expect(dpi).toBe(100);
    expect(qualityLevel(dpi, STUDIOS.stickers.dpi)).toBe('low');
  });

  it('uses the poster thresholds and orientation', () => {
    const img = { w: 3000, h: 2000 };
    const a2 = printArea('posters', { size: 'A2', orientation: 'landscape' });
    expect(a2).toEqual({ w: 23.39, h: 16.54 });
    const rect = cropRect(img, frameAspect('posters', { size: 'A2', orientation: 'landscape' })!);
    expect(qualityLevel(effectiveDpi(img, a2, rect), STUDIOS.posters.dpi)).toBe('ok');
    const a3 = printArea('posters', { size: 'A3', orientation: 'landscape' });
    expect(qualityLevel(effectiveDpi(img, a3, cropRect(img, a3.w / a3.h)), STUDIOS.posters.dpi)).toBe('great');
  });

  it('drops when you zoom into a polaroid crop', () => {
    const img = { w: 1200, h: 1500 };
    const area = printArea('polaroids', { size: 'classic' });
    const full = effectiveDpi(img, area, cropRect(img, 1));
    const zoomed = effectiveDpi(img, area, cropRect(img, 1, { x: 0.5, y: 0.5, zoom: 2 }));
    expect(full).toBe(387);
    expect(zoomed).toBe(193);
  });
});

describe('design rules', () => {
  it('limits images to the polaroid set size and one image elsewhere', () => {
    expect(maxItems('polaroids', { pack: '20' })).toBe(20);
    const eleven = Array.from({ length: 11 }, () => ({ id: ID }));
    expect(checkDesign('polaroids', { pack: '10' }, eleven)).toMatch(/holds 10 photos/);
    expect(checkDesign('polaroids', { pack: '20' }, eleven)).toBeNull();
    expect(checkDesign('stickers', {}, [{ id: ID }, { id: ID2 }])).toMatch(/one image/);
    expect(checkDesign('posters', {}, [])).toMatch(/Add an image/);
  });

  it('checks captions, crops, ids and notes', () => {
    expect(checkDesign('polaroids', { pack: '10' }, [{ id: ID, caption: 'x'.repeat(29) }])).toMatch(/28 characters/);
    expect(checkDesign('stickers', {}, [{ id: ID, caption: 'hi' }])).toMatch(/only for polaroids/);
    expect(checkDesign('posters', {}, [{ id: ID, crop: { x: 0.5, y: 0.5, zoom: 4 } }])).toMatch(/out of range/);
    expect(checkDesign('posters', {}, [{ id: 'nope' }])).toMatch(/missing/);
    expect(checkDesign('posters', {}, [{ id: ID }], 'x'.repeat(301))).toMatch(/300 characters/);
    expect(checkDesign('polaroids', { pack: '10' }, [{ id: ID, caption: 'best night', crop: { x: 0.4, y: 0.5, zoom: 1.5 } }])).toBeNull();
  });

  it('gives the same design the same cart key, and changes it when anything changes', () => {
    const a = customLineKey('custom-stickers', { size: 'S', finish: 'matte' }, [{ id: ID }]);
    expect(customLineKey('custom-stickers', { finish: 'matte', size: 'S' }, [{ id: ID }])).toBe(a);
    expect(customLineKey('custom-stickers', { size: 'M', finish: 'matte' }, [{ id: ID }])).not.toBe(a);
    expect(customLineKey('custom-stickers', { size: 'S', finish: 'matte' }, [{ id: ID2 }])).not.toBe(a);
    expect(customLineKey('custom-stickers', { size: 'S', finish: 'matte' }, [{ id: ID }], 'cut close')).not.toBe(a);
    expect(a.startsWith('custom:custom-stickers:')).toBe(true);
  });

  it('summarises designs for the cart', () => {
    const items = [{ upload: upload('a.jpg'), caption: 'goa' }, { upload: upload('b.jpg') }];
    expect(designSummary({ kind: 'polaroids', items }, { pack: '10' })).toBe('2 photos · 1 caption · 8 filled with copies');
    expect(designSummary({ kind: 'posters', items: [{ upload: upload('trip.jpg') }] }, { orientation: 'landscape' })).toBe('trip.jpg · Landscape');
    expect(designSummary({ kind: 'stickers', items: [{ upload: upload('logo.png') }] }, {})).toBe('logo.png');
  });
});

describe('custom prices', () => {
  it('prices custom stickers by quantity, size and finish', () => {
    const p = type('custom-stickers').price;
    expect(unitPrice(p, { pack: '10', shape: 'die-cut', size: 'S', finish: 'matte' })).toBe(29900);
    expect(unitPrice(p, { pack: '25', shape: 'circle', size: 'S', finish: 'matte' })).toBe(59900);
    expect(unitPrice(p, { pack: '100', shape: 'square', size: 'L', finish: 'glossy' })).toBe(209900);
  });

  it('prices custom polaroids and posters', () => {
    expect(unitPrice(type('custom-polaroids').price, { pack: '10', size: 'classic', finish: 'matte', extras: 'none' })).toBe(17900);
    expect(unitPrice(type('custom-polaroids').price, { pack: '50', size: 'mini', finish: 'glossy', extras: 'lights' })).toBe(63800);
    expect(unitPrice(type('custom-posters').price, { size: 'A4', paper: 'matte', frame: 'none', orientation: 'portrait' })).toBe(11900);
    expect(unitPrice(type('custom-posters').price, { size: 'A2', paper: 'glossy', frame: 'wood', orientation: 'landscape' })).toBe(11900 + 15000 + 2000 + 45000);
  });

  it('does not count custom stickers towards sticker packs', () => {
    const lines: PricedLine[] = [
      { key: 'a', productId: 1, typeId: 'laptop-stickers', options: { size: 'S', finish: 'matte' }, qty: 9, unit: 2900 },
      { key: 'c', productId: 0, typeId: 'custom-stickers', options: { pack: '10', size: 'S', finish: 'matte' }, qty: 1, unit: 29900 },
    ];
    const q = quote(lines, DEFAULT_SETTINGS);
    expect(q.discounts).toEqual([]);
    expect(q.hints.find((h) => h.id === 'packs')?.text).toMatch(/Add 1 more sticker/);
  });
});
