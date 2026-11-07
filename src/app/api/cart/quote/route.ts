import { z } from 'zod';
import { getQuoteProducts, getQuoteTypes, getSettings } from '@/lib/catalog/queries';
import { checkDesign } from '@/lib/custom/rules';
import { studioForType } from '@/lib/custom/studios';
import { uploadSrc } from '@/lib/custom/types';
import { normalizeOptions, optionLabels, quote, unitPrice, type PricedLine } from '@/lib/pricing/engine';
import type { QuotedLine, QuoteResponse } from '@/lib/pricing/quote-types';
import { readyUploadIds } from '@/lib/uploads';

const MAX_CUSTOM_ITEMS = 500;

const Custom = z.object({
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

const Body = z.object({
  lines: z
    .array(
      z.object({
        key: z.string().max(400),
        /** 0 for custom-studio lines. */
        productId: z.number().int().min(0),
        options: z.record(z.string().max(40), z.string().max(80)).optional(),
        qty: z.number().int().min(1).max(99),
        custom: Custom.optional(),
      }),
    )
    .max(100),
  payment: z.enum(['online', 'cod']).optional(),
});

/** Price a cart on the server: current prices, offers, shipping and hints. */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'That cart could not be read.' }, { status: 400 });
  const input = parsed.data.lines;
  const customs = input.flatMap((l) => (l.custom ? [l.custom] : []));
  if (customs.reduce((n, c) => n + c.items.length, 0) > MAX_CUSTOM_ITEMS) return Response.json({ error: 'That cart has too many images.' }, { status: 400 });

  const [products, types, ready, settings] = await Promise.all([
    getQuoteProducts(input.filter((l) => !l.custom).map((l) => l.productId)),
    getQuoteTypes(customs.map((c) => c.typeId)),
    readyUploadIds(customs.flatMap((c) => c.items.map((i) => i.id))),
    getSettings(),
  ]);
  const byId = new Map(products.map((p) => [p.id, p]));
  const typeById = new Map(types.map((t) => [t.id, t]));
  const invalid: string[] = [];
  const lines: Array<QuotedLine & { typeId: string }> = [];

  for (const l of input) {
    if (l.custom) {
      // Custom-studio item: priced by its type, and every image must be uploaded and checked.
      const t = typeById.get(l.custom.typeId);
      const studio = t && studioForType(t.id);
      const options = t ? normalizeOptions(t.options, l.options) : null;
      const ok =
        t && studio && options && !checkDesign(studio.kind, options, l.custom.items, l.custom.note) && l.custom.items.every((i) => ready.has(i.id));
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
    });
  }

  const priced: PricedLine[] = lines.map(({ key, productId, typeId, options, qty, unit }) => ({ key, productId, typeId, options, qty, unit }));
  const { lines: _priced, ...summary } = quote(priced, settings, { payment: parsed.data.payment });
  const body: QuoteResponse = { lines: lines.map(({ typeId: _t, ...rest }) => rest), invalid, summary };
  return Response.json(body, { headers: { 'Cache-Control': 'no-store' } });
}
