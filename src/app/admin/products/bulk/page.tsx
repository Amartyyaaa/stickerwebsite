import Link from 'next/link';
import { Suspense } from 'react';
import { BulkPhotos } from '@/components/admin/bulk-photos';
import { AdminHeader } from '@/components/admin/ui';
import { adminOrNull } from '@/lib/admin/guard';
import { adminTypes, adminVibes } from '@/lib/admin/products';

export const metadata = { title: 'Add products from photos' };

async function Form() {
  if (!(await adminOrNull())) return null;
  const [types, vibes] = await Promise.all([adminTypes(), adminVibes()]);
  return (
    <BulkPhotos
      types={types.filter((t) => t.groupId !== 'custom').map((t) => ({ id: t.id, name: t.name }))}
      themes={vibes.map((v) => ({ id: v.id, name: v.name }))}
    />
  );
}

export default function BulkPhotosPage() {
  return (
    <>
      <AdminHeader
        title="Add from photos"
        subtitle={
          <Link href="/admin/products" className="hover:text-ink">
            ← Products
          </Link>
        }
      />
      <Suspense fallback={<div className="h-96" aria-busy="true" />}>
        <Form />
      </Suspense>
    </>
  );
}
