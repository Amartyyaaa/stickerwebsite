import 'server-only';
import { mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { isLocalSite } from '@/lib/site';

/**
 * Sends email through Resend when RESEND_API_KEY is set. Without it (local
 * development) each email is saved as a JSON file in data/outbox so you can
 * read it, and a one-line summary is logged.
 */

export interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

/**
 * Whether emails reach people: a Resend key is set, or this is a local copy (where you read
 * the outbox yourself). Without it on the live site, shopper sign-in by email code is hidden,
 * and admin codes are read on the server with `sudo pyv code`.
 */
export const emailReady = () => Boolean(process.env.RESEND_API_KEY) || isLocalSite();

/**
 * On Vercel without an email service there's no lasting disk to save emails to, so they're only
 * noted in the log (Vercel dashboard → Logs). Admin sign-in codes are written there in full
 * (src/lib/auth.ts), the way `sudo pyv code` reads them on a server.
 */
export const mailToLogs = () => !process.env.RESEND_API_KEY && Boolean(process.env.VERCEL);

const outboxDir = () => resolve(/*turbopackIgnore: true*/ process.env.MAIL_OUTBOX_DIR || 'data/outbox');
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
let warned = false;

export async function sendMail(mail: Mail): Promise<void> {
  const from = process.env.MAIL_FROM || 'PrintYourVibe <orders@printyourvibe.in>';
  const key = process.env.RESEND_API_KEY;
  if (key) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, html: mail.html, text: mail.text, reply_to: mail.replyTo }),
    });
    if (!res.ok) throw new Error(`Email to ${mail.to} failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
    return;
  }
  if (mailToLogs()) {
    // No addresses here: the log only says that an email would have gone out.
    console.log(`[mail] Not sent (no email service set up yet): "${mail.subject}"`);
    return;
  }
  if (process.env.NODE_ENV === 'production' && !warned) {
    warned = true;
    console.warn('[mail] RESEND_API_KEY is not set, so emails are saved to the outbox folder instead of being sent.');
  }
  const dir = outboxDir();
  await mkdir(dir, { recursive: true });
  const file = join(dir, `${Date.now()}-${slug(mail.to)}-${slug(mail.subject)}.json`);
  // Written under another name, then renamed, so nothing (sudo pyv code, the tests) reads a half-written file.
  await writeFile(`${file}.part`, JSON.stringify({ from, at: new Date().toISOString(), ...mail }, null, 2));
  await rename(`${file}.part`, file);
  console.log(`[mail] "${mail.subject}" to ${mail.to} saved to the outbox`);
}

/**
 * Deletes emails saved in the outbox more than `maxAge` seconds ago: they hold customers'
 * addresses and sign-in codes. The nightly clean-up runs it. Returns how many it deleted.
 */
export async function deleteOldOutboxMail(maxAge: number): Promise<number> {
  const dir = outboxDir();
  const names = await readdir(dir).catch(() => [] as string[]);
  const cutoff = Date.now() - maxAge * 1000;
  let deleted = 0;
  for (const name of names) {
    // Saved emails are named <time in ms>-<to>-<subject>.json.
    const at = Number(name.split('-')[0]);
    if (!name.endsWith('.json') || !Number.isFinite(at) || at >= cutoff) continue;
    await rm(join(dir, name), { force: true });
    deleted++;
  }
  return deleted;
}

/** Send without letting a mail failure break the request; failures are logged. */
export function sendMailSafely(mail: Mail): Promise<void> {
  return sendMail(mail).catch((err: unknown) => console.error('[mail]', err));
}
