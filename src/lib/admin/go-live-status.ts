import 'server-only';
import { sql } from 'drizzle-orm';
import { policyPlaceholders } from '@/content/pages';
import { bucketConfig } from '@/lib/backup/s3';
import { db } from '@/lib/db/client';
import { databaseFile } from '@/lib/db/url';
import { getOps } from '@/lib/ops';
import { siteUrl } from '@/lib/site';
import { currentSettings } from './settings';
import { goLiveChecklist, type GoLiveItem } from './go-live';

/** The go-live checklist with this server's real settings. Only says whether secrets are set, never what they are. */
export async function goLiveStatus(): Promise<GoLiveItem[]> {
  const [settings, ops, [counts]] = await Promise.all([
    currentSettings(),
    getOps(),
    db.all<{ demo: number | null; real: number | null }>(sql`SELECT sum(is_sample) AS demo, sum(CASE WHEN is_sample = 0 AND is_active = 1 THEN 1 ELSE 0 END) AS real FROM products`),
  ]);
  const e = process.env;
  return goLiveChecklist({
    env: {
      siteUrl: siteUrl(),
      authSecretLength: (e.BETTER_AUTH_SECRET ?? '').length,
      razorpayKeyId: e.RAZORPAY_KEY_ID ?? '',
      razorpaySecret: Boolean(e.RAZORPAY_KEY_SECRET),
      webhookSecret: Boolean(e.RAZORPAY_WEBHOOK_SECRET),
      paymentsMock: e.PAYMENTS_MOCK === '1',
      resendKey: Boolean(e.RESEND_API_KEY),
      mailFrom: e.MAIL_FROM ?? '',
      backups: Boolean(bucketConfig()),
      hostedDatabase: !databaseFile(),
    },
    settings,
    placeholders: policyPlaceholders(settings),
    demoProducts: counts?.demo ?? 0,
    realProducts: counts?.real ?? 0,
    ops,
    now: Math.floor(Date.now() / 1000),
  });
}
