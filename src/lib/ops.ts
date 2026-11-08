import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { settings } from '@/lib/db/schema';

/**
 * When the daily jobs last ran, for the admin dashboard. Stored in the
 * settings table under the key "ops". Times are Unix seconds.
 */

export interface OpsRun {
  at: number;
  ok: boolean;
  message: string;
}

export interface BackupRun extends OpsRun {
  /** The database snapshot's key in the bucket. */
  snapshot?: string;
  /** Photos copied this time, and in the bucket in all. */
  copied?: number;
  stored?: number;
  /** True when the copy stayed on this server because Cloudflare R2 isn't set up. */
  local?: boolean;
}

export interface OpsStatus {
  maintenance?: OpsRun;
  backup?: BackupRun;
}

export async function getOps(): Promise<OpsStatus> {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, 'ops') });
  return (row?.value as OpsStatus | undefined) ?? {};
}

export async function recordOps<K extends keyof OpsStatus>(kind: K, run: NonNullable<OpsStatus[K]>): Promise<void> {
  const next = { ...(await getOps()), [kind]: run };
  await db.insert(settings).values({ key: 'ops', value: next }).onConflictDoUpdate({ target: settings.key, set: { value: next } });
}
