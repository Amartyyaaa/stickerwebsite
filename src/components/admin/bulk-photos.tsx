'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { createProductsFromPhotosAction } from '@/actions/admin/products';
import { inputClass, selectClass } from '@/components/checkout/fields';
import { DropZone } from '@/components/custom/drop-zone';
import { useUploadQueue } from '@/components/custom/use-upload-queue';
import { RefreshIcon } from '@/components/icons';
import { BULK_BATCH, folderOf, nameFromFile, themeForFolder } from '@/lib/admin/bulk-photos';
import { cn } from '@/lib/cn';
import { isUploadType, type UploadInfo } from '@/lib/custom/types';

interface Option {
  id: string;
  name: string;
}

interface Row {
  uploadId: string;
  thumb: string;
  file: string;
  name: string;
  /** Empty means "the default theme". */
  vibeId: string;
  /** The folder the file came from, when it didn't match a theme. */
  unmatched: string | null;
  error?: string;
}

/**
 * "Add from photos": upload a folder of design files and make one product per image.
 * Sub-folders named after themes set each design's theme; names come from the file names.
 */
export function BulkPhotos({ types, themes }: { types: Option[]; themes: Option[] }) {
  const [typeId, setTypeId] = useState(types[0]?.id ?? '');
  const [defaultTheme, setDefaultTheme] = useState(themes[0]?.id ?? '');
  const [hidden, setHidden] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [created, setCreated] = useState(0);
  const folderInput = useRef<HTMLInputElement>(null);

  const uploads = useUploadQueue({
    initUrl: '/api/admin/uploads',
    onDone: (info: UploadInfo, file?: File) => {
      const folder = folderOf(file?.webkitRelativePath ?? '');
      const theme = folder ? themeForFolder(folder, themes) : null;
      setRows((r) => [...r, { uploadId: info.id, thumb: info.thumb, file: info.name, name: nameFromFile(info.name), vibeId: theme ?? '', unmatched: folder && !theme ? folder : null }]);
    },
  });
  const failed = uploads.pending.filter((p) => p.error);

  const addFiles = (files: File[]) => {
    const images = files.filter((f) => isUploadType(f.type));
    const others = files.length - images.length;
    setNotice(others ? { ok: true, text: `${others} file${others === 1 ? ' that isn’t' : 's that aren’t'} a PNG, JPG or WebP image ${others === 1 ? 'was' : 'were'} left out.` } : null);
    void uploads.add(images);
  };

  const edit = (uploadId: string, patch: Partial<Row>) => setRows((list) => list.map((r) => (r.uploadId === uploadId ? { ...r, ...patch, error: undefined } : r)));

  const create = async () => {
    if (!typeId) return setNotice({ ok: false, text: 'Choose a product type.' });
    const todo = rows;
    setBusy({ done: 0, total: todo.length });
    setNotice(null);
    let added = 0;
    const kept = new Map<string, string>();
    for (let i = 0; i < todo.length; i += BULK_BATCH) {
      const chunk = todo.slice(i, i + BULK_BATCH);
      const r = await createProductsFromPhotosAction({ typeId, isActive: !hidden, rows: chunk.map((x) => ({ uploadId: x.uploadId, name: x.name, vibeId: x.vibeId || defaultTheme })) });
      if (!r.ok) {
        for (const x of todo.slice(i)) kept.set(x.uploadId, r.error);
        break;
      }
      added += r.created;
      for (const s of r.skipped) kept.set(s.uploadId, s.reason);
      setBusy({ done: Math.min(i + BULK_BATCH, todo.length), total: todo.length });
    }
    setBusy(null);
    setCreated((n) => n + added);
    // Keep only the designs that couldn't be added, with the reason, so they can be fixed and sent again.
    setRows((list) => list.filter((x) => kept.has(x.uploadId)).map((x) => ({ ...x, error: kept.get(x.uploadId) })));
    setNotice({
      ok: kept.size === 0,
      text: `Added ${added} product${added === 1 ? '' : 's'}${hidden ? ', hidden for now' : ''}.${kept.size ? ` ${kept.size} couldn’t be added: see the reasons below.` : ''}`,
    });
  };

  const themeName = (id: string) => themes.find((t) => t.id === id)?.name ?? '';

  return (
    <div className="grid gap-5">
      <section className="grid gap-4 rounded-card border border-line bg-surface p-4 sm:p-5" aria-labelledby="bulk-settings">
        <h2 id="bulk-settings" className="font-display text-xl uppercase">
          1. What are they?
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid content-start gap-1.5" htmlFor="bulk-type">
            <span className="text-[12.5px] font-bold uppercase tracking-[0.07em]">Product type</span>
            <select id="bulk-type" value={typeId} onChange={(e) => setTypeId(e.target.value)} className={selectClass()}>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid content-start gap-1.5" htmlFor="bulk-theme">
            <span className="text-[12.5px] font-bold uppercase tracking-[0.07em]">Theme</span>
            <select id="bulk-theme" value={defaultTheme} onChange={(e) => setDefaultTheme(e.target.value)} className={selectClass()}>
              {themes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <span className="text-[13px] text-muted">Used unless a design is in a sub-folder named after a theme, like “Anime” or “Dark &amp; Edgy”.</span>
          </label>
        </div>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} className="size-4 accent-[var(--color-lime)]" />
          Add them hidden, so I can check them before shoppers see them
        </label>
        <p className="text-[13px] text-muted">Each gets the type’s standard price and description. Only add designs you have the rights to sell.</p>
      </section>

      <section className="grid gap-4 rounded-card border border-line bg-surface p-4 sm:p-5" aria-labelledby="bulk-files">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="bulk-files" className="font-display text-xl uppercase">
            2. Upload the designs
          </h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => folderInput.current?.click()}>
            Choose a folder
          </button>
          <input
            ref={folderInput}
            type="file"
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            {...{ webkitdirectory: '' }}
            onChange={(e) => {
              addFiles([...(e.target.files ?? [])]);
              e.target.value = '';
            }}
          />
        </div>
        <DropZone multiple compact onFiles={addFiles} title="Drop design files here" hint="PNG, JPG or WebP, up to 25 MB each. As many as you like." />
        {uploads.active > 0 && (
          <p className="text-sm text-muted" aria-live="polite">
            Uploading {uploads.active} file{uploads.active === 1 ? '' : 's'}…
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
      </section>

      <section className="grid gap-4 rounded-card border border-line bg-surface p-4 sm:p-5" aria-labelledby="bulk-review">
        <h2 id="bulk-review" className="font-display text-xl uppercase">
          3. Check the names, then add them
        </h2>
        {notice && (
          <p role="status" className={cn('text-sm font-semibold', notice.ok ? 'text-lime' : 'text-red')}>
            {notice.text}
            {created > 0 && (
              <>
                {' '}
                <Link href={hidden ? '/admin/products?status=hidden&source=real' : '/admin/products?source=real'} className="underline underline-offset-2">
                  See them in Products
                </Link>
                {hidden ? ', tick them and click Show.' : '.'}
              </>
            )}
          </p>
        )}
        {rows.length === 0 ? (
          <p className="text-sm text-muted">Uploaded designs appear here.</p>
        ) : (
          <ul className="grid gap-2">
            {rows.map((r, i) => (
              <li key={r.uploadId} className="grid grid-cols-[56px_minmax(0,1fr)] items-start gap-3 rounded-[3px] border border-line bg-bg p-2 sm:grid-cols-[56px_minmax(0,1fr)_200px_auto] sm:items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.thumb} alt="" className="size-14 rounded-[3px] bg-surface-2 object-contain" />
                <div className="grid gap-1">
                  <label className="sr-only" htmlFor={`bulk-name-${i}`}>
                    Name for {r.file}
                  </label>
                  <input id={`bulk-name-${i}`} value={r.name} maxLength={80} onChange={(e) => edit(r.uploadId, { name: e.target.value })} className={inputClass(r.error)} />
                  <span className="truncate text-[12px] text-muted">
                    {r.file}
                    {r.unmatched && <span className="text-orange"> · folder “{r.unmatched}” isn’t a theme, so it uses the default</span>}
                  </span>
                  {r.error && <span className="text-[13px] font-semibold text-red">{r.error}</span>}
                </div>
                <select aria-label={`Theme for ${r.name || r.file}`} value={r.vibeId} onChange={(e) => edit(r.uploadId, { vibeId: e.target.value, unmatched: null })} className={cn(selectClass(), 'col-start-2 sm:col-start-auto')}>
                  <option value="">Default ({themeName(defaultTheme)})</option>
                  {themes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <button type="button" className="col-start-2 justify-self-start text-sm text-muted hover:text-red sm:col-start-auto" onClick={() => setRows((list) => list.filter((x) => x.uploadId !== r.uploadId))}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-primary" disabled={!rows.length || Boolean(busy) || uploads.active > 0} onClick={() => void create()}>
            {busy ? `Adding ${busy.done} of ${busy.total}…` : `Add ${rows.length} product${rows.length === 1 ? '' : 's'}`}
          </button>
          {uploads.active > 0 && <span className="text-sm text-muted">Waiting for uploads to finish.</span>}
        </div>
      </section>
    </div>
  );
}
