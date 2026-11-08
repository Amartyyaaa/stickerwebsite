import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { SignInPanel, SignOutButton } from '@/components/account/sign-in-panel';
import { AdminNav } from '@/components/admin/admin-nav';
import { Logo } from '@/components/layout/logo';
import { googleEnabled } from '@/lib/auth';
import { getViewer } from '@/lib/viewer';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · Admin · PrintYourVibe' },
  robots: { index: false, follow: false },
};

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="wrap grid min-h-dvh content-center gap-6 py-10">
      <Logo className="justify-self-center" />
      {children}
    </main>
  );
}

/** Only emails on the ADMIN_EMAILS list get past this. */
async function AdminGate({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (!viewer) {
    return (
      <Frame>
        <p className="text-center text-muted">Store admin. Sign in with your admin email.</p>
        <SignInPanel googleEnabled={googleEnabled} />
      </Frame>
    );
  }
  if (!viewer.isAdmin) {
    return (
      <Frame>
        <div className="mx-auto grid max-w-md gap-4 rounded-card border border-line bg-surface p-6 text-center">
          <h1 className="font-display text-3xl uppercase">No access</h1>
          <p className="text-sm text-muted">
            {viewer.email} isn’t a store admin. Admin emails are listed in the ADMIN_EMAILS setting on the server.
          </p>
          <div className="flex justify-center gap-2">
            <Link href="/" className="btn btn-ghost btn-sm">
              Go to the store
            </Link>
            <SignOutButton />
          </div>
        </div>
      </Frame>
    );
  }
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="sticky top-0 z-30 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur print:hidden lg:h-dvh lg:border-b-0 lg:border-r lg:px-4 lg:py-6">
        <div className="mb-3 flex items-center justify-between gap-3 lg:mb-6 lg:block">
          <Logo />
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-lime lg:mt-1">Admin</p>
        </div>
        <AdminNav />
        <div className="mt-6 hidden gap-2 border-t border-line pt-4 text-[13px] text-muted lg:grid">
          <span className="truncate" title={viewer.email}>
            {viewer.email}
          </span>
          <Link href="/" className="hover:text-ink">
            View the store ↗
          </Link>
          <SignOutButton />
        </div>
      </aside>
      <main id="main" className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 print:p-0">
        {children}
      </main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>
      <AdminGate>{children}</AdminGate>
    </Suspense>
  );
}
