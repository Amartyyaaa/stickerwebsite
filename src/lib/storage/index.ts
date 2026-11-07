import 'server-only';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';

/**
 * File storage for customer uploads. Development (and a single-server host)
 * uses a folder on disk. Step 5 adds a Cloudflare R2 driver with presigned
 * uploads; it implements the same interface, so nothing else changes.
 */

export interface UploadTarget {
  url: string;
  method: 'PUT';
  headers: Record<string, string>;
}

export interface Storage {
  /** Uploads arrive through our own PUT route (true) or go straight to the bucket (false). */
  readonly viaApp: boolean;
  /** Where the browser should send a new upload. */
  uploadTarget(input: { id: string; key: string; contentType: string; bytes: number }): Promise<UploadTarget>;
  /** Save a request body, stopping with TooLargeError once it passes maxBytes. Returns the bytes written. */
  putStream(key: string, body: ReadableStream<Uint8Array>, maxBytes: number): Promise<number>;
  put(key: string, data: Buffer): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(keys: string[]): Promise<void>;
}

export class TooLargeError extends Error {
  constructor() {
    super('Upload is larger than allowed');
  }
}

const KEY_RE = /^[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*(\.[a-z0-9]+)?$/;

class DiskStorage implements Storage {
  readonly viaApp = true;
  constructor(private root: string) {}

  /** Keys are built by the server, but check them anyway so nothing can escape the folder. */
  private path(key: string): string {
    if (!KEY_RE.test(key)) throw new Error(`Invalid storage key: ${key}`);
    const p = resolve(this.root, key);
    if (!p.startsWith(this.root + sep)) throw new Error(`Invalid storage key: ${key}`);
    return p;
  }

  async uploadTarget({ id, contentType }: { id: string; contentType: string }): Promise<UploadTarget> {
    return { url: `/api/uploads/${id}/file`, method: 'PUT', headers: { 'content-type': contentType } };
  }

  async putStream(key: string, body: ReadableStream<Uint8Array>, maxBytes: number): Promise<number> {
    const final = this.path(key);
    const part = `${final}.${randomBytes(4).toString('hex')}.part`;
    await mkdir(dirname(final), { recursive: true });
    // Read the request with a plain reader (not Readable.fromWeb) so that
    // stopping early can never leave an unhandled stream error behind.
    const reader = body.getReader();
    const out = createWriteStream(part);
    let failed: Error | null = null;
    out.on('error', (err) => {
      failed = err;
    });
    let written = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        written += value.byteLength;
        if (written > maxBytes) throw new TooLargeError();
        if (failed) throw failed;
        if (!out.write(value)) await once(out, 'drain');
      }
      await new Promise<void>((resolveEnd, rejectEnd) => {
        out.once('error', rejectEnd);
        out.end(() => resolveEnd());
      });
      if (failed) throw failed;
      await rename(part, final);
      return written;
    } catch (err) {
      out.destroy();
      await reader.cancel().catch(() => {});
      await rm(part, { force: true });
      throw err;
    }
  }

  async put(key: string, data: Buffer): Promise<void> {
    const p = this.path(key);
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, data);
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await readFile(this.path(key));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }

  async delete(keys: string[]): Promise<void> {
    await Promise.all(keys.map((k) => rm(this.path(k), { force: true })));
  }
}

let storage: Storage | undefined;

export function getStorage(): Storage {
  // The uploads folder is runtime data, not source: keep the bundler from tracing it into the build.
  storage ??= new DiskStorage(resolve(/*turbopackIgnore: true*/ process.env.UPLOADS_DIR || 'uploads'));
  return storage;
}
