'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { bulkProductsAction, saveProductAction } from '@/actions/admin/products';
import { Art } from '@/components/art';
import { described, Field, inputClass } from '@/components/checkout/fields';
import { FileButton, DropZone } from '@/components/custom/drop-zone';
import { useUploadQueue } from '@/components/custom/use-upload-queue';
import { ArrowIcon, CloseIcon, RefreshIcon } from '@/components/icons';
import type { ArtSpec } from '@/lib/art/types';
import { autoSlug, LIMITS, overrideFor, parseRupees, priceError, rupeesText, startingPriceOf, typeStartingPrice } from '@/lib/admin/product-rules';
import type { AdminProduct, AdminType, ProductFormInput } from '@/lib/admin/products';
import { cardImage, photoSrc } from '@/lib/catalog/images';
import { GROUPS } from '@/lib/catalog/types';
import { cn } from '@/lib/cn';
import { formatINR } from '@/lib/money';
import { Badge } from './product-table';

type Errors = Partial<Record<keyof ProductFormInput | 'form', string>>;

function PhotoTile({ src, index, count, onMove, onRemove }: { src: string; index: number; count: number; onMove: (to: number) => void; onRemove: () => void }) {
  return (
    <li className="relative overflow-hidden rounded-[4px] border border-line bg-bg">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={cardImage(src) ?? src} alt={`Photo ${index + 1}`} className="aspect-square w-full object-contain p-1" />
      {index === 0 && <span className="absolute left-1.5 top-1.5 rounded-[2px] bg-lime px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-bg">Cover</span>}
      <div className="flex border-t border-line">
        <button type="button" className="grid h-9 flex-1 place-items-center text-muted hover:text-ink disabled:opacity-30" disabled={index === 0} onClick={() => onMove(index - 1)} aria-label={`Move photo ${index + 1} earlier`}>
          <ArrowIcon size={15} className="rotate-180" />
        </button>
        <button type="button" className="grid h-9 flex-1 place-items-center text-muted hover:text-ink disabled:opacity-30" disabled={index === count - 1} onClick={() => onMove(index + 1)} aria-label={`Move photo ${index + 1} later`}>
          <ArrowIcon size={15} />
        </button>
        <button type="button" className="grid h-9 flex-1 place-items-center text-muted hover:text-red" onClick={onRemove} aria-label={`Remove photo ${index + 1}`}>
          <CloseIcon size={15} />
        </button>
      </div>
    </li>
  );
}

export function ProductForm({ product, types, vibes }: { product: AdminProduct | null; types: AdminType[]; vibes: Array<{ id: string; name: string; isActive: boolean }> }) {
  const router = useRouter();
  const [name, setName] = useState(product?.name ?? '');
  const [slug, setSlug] = useState(product?.slug ?? '');
  const [typeId, setTypeId] = useState(product?.typeId ?? '');
  const [vibeId, setVibeId] = useState(product?.vibeId ?? '');
  const [extraVibes, setExtraVibes] = useState<string[]>(product?.extraVibes ?? []);
  const [description, setDescription] = useState(product?.description ?? '');
  const [tags, setTags] = useState(product?.tags ?? '');
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [startingPrice, setStartingPrice] = useState(product?.startingPrice ? rupeesText(product.startingPrice) : '');
  const [popularity, setPopularity] = useState(String(product?.popularity ?? 0));
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const uploads = useUploadQueue({ initUrl: '/api/admin/uploads', onDone: (info) => setImages((list) => (list.length < LIMITS.images ? [...list, photoSrc(info.id)] : list)) });
  const type = types.find((t) => t.id === typeId);
  const edit = <T,>(set: (v: T) => void, key: keyof ProductFormInput) => (v: T) => {
    set(v);
    setSaved(false);
    if (errors[key] || errors.form) setErrors((e) => ({ ...e, [key]: undefined, form: undefined }));
  };

  const price = useMemo(() => {
    if (!type) return null;
    const own = parseRupees(startingPrice);
    const typeFrom = typeStartingPrice(type);
    if (own === null) return { from: typeFrom, typeFrom, own: false };
    if (Number.isNaN(own) || priceError(own)) return { from: null, typeFrom, own: true };
    return { from: startingPriceOf(type, overrideFor(type, own)), typeFrom, own: true };
  }, [type, startingPrice]);

  const previewSlug = slug || (name && type ? autoSlug(name, type.singular) : '');
  const cover = images[0] ?? uploads.pending.find((p) => p.local && !p.error)?.local ?? null;
  const art: ArtSpec | null = product?.art ?? null;
  const room = LIMITS.images - images.length - uploads.active;

  const save = async () => {
    setBusy(true);
    setErrors({});
    const r = await saveProductAction({
      id: product?.id ?? null,
      name,
      slug,
      typeId,
      vibeId,
      extraVibes: extraVibes.filter((v) => v !== vibeId),
      description,
      tags,
      images,
      startingPrice,
      popularity: Number.parseInt(popularity || '0', 10),
      isActive,
    });
    setBusy(false);
    if (!r.ok) {
      setErrors(r.field ? { [r.field]: r.error } : { form: r.error });
      requestAnimationFrame(() => document.getElementById(r.field ? `pf-${r.field}` : 'pf-status')?.focus());
      return;
    }
    if (!product) return router.replace(`/admin/products/${r.id}?saved=1`);
    setSlug(r.slug);
    setSaved(true);
    router.refresh();
  };

  const remove = async () => {
    if (!product || !window.confirm(`Delete “${product.name}”? This can’t be undone. Past orders keep their details.`)) return;
    setBusy(true);
    const r = await bulkProductsAction({ ids: [product.id], action: 'delete' });
    setBusy(false);
    if (!r.ok) return setErrors({ form: r.error });
    router.replace('/admin/products');
  };

  return (
    <form
      className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      noValidate
    >
      <div className="grid min-w-0 content-start gap-6">
        {product?.isSample && (
          <p className="rounded-card border border-line bg-surface-2/50 p-3 text-sm text-muted">
            <Badge>Demo</Badge> This is a demo product. Once you save it, it counts as one of yours and “Remove demo products” keeps it.
          </p>
        )}

        <section className="grid gap-4 rounded-card border border-line bg-surface p-4 sm:p-5">
          <h2 className="font-display text-xl uppercase">Details</h2>
          <Field id="pf-name" label="Name" error={errors.name}>
            <input id="pf-name" value={name} onChange={(e) => edit(setName, 'name')(e.target.value)} maxLength={LIMITS.nameMax} className={inputClass(errors.name)} {...described('pf-name', errors.name)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="pf-typeId" label="Type" error={errors.typeId}>
              <select id="pf-typeId" value={typeId} onChange={(e) => edit(setTypeId, 'typeId')(e.target.value)} className={inputClass(errors.typeId)} {...described('pf-typeId', errors.typeId)}>
                <option value="">Choose a type…</option>
                {GROUPS.map((g) => (
                  <optgroup key={g.id} label={g.name}>
                    {types
                      .filter((t) => t.groupId === g.id)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                          {t.isActive ? '' : ' (hidden)'}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </Field>
            <Field id="pf-vibeId" label="Main vibe" error={errors.vibeId}>
              <select id="pf-vibeId" value={vibeId} onChange={(e) => edit(setVibeId, 'vibeId')(e.target.value)} className={inputClass(errors.vibeId)} {...described('pf-vibeId', errors.vibeId)}>
                <option value="">Choose a vibe…</option>
                {vibes.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                    {v.isActive ? '' : ' (hidden)'}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-1.5 text-[12.5px] font-bold uppercase tracking-[0.07em]">
              More vibes <span className="font-semibold normal-case tracking-normal text-muted">(optional, up to {LIMITS.vibes - 1})</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {vibes
                .filter((v) => v.id !== vibeId)
                .map((v) => {
                  const on = extraVibes.includes(v.id);
                  const full = !on && extraVibes.filter((x) => x !== vibeId).length >= LIMITS.vibes - 1;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      aria-pressed={on}
                      disabled={full}
                      className="chip min-h-9 disabled:opacity-40"
                      onClick={() => edit(setExtraVibes, 'extraVibes')(on ? extraVibes.filter((x) => x !== v.id) : [...extraVibes, v.id])}
                    >
                      {v.name}
                    </button>
                  );
                })}
            </div>
            {errors.extraVibes && <p className="text-[13px] font-semibold text-red">{errors.extraVibes}</p>}
          </fieldset>
          <Field id="pf-description" label="Description" optional error={errors.description} hint="Shown on the product page. Leave empty to use the type’s description.">
            <textarea
              id="pf-description"
              value={description}
              onChange={(e) => edit(setDescription, 'description')(e.target.value)}
              maxLength={LIMITS.description}
              rows={4}
              className={cn(inputClass(errors.description), 'py-2.5')}
              {...described('pf-description', errors.description, 'x')}
            />
          </Field>
          <Field id="pf-tags" label="Search words" optional hint="Extra words shoppers might search for, like naruto anime ninja.">
            <input id="pf-tags" value={tags} onChange={(e) => edit(setTags, 'tags')(e.target.value)} maxLength={LIMITS.tags} className={inputClass()} {...described('pf-tags', undefined, 'x')} />
          </Field>
          <Field id="pf-slug" label="Web address" optional error={errors.slug} hint={product ? 'Changing it breaks links people already shared.' : 'Made from the name if you leave it empty.'}>
            <div className="flex items-center gap-0 rounded-[2px]">
              <span className="hidden min-h-11 items-center border border-r-0 border-line-2 bg-surface-2 px-3 text-sm text-muted sm:flex">/p/</span>
              <input
                id="pf-slug"
                value={slug}
                placeholder={previewSlug || 'made-from-the-name'}
                onChange={(e) => edit(setSlug, 'slug')(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                className={inputClass(errors.slug)}
                {...described('pf-slug', errors.slug, 'x')}
              />
            </div>
          </Field>
        </section>

        <section className="grid gap-4 rounded-card border border-line bg-surface p-4 sm:p-5" aria-labelledby="pf-photos-title">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="pf-photos-title" className="font-display text-xl uppercase">
              Photos
            </h2>
            <span className="text-xs text-muted">
              {images.length} of {LIMITS.images} · the first one is the cover
            </span>
          </div>
          {(images.length > 0 || uploads.pending.length > 0) && (
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
              {images.map((src, i) => (
                <PhotoTile
                  key={src}
                  src={src}
                  index={i}
                  count={images.length}
                  onMove={(to) => {
                    const next = [...images];
                    const [x] = next.splice(i, 1);
                    next.splice(to, 0, x);
                    edit(setImages, 'images')(next);
                  }}
                  onRemove={() => edit(setImages, 'images')(images.filter((x) => x !== src))}
                />
              ))}
              {uploads.pending.map((p) => (
                <li key={p.key} className="relative overflow-hidden rounded-[4px] border border-line bg-bg">
                  {p.local ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.local} alt="" className={cn('aspect-square w-full object-contain p-1', !p.error && 'opacity-50')} />
                  ) : (
                    <div className="aspect-square" />
                  )}
                  <div className="grid min-h-9 content-center gap-1 border-t border-line px-2 py-1.5 text-[11px]">
                    {p.error ? (
                      <>
                        <span className="font-semibold text-red">{p.error}</span>
                        <span className="flex gap-3">
                          {p.canRetry && (
                            <button type="button" className="inline-flex items-center gap-1 font-semibold text-lime" onClick={() => uploads.retry(p.key)}>
                              <RefreshIcon size={12} /> Retry
                            </button>
                          )}
                          <button type="button" className="font-semibold text-muted hover:text-ink" onClick={() => uploads.remove(p.key)}>
                            Remove
                          </button>
                        </span>
                      </>
                    ) : (
                      <span className="block h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-label={`Uploading ${p.name}`} aria-valuenow={Math.round(p.progress * 100)}>
                        <span className="block h-full bg-lime transition-[width]" style={{ width: `${Math.max(4, p.progress * 100)}%` }} />
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {images.length === 0 && uploads.pending.length === 0 ? (
            <DropZone multiple onFiles={(files) => uploads.add(files.slice(0, Math.max(0, room)))} title="Add product photos" hint={`PNG, JPG or WebP, up to 25 MB each. Up to ${LIMITS.images} photos.`} />
          ) : (
            room > 0 && (
              <FileButton multiple onFiles={(files) => uploads.add(files.slice(0, room))} className="justify-self-start">
                Add more photos
              </FileButton>
            )
          )}
          {errors.images && (
            <p id="pf-images" tabIndex={-1} className="text-[13px] font-semibold text-red">
              {errors.images}
            </p>
          )}
          {!images.length && art && <p className="text-xs text-muted">Without photos, this demo product keeps its generated artwork.</p>}
        </section>

        <section className="grid gap-4 rounded-card border border-line bg-surface p-4 sm:p-5">
          <h2 className="font-display text-xl uppercase">Price and visibility</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="pf-startingPrice"
              label="Starting price (₹)"
              optional
              error={errors.startingPrice}
              hint={type ? `Empty uses the ${type.name} price table, from ${formatINR(price?.typeFrom ?? 0)}. A price here moves every option by the same amount.` : 'Choose a type first.'}
            >
              <input
                id="pf-startingPrice"
                inputMode="decimal"
                value={startingPrice}
                onChange={(e) => edit(setStartingPrice, 'startingPrice')(e.target.value)}
                placeholder={price ? String(price.typeFrom / 100) : ''}
                className={inputClass(errors.startingPrice)}
                {...described('pf-startingPrice', errors.startingPrice, 'x')}
              />
            </Field>
            <Field id="pf-popularity" label="Popularity" error={errors.popularity} hint="Higher numbers come first when shoppers sort by Popular.">
              <input
                id="pf-popularity"
                inputMode="numeric"
                value={popularity}
                onChange={(e) => edit(setPopularity, 'popularity')(e.target.value.replace(/\D/g, '').slice(0, 7))}
                className={inputClass(errors.popularity)}
                {...described('pf-popularity', errors.popularity, 'x')}
              />
            </Field>
          </div>
          <label className="flex items-start gap-3 text-[15px]">
            <input type="checkbox" checked={isActive} onChange={(e) => edit(setIsActive, 'isActive')(e.target.checked)} className="mt-1 size-4 accent-[var(--color-lime)]" />
            <span>
              <span className="font-semibold">Show in the store</span>
              <span className="block text-xs text-muted">Hidden products don’t appear in listings or search, and their page shows “not found”.</span>
            </span>
          </label>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn btn-primary" disabled={busy || uploads.active > 0}>
            {busy ? 'Saving…' : uploads.active > 0 ? 'Uploading photos…' : product ? 'Save changes' : 'Add product'}
          </button>
          {product && (
            <button type="button" className="btn btn-ghost btn-sm border-red/50 text-red hover:border-red hover:text-red" disabled={busy} onClick={remove}>
              Delete
            </button>
          )}
          <p id="pf-status" tabIndex={-1} className={cn('text-sm font-semibold', errors.form ? 'text-red' : 'text-lime')} aria-live="polite">
            {errors.form ?? (saved ? 'Saved. The store shows the change now.' : '')}
          </p>
        </div>
      </div>

      <aside className="min-w-0 xl:sticky xl:top-6 xl:self-start" aria-label="Card preview">
        <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.08em] text-muted">How the card looks</p>
        <div className="mx-auto max-w-[260px] overflow-hidden rounded-card border border-line bg-surface">
          <div className="relative aspect-square border-b border-line">
            <div className="absolute inset-[11%]">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover.startsWith('blob:') ? cover : (cardImage(cover) ?? cover)} alt="" className="h-full w-full object-contain" />
              ) : (
                <Art spec={art} idPrefix="pf" />
              )}
            </div>
          </div>
          <div className="grid gap-0.5 p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{type?.singular ?? 'Type'}</p>
            <p className="font-display text-[19px] uppercase leading-[1.1]">{name || 'Product name'}</p>
            <p className="pt-2 font-bold tabular-nums text-lime">
              <span className="text-[11.5px] font-semibold text-muted">from </span>
              {price?.from ? formatINR(price.from) : '—'}
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-1 text-sm text-muted">
          {product && isActive && (
            <Link href={`/p/${product.slug}`} target="_blank" className="font-semibold text-lime hover:underline">
              View in the store ↗
            </Link>
          )}
          {previewSlug && <span className="break-all text-xs">/p/{previewSlug}</span>}
        </div>
      </aside>
    </form>
  );
}
