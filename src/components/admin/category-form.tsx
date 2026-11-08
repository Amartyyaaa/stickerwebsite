'use client';

import { useRouter } from 'next/navigation';
import { Fragment, useMemo, useState } from 'react';
import { moveCategoryAction, moveVibeAction, saveCategoryAction } from '@/actions/admin/catalog';
import { described, Field, inputClass, selectClass } from '@/components/checkout/fields';
import type { Category } from '@/lib/admin/categories';
import { byValues, fromPriceInput, pricedGroups, priceRows, toPriceInput, type PriceInput } from '@/lib/admin/price-table';
import type { OptionGroup } from '@/lib/catalog/types';
import { cn } from '@/lib/cn';
import { formatINR } from '@/lib/money';
import { priceRange, unitPrice } from '@/lib/pricing/engine';

const amountClass = 'min-h-10 w-[92px] rounded-[2px] border border-line-2 bg-bg px-2.5 text-right text-[14.5px] tabular-nums focus:border-lime focus:outline-none';

/** One option's prices: one box per choice, or a small grid when the price depends on another option (like a frame by size). */
function GroupPrices({ group, category, input, setAmount }: { group: OptionGroup; category: Category; input: PriceInput; setAmount: (value: string, by: string | null, v: string) => void }) {
  const rows = priceRows(category.options, category.price, group);
  const dependent = rows.find((r) => r.by);
  const cols = dependent ? byValues(category.options, category.price, group.key, dependent.value) : [];
  const byLabel: string = dependent ? (category.options.find((g) => g.key === dependent.by)?.label ?? dependent.by ?? '') : '';
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="border-collapse text-sm">
        <thead>
          <tr className="text-left text-[11.5px] font-bold uppercase tracking-[0.08em] text-muted">
            <th className="py-1.5 pr-4">{group.label}</th>
            {dependent ? (
              cols.map((c) => (
                <th key={c.value} className="px-1 py-1.5 text-right">
                  {c.label}
                </th>
              ))
            ) : (
              <th className="px-1 py-1.5 text-right">Extra ₹</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const sent = input.amounts[group.key]?.[r.value];
            return (
              <tr key={r.value} className="border-t border-line">
                <th scope="row" className="py-1.5 pr-4 text-left font-semibold">
                  {r.label}
                </th>
                {r.by ? (
                  cols.map((c) => (
                    <td key={c.value} className="px-1 py-1.5">
                      <input
                        inputMode="decimal"
                        aria-label={`${group.label} ${r.label} with ${byLabel} ${c.label}, extra in rupees`}
                        value={typeof sent === 'object' ? (sent[c.value] ?? '0') : '0'}
                        onChange={(e) => setAmount(r.value, c.value, e.target.value)}
                        className={amountClass}
                      />
                    </td>
                  ))
                ) : (
                  <td className="px-1 py-1.5" colSpan={dependent ? cols.length : 1}>
                    <span className="flex items-center gap-2">
                      <input
                        inputMode="decimal"
                        aria-label={`${group.label} ${r.label}, extra in rupees`}
                        value={typeof sent === 'string' ? sent : '0'}
                        onChange={(e) => setAmount(r.value, null, e.target.value)}
                        className={amountClass}
                      />
                      {dependent && <span className="text-xs text-muted">for every {byLabel.toLowerCase()}</span>}
                    </span>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function CategoryForm({ category }: { category: Category }) {
  const router = useRouter();
  const [name, setName] = useState(category.name);
  const [singular, setSingular] = useState(category.singular);
  const [description, setDescription] = useState(category.description);
  const [highlights, setHighlights] = useState(category.highlights.join('\n'));
  const [isActive, setIsActive] = useState(category.isActive);
  const [input, setInput] = useState<PriceInput>(() => toPriceInput(category.options, category.price));
  const [check, setCheck] = useState<Record<string, string>>(() => Object.fromEntries(category.options.map((g) => [g.key, g.values[0]?.value ?? ''])));
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const isCustom = category.groupId === 'custom';

  const priced = pricedGroups(category.options, category.price);
  const others = category.options.filter((g) => !priced.includes(g));
  const parsed = useMemo(() => fromPriceInput(category.options, category.price, input), [category, input]);
  const range = parsed.ok ? priceRange(parsed.price, category.options) : null;

  const dirty = () => status && setStatus(null);
  const setAmount = (group: string) => (value: string, by: string | null, v: string) => {
    dirty();
    setInput((cur) => {
      const row = { ...cur.amounts[group] };
      if (by === null) row[value] = v;
      else row[value] = { ...(row[value] as Record<string, string>), [by]: v };
      return { ...cur, amounts: { ...cur.amounts, [group]: row } };
    });
  };

  const save = async () => {
    setBusy(true);
    setStatus(null);
    const r = await saveCategoryAction({ id: category.id, name, singular, description, highlights: highlights.split('\n'), isActive, price: input });
    setBusy(false);
    if (!r.ok) return setStatus({ ok: false, text: r.error });
    setStatus({ ok: true, text: `Saved. ${category.products ? `Prices for ${category.products.toLocaleString('en-IN')} product${category.products === 1 ? '' : 's'} are updated in the store.` : 'The store shows the change now.'}` });
    router.refresh();
  };

  return (
    <form
      className="grid gap-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <section className="grid gap-4 rounded-card border border-line bg-surface p-4 sm:p-5">
        <h2 className="font-display text-xl uppercase">Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="cf-name" label="Name" hint="Shown in menus and on the category page, like Wall Posters.">
            <input id="cf-name" value={name} maxLength={60} onChange={(e) => (dirty(), setName(e.target.value))} className={inputClass()} {...described('cf-name', undefined, 'x')} />
          </Field>
          <Field id="cf-singular" label="One item" hint="Shown on cards and in the cart, like Wall poster.">
            <input id="cf-singular" value={singular} maxLength={60} onChange={(e) => (dirty(), setSingular(e.target.value))} className={inputClass()} {...described('cf-singular', undefined, 'x')} />
          </Field>
        </div>
        <Field id="cf-description" label="Description">
          <textarea id="cf-description" rows={2} maxLength={400} value={description} onChange={(e) => (dirty(), setDescription(e.target.value))} className={cn(inputClass(), 'py-2.5')} />
        </Field>
        <Field id="cf-highlights" label="Highlights" hint="One per line, up to 6. Shown as ticks on every product page of this type.">
          <textarea id="cf-highlights" rows={3} value={highlights} onChange={(e) => (dirty(), setHighlights(e.target.value))} className={cn(inputClass(), 'py-2.5')} {...described('cf-highlights', undefined, 'x')} />
        </Field>
        {isCustom ? (
          <p className="text-sm text-muted">This type powers a custom studio, so it’s always on.</p>
        ) : (
          <label className="flex items-start gap-3 text-[15px]">
            <input type="checkbox" checked={isActive} onChange={(e) => (dirty(), setIsActive(e.target.checked))} className="mt-1 size-4 accent-[var(--color-lime)]" />
            <span>
              <span className="font-semibold">Show in the store</span>
              <span className="block text-xs text-muted">Hiding a type takes it out of the menus and hides all its products, without changing each product.</span>
            </span>
          </label>
        )}
      </section>

      <section className="grid gap-5 rounded-card border border-line bg-surface p-4 sm:p-5" aria-labelledby="cf-prices">
        <div>
          <h2 id="cf-prices" className="font-display text-xl uppercase">
            Prices
          </h2>
          <p className="mt-1 max-w-[70ch] text-sm text-muted">
            A product costs the base price plus the extra for each choice. Extras can be 0, or negative for a cheaper choice. Products with their own starting price move by the same amounts.
          </p>
        </div>
        <Field id="cf-base" label="Base price (₹)" hint="The price with the first choice in every option.">
          <input
            id="cf-base"
            inputMode="decimal"
            value={input.base}
            onChange={(e) => {
              dirty();
              setInput((cur) => ({ ...cur, base: e.target.value }));
            }}
            className={cn(inputClass(), 'max-w-[160px] text-right tabular-nums')}
            {...described('cf-base', undefined, 'x')}
          />
        </Field>
        {priced.map((g) => (
          <GroupPrices key={g.key} group={g} category={category} input={input} setAmount={setAmount(g.key)} />
        ))}
        {others.map((g) => (
          <details key={g.key} className="rounded-[3px] border border-line p-3">
            <summary className="cursor-pointer text-sm font-semibold">
              {g.label}: every choice costs the same <span className="font-normal text-muted">(set different prices)</span>
            </summary>
            <div className="mt-3">
              <GroupPrices group={g} category={category} input={input} setAmount={setAmount(g.key)} />
            </div>
          </details>
        ))}

        <div className="grid gap-3 rounded-[3px] border border-line bg-bg p-3 sm:p-4" aria-live="polite">
          <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-muted">Price check</p>
          <div className="flex flex-wrap items-end gap-3">
            {category.options.map((g) => (
              <label key={g.key} className="grid gap-1 text-xs text-muted">
                {g.label}
                <select value={check[g.key]} onChange={(e) => setCheck((c) => ({ ...c, [g.key]: e.target.value }))} className={cn(selectClass(), 'min-h-10 text-sm')}>
                  {g.values.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <p className="font-display text-3xl text-lime tabular-nums">{parsed.ok ? formatINR(unitPrice(parsed.price, check)) : '—'}</p>
          </div>
          {parsed.ok && range ? (
            <p className="text-sm text-muted">
              Cheapest {formatINR(range.min)} · dearest {formatINR(range.max)}
            </p>
          ) : (
            !parsed.ok && <p className="text-sm font-semibold text-orange">{parsed.error}</p>
          )}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={busy || !parsed.ok}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
        <p className={cn('text-sm font-semibold', status?.ok ? 'text-lime' : 'text-red')} role="status">
          {status?.text}
        </p>
      </div>
    </form>
  );
}

/** Up and down buttons that reorder a product type or a vibe. */
export function MoveButtons({ id, label, kind, first, last }: { id: string; label: string; kind: 'category' | 'vibe'; first?: boolean; last?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const go = async (dir: -1 | 1) => {
    setBusy(true);
    await (kind === 'category' ? moveCategoryAction : moveVibeAction)({ id, dir });
    setBusy(false);
    router.refresh();
  };
  return (
    <span className="inline-flex gap-1">
      {([-1, 1] as const).map((dir) => (
        <Fragment key={dir}>
          <button type="button" disabled={busy || (dir < 0 ? first : last)} onClick={() => go(dir)} aria-label={`Move ${label} ${dir < 0 ? 'up' : 'down'}`} className="grid size-8 place-items-center rounded-[2px] border border-line text-muted hover:border-lime hover:text-lime disabled:opacity-40">
            {dir < 0 ? '↑' : '↓'}
          </button>
        </Fragment>
      ))}
    </span>
  );
}
