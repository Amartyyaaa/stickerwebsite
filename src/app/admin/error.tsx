'use client';

import { useEffect } from 'react';

/** Shown if an admin page fails unexpectedly. The reference matches the server log (sudo pyv logs). */
export default function AdminError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const ref = error instanceof Error ? ((error as Error & { digest?: string }).digest ?? '') : '';
  return (
    <div className="grid max-w-lg gap-4 rounded-card border border-red/40 bg-surface p-6">
      <h1 className="font-display text-3xl uppercase">Something went wrong</h1>
      <p className="text-sm text-muted">This page hit an error. Try again; if it keeps happening, the server log has the details{ref ? ` (look for ${ref})` : ''}.</p>
      <button type="button" className="btn btn-primary btn-sm justify-self-start" onClick={() => retry()}>
        Try again
      </button>
    </div>
  );
}
