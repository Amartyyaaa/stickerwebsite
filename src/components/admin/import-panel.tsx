'use client';

import Link from 'next/link';
import { useState } from 'react';
import { inputClass } from '@/components/checkout/fields';
import { DropZone } from '@/components/custom/drop-zone';
import { useUploadQueue } from '@/components/custom/use-upload-queue';
import { RefreshIcon } from '@/components/icons';
import type { UploadInfo } from '@/lib/custom/types';
import { cn } from '@/lib/cn';
import { formatINR } from '@/lib/money';
import { Badge } from './product-table';
import { tableClass } from './ui';

type PreviewRow =
  | { row: number; kind: 'new' | 'update'; label: string; id?: number; changes: string[]; price: number }
  | { row: number; kind: 'error'; label: string; errors: string[] };

interface Preview {
  counts: { new: number; update: number; unchanged: number; error: number };
  ignored: string[];
  rows: PreviewRow[];
  more: number;
}

const KIND: Record<PreviewRow['kind'], { label: string; tone: 'lime' | 'violet' | 'warn' }> = {
  new: { label: 'New', tone: 'lime' },
  update: { label: 'Update', tone: 'violet' },
  error: { label: 'Error', tone: 'warn' },
};

/** Step 1: product photos, uploaded in bulk and matched to the CSV by file name. */
export function PhotoUploader() {
  const [done, setDone] = useState<UploadInfo[]>([]);
  const uploads = useUploadQueue({ initUrl: '/api/admin/uploads', onDone: (info) => setDone((d) => [info, ...d]) });
  const failed = uploads.pending.filter((p) => p.error);
  return (
    <div className="grid gap-4">
      <DropZone multiple compact onFiles={(files) => uploads.add(files)} title="Upload product photos" hint="PNG, JPG or WebP, up to 25 MB each. Choose as many as you like." />
      {uploads.active > 0 && (
        <p className="text-sm text-muted" aria-live="polite">
          Uploading {uploads.active} photo{uploads.active === 1 ? '' : 's'}…
        </p>
      )}
      {failed.length > 0 && (
        <ul className="grid gap-1 text-sm">
          {failed.map((p) => (
            <li key={p.key} className="flex flex-wrap items-center gap-3 text-red">
              <span className="font-semibold">{p.error}</span>
              {p.canRetry && (
                <button type="button" className="inline-flex items-center gap-1 font-semibold text-lime" onClick={() => uploads.retry(p.key)}>
                  <RefreshIcon size={13} /> Retry
                </button>
              )}
              <button type="button" className="text-muted hover:text-ink" onClick={() => uploads.remove(p.key)}>
                Dismiss
              </button>
            </li>
          ))}
        </ul>
      )}
      {done.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-lime" aria-live="polite">
            {done.length} photo{done.length === 1 ? '' : 's'} uploaded. Use these file names in the images column:
          </p>
          <ul className="grid max-h-64 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
            {done.map((p) => (
              <li key={p.id} className="flex min-w-0 items-center gap-2 rounded-[3px] border border-line bg-bg p-1.5 text-[13px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumb} alt="" className="size-9 shrink-0 object-contain" />
                <span className="truncate font-mono">{p.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Step 2 and 3: check the CSV, see what will change, then import. */
export function CsvImport() {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<{ created: number; updated: number; errors: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'check' | 'run' | null>(null);

  const send = async (mode: 'check' | 'run') => {
    setBusy(mode);
    setError(null);
    if (mode === 'check') setResult(null);
    try {
      const res = await fetch(`/api/admin/products/import?mode=${mode}`, { method: 'POST', headers: { 'content-type': 'text/csv; charset=utf-8' }, body: text });
      const body = (await res.json().catch(() => null)) as (Preview & { error?: string }) | ({ created: number; updated: number; errors: number } & { error?: string }) | null;
      if (!res.ok || !body) {
        setPreview(null);
        return setError(body?.error ?? 'The file couldn’t be checked. Please try again.');
      }
      if (mode === 'check') setPreview(body as Preview);
      else {
        setResult(body as { created: number; updated: number; errors: number });
        setPreview(null);
      }
    } catch {
      setError('The connection dropped. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const ready = preview ? preview.counts.new + preview.counts.update : 0;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="btn btn-ghost btn-sm cursor-pointer focus-within:outline focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-cyan">
          <input
            type="file"
            accept=".csv,.tsv,.txt,text/csv,text/plain"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              setFileName(file.name);
              setText(await file.text());
              setPreview(null);
              setResult(null);
            }}
          />
          Choose CSV file
        </label>
        <span className="text-sm text-muted">{fileName ? `Loaded ${fileName}` : 'or paste the rows below (straight from Excel or Google Sheets works too).'}</span>
      </div>
      <label className="sr-only" htmlFor="csv-text">
        CSV text
      </label>
      <textarea
        id="csv-text"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setFileName(null);
          setPreview(null);
        }}
        rows={7}
        spellCheck={false}
        placeholder="id,slug,name,type,vibes,description,tags,price_from_rupees,popularity,images,active"
        className={cn(inputClass(), 'py-2.5 font-mono text-[13px]')}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-ghost btn-sm" disabled={!text.trim() || busy !== null} onClick={() => send('check')}>
          {busy === 'check' ? 'Checking…' : 'Check file'}
        </button>
        {preview && (
          <button type="button" className="btn btn-primary btn-sm" disabled={!ready || busy !== null} onClick={() => send('run')}>
            {busy === 'run' ? 'Importing…' : `Import ${ready.toLocaleString('en-IN')} product${ready === 1 ? '' : 's'}`}
          </button>
        )}
        <p className="text-sm font-semibold text-red" role="alert">
          {error}
        </p>
      </div>

      {result && (
        <div className="rounded-card border border-lime/40 bg-lime/5 p-4 text-sm" role="status">
          <p className="font-semibold text-lime">
            Done. Added {result.created.toLocaleString('en-IN')} and updated {result.updated.toLocaleString('en-IN')} product{result.created + result.updated === 1 ? '' : 's'}.
          </p>
          {result.errors > 0 && <p className="mt-1 text-muted">{result.errors} row{result.errors === 1 ? '' : 's'} with errors were skipped. Fix them and import the file again: rows already imported come up as unchanged.</p>}
          <Link href="/admin/products" className="mt-2 inline-block font-semibold text-lime hover:underline">
            See the products →
          </Link>
        </div>
      )}

      {preview && (
        <div className="grid gap-3" role="status">
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="chip is-on">New {preview.counts.new.toLocaleString('en-IN')}</span>
            <span className="chip">Updates {preview.counts.update.toLocaleString('en-IN')}</span>
            <span className="chip">Unchanged {preview.counts.unchanged.toLocaleString('en-IN')}</span>
            <span className={cn('chip', preview.counts.error > 0 && 'border-orange/60 text-orange')}>Errors {preview.counts.error.toLocaleString('en-IN')}</span>
          </div>
          {preview.ignored.length > 0 && <p className="text-sm text-muted">These columns aren’t used and will be skipped: {preview.ignored.join(', ')}.</p>}
          {preview.counts.error > 0 && <p className="text-sm text-muted">Rows with errors are skipped. The rest can be imported now, or fix the file and check it again.</p>}
          {preview.rows.length > 0 && (
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <table className={`${tableClass} min-w-[640px]`}>
                <thead>
                  <tr>
                    <th className="w-16">Row</th>
                    <th>Product</th>
                    <th className="w-24">Result</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((r) => (
                    <tr key={r.row}>
                      <td className="tabular-nums text-muted">{r.row}</td>
                      <td className="font-semibold">{r.label}</td>
                      <td>
                        <Badge tone={KIND[r.kind].tone}>{KIND[r.kind].label}</Badge>
                      </td>
                      <td className="text-[13px]">
                        {r.kind === 'error' ? (
                          <ul className="grid gap-0.5 text-orange">
                            {r.errors.map((e) => (
                              <li key={e}>{e}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-muted">
                            {r.kind === 'update' ? `Changes ${r.changes.join(', ')}` : 'Added'} · from {formatINR(r.price)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {preview.more > 0 && <p className="text-xs text-muted">And {preview.more.toLocaleString('en-IN')} more rows like these.</p>}
        </div>
      )}
    </div>
  );
}
