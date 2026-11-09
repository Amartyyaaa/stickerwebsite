/** Apply database migrations (creates ./data/printyourvibe.db on first run). */
import './load-env';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { DATABASE_URL, db, isLocalFile } from '@/lib/db/client';

async function main() {
  // Write-ahead logging lets pages keep reading while an order or an import is being saved. It's a
  // setting stored in the database file, so setting it once here is enough.
  if (isLocalFile) await db.$client.execute('PRAGMA journal_mode = WAL');
  else await prepareSearchIndex();
  await migrate(db, { migrationsFolder: 'drizzle' });
  console.log(`Migrations applied to ${DATABASE_URL.replace(/\?.*$/, '')}`);
}

/**
 * Product search uses SQLite's FTS5 index. If a hosted database doesn't have FTS5, create a plain
 * table with the same columns first: the migration's CREATE VIRTUAL TABLE IF NOT EXISTS then
 * leaves it, and search uses a simple word match instead (src/lib/catalog/queries.ts).
 */
async function prepareSearchIndex() {
  const found = await db.$client.execute("SELECT 1 FROM sqlite_master WHERE name = 'products_fts'");
  if (found.rows.length) return;
  try {
    await db.$client.batch(['CREATE VIRTUAL TABLE IF NOT EXISTS temp.fts5_probe USING fts5(x)', 'DROP TABLE IF EXISTS temp.fts5_probe']);
  } catch {
    console.log('This database has no FTS5 full-text search, so product search uses a simpler word match.');
    await db.$client.execute('CREATE TABLE IF NOT EXISTS products_fts (rowid INTEGER PRIMARY KEY, name TEXT, tags TEXT, type_name TEXT, vibe_names TEXT)');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
