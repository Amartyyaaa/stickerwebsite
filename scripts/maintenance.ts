/**
 * Daily housekeeping. Run it once a day on the server (for example with cron):
 *
 *   npm run maintenance
 *
 * - cancels online orders that were never paid within 24 hours
 * - deletes custom-studio uploads that never became part of an order (after 7 days)
 * - clears old rate-limit counters
 */
import { lt } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { requestLimits } from '@/lib/db/schema';
import { cancelUnpaidOrders } from '@/lib/orders/service';
import { deleteUnorderedUploads } from '@/lib/uploads';

const DAY = 86400;

async function main() {
  const cancelled = await cancelUnpaidOrders(DAY);
  const uploads = await deleteUnorderedUploads(7 * DAY);
  const limits = await db
    .delete(requestLimits)
    .where(lt(requestLimits.windowStart, Math.floor(Date.now() / 1000) - DAY))
    .returning({ key: requestLimits.key });
  console.log(`Maintenance: cancelled ${cancelled} unpaid order(s), deleted ${uploads} unused upload(s), cleared ${limits.length} old rate-limit counter(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
