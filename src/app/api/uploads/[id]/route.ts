import { readPreview } from '@/lib/uploads';

/** The web preview (or `?size=thumb` thumbnail) of an upload. Originals are never served here. */
export async function GET(request: Request, ctx: RouteContext<'/api/uploads/[id]'>) {
  const { id } = await ctx.params;
  const size = new URL(request.url).searchParams.get('size') === 'thumb' ? 'thumb' : 'preview';
  const data = await readPreview(id, size);
  if (!data) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  return new Response(new Uint8Array(data), {
    headers: {
      'Content-Type': 'image/webp',
      'Content-Length': String(data.length),
      // Each id always points to the same image, so the browser can keep it. "private": no shared caches.
      'Cache-Control': 'private, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline',
    },
  });
}
