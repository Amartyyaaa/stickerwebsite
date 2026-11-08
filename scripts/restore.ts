/**
 * Bring back the database and photos from the backup bucket.
 * Stop the store first (sudo systemctl stop printyourvibe), then:
 *
 *   npm run restore                        the latest backup, into an empty server
 *   npm run restore -- --force             replace the current database (it's kept as a copy)
 *   npm run restore -- --from 2026-11-01   the last backup from that day or earlier
 *   npm run restore -- --photos-only       only download missing photos
 */
import './load-env';
import { runRestore } from '@/lib/backup/restore';

const args = process.argv.slice(2);
const fromAt = args.indexOf('--from');
const from = fromAt >= 0 ? args[fromAt + 1] : undefined;
if (from !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(from)) {
  console.error('Use --from with a date like 2026-11-01.');
  process.exit(1);
}

runRestore({ from, force: args.includes('--force'), photosOnly: args.includes('--photos-only') })
  .then(() => console.log('Restore done. Start the store again: sudo systemctl start printyourvibe'))
  .catch((err) => {
    console.error(`Restore stopped: ${(err as Error).message}`);
    process.exit(1);
  });
