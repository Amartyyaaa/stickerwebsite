import 'server-only';
import { sql } from 'drizzle-orm';
import { headers } from 'next/headers';
import { db } from '@/lib/db/client';

/**
 * Fixed-window rate limit kept in the database, so it holds across restarts
 * and server processes. Returns ok: false once `max` requests are used up in
 * the current window.
 */
export async function rateLimit(key: string, max: number, windowSec: number): Promise<{ ok: boolean; retryAfter: number }> {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % windowSec);
  const rows = await db.all<{ count: number }>(sql`
    INSERT INTO request_limits (key, window_start, count) VALUES (${key}, ${windowStart}, 1)
    ON CONFLICT(key) DO UPDATE SET
      count = CASE WHEN request_limits.window_start = excluded.window_start THEN request_limits.count + 1 ELSE 1 END,
      window_start = excluded.window_start
    RETURNING count`);
  return { ok: (rows[0]?.count ?? 1) <= max, retryAfter: windowStart + windowSec - now };
}

/** The visitor's IP address as reported by the hosting proxy (falls back to "local"). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get('x-forwarded-for')?.split(',')[0] || h.get('x-real-ip') || 'local').trim().slice(0, 64);
}
