import { adminRouteGuard, download } from '@/lib/admin/route-guard';
import { toCsv } from '@/lib/admin/csv';
import { CSV_COLUMNS } from '@/lib/admin/product-rules';
import { templateRows } from '@/lib/admin/products';

/** An empty import file with the column names and two example rows. */
export async function GET() {
  const denied = await adminRouteGuard();
  if (denied) return denied;
  const csv = '﻿' + toCsv([[...CSV_COLUMNS], ...(await templateRows())]);
  return download(new TextEncoder().encode(csv), 'printyourvibe-product-template.csv', 'text/csv; charset=utf-8');
}
