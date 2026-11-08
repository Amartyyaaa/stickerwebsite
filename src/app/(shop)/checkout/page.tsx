import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CheckoutForm } from '@/components/checkout/checkout-form';
import { getSettings } from '@/lib/catalog/queries';
import { listAddresses } from '@/lib/orders/addresses';
import { paymentsMode } from '@/lib/payments/razorpay';
import { getViewer } from '@/lib/viewer';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false } };

function CheckoutSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]" aria-busy="true">
      <div className="grid content-start gap-5">
        <div className="h-48 rounded-card border border-line bg-surface/60" />
        <div className="h-96 rounded-card border border-line bg-surface/60" />
      </div>
      <div className="h-96 rounded-card border border-line bg-surface" />
    </div>
  );
}

/** The parts of checkout that depend on who is signed in. */
async function CheckoutLoader() {
  const [viewer, settings] = await Promise.all([getViewer(), getSettings()]);
  const saved = viewer ? await listAddresses(viewer.id) : [];
  return (
    <CheckoutForm
      viewer={viewer ? { email: viewer.email } : null}
      addresses={saved}
      settings={{ cod: settings.cod, delivery: settings.delivery, prepaidDiscount: settings.prepaidDiscount }}
      mode={paymentsMode()}
    />
  );
}

export default function CheckoutPage() {
  return (
    <div className="wrap py-8 md:py-10">
      <h1 className="display mb-6 text-[clamp(38px,5vw,60px)]">Checkout</h1>
      <Suspense fallback={<CheckoutSkeleton />}>
        <CheckoutLoader />
      </Suspense>
    </div>
  );
}
