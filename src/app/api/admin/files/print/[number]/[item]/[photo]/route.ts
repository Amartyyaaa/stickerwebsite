import { printFile } from '@/lib/admin/files';
import { adminRouteGuard, download } from '@/lib/admin/route-guard';
import { getOrderViewForAdmin } from '@/lib/orders/service';

/** One print-ready file: the customer's crop applied to the original at full resolution (admins only). */
export async function GET(_request: Request, ctx: RouteContext<'/api/admin/files/print/[number]/[item]/[photo]'>) {
  const denied = await adminRouteGuard();
  if (denied) return denied;
  const { number, item, photo } = await ctx.params;
  const found = await getOrderViewForAdmin(number);
  const f = found ? await printFile(found.order, Number(item), Number(photo)) : null;
  return f ? download(f.data, f.name, f.type) : new Response('Not found', { status: 404 });
}
