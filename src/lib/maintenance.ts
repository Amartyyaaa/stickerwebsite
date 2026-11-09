import 'server-only';
import { lt } from 'drizzle-orm';
import { deleteUnusedProductPhotos } from '@/lib/admin/products';
import { db } from '@/lib/db/client';
import { requestLimits } from '@/lib/db/schema';
import { deleteOldOutboxMail } from '@/lib/email/send';
import { recordOps } from '@/lib/ops';
import { cancelUnpaidOrders } from '@/lib/orders/service';
import { deleteUnorderedUploads, deleteUpload } from '@/lib/uploads';

const DAY = 86400;

/**
 * Daily housekeeping. On a server, a systemd timer runs it (npm run maintenance); on Vercel,
 * a daily cron job calls /api/cron/maintenance.
 * - cancels online orders that were never paid within 24 hours
 * - deletes custom-studio uploads that never became part of an order (after 7 days)
 * - deletes product photos that no product or order uses (after 7 days)
 * - clears old rate-limit counters
 * - deletes emails saved in the outbox (when email sending isn't set up) after 14 days
 * The result is recorded for the admin dashboard.
 */
export async function runMaintenance(): Promise<string> {
  const at = Math.floor(Date.now() / 1000);
  try {
    const cancelled = await cancelUnpaidOrders(DAY);
    const uploads = await deleteUnorderedUploads(7 * DAY);
    const photos = await deleteUnusedProductPhotos(7 * DAY, deleteUpload);
    const limits = await db.delete(requestLimits).where(lt(requestLimits.windowStart, at - DAY)).returning({ key: requestLimits.key });
    const mails = await deleteOldOutboxMail(14 * DAY);
    const message = `cancelled ${cancelled} unpaid order(s), deleted ${uploads} unused upload(s) and ${photos} unused product photo(s), cleared ${limits.length} old rate-limit counter(s)${mails ? ` and ${mails} old saved email(s)` : ''}`;
    await recordOps('maintenance', { at, ok: true, message });
    return message;
  } catch (err) {
    await recordOps('maintenance', { at, ok: false, message: (err as Error).message }).catch(() => {});
    throw err;
  }
}
