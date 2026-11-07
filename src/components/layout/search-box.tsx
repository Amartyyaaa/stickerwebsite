'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { Art } from '@/components/art';
import { SearchIcon, TrendIcon } from '@/components/icons';
import type { ProductCard } from '@/lib/catalog/types';
import { cn } from '@/lib/cn';
import { formatINR } from '@/lib/money';

interface Suggestions {
  products: ProductCard[];
  types: Array<{ id: string; name: string }>;
  vibes: Array<{ id: string; name: string }>;
}

const POPULAR = ['f1 posters', 'anime stickers', 'polaroids', '3d motion stickers', 'framed posters', 'desi vibes'];

export function SearchBox({ className, defaultValue = '' }: { className?: string; defaultValue?: string }) {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<{ term: string; data: Suggestions | null } | null>(null);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: Suggestions | null) => {
          setResult({ term, data: d });
          setActive(-1);
        })
        .catch(() => {});
    }, 140);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const term = q.trim();
  const data = result && result.term === term ? result.data : null;
  const ready = Boolean(result && result.term === term);
  const products = term.length >= 2 ? (data?.products ?? []) : [];
  const links: Array<{ href: string; label: string }> = [
    ...(term.length >= 2 ? (data?.types ?? []).map((t) => ({ href: `/c/${t.id}`, label: t.name })) : []),
    ...(term.length >= 2 ? (data?.vibes ?? []).map((v) => ({ href: `/v/${v.id}`, label: v.name })) : []),
  ];
  const items = [...products.map((p) => `/p/${p.slug}`), ...links.map((l) => l.href)];

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <form
      ref={boxRef}
      action="/search"
      role="search"
      className={cn('relative', className)}
      onSubmit={(e) => {
        e.preventDefault();
        if (active >= 0 && items[active]) return go(items[active]);
        if (term) go(`/search?q=${encodeURIComponent(term)}`);
      }}
    >
      <label className="flex min-h-11 items-center gap-2 rounded-[2px] border border-line bg-surface px-3.5 focus-within:border-lime focus-within:shadow-[0_0_0_3px_rgb(198_255_61/0.25)]">
        <SearchIcon size={18} className="shrink-0 text-muted" />
        <span className="sr-only">Search the store</span>
        <input
          type="search"
          name="q"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setOpen(true);
              setActive((i) => Math.min(items.length - 1, i + 1));
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((i) => Math.max(-1, i - 1));
            }
          }}
          placeholder="Search posters, stickers, fandoms"
          autoComplete="off"
          enterKeyHint="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          className="w-full min-w-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
        />
      </label>

      {open && (
        <div id={listId} className="absolute inset-x-0 top-[calc(100%+8px)] z-50 max-h-[70vh] overflow-y-auto rounded-card border border-line-2 bg-surface p-2 shadow-2xl">
          {term.length < 2 ? (
            <>
              <p className="px-2 pb-1 pt-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-muted">Popular searches</p>
              {POPULAR.map((p) => (
                <button key={p} type="button" onClick={() => go(`/search?q=${encodeURIComponent(p)}`)} className="flex w-full items-center gap-2.5 rounded-[3px] px-2 py-2 text-left text-[15px] hover:bg-surface-2">
                  <TrendIcon size={16} className="text-muted" />
                  {p}
                </button>
              ))}
            </>
          ) : (
            <>
              {products.length === 0 && links.length === 0 && <p className="px-2 py-3 text-sm text-muted">{ready ? `No matches for “${term}” yet.` : 'Searching…'}</p>}
              {products.map((p, i) => (
                <Link
                  key={p.id}
                  href={`/p/${p.slug}`}
                  onClick={() => setOpen(false)}
                  className={cn('flex items-center gap-3 rounded-[3px] px-2 py-1.5 hover:bg-surface-2', active === i && 'bg-surface-2')}
                >
                  <span className="size-11 shrink-0 rounded-[3px] bg-bg p-1">
                    <Art spec={p.art} image={p.image} idPrefix="sg" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-[15px] uppercase">{p.name}</span>
                    <span className="block text-xs text-muted">{p.typeName}</span>
                  </span>
                  <span className="text-sm font-bold text-lime tabular-nums">{formatINR(p.priceFrom)}</span>
                </Link>
              ))}
              {links.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-2 border-t border-line px-2 pb-1 pt-3">
                  {links.map((l, j) => (
                    <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className={cn('chip', active === products.length + j && 'is-on')}>
                      {l.label}
                    </Link>
                  ))}
                </div>
              )}
              <Link href={`/search?q=${encodeURIComponent(term)}`} onClick={() => setOpen(false)} className="mt-1 block rounded-[3px] px-2 py-2.5 text-sm font-bold uppercase tracking-[0.06em] text-lime hover:bg-surface-2">
                See all results for “{term}”
              </Link>
            </>
          )}
        </div>
      )}
    </form>
  );
}
