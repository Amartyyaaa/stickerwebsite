/**
 * Daily housekeeping. Run it once a day on the server (for example with cron):
 *
 *   npm run maintenance
 *
 * - cancels online orders that were never paid within 24 hours
 * - deletes custom-studio uploads that never became part of an order (after 7 days)
 * - deletes product photos that no product or order uses (after 7 days)
 * - clears old rate-limit counters
 * - deletes emails saved in the outbox (when email sending isn't set up) after 14 days
 */
import './load-env';
import { lt } from 'drizzle-orm';
import { deleteUnusedProductPhotos } from '@/lib/admin/products';
import { db } from '@/lib/db/client';
import { deleteOldOutboxMail } from '@/lib/email/send';
import { requestLimits } from '@/lib/db/schema';
import { recordOps } from '@/lib/ops';
import { cancelUnpaidOrders } from '@/lib/orders/service';
import { deleteUnorderedUploads, deleteUpload } from '@/lib/uploads';

const DAY = 86400;

async function run(): Promise<string> {
  const cancelled = await cancelUnpaidOrders(DAY);
  const uploads = await deleteUnorderedUploads(7 * DAY);
  const photos = await deleteUnusedProductPhotos(7 * DAY, deleteUpload);
  const limits = await db
    .delete(requestLimits)
    .where(lt(requestLimits.windowStart, Math.floor(Date.now() / 1000) - DAY))
    .returning({ key: requestLimits.key });
  const mails = await deleteOldOutboxMail(14 * DAY);
  return `cancelled ${cancelled} unpaid order(s), deleted ${uploads} unused upload(s) and ${photos} unused product photo(s), cleared ${limits.length} old rate-limit counter(s)${mails ? ` and ${mails} old saved email(s)` : ''}`;
}

async function main() {
  const at = Math.floor(Date.now() / 1000);
  try {
    const message = await run();
    await recordOps('maintenance', { at, ok: true, message });
    console.log(`Maintenance: ${message}.`);
  } catch (err) {
    await recordOps('maintenance', { at, ok: false, message: (err as Error).message }).catch(() => {});
    throw err;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
