import { z } from 'zod';
import { CartLinesInput, priceCart } from '@/lib/pricing/price-cart';
import type { QuoteResponse } from '@/lib/pricing/quote-types';

const Body = z.object({
  lines: CartLinesInput,
  payment: z.enum(['online', 'cod']).optional(),
  coupon: z.string().max(40).optional(),
  /** Lets the per-shopper coupon limit be checked before checkout. */
  email: z.string().max(200).optional(),
});

/** Price a cart on the server: current prices, offers, shipping and hints. */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'That cart could not be read.' }, { status: 400 });
  try {
    const { payment, coupon, email } = parsed.data;
    const { lines, invalid, summary } = await priceCart(parsed.data.lines, { payment, coupon, email: email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined });
    const body: QuoteResponse = { lines: lines.map(({ typeId: _t, custom: _c, ...rest }) => rest), invalid, summary };
    return Response.json(body, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
}
