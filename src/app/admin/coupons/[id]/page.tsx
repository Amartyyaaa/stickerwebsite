import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { CouponForm } from '@/components/admin/coupon-form';
import { AdminHeader } from '@/components/admin/ui';
import { toCouponForm } from '@/lib/admin/coupon-form';
import { getCoupon } from '@/lib/admin/coupons';
import { adminOrNull } from '@/lib/admin/guard';

export const metadata = { title: 'Edit coupon' };

async function EditCoupon({ params }: { params: PageProps<'/admin/coupons/[id]'>['params'] }) {
  if (!(await adminOrNull())) return null;
  const { id } = await params;
  const n = Number(id);
  const coupon = Number.isInteger(n) && n > 0 ? await getCoupon(n) : null;
  if (!coupon) notFound();
  return (
    <>
      <AdminHeader
        title={coupon.code}
        subtitle={
          <>
            <Link href="/admin/coupons" className="hover:text-ink">
              ← Coupons
            </Link>{' '}
            ·{' '}
            <Link href={`/admin/orders?q=${encodeURIComponent(coupon.code)}`} className="text-lime hover:underline">
              Orders with this code
            </Link>
          </>
        }
      />
      <CouponForm key={coupon.id} id={coupon.id} initial={toCouponForm(coupon)} usedCount={coupon.usedCount} />
    </>
  );
}

export default function EditCouponPage(props: PageProps<'/admin/coupons/[id]'>) {
  return (
    <Suspense fallback={<div className="h-64" aria-busy="true" />}>
      <EditCoupon params={props.params} />
    </Suspense>
  );
}
