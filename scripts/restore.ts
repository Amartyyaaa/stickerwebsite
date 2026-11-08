/**
 * Bring back the database (and photos) from a backup.
 * Stop the store first (sudo pyv restore does that for you), then:
 *
 *   npm run restore                        the latest backup in R2, into an empty server
 *   npm run restore -- --force             replace the current database (it's kept as a copy)
 *   npm run restore -- --from 2026-11-01   the last backup from that day or earlier
 *   npm run restore -- --photos-only       only download missing photos from R2
 *   npm run restore -- --local             the newest copy kept on this server (while R2 isn't set up)
 *   npm run restore -- --file <path>       a backup file, like one downloaded from the admin dashboard
 */
import './load-env';
import { runRestore } from '@/lib/backup/restore';

const args = process.argv.slice(2);
const valueOf = (flag: string) => {
  const at = args.indexOf(flag);
  return at >= 0 ? args[at + 1] : undefined;
};
const from = valueOf('--from');
if (args.includes('--from') && (!from || !/^\d{4}-\d{2}-\d{2}$/.test(from))) {
  console.error('Use --from with a date like 2026-11-01.');
  process.exit(1);
}
const file = valueOf('--file');
if (args.includes('--file') && (!file || file.startsWith('--'))) {
  console.error('Use --file with the path of a backup, like --file /home/ubuntu/printyourvibe-2026-11-08.sqlite.gz');
  process.exit(1);
}

runRestore({ from, file, local: args.includes('--local'), force: args.includes('--force'), photosOnly: args.includes('--photos-only') })
  .then(() => console.log('Restore done. Start the store again: sudo systemctl start printyourvibe'))
  .catch((err) => {
    console.error(`Restore stopped: ${(err as Error).message}`);
    process.exit(1);
  });
