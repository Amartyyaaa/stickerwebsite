/** Apply database migrations (creates ./data/printyourvibe.db on first run). */
import { migrate } from 'drizzle-orm/libsql/migrator';
import { DATABASE_URL, db } from '@/lib/db/client';

async function main() {
  await migrate(db, { migrationsFolder: 'drizzle' });
  console.log(`Migrations applied to ${DATABASE_URL.replace(/\?.*$/, '')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
