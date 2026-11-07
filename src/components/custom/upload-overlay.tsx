'use client';

import { RefreshIcon, TrashIcon } from '@/components/icons';
import type { PendingUpload } from './use-upload-queue';

/** Progress bar or error over an image that is still uploading. */
export function UploadOverlay({ item, onRetry, onRemove, compact }: { item: PendingUpload; onRetry: () => void; onRemove: () => void; compact?: boolean }) {
  if (item.error) {
    return (
      <div className="absolute inset-0 grid place-items-center content-center gap-2 bg-bg/85 p-3 text-center" role="alert">
        <p className={compact ? 'text-[12px] font-semibold text-red' : 'text-sm font-semibold text-red'}>{item.error}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {item.canRetry && (
            <button type="button" onClick={onRetry} className="btn btn-ghost btn-sm">
              <RefreshIcon size={15} /> Retry
            </button>
          )}
          <button type="button" onClick={onRemove} className="btn btn-ghost btn-sm">
            <TrashIcon size={15} /> Remove
          </button>
        </div>
      </div>
    );
  }
  const pct = Math.round(item.progress * 100);
  return (
    <div className="absolute inset-x-0 bottom-0 grid gap-1.5 bg-gradient-to-t from-bg/90 to-transparent p-3 pt-8" role="status">
      <span className="text-[12px] font-bold uppercase tracking-[0.06em]">{pct < 100 ? `Uploading ${pct}%` : 'Checking…'}</span>
      <span className="h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
        <span className="block h-full rounded-full bg-lime transition-[width]" style={{ width: `${Math.max(4, pct)}%` }} />
      </span>
    </div>
  );
}
