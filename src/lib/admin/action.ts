import 'server-only';
import type { Viewer } from '@/lib/viewer';
import { NotAdminError, requireAdmin } from './guard';

export type Failure = { ok: false; error: string };

/** Run an admin server action: checks the visitor is an admin, and turns unexpected errors into a plain message. */
export async function asAdmin<T extends { ok: boolean }>(fn: (admin: Viewer) => Promise<T>): Promise<T | Failure> {
  try {
    return await fn(await requireAdmin());
  } catch (err) {
    if (err instanceof NotAdminError) return { ok: false, error: err.message };
    console.error('[admin]', err);
    return { ok: false, error: 'Something went wrong. Please try again.' };
  }
}
