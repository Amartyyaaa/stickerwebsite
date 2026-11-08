import 'server-only';
import { z } from 'zod';
import { getQuoteProducts, getQuoteTypes, getSettings } from '@/lib/catalog/queries';
import { resolveCoupon } from '@/lib/coupons';
import { checkDesign } from '@/lib/custom/rules';
import { studioForType } from '@/lib/custom/studios';
import { uploadSrc } from '@/lib/custom/types';
import type { StoreSettings } from '@/lib/settings';
import { readyUploadIds } from '@/lib/uploads';
import { normalizeOptions, optionLabels, quote, unitPrice, type PricedLine, type Quote } from './engine';
import type { QuotedLine } from './quote-types';

/**
 * Prices a cart on the server. The cart quote API and checkout both use this,
 * so the price a shopper sees is the price their order is created with.
 */

const MAX_CUSTOM_ITEMS = 500;

const CustomInput = z.object({
  typeId: z.string().max(40),
  items: z
    .array(
      z.object({
        id: z.string().max(40),
        caption: z.string().max(60).optional(),
        crop: z.object({ x: z.number(), y: z.number(), zoom: z.number() }).optional(),
      }),
    )
    .min(1)
    .max(50),
  note: z.string().max(400).optional(),
});

export const CartLineInput = z.object({
  key: z.string().max(400),
  /** 0 for custom-studio lines. */
  productId: z.number().int().min(0),
  options: z.record(z.string().max(40), z.string().max(80)).optional(),
  qty: z.number().int().min(1).max(99),
  custom: CustomInput.optional(),
});

export const CartLinesInput = z.array(CartLineInput).max(100);
export type CartLineInput = z.infer<typeof CartLineInput>;

/** A priced line, with the extra details an order needs to keep. */
export interface PricedCartLine extends QuotedLine {
  typeId: string;
  custom: CartLineInput['custom'] | null;
}

export interface PricedCart {
  lines: PricedCartLine[];
  /** Cart keys that couldn't be priced (a removed product, a missing upload, invalid options). */
  invalid: string[];
  summary: Omit<Quote, 'lines'>;
  settings: StoreSettings;
}

/** `coupon` is the code as the shopper typed it; `email` lets the per-shopper limit be checked. */
export async function priceCart(input: CartLineInput[], opts: { payment?: 'online' | 'cod'; coupon?: string; email?: string } = {}): Promise<PricedCart> {
  const customs = input.flatMap((l) => (l.custom ? [l.custom] : []));
  if (customs.reduce((n, c) => n + c.items.length, 0) > MAX_CUSTOM_ITEMS) throw new Error('That cart has too many images.');

  const [products, types, ready, settings, coupon] = await Promise.all([
    getQuoteProducts(input.filter((l) => !l.custom).map((l) => l.productId)),
    getQuoteTypes(customs.map((c) => c.typeId)),
    readyUploadIds(customs.flatMap((c) => c.items.map((i) => i.id))),
    getSettings(),
    opts.coupon?.trim() ? resolveCoupon(opts.coupon, opts.email) : null,
  ]);
  const byId = new Map(products.map((p) => [p.id, p]));
  const typeById = new Map(types.map((t) => [t.id, t]));
  const invalid: string[] = [];
  const lines: PricedCartLine[] = [];

  for (const l of input) {
    if (l.custom) {
      // Custom-studio item: priced by its type, and every image must be uploaded and checked.
      const t = typeById.get(l.custom.typeId);
      const studio = t && studioForType(t.id);
      const options = t ? normalizeOptions(t.options, l.options) : null;
      const ok = t && studio && options && !checkDesign(studio.kind, options, l.custom.items, l.custom.note) && l.custom.items.every((i) => ready.has(i.id));
      if (!ok) {
        invalid.push(l.key);
        continue;
      }
      const unit = unitPrice(t.price, options);
      lines.push({
        key: l.key,
        productId: 0,
        typeId: t.id,
        slug: '',
        name: t.name,
        typeName: t.singular,
        art: null,
        image: uploadSrc(l.custom.items[0].id, 'thumb'),
        options,
        optionLabels: optionLabels(t.options, options),
        qty: l.qty,
        unit,
        total: unit * l.qty,
        custom: l.custom,
      });
      continue;
    }

    const p = byId.get(l.productId);
    const options = p ? normalizeOptions(p.options, l.options) : null;
    if (!p || !options) {
      invalid.push(l.key);
      continue;
    }
    const unit = unitPrice(p.price, options);
    lines.push({
      key: l.key,
      productId: p.id,
      typeId: p.typeId,
      slug: p.slug,
      name: p.name,
      typeName: p.typeName,
      art: p.art,
      image: p.image,
      options,
      optionLabels: optionLabels(p.options, options),
      qty: l.qty,
      unit,
      total: unit * l.qty,
      custom: null,
    });
  }

  const priced: PricedLine[] = lines.map(({ key, productId, typeId, options, qty, unit }) => ({ key, productId, typeId, options, qty, unit }));
  const { lines: _priced, ...summary } = quote(priced, settings, { payment: opts.payment, coupon: coupon?.rule ?? null });
  if (coupon && !coupon.rule) summary.coupon = { code: coupon.code, applied: false, amount: 0, freeShipping: false, reason: coupon.problem ?? undefined };
  return { lines, invalid, summary, settings };
}
