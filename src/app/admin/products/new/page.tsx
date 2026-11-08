import Link from 'next/link';
import { Suspense } from 'react';
import { ProductForm } from '@/components/admin/product-form';
import { AdminHeader } from '@/components/admin/ui';
import { adminOrNull } from '@/lib/admin/guard';
import { adminTypes, adminVibes } from '@/lib/admin/products';

export const metadata = { title: 'Add product' };

async function NewProduct() {
  if (!(await adminOrNull())) return null;
  const [types, vibes] = await Promise.all([adminTypes(), adminVibes()]);
  return <ProductForm product={null} types={types} vibes={vibes.map((v) => ({ id: v.id, name: v.name, isActive: v.isActive }))} />;
}

export default function NewProductPage() {
  return (
    <>
      <AdminHeader
        title="Add product"
        subtitle={
          <>
            <Link href="/admin/products" className="hover:text-ink">
              ← Products
            </Link>{' '}
            · Adding many? Use the{' '}
            <Link href="/admin/products/import" className="text-lime hover:underline">
              CSV import
            </Link>
            .
          </>
        }
      />
      <Suspense fallback={<div className="h-96" aria-busy="true" />}>
        <NewProduct />
      </Suspense>
    </>
  );
}
