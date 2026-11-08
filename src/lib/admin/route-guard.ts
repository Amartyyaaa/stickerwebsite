import 'server-only';
import { adminOrNull } from './guard';

/** For admin route handlers: a 403 response unless the visitor is a store admin. */
export async function adminRouteGuard(): Promise<Response | null> {
  return (await adminOrNull()) ? null : new Response('Only store admins can do that.', { status: 403, headers: { 'Cache-Control': 'no-store' } });
}

/** A file download that is never cached and opens as an attachment with a safe name. */
export function download(data: Uint8Array, name: string, type: string): Response {
  return new Response(new Uint8Array(data), {
    headers: {
      'Content-Type': type,
      'Content-Length': String(data.length),
      'Content-Disposition': `attachment; filename="${name.replace(/[^\w.-]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
