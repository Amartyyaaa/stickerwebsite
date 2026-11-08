import { describe, expect, it } from 'vitest';
import type { OptionGroup, PriceProfile } from '@/lib/catalog/types';
import { unitPrice } from '@/lib/pricing/engine';
import { slugify, uniqueSlug } from '@/lib/slug';
import { parseCsv, toCsv } from './csv';
import { fromPriceInput, toPriceInput } from './price-table';
import { checkImport, cleanTags, exportRow, overrideFor, parseRupees, startingPriceOf, type ExistingProduct, type ImportContext, type TypeInfo } from './product-rules';

describe('CSV', () => {
  it('reads quoted cells with commas, quotes and line breaks', () => {
    const text = '﻿name,description\r\n"Pit Lane, Night","She said ""go""\nfast"\r\nPlain,ok\r\n';
    expect(parseCsv(text)).toEqual([
      ['name', 'description'],
      ['Pit Lane, Night', 'She said "go"\nfast'],
      ['Plain', 'ok'],
    ]);
  });
  it('reads text pasted from a spreadsheet (tabs)', () => {
    expect(parseCsv('name\ttype\nNeon Koi\twall-posters')).toEqual([
      ['name', 'type'],
      ['Neon Koi', 'wall-posters'],
    ]);
  });
  it('keeps empty cells and a last line without a line break', () => {
    expect(parseCsv('a,,c\n,,')).toEqual([
      ['a', '', 'c'],
      ['', '', ''],
    ]);
  });
  it('writes what it reads', () => {
    const rows = [
      ['id', 'name', 'description'],
      ['1', 'Comma, here', 'Quote " and\nnew line'],
      ['2', ' padded ', ''],
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
});

describe('slugs and small rules', () => {
  it('makes readable web addresses', () => {
    expect(slugify('Café Racer — Poster!')).toBe('cafe-racer-poster');
    expect(uniqueSlug('neon', (s) => s === 'neon' || s === 'neon-2')).toBe('neon-3');
  });
  it('reads rupee amounts', () => {
    expect(parseRupees('₹1,299.50')).toBe(129950);
    expect(parseRupees(' 249 ')).toBe(24900);
    expect(parseRupees('')).toBeNull();
    expect(parseRupees('12.345')).toBeNaN();
    expect(parseRupees('-20')).toBeNaN();
    expect(parseRupees('-20', true)).toBe(-2000);
  });
  it('cleans tags', () => {
    expect(cleanTags('Anime, NARUTO; anime  ninja!')).toBe('anime naruto ninja');
  });
});

const SIZE: OptionGroup = {
  key: 'size',
  label: 'Size',
  values: [
    { value: 'A4', label: 'A4' },
    { value: 'A3', label: 'A3' },
  ],
};
const FRAME: OptionGroup = {
  key: 'frame',
  label: 'Frame',
  values: [
    { value: 'none', label: 'No frame' },
    { value: 'black', label: 'Black' },
  ],
};
const POSTER_PRICE: PriceProfile = { base: 19900, deltas: { size: { A4: 0, A3: 10000 }, frame: { none: 0, black: { by: 'size', map: { A4: 20000, A3: 25000 } } } } };
const poster: TypeInfo = { id: 'framed-posters', name: 'Framed Posters', singular: 'Framed poster', description: '', options: [SIZE, FRAME], price: POSTER_PRICE };

describe('product starting price', () => {
  it('moves every option by the same amount', () => {
    const override = overrideFor(poster, 24900);
    expect(override).toEqual({ base: 24900 });
    expect(startingPriceOf(poster, override)).toBe(24900);
    expect(unitPrice({ ...POSTER_PRICE, ...override }, { size: 'A3', frame: 'black' })).toBe(24900 + 10000 + 25000);
    expect(startingPriceOf(poster, null)).toBe(19900);
  });
});

describe('category price table', () => {
  it('round-trips the current prices', () => {
    const input = toPriceInput(poster.options, POSTER_PRICE);
    expect(input.amounts.frame.black).toEqual({ A4: '200', A3: '250' });
    const back = fromPriceInput(poster.options, POSTER_PRICE, input);
    expect(back).toEqual({ ok: true, price: POSTER_PRICE });
  });
  it('changes flat and dependent amounts and keeps the structure', () => {
    const input = toPriceInput(poster.options, POSTER_PRICE);
    input.base = '149';
    input.amounts.size.A3 = '120';
    input.amounts.frame.black = { A4: '210', A3: '260.50' };
    const r = fromPriceInput(poster.options, POSTER_PRICE, input);
    expect(r.ok && r.price).toEqual({ base: 14900, deltas: { size: { A4: 0, A3: 12000 }, frame: { none: 0, black: { by: 'size', map: { A4: 21000, A3: 26050 } } } } });
  });
  it('refuses prices below ₹1 and unreadable amounts', () => {
    const input = toPriceInput(poster.options, POSTER_PRICE);
    input.base = '0';
    expect(fromPriceInput(poster.options, POSTER_PRICE, input).ok).toBe(false);
    const bad = toPriceInput(poster.options, POSTER_PRICE);
    bad.amounts.size.A3 = 'ten';
    const r = fromPriceInput(poster.options, POSTER_PRICE, bad);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toContain('Size: A3');
  });
  it('only adds a price list for an option when an amount is set', () => {
    const plain: PriceProfile = { base: 9900 };
    const input = toPriceInput([SIZE], plain);
    expect(fromPriceInput([SIZE], plain, input)).toEqual({ ok: true, price: { base: 9900 } });
    input.amounts.size.A3 = '30';
    expect(fromPriceInput([SIZE], plain, input)).toEqual({ ok: true, price: { base: 9900, deltas: { size: { A4: 0, A3: 3000 } } } });
  });
});

const PHOTO = 'AAAAAAAAAAAAAAAAAAAAAA';
const PHOTO2 = 'BBBBBBBBBBBBBBBBBBBBBB';
const demo: ExistingProduct = {
  id: 7,
  slug: 'neon-koi-framed-poster',
  name: 'Neon Koi',
  typeId: 'framed-posters',
  vibes: ['anime', 'aesthetic'],
  description: 'A koi.',
  tags: 'koi fish',
  priceOverride: null,
  popularity: 10,
  images: [],
  hasArt: true,
  isActive: true,
};
const ctx: ImportContext = {
  types: [poster],
  vibes: [
    { id: 'anime', name: 'Anime' },
    { id: 'aesthetic', name: 'Aesthetic' },
    { id: 'f1', name: 'F1 & Racing' },
  ],
  products: [demo],
  photosByName: new Map([['koi-front.jpg', PHOTO]]),
  photoIds: new Set([PHOTO, PHOTO2]),
};
const header = ['id', 'slug', 'name', 'type', 'vibes', 'description', 'tags', 'price_from_rupees', 'popularity', 'images', 'active'];

describe('CSV import checks', () => {
  it('re-importing an export changes nothing', () => {
    const r = checkImport([header, exportRow(demo, poster)], ctx);
    expect(r.counts).toEqual({ new: 0, update: 0, unchanged: 1, error: 0 });
  });

  it('sorts rows into new, update and error, with reasons', () => {
    const r = checkImport(
      [
        header,
        ['7', '', 'Neon Koi', 'framed-posters', 'F1 & Racing;anime', 'A koi.', 'koi fish', '299', '10', 'koi-front.jpg', 'yes'],
        ['', '', 'Grid Start', 'Framed poster', 'f1', '', '', '', '', `/api/uploads/${PHOTO2}`, ''],
        ['', '', 'No Photo', 'framed-posters', 'anime', '', '', '', '', '', 'yes'],
        ['', '', 'Bad Type', 'mugs', 'unknown-vibe', '', '', 'abc', '', 'missing.png', 'maybe'],
      ],
      ctx,
    );
    expect(r.counts).toEqual({ new: 1, update: 1, unchanged: 0, error: 2 });
    const [update, created, noPhoto, bad] = r.rows;
    expect(update.kind === 'update' && update.changes).toEqual(['vibes', 'price', 'photos']);
    expect(update.kind === 'update' && update.product.vibes).toEqual(['f1', 'anime']);
    expect(update.kind === 'update' && update.product.priceFrom).toBe(29900);
    expect(created.kind === 'new' && created.product.slug).toBe('grid-start-framed-poster');
    expect(created.kind === 'new' && created.product.images).toEqual([`/api/uploads/${PHOTO2}`]);
    expect(noPhoto.kind === 'error' && noPhoto.errors[0]).toContain('Add a photo');
    expect(bad.kind === 'error' && bad.errors.length).toBe(5);
  });

  it('updates by web address and catches clashes inside the file', () => {
    const r = checkImport(
      [
        ['slug', 'name', 'type', 'vibes', 'active'],
        ['neon-koi-framed-poster', 'Neon Koi II', '', '', ''],
        ['brand-new', 'Brand New', 'framed-posters', 'anime', 'no'],
        ['brand-new', 'Brand New Again', 'framed-posters', 'anime', 'no'],
      ],
      ctx,
    );
    expect(r.rows[0].kind === 'update' && r.rows[0].changes).toEqual(['name']);
    expect(r.rows[1].kind).toBe('new');
    expect(r.rows[2].kind === 'error' && r.rows[2].errors[0]).toContain('Row 3');
  });

  it('matches rows without id or web address to the product they added before', () => {
    const file = [
      ['name', 'type', 'vibes', 'images'],
      ['Grid Start', 'framed-posters', 'f1', `/api/uploads/${PHOTO2}`],
      ['Grid Start', 'framed-posters', 'f1', `/api/uploads/${PHOTO2}`],
    ];
    const first = checkImport(file, ctx);
    expect(first.rows.map((r) => r.kind)).toEqual(['new', 'error']);
    expect(first.rows[1].kind === 'error' && first.rows[1].errors[0]).toContain('Row 2 adds a product with the same name');
    const added: ExistingProduct = { ...demo, id: 8, slug: 'grid-start-framed-poster', name: 'Grid Start', vibes: ['f1'], description: '', tags: '', popularity: 0, images: [`/api/uploads/${PHOTO2}`], hasArt: false };
    const again = checkImport(file.slice(0, 2), { ...ctx, products: [demo, added] });
    expect(again.rows[0]).toMatchObject({ kind: 'unchanged', id: 8 });
  });

  it('explains a file without column names', () => {
    expect(checkImport([['Neon Koi', 'framed-posters']], ctx).error).toContain('first row');
    expect(checkImport([], ctx).error).toBeDefined();
  });
});
