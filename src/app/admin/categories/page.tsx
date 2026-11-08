import Link from 'next/link';
import { Suspense } from 'react';
import { MoveButtons } from '@/components/admin/category-form';
import { Badge } from '@/components/admin/product-table';
import { AdminHeader, Panel, tableClass } from '@/components/admin/ui';
import { listCategories } from '@/lib/admin/categories';
import { adminOrNull } from '@/lib/admin/guard';
import { GROUPS } from '@/lib/catalog/types';
import { formatINR } from '@/lib/money';

export const metadata = { title: 'Categories' };

const SECTIONS = [...GROUPS.map((g) => ({ id: g.id as string, name: g.name, blurb: g.blurb })), { id: 'custom', name: 'Custom studio', blurb: 'Prices for shoppers’ own designs' }];

async function Categories() {
  if (!(await adminOrNull())) return null;
  const rows = await listCategories();
  return (
    <div className="grid gap-5">
      {SECTIONS.map((g) => {
        const list = rows.filter((r) => r.groupId === g.id);
        if (!list.length) return null;
        return (
          <Panel key={g.id} title={g.name}>
            <p className="-mt-2 mb-3 text-sm text-muted">{g.blurb}</p>
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <table className={`${tableClass} min-w-[560px]`}>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th className="text-right">Products</th>
                    <th className="text-right">Starts at</th>
                    <th className="w-24">Order</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((t, i) => (
                    <tr key={t.id}>
                      <td>
                        <Link href={`/admin/categories/${t.id}`} className="font-semibold hover:text-lime hover:underline">
                          {t.name}
                        </Link>
                        {!t.isActive && (
                          <span className="ml-2">
                            <Badge tone="warn">Hidden</Badge>
                          </span>
                        )}
                        <span className="block text-xs text-muted">{t.id}</span>
                      </td>
                      <td className="text-right tabular-nums">{g.id === 'custom' ? '—' : t.products.toLocaleString('en-IN')}</td>
                      <td className="text-right font-semibold tabular-nums">{formatINR(t.startingPrice)}</td>
                      <td>
                        <MoveButtons id={t.id} label={t.name} kind="category" first={i === 0} last={i === list.length - 1} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

export default function AdminCategoriesPage() {
  return (
    <>
      <AdminHeader title="Categories" subtitle="Product types: names, the order in menus, and their price tables." />
      <Suspense fallback={<div className="h-96" aria-busy="true" />}>
        <Categories />
      </Suspense>
    </>
  );
}
