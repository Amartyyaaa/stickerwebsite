import { Suspense } from 'react';
import { SettingsEditor } from '@/components/admin/settings-editor';
import { AdminHeader } from '@/components/admin/ui';
import { adminOrNull } from '@/lib/admin/guard';
import { adminTypes } from '@/lib/admin/products';
import { currentSettings } from '@/lib/admin/settings';
import { toSettingsForm } from '@/lib/admin/settings-form';
import { paymentsMode } from '@/lib/payments/razorpay';

export const metadata = { title: 'Settings' };

async function Settings() {
  if (!(await adminOrNull())) return null;
  const [settings, types] = await Promise.all([currentSettings(), adminTypes()]);
  return <SettingsEditor initial={toSettingsForm(settings)} types={types.map((t) => ({ id: t.id, name: t.name }))} onlinePayments={paymentsMode() !== 'off'} />;
}

export default function AdminSettingsPage() {
  return (
    <>
      <AdminHeader title="Settings" subtitle="Shipping, Cash on Delivery, offers, contact details and what goes on receipts." />
      <Suspense fallback={<div className="h-96" aria-busy="true" />}>
        <Settings />
      </Suspense>
    </>
  );
}
