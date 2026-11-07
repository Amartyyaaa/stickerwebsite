'use client';

import { useId, useState } from 'react';
import { UploadIcon } from '@/components/icons';
import { cn } from '@/lib/cn';
import { UPLOAD_TYPES } from '@/lib/custom/types';

/** Click or drop to choose images. The hidden file input keeps it keyboard and screen-reader friendly. */
export function DropZone({
  onFiles,
  multiple,
  title,
  hint = 'PNG, JPG or WebP, up to 25 MB',
  compact,
  disabled,
  className,
}: {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  title: string;
  hint?: string;
  compact?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  const [over, setOver] = useState(false);
  return (
    <div className={cn('relative', className)}>
      <input
        id={id}
        type="file"
        accept={UPLOAD_TYPES.join(',')}
        multiple={multiple}
        disabled={disabled}
        className="peer sr-only"
        onChange={(e) => {
          const list = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (list.length) onFiles(list);
        }}
      />
      <label
        htmlFor={id}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (disabled) return;
          const list = Array.from(e.dataTransfer.files);
          if (list.length) onFiles(multiple ? list : list.slice(0, 1));
        }}
        className={cn(
          'grid h-full cursor-pointer place-items-center content-center gap-2 rounded-card border-2 border-dashed border-line-2 bg-surface/60 text-center transition hover:border-lime peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-cyan',
          compact ? 'p-4' : 'p-8',
          over && 'border-lime bg-lime/5',
          disabled && 'cursor-not-allowed opacity-50 hover:border-line-2',
        )}
      >
        <span className={cn('grid place-items-center rounded-full bg-lime/10 text-lime', compact ? 'size-10' : 'size-14')}>
          <UploadIcon size={compact ? 20 : 26} />
        </span>
        <span className={cn('font-display uppercase leading-tight', compact ? 'text-base' : 'text-xl')}>{title}</span>
        {!compact && (
          <span className="text-[13px] text-muted">
            Drag {multiple ? 'them' : 'it'} here or <span className="font-semibold text-lime underline underline-offset-2">choose {multiple ? 'files' : 'a file'}</span>
          </span>
        )}
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </label>
    </div>
  );
}

/** A button that opens the file picker, for "Replace image" and "Add photos". */
export function FileButton({ onFiles, multiple, children, className }: { onFiles: (files: File[]) => void; multiple?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('btn btn-ghost btn-sm cursor-pointer focus-within:outline focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-cyan', className)}>
      <input
        type="file"
        accept={UPLOAD_TYPES.join(',')}
        multiple={multiple}
        className="sr-only"
        onChange={(e) => {
          const list = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (list.length) onFiles(list);
        }}
      />
      {children}
    </label>
  );
}
