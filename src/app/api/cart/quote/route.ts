import { z } from 'zod';
import { getQuoteProducts, getSettings } from '@/lib/catalog/queries';
import { normalizeOptions, optionLabels, quote, unitPrice, type PricedLine } from '@/lib/pricing/engine';
import type { QuotedLine, QuoteResponse } from '@/lib/pricing/quote-types';

const Body = z.object({
  lines: z
    .array(
      z.object({
        key: z.string().max(400),
        productId: z.number().int().positive(),
        options: z.record(z.string().max(40), z.string().max(80)).optional(),
        qty: z.number().int().min(1).max(99),
      }),
    )
    .max(100),
  payment: z.enum(['online', 'cod']).optional(),
});

/** Price a cart on the server: current prices, offers, shipping and hints. */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'That cart could not be read.' }, { status: 400 });

  const [products, settings] = await Promise.all([getQuoteProducts(parsed.data.lines.map((l) => l.productId)), getSettings()]);
  const byId = new Map(products.map((p) => [p.id, p]));
  const invalid: string[] = [];
  const lines: Array<QuotedLine & { typeId: string }> = [];

  for (const l of parsed.data.lines) {
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
