import { cn } from '@/lib/cn';

export const inputClass = (error?: string) =>
  cn(
    'min-h-11 w-full rounded-[2px] border bg-surface px-3.5 text-[15px] text-ink placeholder:text-muted focus:border-lime focus:outline-none',
    error ? 'border-red' : 'border-line-2',
  );

/** A labelled form field with an optional hint and error, wired up for screen readers. */
export function Field({ id, label, error, hint, optional, className, children }: { id: string; label: string; error?: string; hint?: string; optional?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('grid content-start gap-1.5', className)}>
      <label htmlFor={id} className="text-[12.5px] font-bold uppercase tracking-[0.07em]">
        {label} {optional && <span className="font-semibold normal-case tracking-normal text-muted">(optional)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-[13px] font-semibold text-red">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** aria props that link an input to its error or hint. */
export const described = (id: string, error?: string, hint?: string) => ({
  'aria-invalid': error ? true : undefined,
  'aria-describedby': error ? `${id}-error` : hint ? `${id}-hint` : undefined,
});
