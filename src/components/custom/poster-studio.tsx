'use client';

import { useState } from 'react';
import { CropIcon, ImageIcon } from '@/components/icons';
import { OptionPicker, type OptionNote } from '@/components/pdp/option-picker';
import type { ProductType } from '@/lib/catalog/types';
import { cn } from '@/lib/cn';
import { cropRect } from '@/lib/custom/crop';
import { effectiveDpi, qualityLevel } from '@/lib/custom/quality';
import { checkDesign, designInputs } from '@/lib/custom/rules';
import { printArea, posterCm, STUDIOS } from '@/lib/custom/studios';
import type { Crop } from '@/lib/custom/types';
import { optionLabels, unitPrice, type Options } from '@/lib/pricing/engine';
import { useCart } from '@/lib/store/cart';
import { useStudioDraft } from '@/lib/store/studio';
import { CropDialog } from './crop-dialog';
import { CropImage } from './crop-image';
import { DropZone, FileButton } from './drop-zone';
import { QualityNote } from './quality-note';
import { RoomPreview } from './room-preview';
import { StudioSummary } from './studio-summary';
import { UploadOverlay } from './upload-overlay';
import { useUploadQueue } from './use-upload-queue';

const studio = STUDIOS.posters;
const FRAME_BG: Record<string, string> = {
  black: '#121216',
  white: '#f1f1f4',
  wood: 'linear-gradient(135deg, #b07a43, #d6a467 50%, #8d5a2c)',
};

function PosterView({ src, img, crop, o }: { src: string; img: { w: number; h: number }; crop?: Crop; o: Options }) {
  const area = printArea('posters', o);
  const aspect = area.w / area.h;
  const framed = o.frame !== 'none';
  const width = aspect >= 1 ? 80 : 80 * aspect;
  return (
    <div className="checker absolute inset-0 grid place-items-center [container-type:size]">
      <div
        className="relative shadow-[0_14px_34px_rgb(0_0_0/0.55)]"
        style={{ width: `${width}cqmin`, padding: framed ? `${width * 0.045}cqmin` : 0, background: framed ? FRAME_BG[o.frame] : undefined }}
      >
        <CropImage src={src} img={img} aspect={aspect} crop={crop} className="w-full bg-white" />
        {o.paper === 'glossy' && <span className="gloss-film" style={{ inset: framed ? `${width * 0.045}cqmin` : 0 }} />}
      </div>
    </div>
  );
}

/** `payNote` says how a custom print can be paid for (it depends on the payment setup). */
export function PosterStudio({ type, payNote }: { type: ProductType; payNote: string }) {
  const [draft, setDraft] = useStudioDraft('posters', type.options);
  const add = useCart((s) => s.add);
  const [view, setView] = useState<'poster' | 'wall'>('poster');
  const [cropping, setCropping] = useState(false);
  const queue = useUploadQueue({
    // Match the poster's orientation to the image when it arrives; the shopper can still change it.
    onDone: (info) => setDraft((d) => ({ ...d, items: [{ upload: info }], options: { ...d.options, orientation: info.w > info.h ? 'landscape' : 'portrait' } })),
  });
  const o = draft.options;
  const item = draft.items[0];
  const pending = queue.pending[queue.pending.length - 1];
  const setOption = (key: string, v: string) => setDraft((d) => ({ ...d, options: { ...d.options, [key]: v } }));
  const choose = (files: File[]) => {
    queue.pending.forEach((p) => queue.remove(p.key));
    void queue.add(files.slice(0, 1));
  };

  const shown = pending?.local ? { src: pending.local, w: pending.w, h: pending.h } : item ? { src: item.upload.src, w: item.upload.w, h: item.upload.h } : null;
  const crop = pending ? undefined : item?.crop;
  const unit = unitPrice(type.price, o);
  const dpiAt = (opts: Options, c?: Crop) => {
    if (!item) return 0;
    const area = printArea('posters', opts);
    return effectiveDpi(item.upload, area, cropRect(item.upload, area.w / area.h, c));
  };
  const dpi = dpiAt(o, item?.crop);
  const level = qualityLevel(dpi, studio.dpi);
  const sizeGroup = type.options.find((g) => g.key === 'size');
  const sizeNotes: Record<string, OptionNote | undefined> = {};
  if (item && sizeGroup) for (const v of sizeGroup.values) if (qualityLevel(dpiAt({ ...o, size: v.value }, item.crop), studio.dpi) === 'low') sizeNotes[v.value] = { text: 'Low res', warn: true };
  const sizeLabel = sizeGroup?.values.find((v) => v.value === o.size)?.label ?? o.size;
  const area = printArea('posters', o);

  const reason = !item
    ? queue.active
      ? 'Wait for your image to finish uploading.'
      : 'Upload your image to continue.'
    : queue.active
      ? 'Wait for your new image to finish uploading.'
      : checkDesign('posters', o, designInputs({ kind: 'posters', items: [item] }), draft.note);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-12">
      <div className="min-w-0">
        {shown ? (
          <>
            <div
              className={cn('relative overflow-hidden rounded-card border border-line', view === 'wall' ? 'aspect-[600/420]' : 'aspect-square')}
              role={view === 'poster' ? 'img' : undefined}
              aria-label={view === 'poster' ? `Preview of your ${sizeLabel} poster` : undefined}
            >
              {view === 'wall' ? (
                <RoomPreview src={shown.src} img={shown} crop={crop} cm={posterCm(o)} frame={o.frame} glossy={o.paper === 'glossy'} />
              ) : (
                <PosterView src={shown.src} img={shown} crop={crop} o={o} />
              )}
              {pending && <UploadOverlay item={pending} onRetry={() => queue.retry(pending.key)} onRemove={() => queue.remove(pending.key)} />}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2" role="group" aria-label="Preview">
                <button type="button" className="chip" aria-pressed={view === 'poster'} onClick={() => setView('poster')}>
                  Your poster
                </button>
                <button type="button" className="chip" aria-pressed={view === 'wall'} onClick={() => setView('wall')}>
                  On the wall
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {item && !pending && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCropping(true)}>
                    <CropIcon size={16} /> Adjust crop
                  </button>
                )}
                <FileButton onFiles={choose}>
                  <ImageIcon size={16} /> Replace image
                </FileButton>
              </div>
            </div>
            {view === 'wall' && <p className="mt-2 text-[13px] text-muted">Drawn to scale: the sofa is 180 cm wide.</p>}
          </>
        ) : (
          <DropZone onFiles={choose} title="Upload your photo or artwork" className="aspect-square" />
        )}
        {item && cropping && (
          <CropDialog
            open
            onClose={() => setCropping(false)}
            onDone={(c) => setDraft((d) => ({ ...d, items: d.items.map((it, i) => (i === 0 ? { ...it, crop: c } : it)) }))}
            src={item.upload.src}
            img={item.upload}
            aspect={area.w / area.h}
            crop={item.crop}
            title="Crop your poster"
            renderInfo={(c) => {
              const d = dpiAt(o, c);
              return <QualityNote level={qualityLevel(d, studio.dpi)} dpi={d} sizeLabel={sizeLabel} />;
            }}
          />
        )}
      </div>

      <div className="grid min-w-0 content-start gap-5">
        {type.options.map((g) => (
          <OptionPicker key={g.key} group={g} value={o[g.key]} onChange={(v) => setOption(g.key, v)} notes={g.key === 'size' ? sizeNotes : undefined} idPrefix="poster" />
        ))}
        {item && !pending && <QualityNote level={level} dpi={dpi} sizeLabel={sizeLabel} />}
        <StudioSummary
          payNote={payNote}
          unit={unit}
          qty={draft.qty}
          onQty={(qty) => setDraft((d) => ({ ...d, qty }))}
          reason={reason}
          note={draft.note}
          onNote={(note) => setDraft((d) => ({ ...d, note }))}
          label="your poster"
          onAdd={() => {
            if (!item) return;
            add({
              productId: 0,
              typeId: type.id,
              slug: '',
              href: studio.href,
              name: studio.title,
              typeName: 'Custom studio',
              art: null,
              image: item.upload.thumb,
              options: o,
              optionLabels: optionLabels(type.options, o),
              unit,
              qty: draft.qty,
              custom: { kind: 'posters', items: [item], note: draft.note.trim() || undefined },
            });
            setDraft((d) => ({ ...d, items: [], note: '', qty: 1 }));
          }}
        />
      </div>
    </div>
  );
}
