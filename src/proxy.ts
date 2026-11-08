import { NextResponse, type NextRequest } from 'next/server';

/**
 * Category and vibe pages stream their listings, so by the time the page
 * knows a category is missing or hidden, it has already sent "200 OK". This
 * checks the address first and returns a real 404 for ones that don't exist.
 * The list of shown categories and vibes is kept for a minute.
 */
export const config = { matcher: ['/c/:type', '/v/:vibe'] };

let known: { at: number; types: Set<string>; vibes: Set<string> } | null = null;

async function shownPaths() {
  if (known && Date.now() - known.at < 60_000) return known;
  const { getShownPaths } = await import('@/lib/catalog/shown-paths');
  const { types, vibes } = await getShownPaths();
  known = { at: Date.now(), types: new Set(types), vibes: new Set(vibes) };
  return known;
}

export async function proxy(request: NextRequest) {
  const [, section, id] = request.nextUrl.pathname.split('/');
  try {
    const paths = await shownPaths();
    if ((section === 'c' ? paths.types : paths.vibes).has(decodeURIComponent(id ?? ''))) return NextResponse.next();
  } catch (err) {
    // If the check itself fails, let the page decide rather than hide a real category.
    console.error('[proxy]', err);
    return NextResponse.next();
  }
  return NextResponse.rewrite(new URL('/_not-found', request.url), { status: 404 });
}
