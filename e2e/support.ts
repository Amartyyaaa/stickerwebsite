import { createClient, type InArgs, type Row } from '@libsql/client';
import { expect, type Page } from '@playwright/test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { E2E } from './env';

export const B = E2E.baseURL;
export const IMG = E2E.images;
export const OWNER = E2E.owner;

/** The test store's database, for checking what a step saved. */
export const db = createClient({ url: `file:${E2E.database}`, timeout: 5000 });

// libsql rows are loosely typed; the tests read known columns, so a loose row type keeps them short.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Row & Record<string, any>;
export const one = async (sql: string, args: InArgs = []) => (await db.execute({ sql, args })).rows[0] as AnyRow | undefined;
export const all = async (sql: string, args: InArgs = []) => (await db.execute({ sql, args })).rows as AnyRow[];

/** A short tag that keeps names and emails from one run apart from the next. */
export const runTag = () => Date.now().toString().slice(-6);

/**
 * Records a named check without stopping the test, like a checklist: every check runs,
 * and the test fails at the end if any of them failed, listing which.
 */
export const check = (name: string, ok: unknown, detail = '') => expect.soft(Boolean(ok), detail ? `${name} — ${detail}` : name).toBe(true);

/** Collects script errors from pages, so a test can assert there were none. */
export function watchErrors(page: Page, errors: string[], who = 'page') {
  page.on('pageerror', (e) => errors.push(`${who} pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text())) errors.push(`${who} console: ${m.text().slice(0, 300)}`);
  });
}

/** Opens a page and waits until it's interactive (the app marks <html data-ready> after hydrating). */
export async function nav(page: Page, url: string) {
  await page.goto(url.startsWith('http') ? url : `${B}${url}`, { waitUntil: 'load' });
  await page.waitForSelector('html[data-ready]', { timeout: 20000 });
}

export interface Mail {
  to: string;
  subject: string;
  text: string;
  at: string;
}

/** Emails the test store "sent" (saved to its outbox), to one address, oldest first. */
export function mails(to: string): Mail[] {
  if (!existsSync(E2E.outbox)) return [];
  const read = (f: string): Mail | null => {
    try {
      return JSON.parse(readFileSync(`${E2E.outbox}/${f}`, 'utf8')) as Mail;
    } catch {
      return null; // still being written; the next look will find it
    }
  };
  return readdirSync(E2E.outbox)
    .filter((f) => f.endsWith('.json'))
    .map(read)
    .filter((m): m is Mail => m !== null && m.to === to)
    .sort((a, b) => a.at.localeCompare(b.at));
}

/** Retries `fn` until it returns something truthy, or the time runs out (then returns its last value). */
export async function waitFor<T>(fn: () => T | Promise<T>, ms = 10000): Promise<T> {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v || Date.now() > end) return v;
    await new Promise((r) => setTimeout(r, 250));
  }
}

/** Signs in with an emailed code, read from the test outbox. */
export async function signIn(page: Page, email: string, at: string) {
  const since = new Date().toISOString();
  await page.goto(`${B}${at}`, { waitUntil: 'load' });
  await page.fill('#signin-email', email);
  await page.click('button:has-text("Email me a code")');
  await page.waitForSelector('#signin-code');
  const m = await waitFor(() => mails(email).filter((x) => /sign-in code/.test(x.subject) && x.at >= since).pop());
  expect(m, `sign-in code emailed to ${email}`).toBeTruthy();
  await page.fill('#signin-code', m!.subject.match(/(\d{6})/)![1]);
  await page.click('button:has-text("Sign in")');
}

/** Clears sign-in and checkout rate limits, so tests that sign in or order a lot don't trip them. */
export async function clearRateLimits() {
  await db.execute('delete from auth_rate_limit');
  await db.execute('delete from request_limits');
}

/** How far the page scrolls sideways (0 means it fits the screen). */
export const sidewaysScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

/** The PYV-XXXXXX order number in the page address. */
export const orderNumberIn = (url: string) => url.match(/PYV-[A-Z0-9]{6}/)![0];
