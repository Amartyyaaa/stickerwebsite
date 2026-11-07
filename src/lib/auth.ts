import 'server-only';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { emailOTP } from 'better-auth/plugins/email-otp';
import { after } from 'next/server';
import { db } from '@/lib/db/client';
import * as s from '@/lib/db/schema';
import { sendMailSafely } from '@/lib/email/send';
import { otpEmail } from '@/lib/email/templates';

/**
 * Sign-in for shoppers: a 6-digit code by email, or Google when its keys are
 * set. Guests can still check out without an account.
 */
const google =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }
    : undefined;

export const googleEnabled = Boolean(google);

export const auth = betterAuth({
  appName: 'PrintYourVibe',
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || undefined,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema: { user: s.user, session: s.session, account: s.account, verification: s.verification, rateLimit: s.authRateLimit },
  }),
  socialProviders: google ? { google } : undefined,
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  rateLimit: {
    enabled: true,
    storage: 'database',
    window: 60,
    max: 100,
    customRules: {
      '/email-otp/send-verification-otp': { window: 60, max: 3 },
      '/sign-in/email-otp': { window: 60, max: 10 },
    },
  },
  telemetry: { enabled: false },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 300,
      allowedAttempts: 3,
      storeOTP: 'hashed',
      async sendVerificationOTP({ email, otp }) {
        // Sent after the response so how long sending takes can't hint whether an account exists.
        after(() => sendMailSafely({ to: email, ...otpEmail(otp) }));
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
