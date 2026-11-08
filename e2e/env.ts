import { resolve } from 'node:path';

/**
 * The browser tests run against their own copy of the store: a separate database,
 * uploads folder and email outbox under `.e2e/`, so your local data is never touched.
 * (They do replace the production build in `.next`: run `npm run build` before `npm start`.)
 */
const root = resolve(__dirname, '..');
const dir = resolve(root, '.e2e');

export const E2E = {
  port: 3200,
  baseURL: 'http://localhost:3200',
  root,
  dir,
  database: resolve(dir, 'data/printyourvibe.db'),
  uploads: resolve(dir, 'uploads'),
  outbox: resolve(dir, 'outbox'),
  images: resolve(dir, 'images'),
  owner: 'owner@printyourvibe.test',
  webhookSecret: 'test_webhook_secret',
};

/** Settings for the test server and the scripts it runs. Test values only: never use these on the live site. */
export const serverEnv: Record<string, string> = {
  NODE_ENV: 'production',
  NEXT_PUBLIC_SITE_URL: E2E.baseURL,
  BETTER_AUTH_SECRET: 'e2e-only-secret-0123456789abcdef0123456789',
  DATABASE_URL: `file:${E2E.database}`,
  UPLOADS_DIR: E2E.uploads,
  MAIL_OUTBOX_DIR: E2E.outbox,
  PAYMENTS_MOCK: '1',
  RAZORPAY_WEBHOOK_SECRET: E2E.webhookSecret,
  ADMIN_EMAILS: E2E.owner,
  ORDER_ALERT_EMAIL: E2E.owner,
  // Keep real keys from a local .env out of the tests.
  RAZORPAY_KEY_ID: '',
  RAZORPAY_KEY_SECRET: '',
  RESEND_API_KEY: '',
  R2_ACCOUNT_ID: '',
  R2_ACCESS_KEY_ID: '',
  R2_SECRET_ACCESS_KEY: '',
  R2_BUCKET: '',
  GOOGLE_CLIENT_ID: '',
  GOOGLE_CLIENT_SECRET: '',
};
