import type { NextRequest } from 'next/server';
import { getSuggestions } from '@/lib/catalog/queries';

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 80);
  if (q.length < 2) return Response.json({ products: [], types: [], vibes: [] });
  return Response.json(await getSuggestions(q.toLowerCase()), { headers: { 'Cache-Control': 'public, max-age=60' } });
}
