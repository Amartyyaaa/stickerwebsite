import { timingSafeEqual } from 'node:crypto';
import { connection } from 'next/server';
import { runMaintenance } from '@/lib/maintenance';

/**
 * The daily clean-up, for hosts with scheduled requests instead of a server timer: Vercel Cron
 * calls this every day (vercel.json) with "Authorization: Bearer <CRON_SECRET>". Without
 * CRON_SECRET set, or with the wrong one, it does nothing.
 */
export async function GET(request: Request) {
  await connection();
  const secret = process.env.CRON_SECRET;
  const given = Buffer.from(request.headers.get('authorization') ?? '');
  const wanted = Buffer.from(`Bearer ${secret}`);
  if (!secret || given.length !== wanted.length || !timingSafeEqual(given, wanted)) {
    return new Response('Not allowed.', { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  const message = await runMaintenance();
  return Response.json({ ok: true, message }, { headers: { 'Cache-Control': 'no-store' } });
}
