import { readPreview } from '@/lib/uploads';

/** The web preview (or `?size=thumb` thumbnail) of an upload. Originals are never served here. */
export async function GET(request: Request, ctx: RouteContext<'/api/uploads/[id]'>) {
  const { id } = await ctx.params;
  const size = new URL(request.url).searchParams.get('size') === 'thumb' ? 'thumb' : 'preview';
  const file = await readPreview(id, size);
  if (!file) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  return new Response(new Uint8Array(file.data), {
    headers: {
      'Content-Type': 'image/webp',
      'Content-Length': String(file.data.length),
      // Each id always points to the same image, so it can be kept for a year. Catalog photos may also be
      // kept by shared caches (a CDN); a shopper's own uploads only by their browser.
      'Cache-Control': `${file.isPublic ? 'public' : 'private'}, max-age=31536000, immutable`,
      // Hosts with their own CDN (Vercel, Cloudflare) cache catalog photos too, so they aren't fetched from storage each time.
      ...(file.isPublic ? { 'CDN-Cache-Control': 'public, max-age=31536000, immutable' } : {}),
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline',
    },
  });
}
