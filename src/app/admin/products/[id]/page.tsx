import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ProductForm } from '@/components/admin/product-form';
import { AdminHeader } from '@/components/admin/ui';
import { adminOrNull } from '@/lib/admin/guard';
import { adminTypes, adminVibes, getAdminProduct } from '@/lib/admin/products';

export const metadata = { title: 'Edit product' };

async function EditProduct({ params, searchParams }: { params: PageProps<'/admin/products/[id]'>['params']; searchParams: PageProps<'/admin/products/[id]'>['searchParams'] }) {
  if (!(await adminOrNull())) return null;
  const { id } = await params;
  const n = Number(id);
  const product = Number.isInteger(n) && n > 0 ? await getAdminProduct(n) : null;
  if (!product) notFound();
  const [types, vibes, sp] = await Promise.all([adminTypes(), adminVibes(), searchParams]);
  return (
    <>
      <AdminHeader
        title={product.name}
        subtitle={
          <>
            <Link href="/admin/products" className="hover:text-ink">
              ← Products
            </Link>{' '}
            · id {product.id}
            {sp.saved === '1' && <span className="ml-2 font-semibold text-lime">Added. It’s in the store now{product.isActive ? '' : ' (hidden)'}.</span>}
          </>
        }
      />
      <ProductForm key={product.id} product={product} types={types} vibes={vibes.map((v) => ({ id: v.id, name: v.name, isActive: v.isActive }))} />
    </>
  );
}

export default function EditProductPage(props: PageProps<'/admin/products/[id]'>) {
  return (
    <Suspense fallback={<div className="h-96" aria-busy="true" />}>
      <EditProduct params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
