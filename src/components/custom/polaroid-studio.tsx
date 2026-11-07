'use client';

import { useState } from 'react';
import { AlertIcon, CropIcon, PlusIcon, TrashIcon } from '@/components/icons';
import { OptionPicker } from '@/components/pdp/option-picker';
import type { ProductType } from '@/lib/catalog/types';
import { cn } from '@/lib/cn';
import { cropRect } from '@/lib/custom/crop';
import { effectiveDpi, qualityLevel } from '@/lib/custom/quality';
import { checkDesign, designInputs } from '@/lib/custom/rules';
import { frameAspect, maxItems, printArea, STUDIOS } from '@/lib/custom/studios';
import { MAX_CAPTION, type Crop, type DesignItem } from '@/lib/custom/types';
import { formatINR } from '@/lib/money';
import { optionLabels, unitPrice, type Options } from '@/lib/pricing/engine';
import { useCart } from '@/lib/store/cart';
import { useStudioDraft } from '@/lib/store/studio';
import { CropDialog } from './crop-dialog';
import { CropImage } from './crop-image';
import { DropZone, FileButton } from './drop-zone';
import { QualityNote } from './quality-note';
import { StudioSummary } from './studio-summary';
import { UploadOverlay } from './upload-overlay';
import { useUploadQueue, type PendingUpload } from './use-upload-queue';

const studio = STUDIOS.polaroids;

/** Card proportions in inches: classic 3.5 × 4.2 with a 3.1 in square photo, mini 2.1 × 3.4 with 1.8 × 2.4. */
const CARD: Record<string, { aspect: string; side: number }> = {
  classic: { aspect: '3.5 / 4.2', side: (0.2 / 3.5) * 100 },
  mini: { aspect: '2.1 / 3.4', side: (0.15 / 2.1) * 100 },
};

function Card({ size, children, className }: { size: string; children: React.ReactNode; className?: string }) {
  const c = CARD[size] ?? CARD.classic;
  return (
    <div
      className={cn('relative flex flex-col rounded-[3px] bg-[#f6f5f0] shadow-[0_10px_24px_rgb(0_0_0/0.45)] [container-type:inline-size]', className)}
      style={{ aspectRatio: c.aspect, padding: `${c.side}% ${c.side}% 0` }}
    >
      {children}
    </div>
  );
}

const iconBtn = 'grid size-9 place-items-center rounded-full bg-bg/80 text-ink backdrop-blur hover:bg-bg hover:text-lime';

export function PolaroidStudio({ type }: { type: ProductType }) {
  const [draft, setDraft] = useStudioDraft('polaroids', type.options);
  const add = useCart((s) => s.add);
  const [cropIndex, setCropIndex] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const queue = useUploadQueue({ onDone: (info) => setDraft((d) => ({ ...d, items: [...d.items, { upload: info }].slice(0, 50) })) });
  const o = draft.options;
  const items = draft.items;
  const max = maxItems('polaroids', o);
  const count = items.length + queue.active;
  const room = Math.max(0, max - count);
  const aspect = frameAspect('polaroids', o) ?? 1;
  const area = printArea('polaroids', o);
  const sizeLabel = `${type.options.find((g) => g.key === 'size')?.values.find((v) => v.value === o.size)?.label ?? 'this'} size`;
  const dpiOf = (it: DesignItem, crop?: Crop) => effectiveDpi(it.upload, area, cropRect(it.upload, aspect, crop ?? it.crop));
  const lowCount = items.filter((it) => qualityLevel(dpiOf(it), studio.dpi) === 'low').length;
  const unit = unitPrice(type.price, o);

  const setOption = (key: string, v: string) => setDraft((d) => ({ ...d, options: { ...d.options, [key]: v } }));
  const updateItem = (i: number, patch: Partial<DesignItem>) => setDraft((d) => ({ ...d, items: d.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) }));

  const choose = (files: File[]) => {
    if (room <= 0) {
      setNotice(`This set holds ${max} photos. Choose a bigger set to add more.`);
      return;
    }
    setNotice(files.length > room ? `Only ${room} more photo${room === 1 ? '' : 's'} fit in a set of ${max}. Choose a bigger set to add the rest.` : null);
    void queue.add(files.slice(0, room));
  };

  const packGroup = type.options.find((g) => g.key === 'pack');
  const disabled: Record<string, string | undefined> = {};
  if (packGroup) for (const v of packGroup.values) if (Number(v.value) < count) disabled[v.value] = `Sets smaller than your ${count} photos are switched off.`;

  const reason = !items.length
    ? queue.active
      ? 'Wait for your photos to finish uploading.'
      : 'Add at least one photo to continue.'
    : queue.active
      ? 'Wait for your photos to finish uploading.'
      : checkDesign('polaroids', o, designInputs({ kind: 'polaroids', items }), draft.note);
  const cropping = cropIndex !== null ? items[cropIndex] : undefined;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-12">
      <div className="min-w-0">
        {items.length === 0 && queue.pending.length === 0 ? (
          <DropZone onFiles={choose} multiple title="Upload your photos" hint={`Add up to ${max} photos · PNG, JPG or WebP, up to 25 MB each`} className="min-h-72" />
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="font-display text-xl uppercase" aria-live="polite">
                {items.length} of {max} photos added
              </p>
              <div className="flex flex-wrap gap-2">
                {room > 0 && (
                  <FileButton onFiles={choose} multiple>
                    <PlusIcon size={16} /> Add photos
                  </FileButton>
                )}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    if (window.confirm('Remove all photos from this set?')) {
                      queue.pending.forEach((p) => queue.remove(p.key));
                      setDraft((d) => ({ ...d, items: [] }));
                    }
                  }}
                >
                  <TrashIcon size={15} /> Remove all
                </button>
              </div>
            </div>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 xl:grid-cols-4">
              {items.map((it, i) => {
                const low = qualityLevel(dpiOf(it), studio.dpi) === 'low';
                return (
                  <li key={it.upload.id} className="relative">
                    <Card size={o.size}>
                      <CropImage src={it.upload.thumb} img={it.upload} aspect={aspect} crop={it.crop} className="w-full bg-[#d9d9de]" alt={`Photo ${i + 1}: ${it.upload.name}`} />
                      <input
                        value={it.caption ?? ''}
                        onChange={(e) => updateItem(i, { caption: e.target.value })}
                        maxLength={MAX_CAPTION}
                        placeholder="add a caption"
                        aria-label={`Caption for photo ${i + 1}`}
                        className="min-h-0 w-full flex-1 bg-transparent text-center font-hand text-[11cqw] leading-none text-[#1b1b24] placeholder:text-[#a2a2ae] focus:outline-none focus-visible:rounded-[2px] focus-visible:ring-2 focus-visible:ring-cyan"
                      />
                    </Card>
                    <div className="absolute right-1.5 top-1.5 flex gap-1.5">
                      <button type="button" className={iconBtn} onClick={() => setCropIndex(i)} aria-label={`Crop photo ${i + 1}`}>
                        <CropIcon size={16} />
                      </button>
                      <button type="button" className={iconBtn} onClick={() => setDraft((d) => ({ ...d, items: d.items.filter((_, j) => j !== i) }))} aria-label={`Remove photo ${i + 1}`}>
                        <TrashIcon size={16} />
                      </button>
                    </div>
                    {low && (
                      <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-orange px-2 py-1 text-[11px] font-bold uppercase tracking-[0.04em] text-bg">
                        <AlertIcon size={13} /> Low res
                      </span>
                    )}
                  </li>
                );
              })}
              {queue.pending.map((p: PendingUpload) => (
                <li key={p.key} className="relative">
                  <Card size={o.size}>
                    {p.local ? (
                      <CropImage src={p.local} img={p} aspect={aspect} className="w-full bg-[#d9d9de]" />
                    ) : (
                      <div className="w-full bg-[#d9d9de]" style={{ aspectRatio: String(aspect) }} />
                    )}
                    <UploadOverlay item={p} onRetry={() => queue.retry(p.key)} onRemove={() => queue.remove(p.key)} compact />
                  </Card>
                </li>
              ))}
              {Array.from({ length: Math.min(room, 4) }, (_, i) => (
                <li key={`slot${i}`} style={{ aspectRatio: (CARD[o.size] ?? CARD.classic).aspect }}>
                  <DropZone onFiles={choose} multiple compact title="Add photos" hint="" className="h-full" />
                </li>
              ))}
            </ul>
          </>
        )}
        {notice && <p className="mt-3 text-sm font-semibold text-orange">{notice}</p>}
        {items.length > 0 && items.length < max && (
          <p className="mt-4 text-[13.5px] text-muted">
            {items.length} of {max} photos added. We’ll fill the last {max - items.length} print{max - items.length === 1 ? '' : 's'} with copies of your first photos, or you can add{' '}
            {max - items.length} more.
          </p>
        )}
        {cropping && cropIndex !== null && (
          <CropDialog
            open
            onClose={() => setCropIndex(null)}
            onDone={(crop) => updateItem(cropIndex, { crop })}
            src={cropping.upload.src}
            img={cropping.upload}
            aspect={aspect}
            crop={cropping.crop}
            title={`Crop photo ${cropIndex + 1}`}
            renderInfo={(crop) => {
              const d = dpiOf(cropping, crop);
              return <QualityNote level={qualityLevel(d, studio.dpi)} dpi={d} sizeLabel={sizeLabel} />;
            }}
          />
        )}
      </div>

      <div className="grid min-w-0 content-start gap-5 lg:sticky lg:top-24">
        {type.options.map((g) => (
          <OptionPicker key={g.key} group={g} value={o[g.key]} onChange={(v) => setOption(g.key, v)} disabled={g.key === 'pack' ? disabled : undefined} idPrefix="polaroid" />
        ))}
        {lowCount > 0 && (
          <p className="flex items-start gap-2 rounded-[3px] border border-orange/50 bg-orange/10 px-3 py-2 text-[13.5px] font-semibold text-orange" role="status">
            <AlertIcon size={18} className="mt-px shrink-0" />
            {lowCount} photo{lowCount === 1 ? '' : 's'} may print blurry at the {sizeLabel}. Zoom out in Crop, or use a bigger photo.
          </p>
        )}
        <StudioSummary
          unit={unit}
          qty={draft.qty}
          onQty={(qty) => setDraft((d) => ({ ...d, qty }))}
          each={`${formatINR(Math.round(unit / Number((o as Options).pack || 10)))} per print`}
          reason={reason}
          note={draft.note}
          onNote={(note) => setDraft((d) => ({ ...d, note }))}
          label="your polaroids"
          onAdd={() => {
            if (!items.length) return;
            const clean = items.map((it) => ({ ...it, caption: it.caption?.trim() || undefined }));
            add({
              productId: 0,
              typeId: type.id,
              slug: '',
              href: studio.href,
              name: studio.title,
              typeName: 'Custom studio',
              art: null,
              image: clean[0].upload.thumb,
              options: o,
              optionLabels: optionLabels(type.options, o),
              unit,
              qty: draft.qty,
              custom: { kind: 'polaroids', items: clean, note: draft.note.trim() || undefined },
            });
            setDraft((d) => ({ ...d, items: [], note: '', qty: 1 }));
          }}
        />
      </div>
    </div>
  );
}
