import { revalidateTag } from 'next/cache';
import { json, jsonError } from '@/lib/api';
import { adminOrNull } from '@/lib/admin/guard';
import { parseCsv } from '@/lib/admin/csv';
import { LIMITS, checkImport, type ImportRow } from '@/lib/admin/product-rules';
import { applyImport, importContext } from '@/lib/admin/products';

/** Rows sent back for the preview: every error, and the first few hundred of the rest. */
const PREVIEW_ROWS = 300;

/**
 * Check (?mode=check) or run (?mode=run) a product CSV import. The CSV is
 * the request body. Running checks the file again, so only rows that are
 * still valid are written.
 */
export async function POST(request: Request) {
  if (!(await adminOrNull())) return jsonError('Only store admins can import products.', 403);
  const mode = new URL(request.url).searchParams.get('mode') === 'run' ? 'run' : 'check';
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > LIMITS.importBytes) return jsonError('That file is over 5 MB. Split it into smaller files.', 413);
  const text = await request.text();
  if (text.length > LIMITS.importBytes) return jsonError('That file is over 5 MB. Split it into smaller files.', 413);

  const check = checkImport(parseCsv(text), await importContext());
  if (check.error) return jsonError(check.error, 422);

  if (mode === 'run') {
    const result = await applyImport(check.rows);
    if (result.created || result.updated) revalidateTag('catalog', { expire: 0 });
    return json({ ...result, errors: check.counts.error, unchanged: check.counts.unchanged });
  }

  const errors = check.rows.filter((r) => r.kind === 'error');
  const others = check.rows.filter((r) => r.kind !== 'error' && r.kind !== 'unchanged').slice(0, PREVIEW_ROWS);
  const rows: Array<Omit<ImportRow, 'product'> & { price?: number }> = [...errors, ...others]
    .sort((a, b) => a.row - b.row)
    .map((r) => (r.kind === 'new' || r.kind === 'update' ? { row: r.row, kind: r.kind, label: r.label, id: r.id, changes: r.changes, price: r.product.priceFrom } : r));
  return json({ counts: check.counts, ignored: check.ignored, rows, more: Math.max(0, check.rows.length - check.counts.unchanged - errors.length - others.length) });
}
