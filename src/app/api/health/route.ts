import { readFileSync } from 'node:fs';
import { access, constants, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { sql } from 'drizzle-orm';
import { connection } from 'next/server';
import { db } from '@/lib/db/client';
import { uploadsRoot, usesBlobStorage } from '@/lib/storage';

let release: string | undefined;

/** Which release is running: the deploy script writes a RELEASE file into each release folder. */
function currentRelease(): string {
  if (release === undefined) {
    try {
      release = readFileSync(resolve(/*turbopackIgnore: true*/ process.cwd(), 'RELEASE'), 'utf8').trim();
    } catch {
      release = 'local';
    }
  }
  return release;
}

/** For uptime monitors and the deploy script: is the database reachable, and can photos be stored? */
export async function GET() {
  await connection();
  const checks = { database: false, uploads: false };
  try {
    await db.run(sql`SELECT 1`);
    checks.database = true;
  } catch (err) {
    console.error('[health] database', err);
  }
  if (usesBlobStorage()) {
    // Photos live on Vercel Blob, which looks after itself; its token being set is what matters here.
    checks.uploads = true;
  } else {
    try {
      const root = uploadsRoot();
      await mkdir(root, { recursive: true });
      await access(root, constants.W_OK);
      checks.uploads = true;
    } catch (err) {
      console.error('[health] uploads', err);
    }
  }
  const ok = checks.database && checks.uploads;
  return Response.json({ ok, ...checks, release: currentRelease() }, { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}
