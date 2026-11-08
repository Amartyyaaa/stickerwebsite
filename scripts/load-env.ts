/**
 * Load .env files the same way Next.js does, so `npm run maintenance` and the
 * other commands see the same settings as the website. Import this first.
 * On a server (where .env.production exists) the production files are used.
 */
import { existsSync } from 'node:fs';
import { loadEnvConfig } from '@next/env';

const production = process.env.NODE_ENV ? process.env.NODE_ENV === 'production' : existsSync('.env.production');
loadEnvConfig(process.cwd(), !production, { info: () => {}, error: console.error });
