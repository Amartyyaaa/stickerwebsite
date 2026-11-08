/** Apply database migrations (creates ./data/printyourvibe.db on first run). */
import { migrate } from 'drizzle-orm/libsql/migrator';
import { DATABASE_URL, db, isLocalFile } from '@/lib/db/client';

async function main() {
  // Write-ahead logging lets pages keep reading while an order or an import is being saved. It's a
  // setting stored in the database file, so setting it once here is enough.
  if (isLocalFile) await db.$client.execute('PRAGMA journal_mode = WAL');
  await migrate(db, { migrationsFolder: 'drizzle' });
  console.log(`Migrations applied to ${DATABASE_URL.replace(/\?.*$/, '')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
