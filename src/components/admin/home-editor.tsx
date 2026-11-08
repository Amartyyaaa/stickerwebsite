'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { saveHomeAction } from '@/actions/admin/settings';
import { described, Field, inputClass } from '@/components/checkout/fields';
import { FileButton } from '@/components/custom/drop-zone';
import { useUploadQueue } from '@/components/custom/use-upload-queue';
import { photoSrc } from '@/lib/catalog/images';
import { cn } from '@/lib/cn';
import type { HomeHero } from '@/lib/settings';

/** The home page banner: words, two buttons and an optional photo, with a live preview. */
export function HomeEditor({ initial }: { initial: HomeHero }) {
  const router = useRouter();
  const [h, setH] = useState(initial);
  const [error, setError] = useState<{ field?: string; text: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const uploads = useUploadQueue({ initUrl: '/api/admin/uploads', onDone: (info) => edit({ image: photoSrc(info.id) }) });
  const failed = uploads.pending.find((p) => p.error);

  function edit(patch: Partial<HomeHero>) {
    setH((x) => ({ ...x, ...patch }));
    setSaved(false);
    setError(null);
  }
  const err = (k: string) => (error?.field === k ? error.text : undefined);

  const save = async () => {
    setBusy(true);
    const r = await saveHomeAction(h);
    setBusy(false);
    if (!r.ok) return setError({ field: r.field, text: r.error });
    setSaved(true);
    router.refresh();
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <form
        className="grid content-start gap-4 rounded-card border border-line bg-surface p-4 sm:p-5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Field id="hm-eyebrow" label="Small line above the title" optional error={err('eyebrow')}>
          <input id="hm-eyebrow" value={h.eyebrow} maxLength={40} onChange={(e) => edit({ eyebrow: e.target.value })} className={inputClass(err('eyebrow'))} {...described('hm-eyebrow', err('eyebrow'))} />
        </Field>
        <Field id="hm-title" label="Title" error={err('title')}>
          <input id="hm-title" value={h.title} maxLength={60} onChange={(e) => edit({ title: e.target.value })} className={inputClass(err('title'))} {...described('hm-title', err('title'))} />
        </Field>
        <Field id="hm-body" label="Text" optional error={err('body')}>
          <textarea id="hm-body" rows={3} value={h.body} maxLength={200} onChange={(e) => edit({ body: e.target.value })} className={cn(inputClass(err('body')), 'py-2.5')} {...described('hm-body', err('body'))} />
        </Field>
        {(['primary', 'secondary'] as const).map((k) => (
          <fieldset key={k} className="grid gap-2 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <legend className="mb-1.5 text-[12.5px] font-bold uppercase tracking-[0.07em]">
              {k === 'primary' ? 'Main button' : 'Second button'} {k === 'secondary' && <span className="font-semibold normal-case tracking-normal text-muted">(optional)</span>}
            </legend>
            <input aria-label={`${k === 'primary' ? 'Main' : 'Second'} button label`} placeholder="Label" value={h[k].label} maxLength={30} onChange={(e) => edit({ [k]: { ...h[k], label: e.target.value } })} className={inputClass(err(k))} />
            <input aria-label={`${k === 'primary' ? 'Main' : 'Second'} button link`} placeholder="/shop or /v/anime" value={h[k].href} onChange={(e) => edit({ [k]: { ...h[k], href: e.target.value } })} className={inputClass(err(k))} />
            {err(k) && <p className="text-[13px] font-semibold text-red sm:col-span-2">{err(k)}</p>}
          </fieldset>
        ))}
        <div className="grid gap-2">
          <p className="text-[12.5px] font-bold uppercase tracking-[0.07em]">
            Photo <span className="font-semibold normal-case tracking-normal text-muted">(optional; without one, the store’s artwork shows)</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <FileButton onFiles={(files) => uploads.add(files.slice(0, 1))}>{h.image ? 'Replace photo' : 'Upload a photo'}</FileButton>
            {h.image && (
              <button type="button" className="text-sm text-muted hover:text-red" onClick={() => edit({ image: null })}>
                Remove photo
              </button>
            )}
            {uploads.active > 0 && <span className="text-sm text-muted">Uploading…</span>}
          </div>
          {(failed || err('image')) && <p className="text-[13px] font-semibold text-red">{failed?.error ?? err('image')}</p>}
          <p className="text-xs text-muted">A PNG with a see-through background looks best, about 1200 × 1100 px.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button type="submit" className="btn btn-primary" disabled={busy || uploads.active > 0}>
            {busy ? 'Saving…' : 'Save'}
          </button>
          <p className={cn('text-sm font-semibold', error && !error.field ? 'text-red' : 'text-lime')} role="status">
            {error && !error.field ? error.text : saved ? 'Saved. ' : ''}
            {saved && (
              <Link href="/" target="_blank" className="underline underline-offset-2">
                See the home page ↗
              </Link>
            )}
          </p>
        </div>
      </form>

      <section aria-label="Preview" className="relative overflow-hidden rounded-card border border-line bg-bg p-5 sm:p-7">
        <p className="mb-4 text-[12px] font-bold uppercase tracking-[0.08em] text-muted">Preview</p>
        <div className="grid items-center gap-5 sm:grid-cols-[1.05fr_1fr]">
          <div className="min-w-0">
            {h.eyebrow && <p className="eyebrow">{h.eyebrow}</p>}
            <p className="display mt-2 break-words text-[clamp(30px,4vw,52px)]">{h.title || 'Your title'}</p>
            {h.body && <p className="mt-3 text-[14px] text-muted">{h.body}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="btn btn-primary btn-sm pointer-events-none">{h.primary.label || 'Main button'}</span>
              {h.secondary.label && <span className="btn btn-ghost btn-sm pointer-events-none">{h.secondary.label}</span>}
            </div>
          </div>
          <div className="relative grid aspect-[1/0.92] place-items-center rounded-[4px] border border-dashed border-line-2">
            {h.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={h.image} alt="" className="h-full w-full object-contain" />
            ) : (
              <span className="px-4 text-center text-xs text-muted">The store’s poster and sticker artwork shows here</span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
