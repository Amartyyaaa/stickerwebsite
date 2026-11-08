'use client';

export function PrintButton({ label = 'Print' }: { label?: string }) {
  return (
    <button type="button" className="btn btn-primary btn-sm print:hidden" onClick={() => window.print()}>
      {label}
    </button>
  );
}
