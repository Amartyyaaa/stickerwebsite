import { Suspense } from 'react';
import { HomeEditor } from '@/components/admin/home-editor';
import { AdminHeader } from '@/components/admin/ui';
import { adminOrNull } from '@/lib/admin/guard';
import { currentSettings } from '@/lib/admin/settings';

export const metadata = { title: 'Home page' };

async function Content() {
  if (!(await adminOrNull())) return null;
  const settings = await currentSettings();
  return <HomeEditor initial={settings.home} />;
}

export default function AdminContentPage() {
  return (
    <>
      <AdminHeader title="Home page" subtitle="The banner at the top of the home page. Featured vibes are chosen on the Vibes page; the announcement bar is in Settings." />
      <Suspense fallback={<div className="h-96" aria-busy="true" />}>
        <Content />
      </Suspense>
    </>
  );
}
