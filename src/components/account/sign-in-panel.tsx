'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { described, Field, inputClass } from '@/components/checkout/fields';
import { authClient } from '@/lib/auth-client';

type AuthError = { code?: string; message?: string; status?: number } | null | undefined;

function friendly(err: AuthError, fallback: string): string {
  if (!err) return fallback;
  if (err.status === 429) return 'Too many tries. Please wait a minute and try again.';
  const code = err.code ?? '';
  if (code.includes('INVALID_OTP')) return 'That code isn’t right. Check the email and try again.';
  if (code.includes('OTP_EXPIRED')) return 'That code has expired. Send a new one.';
  if (code.includes('TOO_MANY_ATTEMPTS')) return 'Too many wrong codes. Send a new one.';
  if (code.includes('INVALID_EMAIL')) return 'Enter an email like name@example.com.';
  return err.message || fallback;
}

/** Sign in with a 6-digit code sent by email, or with Google when it's set up. Without `next`, the shopper stays on the page they're on. */
/**
 * `emailCodes: false` hides sign-in by email code (for shoppers while the store can't send email yet), leaving Google.
 * `codeNote` tells an admin where to find the code while nothing is emailed.
 */
export function SignInPanel({ googleEnabled, next, emailCodes = true, codeNote }: { googleEnabled: boolean; next?: string; emailCodes?: boolean; codeNote?: string }) {
  const router = useRouter();
  const target = () => next ?? `${window.location.pathname}${window.location.search}`;
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const send = async () => {
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return setError('Enter an email like name@example.com.');
    setBusy(true);
    setError(null);
    const { error: err } = await authClient.emailOtp.sendVerificationOtp({ email: clean, type: 'sign-in' });
    setBusy(false);
    if (err) return setError(friendly(err, 'We couldn’t send a code. Please try again.'));
    setEmail(clean);
    setStep('code');
    setOtp('');
    setWait(30);
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(otp)) return setError('Enter the 6-digit code from the email.');
    setBusy(true);
    setError(null);
    const { error: err } = await authClient.signIn.emailOtp({ email, otp });
    if (err) {
      setBusy(false);
      return setError(friendly(err, 'We couldn’t sign you in. Please try again.'));
    }
    router.replace(target());
    router.refresh();
  };

  return (
    <div className="mx-auto grid w-full max-w-md gap-5 rounded-card border border-line bg-surface p-5 sm:p-7">
      <div>
        <h2 className="font-display text-3xl uppercase">Sign in</h2>
        <p className="mt-1 text-sm text-muted">
          {emailCodes ? 'No password needed. We’ll email you a 6-digit code. New here? The same code creates your account.' : 'Use your Google account. New here? It creates your account.'}
        </p>
        {emailCodes && codeNote && <p className="mt-2 rounded-[3px] border border-orange/50 bg-orange/10 px-3 py-2 text-[13px] font-semibold text-orange">{codeNote}</p>}
      </div>
      {!emailCodes ? null : step === 'email' ? (
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          noValidate
        >
          <Field id="signin-email" label="Email" error={error ?? undefined}>
            <input
              id="signin-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass(error ?? undefined)}
              {...described('signin-email', error ?? undefined)}
            />
          </Field>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Sending…' : 'Email me a code'}
          </button>
        </form>
      ) : (
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void verify();
          }}
          noValidate
        >
          <p className="text-sm">
            We sent a code to <b>{email}</b>.{' '}
            <button type="button" className="font-semibold text-lime underline underline-offset-2" onClick={() => setStep('email')}>
              Change email
            </button>
          </p>
          <Field id="signin-code" label="6-digit code" error={error ?? undefined}>
            <input
              id="signin-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className={`${inputClass(error ?? undefined)} text-center text-2xl tracking-[0.5em]`}
              autoFocus
              {...described('signin-code', error ?? undefined)}
            />
          </Field>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <button type="button" className="text-sm font-semibold text-muted underline underline-offset-2 disabled:no-underline disabled:opacity-60" disabled={wait > 0 || busy} onClick={() => void send()}>
            {wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}
          </button>
        </form>
      )}
      {googleEnabled && (
        <>
          {emailCodes && (
            <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.1em] text-muted" aria-hidden="true">
              <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
            </div>
          )}
          <button type="button" className="btn btn-ghost" onClick={() => void authClient.signIn.social({ provider: 'google', callbackURL: target() })}>
            Continue with Google
          </button>
        </>
      )}
      <p className="text-center text-[13px] text-muted">
        Just want to check an order?{' '}
        <Link href="/track" className="font-semibold text-lime underline underline-offset-2">
          Track it here
        </Link>
      </p>
    </div>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await authClient.signOut();
        router.replace('/account');
        router.refresh();
      }}
    >
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
