import { z } from 'zod';
import { CartLinesInput, priceCart } from '@/lib/pricing/price-cart';
import type { QuoteResponse } from '@/lib/pricing/quote-types';

const Body = z.object({
  lines: CartLinesInput,
  payment: z.enum(['online', 'cod']).optional(),
});

/** Price a cart on the server: current prices, offers, shipping and hints. */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'That cart could not be read.' }, { status: 400 });
  try {
    const { lines, invalid, summary } = await priceCart(parsed.data.lines, { payment: parsed.data.payment });
    const body: QuoteResponse = { lines: lines.map(({ typeId: _t, custom: _c, ...rest }) => rest), invalid, summary };
    return Response.json(body, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
}
