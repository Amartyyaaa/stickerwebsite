'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { isUploadType, MAX_UPLOAD_BYTES, MIN_UPLOAD_SIDE, type UploadInfo } from '@/lib/custom/types';

/**
 * Uploads images in the background, three at a time, with progress. Each file
 * shows straight away from the browser's own copy while it uploads; once the
 * server has checked it, `onDone` hands over the finished upload. Finished
 * uploads are handed over in the order the files were chosen, even when a
 * later one finishes first.
 */

export interface PendingUpload {
  key: string;
  name: string;
  /** The browser's own copy, for an instant preview. */
  local: string | null;
  w: number;
  h: number;
  /** 0 to 1. */
  progress: number;
  error: string | null;
  /** Errors from checks in the browser can't be retried; network errors can. */
  canRetry: boolean;
}

interface Target {
  url: string;
  headers: Record<string, string>;
}

const messageOf = async (res: Response, fallback: string) => {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
};

function put(target: Target, file: File, onProgress: (p: number) => void, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', target.url);
    for (const [k, v] of Object.entries(target.headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      if (xhr.status < 300) return resolve();
      let msg = 'The upload didn’t finish. Please try again.';
      try {
        msg = (JSON.parse(xhr.responseText) as { error?: string }).error ?? msg;
      } catch {
        /* not JSON */
      }
      reject(new Error(msg));
    };
    xhr.onerror = () => reject(new Error('The upload didn’t finish. Check your connection and try again.'));
    signal.addEventListener('abort', () => {
      xhr.abort();
      reject(new DOMException('Upload cancelled', 'AbortError'));
    });
    xhr.send(file);
  });
}

/** Upload one image: ask for a slot, send the file, then ask the server to check it. Admins start product-photo uploads at their own address. */
export async function uploadImage(file: File, onProgress: (p: number) => void, signal: AbortSignal, initUrl = '/api/uploads'): Promise<UploadInfo> {
  const init = await fetch(initUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: file.name, type: file.type, size: file.size }),
    signal,
  });
  if (!init.ok) throw new Error(await messageOf(init, 'We couldn’t start the upload. Please try again.'));
  const slot = (await init.json()) as { id: string; put: Target };
  await put(slot.put, file, onProgress, signal);
  const done = await fetch(`/api/uploads/${slot.id}/complete`, { method: 'POST', signal });
  if (!done.ok) throw new Error(await messageOf(done, 'We couldn’t check that image. Please try again.'));
  return (await done.json()) as UploadInfo;
}

/** Pixel size as the browser shows it (EXIF rotation applied). */
function readSize(url: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => reject(new Error('unreadable'));
    img.src = url;
  });
}

let seq = 0;

export function useUploadQueue({ onDone, concurrency = 3, initUrl }: { onDone: (info: UploadInfo) => void; concurrency?: number; initUrl?: string }) {
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const files = useRef(new Map<string, File>());
  const locals = useRef(new Map<string, string>());
  const ctrls = useRef(new Map<string, AbortController>());
  const queue = useRef<string[]>([]);
  /** Every accepted file, in the order it was chosen, until it has been handed over. */
  const order = useRef<string[]>([]);
  const results = useRef(new Map<string, UploadInfo>());
  const failed = useRef(new Set<string>());
  const running = useRef(0);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  const patch = useCallback((key: string, p: Partial<PendingUpload>) => setPending((list) => list.map((x) => (x.key === key ? { ...x, ...p } : x))), []);

  const forget = useCallback((key: string) => {
    ctrls.current.get(key)?.abort();
    ctrls.current.delete(key);
    files.current.delete(key);
    results.current.delete(key);
    failed.current.delete(key);
    const url = locals.current.get(key);
    if (url) URL.revokeObjectURL(url);
    locals.current.delete(key);
    queue.current = queue.current.filter((k) => k !== key);
    order.current = order.current.filter((k) => k !== key);
    setPending((list) => list.filter((x) => x.key !== key));
  }, []);

  /** Hand over finished uploads from the front of the line. A failed or removed file doesn't hold up the ones after it. */
  const flush = useCallback(() => {
    while (order.current.length) {
      const key = order.current[0];
      const info = results.current.get(key);
      if (info) {
        order.current.shift();
        onDoneRef.current(info);
        forget(key);
      } else if (failed.current.has(key) || !files.current.has(key)) {
        order.current.shift();
      } else {
        break;
      }
    }
  }, [forget]);

  const pump = useRef<() => void>(() => {});
  useEffect(() => {
    pump.current = () => {
      while (running.current < concurrency && queue.current.length) {
        const key = queue.current.shift()!;
        const file = files.current.get(key);
        if (!file) continue;
        running.current++;
        const ctrl = new AbortController();
        ctrls.current.set(key, ctrl);
        uploadImage(file, (progress) => patch(key, { progress }), ctrl.signal, initUrl)
          .then((info) => {
            results.current.set(key, info);
            patch(key, { progress: 1 });
            flush();
          })
          .catch((err: Error) => {
            if (err.name === 'AbortError') return;
            failed.current.add(key);
            patch(key, { error: err.message, progress: 0, canRetry: true });
            flush();
          })
          .finally(() => {
            running.current--;
            ctrls.current.delete(key);
            pump.current();
          });
      }
    };
  }, [concurrency, patch, flush, initUrl]);

  /** Queue files for upload. Returns how many were accepted. */
  const add = useCallback(
    async (list: File[]) => {
      for (const file of list) {
        const key = `u${++seq}`;
        let error: string | null = null;
        let size = { w: 0, h: 0 };
        let local: string | null = null;
        if (!isUploadType(file.type)) error = `${file.name}: please choose a PNG, JPG or WebP image.`;
        else if (file.size > MAX_UPLOAD_BYTES) error = `${file.name} is over 25 MB. Try a smaller image.`;
        else {
          local = URL.createObjectURL(file);
          locals.current.set(key, local);
          try {
            size = await readSize(local);
            if (Math.min(size.w, size.h) < MIN_UPLOAD_SIDE) error = `${file.name} is only ${size.w} × ${size.h} pixels, too small to print.`;
          } catch {
            error = `We couldn’t open ${file.name}. Please choose another image.`;
          }
        }
        setPending((p) => [...p, { key, name: file.name, local, ...size, progress: 0, error, canRetry: false }]);
        if (!error) {
          files.current.set(key, file);
          order.current.push(key);
          queue.current.push(key);
          pump.current();
        }
      }
    },
    [],
  );

  const retry = useCallback(
    (key: string) => {
      if (!files.current.has(key)) return;
      failed.current.delete(key);
      patch(key, { error: null, progress: 0, canRetry: false });
      // A retried file joins the end of the line.
      order.current = [...order.current.filter((k) => k !== key), key];
      queue.current.push(key);
      pump.current();
    },
    [patch],
  );

  useEffect(() => {
    const c = ctrls.current;
    const l = locals.current;
    return () => {
      c.forEach((ctrl) => ctrl.abort());
      l.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  /** Remove a file from the queue (and let any finished uploads after it through). */
  const remove = useCallback(
    (key: string) => {
      forget(key);
      flush();
    },
    [forget, flush],
  );

  const active = pending.filter((p) => !p.error).length;
  return { pending, add, retry, remove, active };
}
