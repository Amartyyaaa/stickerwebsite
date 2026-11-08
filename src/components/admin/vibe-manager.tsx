'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createVibeAction, deleteVibeAction, updateVibeAction } from '@/actions/admin/catalog';
import { Field, inputClass } from '@/components/checkout/fields';
import type { AdminVibe } from '@/lib/admin/products';
import { cn } from '@/lib/cn';
import { slugify } from '@/lib/slug';
import { MoveButtons } from './category-form';

type Result = { ok: true } | { ok: false; error: string };

function useRun() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<Result>) => {
    setBusy(true);
    setError(null);
    const r = await fn();
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return false;
    }
    router.refresh();
    return true;
  };
  return { busy, error, run };
}

export function AddVibeForm() {
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [idTouched, setIdTouched] = useState(false);
  const [blurb, setBlurb] = useState('');
  const [featured, setFeatured] = useState(false);
  const [added, setAdded] = useState<string | null>(null);
  const { busy, error, run } = useRun();
  const slug = idTouched ? id : slugify(name).slice(0, 40);
  return (
    <form
      className="grid gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await run(() => createVibeAction({ id: slug, name, blurb, featured, isActive: true }))) {
          setAdded(name.trim());
          setName('');
          setId('');
          setIdTouched(false);
          setBlurb('');
          setFeatured(false);
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="nv-name" label="Name">
          <input id="nv-name" value={name} maxLength={40} onChange={(e) => (setName(e.target.value), setAdded(null))} placeholder="K-Pop" className={inputClass()} />
        </Field>
        <Field id="nv-id" label="Web address" hint={slug ? `printyourvibe.in/v/${slug}` : 'Made from the name.'}>
          <input
            id="nv-id"
            value={slug}
            maxLength={40}
            onChange={(e) => {
              setIdTouched(true);
              setId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
            }}
            className={inputClass()}
            aria-describedby="nv-id-hint"
          />
        </Field>
      </div>
      <Field id="nv-blurb" label="Description" optional hint="One line shown on the vibe’s page and tile.">
        <input id="nv-blurb" value={blurb} maxLength={200} onChange={(e) => setBlurb(e.target.value)} className={inputClass()} aria-describedby="nv-blurb-hint" />
      </Field>
      <label className="flex items-center gap-3 text-[15px]">
        <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="size-4 accent-[var(--color-lime)]" />
        Feature it on the home page and in the menu
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !name.trim()}>
          Add vibe
        </button>
        <p className={cn('text-sm font-semibold', error ? 'text-red' : 'text-lime')} role="status">
          {error ?? (added ? `Added ${added}. Give products this vibe from their edit page, the bulk “Set main vibe”, or the CSV import.` : '')}
        </p>
      </div>
    </form>
  );
}

export function VibeRow({ vibe, first, last }: { vibe: AdminVibe; first: boolean; last: boolean }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(vibe.name);
  const [blurb, setBlurb] = useState(vibe.blurb);
  const { busy, error, run } = useRun();
  const save = (patch: Partial<Pick<AdminVibe, 'name' | 'blurb' | 'featured' | 'isActive'>>) =>
    run(() => updateVibeAction({ id: vibe.id, name: vibe.name, blurb: vibe.blurb, featured: vibe.featured, isActive: vibe.isActive, ...patch }));

  return (
    <li className={cn('grid gap-3 border-t border-line py-3 first:border-t-0', !vibe.isActive && 'opacity-70')}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-[180px] flex-1">
          <p className="font-semibold">
            {vibe.name}
            {!vibe.isActive && <span className="ml-2 text-xs font-bold uppercase tracking-[0.06em] text-orange">Hidden</span>}
          </p>
          <p className="text-xs text-muted">
            {vibe.isActive ? (
              <Link href={`/v/${vibe.id}`} target="_blank" className="hover:text-lime">
                /v/{vibe.id}
              </Link>
            ) : (
              `/v/${vibe.id}`
            )}{' '}
            ·{' '}
            <Link href={`/admin/products?vibe=${vibe.id}`} className="hover:text-lime">
              {vibe.products.toLocaleString('en-IN')} products
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="chip min-h-9" aria-pressed={vibe.featured} disabled={busy} onClick={() => save({ featured: !vibe.featured })}>
            {vibe.featured ? '★ Featured' : '☆ Feature'}
          </button>
          <button type="button" className="chip min-h-9" disabled={busy} onClick={() => save({ isActive: !vibe.isActive })}>
            {vibe.isActive ? 'Hide' : 'Show'}
          </button>
          <button type="button" className="chip min-h-9" aria-expanded={editing} onClick={() => setEditing((x) => !x)}>
            Edit
          </button>
          {vibe.products === 0 && (
            <button
              type="button"
              className="chip min-h-9 border-red/50 text-red hover:border-red"
              disabled={busy}
              onClick={() => window.confirm(`Delete the ${vibe.name} vibe?`) && run(() => deleteVibeAction({ id: vibe.id }))}
            >
              Delete
            </button>
          )}
          <MoveButtons id={vibe.id} label={vibe.name} kind="vibe" first={first} last={last} />
        </div>
      </div>
      {!editing && vibe.blurb && <p className="-mt-1 text-sm text-muted">{vibe.blurb}</p>}
      {editing && (
        <form
          className="grid gap-3 rounded-[3px] border border-line bg-bg p-3 sm:grid-cols-[220px_minmax(0,1fr)_auto] sm:items-end"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await save({ name, blurb })) setEditing(false);
          }}
        >
          <Field id={`ev-${vibe.id}-name`} label="Name">
            <input id={`ev-${vibe.id}-name`} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} className={inputClass()} />
          </Field>
          <Field id={`ev-${vibe.id}-blurb`} label="Description">
            <input id={`ev-${vibe.id}-blurb`} value={blurb} maxLength={200} onChange={(e) => setBlurb(e.target.value)} className={inputClass()} />
          </Field>
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
            Save
          </button>
        </form>
      )}
      {error && <p className="text-sm font-semibold text-red">{error}</p>}
    </li>
  );
}
