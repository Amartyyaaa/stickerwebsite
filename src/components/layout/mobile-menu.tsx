'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronIcon, CloseIcon, MenuIcon } from '@/components/icons';
import { trapTab } from '@/lib/focus-trap';
import { Logo } from './logo';

export interface MenuGroup {
  id: string;
  name: string;
  links: Array<{ href: string; label: string }>;
}

export function MobileMenu({ groups, className }: { groups: MenuGroup[]; className?: string }) {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => (e.key === 'Escape' ? setOpen(false) : trapTab(e, panelRef.current));
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const trigger = openRef.current;
    const panel = panelRef.current;
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      // Back to the menu button, unless a link took the visitor to another page (then the new page decides).
      if (!document.activeElement || document.activeElement === document.body || panel?.contains(document.activeElement)) trigger?.focus();
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <button ref={openRef} type="button" onClick={() => setOpen(true)} className={className} aria-label="Open menu" aria-expanded={open}>
        <MenuIcon />
      </button>
      {/* Rendered into <body>: the header's blur effect would otherwise shrink this full-screen menu to the header's height. */}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Menu">
            <button type="button" className="absolute inset-0 bg-black/60" onClick={close} aria-label="Close menu" tabIndex={-1} />
            <nav ref={panelRef} className="absolute inset-y-0 left-0 flex w-[min(86%,360px)] flex-col overflow-y-auto border-r border-line bg-bg pb-[calc(20px+env(safe-area-inset-bottom,0px))] pl-[max(18px,env(safe-area-inset-left,0px))] pr-[18px] pt-[calc(14px+env(safe-area-inset-top,0px))]">
              <div className="flex items-center justify-between pb-3">
                <Logo onClick={close} />
                <button ref={closeRef} type="button" onClick={close} className="grid size-10 place-items-center" aria-label="Close menu">
                  <CloseIcon />
                </button>
              </div>
              <ul className="border-t border-line">
                {groups.map((g) => {
                  const expanded = section === g.id;
                  return (
                    <li key={g.id} className="border-b border-line">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between py-3.5 text-left text-[15px] font-bold uppercase tracking-[0.06em]"
                        aria-expanded={expanded}
                        onClick={() => setSection(expanded ? null : g.id)}
                      >
                        {g.name}
                        <ChevronIcon size={18} className={expanded ? 'rotate-180 transition' : 'transition'} />
                      </button>
                      {expanded && (
                        <ul className="grid gap-0.5 pb-3">
                          {g.links.map((l) => (
                            <li key={l.href}>
                              <Link href={l.href} onClick={close} className="block py-1.5 text-[15px] text-muted hover:text-lime">
                                {l.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
              <ul className="mt-4 grid gap-2.5 text-[15px] font-semibold">
                <li>
                  <Link href="/custom/stickers" onClick={close} className="text-lime">
                    Custom studio
                  </Link>
                </li>
                <li>
                  <Link href="/wishlist" onClick={close}>
                    Wishlist
                  </Link>
                </li>
                <li>
                  <Link href="/account" onClick={close}>
                    Your account
                  </Link>
                </li>
                <li>
                  <Link href="/track" onClick={close}>
                    Track your order
                  </Link>
                </li>
                <li>
                  <Link href="/pages/shipping" onClick={close}>
                    Shipping &amp; delivery
                  </Link>
                </li>
                <li>
                  <Link href="/pages/faq" onClick={close}>
                    Help &amp; FAQ
                  </Link>
                </li>
                <li>
                  <Link href="/pages/contact" onClick={close}>
                    Contact us
                  </Link>
                </li>
              </ul>
            </nav>
          </div>,
          document.body,
        )}
    </>
  );
}
