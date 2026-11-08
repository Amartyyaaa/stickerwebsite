/**
 * Copy the database and new photos to the backup bucket (Cloudflare R2), or, until R2
 * is set up, keep a database copy on this server (data/backups, 14 days).
 * The server runs this every night; run it by hand any time:
 *
 *   npm run backup
 */
import './load-env';
import { runBackup } from '@/lib/backup/backup';
import { recordOps } from '@/lib/ops';

async function main() {
  const at = Math.floor(Date.now() / 1000);
  try {
    const r = await runBackup();
    const message =
      r.where === 'local'
        ? `${r.snapshot ? 'Database saved on this server only' : 'Database skipped'} (Cloudflare R2 isn’t set up)`
        : `${r.snapshot ? 'Database saved' : 'Database skipped'}; ${r.copied} new photo file(s), ${r.stored} in all`;
    await recordOps('backup', { at, ok: true, message, snapshot: r.snapshot ?? undefined, copied: r.copied, stored: r.stored, local: r.where === 'local' });
    console.log(`Backup done: ${message}.`);
  } catch (err) {
    const message = (err as Error).message;
    await recordOps('backup', { at, ok: false, message }).catch(() => {});
    console.error(`Backup failed: ${message}`);
    process.exit(1);
  }
}

main();
