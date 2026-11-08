import { resolve } from 'node:path';

/**
 * Where the database lives. In development (and on a single server) it's a
 * SQLite file; set DATABASE_URL to use a hosted libSQL database instead.
 * Kept apart from the client so tools can find the file without opening it.
 */
export const DATABASE_URL = process.env.DATABASE_URL || 'file:./data/printyourvibe.db';
export const isLocalFile = DATABASE_URL.startsWith('file:');

/** The database file's full path, or null for a hosted database. */
export const databaseFile = (): string | null => (isLocalFile ? resolve(/*turbopackIgnore: true*/ DATABASE_URL.slice('file:'.length).split('?')[0]) : null);
