import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { CategoryForm } from '@/components/admin/category-form';
import { AdminHeader } from '@/components/admin/ui';
import { getCategory } from '@/lib/admin/categories';
import { adminOrNull } from '@/lib/admin/guard';

export const metadata = { title: 'Edit category' };

async function EditCategory({ params }: { params: PageProps<'/admin/categories/[id]'>['params'] }) {
  if (!(await adminOrNull())) return null;
  const { id } = await params;
  const category = await getCategory(id);
  if (!category) notFound();
  return (
    <>
      <AdminHeader
        title={category.name}
        subtitle={
          <>
            <Link href="/admin/categories" className="hover:text-ink">
              ← Categories
            </Link>
            {category.groupId !== 'custom' && (
              <>
                {' '}
                · {category.products.toLocaleString('en-IN')} products ·{' '}
                <Link href={`/admin/products?type=${category.id}`} className="text-lime hover:underline">
                  See them
                </Link>
              </>
            )}
          </>
        }
      />
      <CategoryForm key={category.id} category={category} />
    </>
  );
}

export default function EditCategoryPage(props: PageProps<'/admin/categories/[id]'>) {
  return (
    <Suspense fallback={<div className="h-96" aria-busy="true" />}>
      <EditCategory params={props.params} />
    </Suspense>
  );
}
