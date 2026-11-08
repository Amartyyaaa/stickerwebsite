import { adminRouteGuard, download } from '@/lib/admin/route-guard';
import { databaseSnapshot } from '@/lib/backup/backup';

/** A copy of the database to keep on your computer (orders, products, settings; not photos). */
export async function GET() {
  const denied = await adminRouteGuard();
  if (denied) return denied;
  const data = await databaseSnapshot();
  if (!data) return Response.json({ error: 'This store uses a hosted database, which keeps its own backups.' }, { status: 400 });
  const at = new Date(Date.now() + 19800_000).toISOString();
  return download(data, `printyourvibe-${at.slice(0, 10)}-${at.slice(11, 13)}${at.slice(14, 16)}.sqlite.gz`, 'application/gzip');
}
