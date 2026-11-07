'use client';

import { useId, useState, useSyncExternalStore } from 'react';
import { CropIcon, ImageIcon } from '@/components/icons';
import { OptionPicker, type OptionNote } from '@/components/pdp/option-picker';
import type { ProductType } from '@/lib/catalog/types';
import { cn } from '@/lib/cn';
import { cropRect } from '@/lib/custom/crop';
import { effectiveDpi, qualityLevel } from '@/lib/custom/quality';
import { checkDesign, designInputs } from '@/lib/custom/rules';
import { frameAspect, printArea, STUDIOS } from '@/lib/custom/studios';
import { STICKER_MIN_ZOOM, type Crop, type DesignItem } from '@/lib/custom/types';
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
import { useUploadQueue } from './use-upload-queue';

const studio = STUDIOS.stickers;
const RADIUS: Record<string, string> = { circle: '50%', square: '5%', rounded: '20%' };
const SIZE_IN: Record<string, number> = { S: 2, M: 3, L: 4 };
/** The laptop view shows about 9 inches of the lid, so stickers appear at their real size relative to it. */
const LID_IN = 9;

interface Img {
  src: string;
  w: number;
  h: number;
  alpha: boolean;
}

/** True when the shopper has asked for less motion. */
function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia('(prefers-reduced-motion: reduce)');
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => true,
  );
}

const HOLO_STOPS = ['#ffb8f1', '#a9f3ff', '#e9ffb0', '#cbb8ff', '#ffd9a6', '#b8fff0'];

/**
 * A die-cut sticker: an SVG filter grows the image's own outline into a white
 * border (like a real cut line) and adds a soft shadow. Holographic and glossy
 * films are masked to the same outline, border included. Sizes are in the
 * SVG's own units, so everything scales with the preview.
 */
function DieCut({ img, o, sizePct }: { img: Img; o: Options; sizePct: number }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const still = useReducedMotion();
  const sizeIn = SIZE_IN[o.size] ?? 2;
  const clear = o.finish === 'transparent';
  const long = Math.max(img.w, img.h) || 1;
  const w = (1000 * img.w) / long;
  const h = (1000 * img.h) / long;
  // About an eighth of an inch of white border, as on a printed sticker.
  const r = (0.125 / sizeIn) * 1000;
  const pad = r * 2.4;
  const W = w + pad * 2;
  const H = h + pad * 2;
  const box = { x: -pad, y: -pad, width: W, height: H, filterUnits: 'userSpaceOnUse' as const };
  const outline = (
    <>
      <feMorphology in="SourceAlpha" operator="dilate" radius={r * 0.8} result="grown" />
      <feGaussianBlur in="grown" stdDeviation={r * 0.22} result="soft" />
      <feComponentTransfer in="soft" result="edge">
        <feFuncA type="linear" slope="5" intercept="-1.6" />
      </feComponentTransfer>
      <feFlood floodColor="#ffffff" />
      <feComposite operator="in" in2="edge" result="border" />
    </>
  );
  return (
    <div className="relative" style={{ width: `${(W * sizePct) / 1000}cqmin`, aspectRatio: `${W} / ${H}`, mixBlendMode: clear ? 'multiply' : undefined }}>
      <svg viewBox={`${-pad} ${-pad} ${W} ${H}`} className="block size-full" aria-hidden="true">
        <defs>
          <filter id={`${id}o`} {...box} colorInterpolationFilters="sRGB">
            {outline}
            <feDropShadow in="border" dx="0" dy={r * 0.45} stdDeviation={r * 0.7} floodColor="#000" floodOpacity="0.45" result="lifted" />
            <feMerge>
              <feMergeNode in="lifted" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={`${id}m`} {...box} colorInterpolationFilters="sRGB">
            {outline}
          </filter>
          <filter id={`${id}s`} {...box}>
            <feDropShadow dx="0" dy={r * 0.2} stdDeviation={r * 0.25} floodColor="#000" floodOpacity="0.25" />
          </filter>
          <mask id={`${id}k`} maskUnits="userSpaceOnUse" x={-pad} y={-pad} width={W} height={H}>
            <image href={img.src} x="0" y="0" width={w} height={h} preserveAspectRatio="none" filter={`url(#${id}m)`} />
          </mask>
          <linearGradient id={`${id}h`} x1="0" y1="0" x2="1" y2="1" spreadMethod="reflect">
            {HOLO_STOPS.map((c, i) => (
              <stop key={c} offset={i / (HOLO_STOPS.length - 1)} stopColor={c} />
            ))}
            {!still && <animateTransform attributeName="gradientTransform" type="translate" from="-1 -1" to="1 1" dur="6s" repeatCount="indefinite" />}
          </linearGradient>
          <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="0.32" stopColor="#fff" stopOpacity="0.08" />
            <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.8" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.15" />
          </linearGradient>
        </defs>
        <image href={img.src} x="0" y="0" width={w} height={h} preserveAspectRatio="none" filter={`url(#${id}${clear ? 's' : 'o'})`} />
        {o.finish === 'holographic' && <rect x={-pad} y={-pad} width={W} height={H} fill={`url(#${id}h)`} mask={`url(#${id}k)`} opacity="0.8" style={{ mixBlendMode: 'multiply' }} />}
        {o.finish === 'glossy' && <rect x={-pad} y={-pad} width={W} height={H} fill={`url(#${id}g)`} mask={`url(#${id}k)`} />}
      </svg>
    </div>
  );
}

/** One sticker, drawn with its cut line, border and finish. */
function StickerArt({ img, crop, o, sizePct }: { img: Img; crop?: Crop; o: Options; sizePct: number }) {
  if (o.shape === 'die-cut' || !o.shape) return <DieCut img={img} o={o} sizePct={sizePct} />;
  const sizeIn = SIZE_IN[o.size] ?? 2;
  const clear = o.finish === 'transparent';
  const film = o.finish === 'holographic' ? 'holo-film' : o.finish === 'glossy' ? 'gloss-film' : null;
  const radius = RADIUS[o.shape] ?? '0';
  const border = (0.125 / sizeIn) * sizePct;
  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: `${sizePct}cqmin`,
        borderRadius: radius,
        padding: clear ? 0 : `${border}cqmin`,
        background: clear ? 'transparent' : '#fff',
        boxShadow: clear ? undefined : '0 6px 16px rgb(0 0 0 / 0.45)',
        mixBlendMode: clear ? 'multiply' : undefined,
      }}
    >
      <CropImage src={img.src} img={img} aspect={1} crop={crop} minZoom={STICKER_MIN_ZOOM} className={cn('w-full', !clear && 'bg-white')} style={{ borderRadius: radius }} />
      {film && <span className={film} style={{ borderRadius: radius }} />}
    </div>
  );
}

function Preview({ img, crop, o, view }: { img: Img; crop?: Crop; o: Options; view: 'close' | 'laptop' }) {
  const clear = o.finish === 'transparent';
  if (view === 'laptop') {
    const pct = ((SIZE_IN[o.size] ?? 2) / LID_IN) * 100;
    return (
      <div className="laptop-lid absolute inset-0 grid place-items-center [container-type:size]">
        <span className="absolute left-1/2 top-[18%] size-[3.5%] -translate-x-1/2 rounded-full bg-[#2c2c37] shadow-[inset_0_1px_2px_rgb(0_0_0/0.6)]" aria-hidden="true" />
        <div className="-rotate-6">
          <StickerArt img={img} crop={crop} o={o} sizePct={pct} />
        </div>
        <p className="absolute inset-x-0 bottom-3 text-center text-[12px] font-semibold text-white/60">Shown to scale on a laptop lid</p>
      </div>
    );
  }
  return (
    <div className={cn('absolute inset-0 grid place-items-center [container-type:size]', clear ? 'clear-surface' : 'checker')}>
      <StickerArt img={img} crop={crop} o={o} sizePct={64} />
    </div>
  );
}

export function StickerStudio({ type }: { type: ProductType }) {
  const [draft, setDraft] = useStudioDraft('stickers', type.options);
  const add = useCart((s) => s.add);
  const [view, setView] = useState<'close' | 'laptop'>('close');
  const [cropping, setCropping] = useState(false);
  const queue = useUploadQueue({ onDone: (info) => setDraft((d) => ({ ...d, items: [{ upload: info }] })) });
  const o = draft.options;
  const item = draft.items[0];
  const pending = queue.pending[queue.pending.length - 1];
  const setOption = (key: string, v: string) => setDraft((d) => ({ ...d, options: { ...d.options, [key]: v } }));

  const choose = (files: File[]) => {
    queue.pending.forEach((p) => queue.remove(p.key));
    void queue.add(files.slice(0, 1));
  };

  const shown: Img | null = pending?.local
    ? { src: pending.local, w: pending.w, h: pending.h, alpha: true }
    : item
      ? { src: item.upload.src, w: item.upload.w, h: item.upload.h, alpha: item.upload.alpha }
      : null;
  const aspect = frameAspect('stickers', o);
  const dieCut = aspect === null;
  const unit = unitPrice(type.price, o);

  const dpiAt = (opts: Options, crop?: Crop) => {
    if (!item) return 0;
    const img = item.upload;
    const a = frameAspect('stickers', opts);
    return effectiveDpi(img, printArea('stickers', opts, img), a ? cropRect(img, a, crop, STICKER_MIN_ZOOM) : undefined);
  };
  const dpi = dpiAt(o, item?.crop);
  const level = qualityLevel(dpi, studio.dpi);
  const sizeGroup = type.options.find((g) => g.key === 'size');
  const sizeNotes: Record<string, OptionNote | undefined> = {};
  if (item && sizeGroup) for (const v of sizeGroup.values) if (qualityLevel(dpiAt({ ...o, size: v.value }, item.crop), studio.dpi) === 'low') sizeNotes[v.value] = { text: 'Low res', warn: true };
  const packGroup = type.options.find((g) => g.key === 'pack');
  const packNotes: Record<string, OptionNote | undefined> = {};
  if (packGroup) for (const v of packGroup.values) packNotes[v.value] = { text: `${formatINR(Math.round(unitPrice(type.price, { ...o, pack: v.value }) / Number(v.value)))} each` };

  const design = (): DesignItem[] => (item ? [dieCut ? { upload: item.upload } : item] : []);
  const reason = !item
    ? queue.active
      ? 'Wait for your image to finish uploading.'
      : 'Upload your image to continue.'
    : queue.active
      ? 'Wait for your new image to finish uploading.'
      : checkDesign('stickers', o, designInputs({ kind: 'stickers', items: design() }), draft.note);
  const sizeLabel = `${sizeGroup?.values.find((v) => v.value === o.size)?.hint ?? ''}`;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-12">
      <div className="min-w-0">
        {shown ? (
          <>
            <div className="relative aspect-square overflow-hidden rounded-card border border-line" role="img" aria-label={`Preview of your sticker: ${o.shape}, ${o.finish}`}>
              <Preview img={shown} crop={pending ? undefined : item?.crop} o={o} view={view} />
              {pending && <UploadOverlay item={pending} onRetry={() => queue.retry(pending.key)} onRemove={() => queue.remove(pending.key)} />}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2" role="group" aria-label="Preview">
                <button type="button" className="chip" aria-pressed={view === 'close'} onClick={() => setView('close')}>
                  Close-up
                </button>
                <button type="button" className="chip" aria-pressed={view === 'laptop'} onClick={() => setView('laptop')}>
                  On a laptop
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {!dieCut && item && !pending && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCropping(true)}>
                    <CropIcon size={16} /> Adjust crop
                  </button>
                )}
                <FileButton onFiles={choose}>
                  <ImageIcon size={16} /> Replace image
                </FileButton>
              </div>
            </div>
          </>
        ) : (
          <DropZone onFiles={choose} title="Upload your design" className="aspect-square" hint="PNG with a transparent background works best · JPG or WebP · up to 25 MB" />
        )}
        {item && cropping && (
          <CropDialog
            open
            onClose={() => setCropping(false)}
            onDone={(crop) => setDraft((d) => ({ ...d, items: d.items.map((it, i) => (i === 0 ? { ...it, crop } : it)) }))}
            src={item.upload.src}
            img={item.upload}
            aspect={1}
            crop={item.crop}
            round={RADIUS[o.shape]}
            minZoom={STICKER_MIN_ZOOM}
            title="Position your design"
            renderInfo={(crop) => {
              const d = dpiAt(o, crop);
              return <QualityNote level={qualityLevel(d, studio.dpi)} dpi={d} sizeLabel={sizeLabel} />;
            }}
          />
        )}
      </div>

      <div className="grid min-w-0 content-start gap-5">
        {type.options.map((g) => (
          <OptionPicker
            key={g.key}
            group={g}
            value={o[g.key]}
            onChange={(v) => setOption(g.key, v)}
            notes={g.key === 'size' ? sizeNotes : g.key === 'pack' ? packNotes : undefined}
            idPrefix="sticker"
          />
        ))}
        {item && !pending && (
          <div className="grid gap-2">
            <QualityNote level={level} dpi={dpi} sizeLabel={sizeLabel} />
            {dieCut && !item.upload.alpha && (
              <p className="text-[13.5px] text-muted">
                Your image has no transparent background, so a die-cut sticker follows its rectangle. For a shaped cut, upload a PNG with a transparent background, or
                pick circle, square or rounded.
              </p>
            )}
          </div>
        )}
        <StudioSummary
          unit={unit}
          qty={draft.qty}
          onQty={(qty) => setDraft((d) => ({ ...d, qty }))}
          each={`${formatINR(Math.round(unit / Number(o.pack || 1)))} per sticker`}
          reason={reason}
          note={draft.note}
          onNote={(note) => setDraft((d) => ({ ...d, note }))}
          label="your stickers"
          onAdd={() => {
            const items = design();
            if (!items.length) return;
            add({
              productId: 0,
              typeId: type.id,
              slug: '',
              href: studio.href,
              name: studio.title,
              typeName: 'Custom studio',
              art: null,
              image: items[0].upload.thumb,
              options: o,
              optionLabels: optionLabels(type.options, o),
              unit,
              qty: draft.qty,
              custom: { kind: 'stickers', items, note: draft.note.trim() || undefined },
            });
            setDraft((d) => ({ ...d, items: [], note: '', qty: 1 }));
          }}
        />
      </div>
    </div>
  );
}
