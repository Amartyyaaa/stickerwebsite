import { originalFile } from '@/lib/admin/files';
import { adminRouteGuard, download } from '@/lib/admin/route-guard';

/** The untouched original a customer uploaded (admins only). */
export async function GET(_request: Request, ctx: RouteContext<'/api/admin/files/original/[id]'>) {
  const denied = await adminRouteGuard();
  if (denied) return denied;
  const { id } = await ctx.params;
  const f = await originalFile(id);
  return f ? download(f.data, f.name, f.type) : new Response('Not found', { status: 404 });
}
