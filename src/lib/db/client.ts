import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from './schema';

/**
 * In development the database is a single local SQLite file. In production
 * set DATABASE_URL (and DATABASE_AUTH_TOKEN) to a Turso / libSQL database.
 */
export const DATABASE_URL = process.env.DATABASE_URL || 'file:./data/printyourvibe.db';

type DB = LibSQLDatabase<typeof schema> & { $client: Client };

const globalForDb = globalThis as unknown as { __pyvDb?: DB };

function connect(): DB {
  if (DATABASE_URL.startsWith('file:')) mkdirSync(dirname(DATABASE_URL.slice('file:'.length).split('?')[0]), { recursive: true });
  const client = createClient({ url: DATABASE_URL, authToken: process.env.DATABASE_AUTH_TOKEN });
  return drizzle(client, { schema });
}

export const db: DB = globalForDb.__pyvDb ?? connect();
if (process.env.NODE_ENV !== 'production') globalForDb.__pyvDb = db;
