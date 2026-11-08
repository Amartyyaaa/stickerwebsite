import { orderZip } from '@/lib/admin/files';
import { adminRouteGuard, download } from '@/lib/admin/route-guard';
import { getOrderViewForAdmin } from '@/lib/orders/service';

/** All of an order's custom files (originals, print files and a design.txt) as one zip (admins only). */
export async function GET(_request: Request, ctx: RouteContext<'/api/admin/files/zip/[number]'>) {
  const denied = await adminRouteGuard();
  if (denied) return denied;
  const { number } = await ctx.params;
  const found = await getOrderViewForAdmin(number);
  const zip = found ? await orderZip(found.order) : null;
  return zip ? download(zip, `${number}-custom-files.zip`, 'application/zip') : new Response('Not found', { status: 404 });
}
