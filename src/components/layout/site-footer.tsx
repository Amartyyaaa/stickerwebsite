import Link from 'next/link';
import { GROUPS } from '@/lib/catalog/types';
import { Logo } from './logo';
import { NewsletterForm } from './newsletter-form';

const linkCls = 'text-[15px] text-muted hover:text-lime';

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-[#07070c] pb-20 md:pb-0">
      <div className="wrap grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-[15px] text-muted">Stickers, posters and polaroids for every fandom and mood, printed to order in India.</p>
          <NewsletterForm />
        </div>
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em]">Shop</p>
          <ul className="grid gap-2">
            {GROUPS.map((g) => (
              <li key={g.id}>
                <Link href={`/shop?group=${g.id}`} className={linkCls}>
                  {g.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/vibes" className={linkCls}>
                Fandoms &amp; vibes
              </Link>
            </li>
            <li>
              <Link href="/custom/stickers" className={linkCls}>
                Custom studio
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em]">Help</p>
          <ul className="grid gap-2">
            {[
              ['/track', 'Track your order'],
              ['/pages/shipping', 'Shipping & delivery'],
              ['/pages/returns', 'Returns & refunds'],
              ['/pages/faq', 'FAQ'],
              ['/pages/contact', 'Contact us'],
              ['/pages/about', 'About us'],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className={linkCls}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em]">We accept</p>
          <div className="flex flex-wrap gap-1.5">
            {['UPI', 'Cards', 'Netbanking', 'Wallets', 'Cash on Delivery'].map((m) => (
              <span key={m} className="rounded-[3px] border border-line-2 px-2 py-1 text-xs font-bold uppercase tracking-[0.05em]">
                {m}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted">Secure online payments by Razorpay.</p>
        </div>
      </div>
      <div className="wrap flex flex-wrap justify-between gap-x-6 gap-y-2 border-t border-line py-5 text-[13px] text-muted">
        <p>© PrintYourVibe. Made in India.</p>
        <p className="flex gap-4">
          <Link href="/pages/privacy" className="hover:text-lime">
            Privacy
          </Link>
          <Link href="/pages/terms" className="hover:text-lime">
            Terms
          </Link>
          <Link href="/pages/shipping" className="hover:text-lime">
            Shipping policy
          </Link>
        </p>
      </div>
    </footer>
  );
}
