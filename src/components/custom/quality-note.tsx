import { AlertIcon, CheckIcon } from '@/components/icons';
import { cn } from '@/lib/cn';
import type { Quality } from '@/lib/custom/quality';

/** How sharp the print will be, in plain words. */
export function QualityNote({ level, dpi, sizeLabel, className }: { level: Quality; dpi: number; sizeLabel: string; className?: string }) {
  const text =
    level === 'great'
      ? `Sharp at ${sizeLabel} (about ${dpi} DPI).`
      : level === 'ok'
        ? `Should print fine at ${sizeLabel} (about ${dpi} DPI). A bigger image would be sharper.`
        : `Low resolution: about ${dpi} DPI at ${sizeLabel}, so the print may look blurry. Choose a smaller size, zoom out, or upload a bigger image.`;
  return (
    <p
      className={cn(
        'flex items-start gap-2 rounded-[3px] border px-3 py-2 text-[13.5px] font-semibold',
        level === 'low' ? 'border-orange/50 bg-orange/10 text-orange' : level === 'ok' ? 'border-cyan/40 bg-cyan/5 text-cyan' : 'border-lime/40 bg-lime/5 text-lime',
        className,
      )}
      role="status"
    >
      {level === 'low' ? <AlertIcon size={18} className="mt-px shrink-0" /> : <CheckIcon size={18} className="mt-px shrink-0" />}
      <span>{text}</span>
    </p>
  );
}
