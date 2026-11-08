import { adminRouteGuard, download } from '@/lib/admin/route-guard';
import { toCsv } from '@/lib/admin/csv';
import { CSV_COLUMNS } from '@/lib/admin/product-rules';
import { exportProducts } from '@/lib/admin/products';

/** Every product as a CSV in the import format (?real=1 leaves out demo products). Edit it in Excel and import it again. */
export async function GET(request: Request) {
  const denied = await adminRouteGuard();
  if (denied) return denied;
  const onlyReal = new URL(request.url).searchParams.get('real') === '1';
  const rows = await exportProducts(onlyReal);
  const day = new Date(Date.now() + 19800_000).toISOString().slice(0, 10);
  // The byte-order mark makes Excel read ₹ and other non-English letters correctly.
  const csv = '﻿' + toCsv([[...CSV_COLUMNS], ...rows]);
  return download(new TextEncoder().encode(csv), `printyourvibe-products-${day}.csv`, 'text/csv; charset=utf-8');
}
