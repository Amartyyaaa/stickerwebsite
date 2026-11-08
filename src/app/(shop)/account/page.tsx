import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Art } from '@/components/art';
import { AddressBook } from '@/components/account/address-book';
import { SignInPanel, SignOutButton } from '@/components/account/sign-in-panel';
import { HeartIcon, PinIcon } from '@/components/icons';
import { StatusChip } from '@/components/orders/order-parts';
import { googleEnabled } from '@/lib/auth';
import { formatDate } from '@/lib/dates';
import { formatINR } from '@/lib/money';
import { listAddresses } from '@/lib/orders/addresses';
import { listOrdersForViewer } from '@/lib/orders/service';
import { getViewer } from '@/lib/viewer';

export const metadata: Metadata = { title: 'Your account', robots: { index: false } };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Only allow returning to a page on this site. */
const safeNext = (v: string | undefined) => (v && v.startsWith('/') && !v.startsWith('//') ? v : '/account');

async function AccountContent({ searchParams }: { searchParams: PageProps<'/account'>['searchParams'] }) {
  const [sp, viewer] = await Promise.all([searchParams, getViewer()]);
  if (!viewer) {
    return (
      <div className="py-4">
        <SignInPanel googleEnabled={googleEnabled} next={safeNext(first(sp.next))} />
      </div>
    );
  }
  const [orders, addresses] = await Promise.all([listOrdersForViewer(viewer), listAddresses(viewer.id)]);
  return (
    <div className="grid gap-12">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-6">
        <p className="text-muted">
          Signed in as <b className="text-ink">{viewer.email}</b>
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/wishlist" className="btn btn-ghost btn-sm">
            <HeartIcon size={16} /> Wishlist
          </Link>
          <Link href="/track" className="btn btn-ghost btn-sm">
            <PinIcon size={16} /> Track an order
          </Link>
          <SignOutButton />
        </div>
      </div>

      <section aria-labelledby="orders-title">
        <h2 id="orders-title" className="section-title mb-5">
          Your orders
        </h2>
        {orders.length === 0 ? (
          <p className="text-muted">
            No orders yet.{' '}
            <Link href="/shop" className="font-semibold text-lime underline underline-offset-2">
              Find something you love
            </Link>
            .
          </p>
        ) : (
          <ul className="grid gap-3">
            {orders.map((o) => (
              <li key={o.number}>
                <Link href={`/order/${o.number}`} className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-card border border-line bg-surface p-4 transition hover:border-lime">
                  <span className="flex -space-x-3">
                    {o.thumbs.map((t, i) => (
                      <span key={i} className="size-12 rounded-[4px] border border-line bg-bg p-1 shadow-[0_0_0_2px_var(--color-surface)]">
                        <Art spec={t.art} image={t.image} idPrefix={`ac${o.number}${i}`} />
                      </span>
                    ))}
                  </span>
                  <span className="grid min-w-40 flex-1 gap-0.5">
                    <span className="font-display text-xl uppercase leading-none">{o.number}</span>
                    <span className="text-[13px] text-muted">
                      {formatDate(o.createdAt)} · {o.itemCount} item{o.itemCount === 1 ? '' : 's'}
                    </span>
                  </span>
                  <StatusChip status={o.status} />
                  <span className="min-w-20 text-right font-bold tabular-nums">{formatINR(o.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="addresses-title">
        <h2 id="addresses-title" className="section-title mb-5">
          Addresses
        </h2>
        <AddressBook addresses={addresses} />
      </section>
    </div>
  );
}

export default function AccountPage(props: PageProps<'/account'>) {
  return (
    <div className="wrap py-8 md:py-10">
      <header className="mb-8">
        <p className="eyebrow">Account</p>
        <h1 className="display mt-2 text-[clamp(38px,5.4vw,64px)]">Your account</h1>
      </header>
      <Suspense fallback={<div className="min-h-[50vh]" aria-busy="true" />}>
        <AccountContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
