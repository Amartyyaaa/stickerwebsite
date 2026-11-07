import type { NextRequest } from 'next/server';
import { getCardsByIds } from '@/lib/catalog/queries';

/** Product cards by id, for the wishlist and "recently viewed". */
export async function GET(request: NextRequest) {
  const ids = (request.nextUrl.searchParams.get('ids') ?? '')
    .split(',')
    .map((x) => Number.parseInt(x, 10))
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 60);
  return Response.json(await getCardsByIds(ids), { headers: { 'Cache-Control': 'public, max-age=60' } });
}
