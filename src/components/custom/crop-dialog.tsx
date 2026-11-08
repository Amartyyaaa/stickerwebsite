'use client';

import { useEffect, useRef, useState } from 'react';
import { CloseIcon, MinusIcon, PlusIcon } from '@/components/icons';
import { cn } from '@/lib/cn';
import { DEFAULT_CROP, normalizeCrop, panCrop, zoomCrop } from '@/lib/custom/crop';
import { MAX_ZOOM, type Crop } from '@/lib/custom/types';
import { CropImage } from './crop-image';

/**
 * Crop editor in a modal dialog: drag (or use the arrow keys) to move the
 * image, pinch or use the slider to zoom. Changes apply on "Done".
 */
export function CropDialog({
  open,
  onClose,
  onDone,
  src,
  img,
  aspect,
  crop,
  title = 'Adjust the crop',
  round,
  renderInfo,
  minZoom = 1,
}: {
  open: boolean;
  onClose: () => void;
  onDone: (crop: Crop) => void;
  src: string;
  img: { w: number; h: number };
  aspect: number;
  crop?: Crop;
  title?: string;
  /** Shape of the cut, for example "50%" for a circle sticker. */
  round?: string;
  /** Live details under the frame, like the print sharpness at this zoom. */
  renderInfo?: (crop: Crop) => React.ReactNode;
  /** Below 1 the image can shrink inside the frame (stickers). */
  minZoom?: number;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const [work, setWork] = useState<Crop>(crop ?? DEFAULT_CROP);
  const [wasOpen, setWasOpen] = useState(false);

  // Start from the saved crop each time the dialog opens (edits are dropped on Cancel).
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setWork(crop ?? DEFAULT_CROP);
  }

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const pan = (dx: number, dy: number) => setWork((c) => panCrop(img, aspect, c, dx, dy, minZoom));
  const zoomTo = (z: number) => setWork((c) => zoomCrop(img, aspect, c, z, minZoom));
  const dist = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="crop-title"
      className="m-auto w-[min(92vw,600px)] max-w-none rounded-card border border-line-2 bg-surface p-0 text-ink shadow-[0_30px_80px_rgba(0,0,0,0.6)] backdrop:bg-black/75"
    >
      <div className="grid gap-4 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 id="crop-title" className="font-display text-xl uppercase">
            {title}
          </h2>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-[2px] hover:bg-surface-2" aria-label="Cancel">
            <CloseIcon />
          </button>
        </div>
        <div
          ref={frame}
          tabIndex={0}
          role="application"
          aria-label="Crop area. Drag to move the image, or use the arrow keys. Plus and minus zoom."
          className="relative mx-auto cursor-grab touch-none overflow-hidden bg-bg outline-offset-4 active:cursor-grabbing"
          style={{ width: `min(100%, calc(58vh * ${aspect}))`, borderRadius: round }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (pointers.current.size === 2) pinch.current = { dist: dist(), zoom: work.zoom };
          }}
          onPointerMove={(e) => {
            const prev = pointers.current.get(e.pointerId);
            if (!prev || !frame.current) return;
            pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (pointers.current.size === 1) {
              const r = frame.current.getBoundingClientRect();
              pan((e.clientX - prev.x) / r.width, (e.clientY - prev.y) / r.height);
            } else if (pointers.current.size === 2 && pinch.current) {
              const p = pinch.current;
              zoomTo((p.zoom * dist()) / Math.max(1, p.dist));
            }
          }}
          onPointerUp={(e) => {
            pointers.current.delete(e.pointerId);
            if (pointers.current.size < 2) pinch.current = null;
          }}
          onPointerCancel={(e) => {
            pointers.current.delete(e.pointerId);
            pinch.current = null;
          }}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 0.1 : 0.02;
            const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
            if (moves[e.key]) {
              e.preventDefault();
              pan(...moves[e.key]);
            } else if (e.key === '+' || e.key === '=') zoomTo(work.zoom + 0.1);
            else if (e.key === '-') zoomTo(work.zoom - 0.1);
          }}
        >
          <CropImage src={src} img={img} aspect={aspect} crop={work} minZoom={minZoom} className={cn('pointer-events-none w-full', minZoom < 1 && 'bg-white')} />
          <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-40" aria-hidden="true">
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className="border-[0.5px] border-white/40" />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className="grid size-10 shrink-0 place-items-center rounded-[2px] border border-line-2 hover:border-lime hover:text-lime" onClick={() => zoomTo(work.zoom - 0.2)} aria-label="Zoom out">
            <MinusIcon size={18} />
          </button>
          <label className="flex flex-1 items-center gap-3">
            <span className="sr-only">Zoom</span>
            <input type="range" min={minZoom} max={MAX_ZOOM} step={0.01} value={work.zoom} onChange={(e) => zoomTo(Number(e.target.value))} className="w-full accent-lime" />
          </label>
          <button type="button" className="grid size-10 shrink-0 place-items-center rounded-[2px] border border-line-2 hover:border-lime hover:text-lime" onClick={() => zoomTo(work.zoom + 0.2)} aria-label="Zoom in">
            <PlusIcon size={18} />
          </button>
        </div>
        {minZoom < 1 && <p className="-mt-1 text-[13px] text-muted">Zoom out to fit your whole design inside the shape. The space around it prints white.</p>}
        {renderInfo?.(work)}
        <div className="flex flex-wrap justify-between gap-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setWork(DEFAULT_CROP)}>
            Reset
          </button>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className={cn('btn btn-primary btn-sm')}
              onClick={() => {
                onDone(normalizeCrop(img, aspect, work, minZoom));
                onClose();
              }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
