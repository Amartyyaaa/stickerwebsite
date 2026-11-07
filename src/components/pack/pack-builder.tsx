'use client';

import { useEffect, useMemo, useState } from 'react';
import { MinusIcon, PlusIcon } from '@/components/icons';
import { OptionPicker } from '@/components/pdp/option-picker';
import { ProductCard } from '@/components/product/product-card';
import type { OptionGroup, OptionValue, PriceProfile, ProductCard as Card } from '@/lib/catalog/types';
import { cn } from '@/lib/cn';
import { formatINR } from '@/lib/money';
import { defaultOptions, lineKey, optionLabels, packStatus, unitPrice, type Options } from '@/lib/pricing/engine';
import type { StoreSettings } from '@/lib/settings';
import { useCart } from '@/lib/store/cart';
import { useStoresHydrated } from '@/lib/store/hydration';

export interface PackType {
  id: string;
  name: string;
  options: OptionGroup[];
  price: PriceProfile;
}

/** A sticker's options in the pack: the shopper's size and finish where its type offers them, otherwise the type's defaults. */
export function packOptions(type: PackType, choice: Options): Options {
  const o = defaultOptions(type.options);
  for (const [k, v] of Object.entries(choice)) {
    if (type.options.find((g) => g.key === k)?.values.some((x) => x.value === v)) o[k] = v;
  }
  return o;
}

/** Size and finish choices for the whole pack: values the pack rules allow that at least one sticker type offers. */
function choiceGroups(types: PackType[], allowed: Record<string, string[]>): OptionGroup[] {
  return Object.entries(allowed)
    .map(([key, values]) => {
      const seen = new Map<string, OptionValue>();
      for (const t of types) for (const v of t.options.find((g) => g.key === key)?.values ?? []) if (values.includes(v.value) && !seen.has(v.value)) seen.set(v.value, v);
      const label = types.flatMap((t) => t.options).find((g) => g.key === key)?.label ?? key;
      return { key, label, values: values.map((v) => seen.get(v)).filter((v): v is OptionValue => Boolean(v)) };
    })
    .filter((g) => g.values.length > 1);
}

function PackCounter({ product, type, options }: { product: Card; type: PackType; options: Options }) {
  const hydrated = useStoresHydrated();
  const key = lineKey(product.id, options);
  const qty = useCart((s) => s.lines.find((l) => l.key === key)?.qty ?? 0);
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);
  const addOne = () =>
    add(
      {
        productId: product.id,
        typeId: product.typeId,
        slug: product.slug,
        name: product.name,
        typeName: product.typeName,
        art: product.art,
        image: product.image,
        options,
        optionLabels: optionLabels(type.options, options),
        unit: unitPrice(type.price, options),
      },
      { open: false },
    );
  const btn = 'grid size-9 place-items-center text-ink hover:text-lime';
  if (!hydrated || qty === 0) {
    return (
      <button
        type="button"
        onClick={addOne}
        className="inline-flex min-h-9 items-center gap-1 rounded-[2px] border border-line-2 px-2.5 text-[12px] font-bold uppercase tracking-[0.06em] transition hover:border-lime hover:text-lime"
        aria-label={`Add ${product.name} to your pack`}
      >
        <PlusIcon size={15} />
        <span className="max-sm:sr-only">Add</span>
      </button>
    );
  }
  return (
    <div className="inline-flex items-center rounded-[2px] border border-lime bg-lime/10 text-lime" role="group" aria-label={`${product.name} in your pack`}>
      <button type="button" className={btn} onClick={() => setQty(key, qty - 1)} aria-label={`Remove one ${product.name}`}>
        <MinusIcon size={15} />
      </button>
      <output className="min-w-5 text-center text-sm font-bold tabular-nums" aria-live="polite">
        {qty}
      </output>
      <button type="button" className={btn} onClick={addOne} aria-label={`Add another ${product.name}`}>
        <PlusIcon size={15} />
      </button>
    </div>
  );
}

function PackBar({ settings }: { settings: StoreSettings }) {
  const hydrated = useStoresHydrated();
  useEffect(() => {
    document.documentElement.classList.add('has-bottom-bar');
    return () => document.documentElement.classList.remove('has-bottom-bar');
  }, []);
  const lines = useCart((s) => s.lines);
  const setOpen = useCart((s) => s.setOpen);
  const st = packStatus(
    hydrated ? lines.flatMap((l) => (l.typeId && !l.custom ? [{ key: l.key, productId: l.productId, typeId: l.typeId, options: l.options, qty: l.qty, unit: l.unit }] : [])) : [],
    settings,
  );
  const first = [...settings.packs.tiers].sort((a, b) => a.qty - b.qty)[0];
  const goal = st.next ?? st.reached ?? first;
  const progress = st.next ? st.count / st.next.qty : 1;
  const more = st.next ? st.next.qty - st.count : 0;
  const text =
    st.count === 0
      ? `Add stickers to start your pack: ${first.qty} for ${formatINR(first.price)}.`
      : !st.reached
        ? `Add ${more} more for ${st.next!.qty} at ${formatINR(st.next!.price)}.`
        : st.next
          ? `Pack price unlocked: you save ${formatINR(st.saving)}. Add ${more} more for ${st.next.qty} at ${formatINR(st.next.price)}.`
          : `Biggest pack unlocked: you save ${formatINR(st.saving)}.`;
  return (
    <div className="sticky bottom-[calc(66px+env(safe-area-inset-bottom,0px))] z-30 mt-6 md:bottom-4">
      <div className={cn('flex items-center gap-4 rounded-card border bg-surface/95 p-3.5 shadow-[0_18px_40px_rgb(0_0_0/0.55)] backdrop-blur sm:p-4', st.reached ? 'border-lime shadow-glow' : 'border-line-2')}>
        <p className="shrink-0 font-display text-[34px] leading-none tabular-nums" aria-hidden="true">
          <span className={st.reached ? 'text-lime' : undefined}>{st.count}</span>
          <span className="text-xl text-muted"> / {goal.qty}</span>
        </p>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold leading-snug" aria-live="polite">
            <span className="sr-only">
              {st.count} sticker{st.count === 1 ? '' : 's'} in your pack.{' '}
            </span>
            {text}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
            <div className="h-full rounded-full bg-lime transition-all" style={{ width: `${Math.round(Math.min(1, progress) * 100)}%` }} />
          </div>
        </div>
        <button type="button" className="btn btn-primary btn-sm shrink-0 max-sm:px-4" onClick={() => setOpen(true)}>
          View cart
        </button>
      </div>
    </div>
  );
}

/** The pack page's grid: pick a size and finish, add stickers with counters, and watch the pack bar fill up. */
export function PackBuilder({ products, types, settings }: { products: Card[]; types: PackType[]; settings: StoreSettings }) {
  const groups = useMemo(() => choiceGroups(types, settings.packs.options), [types, settings.packs.options]);
  const [choice, setChoice] = useState<Options>(() => Object.fromEntries(groups.map((g) => [g.key, g.values.find((v) => v.value === 'S')?.value ?? g.values[0].value])));
  const byType = new Map(types.map((t) => [t.id, t]));
  return (
    <div>
      {groups.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-x-8 gap-y-4">
          {groups.map((g) => (
            <OptionPicker key={g.key} group={g} value={choice[g.key]} onChange={(v) => setChoice((c) => ({ ...c, [g.key]: v }))} idPrefix="pack" />
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => {
          const type = byType.get(p.typeId);
          if (!type) return null;
          const options = packOptions(type, choice);
          return (
            <ProductCard
              key={p.id}
              product={p}
              idPrefix="pack"
              price={
                <p className="min-w-0 text-[12px] font-semibold leading-tight text-muted">
                  <span className="font-bold text-lime tabular-nums">{formatINR(unitPrice(type.price, options))}</span>
                  <span className="block truncate">{optionLabels(type.options, options).join(' · ')}</span>
                </p>
              }
              action={<PackCounter product={p} type={type} options={options} />}
            />
          );
        })}
      </div>
      <PackBar settings={settings} />
    </div>
  );
}
