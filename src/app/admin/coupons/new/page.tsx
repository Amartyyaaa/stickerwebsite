import Link from 'next/link';
import { Suspense } from 'react';
import { CouponForm } from '@/components/admin/coupon-form';
import { AdminHeader } from '@/components/admin/ui';
import { adminOrNull } from '@/lib/admin/guard';

export const metadata = { title: 'New coupon' };

async function Gate({ children }: { children: React.ReactNode }) {
  return (await adminOrNull()) ? <>{children}</> : null;
}

export default function NewCouponPage() {
  return (
    <>
      <AdminHeader
        title="New coupon"
        subtitle={
          <Link href="/admin/coupons" className="hover:text-ink">
            ← Coupons
          </Link>
        }
      />
      <Suspense fallback={<div className="h-64" aria-busy="true" />}>
        <Gate>
          <CouponForm id={null} />
        </Gate>
      </Suspense>
    </>
  );
}
