import Link from 'next/link';
import { Suspense } from 'react';
import { CsvImport, PhotoUploader } from '@/components/admin/import-panel';
import { AdminHeader, Panel, tableClass } from '@/components/admin/ui';
import { adminOrNull } from '@/lib/admin/guard';

export const metadata = { title: 'Import products' };

const COLUMNS: Array<[string, string]> = [
  ['id', 'Leave empty for a new product. With an id, the row changes that product (the export fills it in).'],
  ['slug', 'The web address, like midnight-drift-wall-poster. Empty for a new product makes one from the name. A row with the slug of an existing product changes that product.'],
  ['name', 'The product name. Needed for new products.'],
  ['type', 'The product type id, like wall-posters or laptop-stickers (the template uses yours).'],
  ['vibes', 'One or more vibe ids or names separated by ;, the main one first. For example anime;aesthetic.'],
  ['description', 'Shown on the product page. Empty uses the type’s description.'],
  ['tags', 'Extra search words, separated by spaces or commas.'],
  ['price_from_rupees', 'The product’s own starting price in rupees, like 249. Empty uses the type’s price table.'],
  ['popularity', 'Optional. Higher numbers come first when shoppers sort by Popular.'],
  ['images', 'Photo file names from step 1, separated by |, the cover first. Empty keeps the photos a product already has.'],
  ['active', 'yes to show it in the store, no to keep it hidden. Empty means yes for new products and no change for others.'],
];

async function Gate({ children }: { children: React.ReactNode }) {
  return (await adminOrNull()) ? <>{children}</> : null;
}

export default function ImportProductsPage() {
  return (
    <>
      <AdminHeader
        title="Import products"
        subtitle={
          <Link href="/admin/products" className="hover:text-ink">
            ← Products
          </Link>
        }
        actions={
          <>
            <a href="/api/admin/products/template" className="btn btn-ghost btn-sm">
              Download template
            </a>
            <a href="/api/admin/products/export?real=1" className="btn btn-ghost btn-sm">
              Export your products
            </a>
            <a href="/api/admin/products/export" className="btn btn-ghost btn-sm">
              Export all
            </a>
          </>
        }
      />
      <Suspense fallback={<div className="h-96" aria-busy="true" />}>
        <Gate>
          <div className="grid gap-5">
            <p className="rounded-card border border-lime/40 bg-lime/5 px-4 py-3 text-sm">
              Just have a folder of design files? <Link href="/admin/products/bulk" className="font-semibold text-lime underline underline-offset-2">Add from photos</Link> makes one product per image, named from the file names, without a spreadsheet.
            </p>
            <Panel title="1. Upload the photos">
              <p className="mb-4 max-w-[70ch] text-sm text-muted">
                Upload every photo the file mentions first. Rows are matched to photos by file name, so a row with <code className="text-ink">midnight-drift.jpg</code> in its images column gets the photo you uploaded with that name. Skip this step if you’re only changing prices or names.
              </p>
              <PhotoUploader />
            </Panel>
            <Panel title="2. Check the file, then import">
              <p className="mb-4 max-w-[70ch] text-sm text-muted">
                Start from the template, or export your products, edit them in Excel or Google Sheets, and bring the file back. Checking changes nothing: you’ll see which rows are new, which change a product, and any problems, before you import.
              </p>
              <CsvImport />
            </Panel>
            <Panel title="Columns">
              <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                <table className={`${tableClass} min-w-[560px]`}>
                  <thead>
                    <tr>
                      <th className="w-44">Column</th>
                      <th>What to put in it</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COLUMNS.map(([c, d]) => (
                      <tr key={c}>
                        <td className="font-mono text-[13px] text-lime">{c}</td>
                        <td className="text-[13.5px] text-muted">{d}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-muted">Columns you leave out of the file are left as they are. Up to 10,000 rows and 5 MB per file.</p>
            </Panel>
          </div>
        </Gate>
      </Suspense>
    </>
  );
}
