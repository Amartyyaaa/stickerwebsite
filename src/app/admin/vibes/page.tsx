import { Suspense } from 'react';
import { AdminHeader, Panel } from '@/components/admin/ui';
import { AddVibeForm, VibeRow } from '@/components/admin/vibe-manager';
import { adminOrNull } from '@/lib/admin/guard';
import { adminVibes } from '@/lib/admin/products';

export const metadata = { title: 'Vibes' };

async function Vibes() {
  if (!(await adminOrNull())) return null;
  const vibes = await adminVibes();
  const featured = vibes.filter((v) => v.featured && v.isActive).length;
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
      <Panel title={`${vibes.length} vibes`}>
        <p className="-mt-2 mb-2 text-sm text-muted">
          {featured} featured on the home page and in the menu. The order here is the order shoppers see. A vibe products use can’t be deleted, but you can hide it.
        </p>
        <ul>
          {vibes.map((v, i) => (
            <VibeRow key={`${v.id}-${v.name}-${v.blurb}-${v.featured}-${v.isActive}`} vibe={v} first={i === 0} last={i === vibes.length - 1} />
          ))}
        </ul>
      </Panel>
      <Panel title="Add a vibe" className="xl:sticky xl:top-6">
        <AddVibeForm />
      </Panel>
    </div>
  );
}

export default function AdminVibesPage() {
  return (
    <>
      <AdminHeader title="Vibes" subtitle="Collections like Anime, F1 or Aesthetic. Each product has a main vibe and up to four more." />
      <Suspense fallback={<div className="h-96" aria-busy="true" />}>
        <Vibes />
      </Suspense>
    </>
  );
}
