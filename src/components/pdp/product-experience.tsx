'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { CheckIcon, PinIcon, ShareIcon } from '@/components/icons';
import { QtyStepper } from '@/components/cart/cart-parts';
import { WishButton } from '@/components/product/wish-button';
import { galleryViews, renderGalleryView, type GalleryView } from '@/lib/art/render';
import { SHEEN_KINDS, type FrameColor } from '@/lib/art/types';
import type { OptionGroup, ProductDetail } from '@/lib/catalog/types';
import { cn } from '@/lib/cn';
import { deliveryWindow, formatDeliveryDate, isPincode } from '@/lib/delivery';
import { formatINR } from '@/lib/money';
import { defaultOptions, optionLabels, unitPrice } from '@/lib/pricing/engine';
import type { StoreSettings } from '@/lib/settings';
import { useCart } from '@/lib/store/cart';
import { useStoresHydrated } from '@/lib/store/hydration';
import { useRecent } from '@/lib/store/saved';

const VIEW_LABEL: Record<GalleryView, string> = { art: 'Design', laptop: 'On a laptop', wall: 'On the wall', closeup: 'Close-up', sizes: 'Size guide' };

function OptionPicker({ group, value, onChange }: { group: OptionGroup; value: string | undefined; onChange: (v: string) => void }) {
  const id = `opt-${group.key}`;
  if (group.display === 'select') {
    return (
      <div className="grid gap-2">
        <label htmlFor={id} className="text-sm font-bold uppercase tracking-[0.08em]">
          {group.label}
        </label>
        <select
          id={id}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-11 max-w-sm rounded-[2px] border border-line-2 bg-surface px-3 text-[15px] focus:border-lime focus:outline-none"
        >
          <option value="" disabled>
            Choose your {group.label.toLowerCase()}
          </option>
          {group.values.map((v) => (
            <option key={v.value} value={v.value}>
              {v.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm font-bold uppercase tracking-[0.08em]">{group.label}</legend>
      <div className="flex flex-wrap gap-2">
        {group.values.map((v) => {
          const checked = value === v.value;
          return (
            <label key={v.value} className="relative cursor-pointer">
              <input type="radio" name={id} value={v.value} checked={checked} onChange={() => onChange(v.value)} className="peer sr-only" />
              <span
                className={cn(
                  'grid min-w-[76px] justify-items-center rounded-[2px] border px-3.5 py-2 text-center text-[13.5px] font-bold uppercase leading-tight tracking-[0.05em] transition peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-cyan',
                  checked ? 'border-lime bg-lime/10 text-lime shadow-[0_0_18px_rgb(198_255_61/0.2)]' : 'border-line-2 hover:border-[#5a5a78]',
                )}
              >
                {v.label}
                {v.hint && <small className="text-[11.5px] font-semibold normal-case tracking-normal text-muted">{v.hint}</small>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function DeliveryCheck({ delivery }: { delivery: StoreSettings['delivery'] }) {
  const [pin, setPin] = useState('');
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <form
      className="grid gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!isPincode(pin)) return setResult({ ok: false, text: 'Enter a valid 6-digit pincode, like 560001.' });
        const [from, to] = deliveryWindow(pin, delivery);
        const now = new Date();
        setResult({ ok: true, text: `Usually delivered between ${formatDeliveryDate(now, from)} and ${formatDeliveryDate(now, to)}. Cash on Delivery available.` });
      }}
    >
      <label htmlFor="pincode" className="inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-[0.08em]">
        <PinIcon size={17} className="text-lime" /> Check delivery
      </label>
      <div className="flex max-w-sm gap-2">
        <input
          id="pincode"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          placeholder="6-digit pincode"
          className="min-h-11 min-w-0 flex-1 rounded-[2px] border border-line-2 bg-surface px-3.5 text-[15px] tracking-[0.06em] placeholder:tracking-normal placeholder:text-muted focus:border-lime focus:outline-none"
        />
        <button type="submit" className="btn btn-ghost btn-sm">
          Check
        </button>
      </div>
      <p className={cn('min-h-5 text-[13.5px] font-semibold', result?.ok ? 'text-lime' : 'text-red')} aria-live="polite">
        {result?.text}
      </p>
    </form>
  );
}

export function ProductExperience({ product, delivery }: { product: ProductDetail; delivery: StoreSettings['delivery'] }) {
  const router = useRouter();
  const hydrated = useStoresHydrated();
  const add = useCart((s) => s.add);
  const pushRecent = useRecent((s) => s.push);
  const [options, setOptions] = useState<Record<string, string>>(() => defaultOptions(product.options));
  const [qty, setQty] = useState(1);
  const [view, setView] = useState<GalleryView>('art');
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (hydrated) pushRecent(product.id);
  }, [hydrated, product.id, pushRecent]);

  const complete = product.options.every((g) => !g.required || options[g.key]);
  const unit = complete ? unitPrice(product.price, options) : null;
  const missing = product.options.find((g) => g.required && !options[g.key]);
  const views: GalleryView[] = product.art ? galleryViews(product.art.kind) : ['art'];
  const frame = (options.frame as FrameColor | undefined) ?? undefined;
  const svgs = useMemo(() => {
    if (!product.art) return {} as Partial<Record<GalleryView, string>>;
    const out: Partial<Record<GalleryView, string>> = {};
    for (const v of views) out[v] = renderGalleryView(product.art, v, { frame, label: `${product.name}: ${VIEW_LABEL[v]}` });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- views derive from product.art
  }, [product.art, product.name, frame]);

  const addToCart = () => {
    if (unit === null) return false;
    add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      typeName: product.typeName,
      art: product.art,
      image: product.image,
      options,
      optionLabels: optionLabels(product.options, options),
      unit,
      qty,
    });
    return true;
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: product.name, url });
      else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch {
      /* the shopper cancelled the share sheet */
    }
  };

  const sheen = product.art && SHEEN_KINDS.has(product.art.kind) && view === 'art';

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-12">
      <div className="min-w-0">
        <div className={cn('relative grid aspect-square place-items-center overflow-hidden rounded-card border border-line bg-surface', sheen && 'sheen')}>
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image} alt={product.name} className="h-full w-full object-contain p-6" />
          ) : (
            <div
              className={cn('art absolute inset-0', view === 'art' || view === 'closeup' ? 'p-[9%]' : view === 'sizes' ? 'p-[6%]' : '')}
              dangerouslySetInnerHTML={{ __html: svgs[view] ?? '' }}
            />
          )}
          {product.isNew && <span className="absolute left-3 top-3 rounded-[2px] bg-red px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-white">New</span>}
        </div>
        {views.length > 1 && (
          <div className="mt-3 grid grid-cols-4 gap-2.5" role="group" aria-label="Product images">
            {views.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                aria-label={VIEW_LABEL[v]}
                className={cn('relative aspect-square overflow-hidden rounded-[4px] border bg-surface transition', view === v ? 'border-lime shadow-[0_0_18px_rgb(198_255_61/0.2)]' : 'border-line hover:border-line-2')}
              >
                <span className={cn('art absolute inset-0', v === 'art' || v === 'closeup' || v === 'sizes' ? 'p-2' : '')} dangerouslySetInnerHTML={{ __html: svgs[v] ?? '' }} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="min-w-0">
        <p className="eyebrow">{product.typeName}</p>
        <h1 className="display mt-2 text-[clamp(38px,5vw,62px)]">{product.name}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          {product.vibes.map((v) => (
            <a key={v.id} href={`/v/${v.id}`} className="chip">
              {v.name}
            </a>
          ))}
        </div>

        <p className="mt-5 flex flex-wrap items-baseline gap-x-3">
          <span className="font-display text-[38px] leading-none text-lime tabular-nums">{unit !== null ? formatINR(unit * qty) : `From ${formatINR(product.priceFrom)}`}</span>
          <span className="text-[13px] text-muted">{qty > 1 && unit !== null ? `${formatINR(unit)} each · ` : ''}Inclusive of all taxes</span>
        </p>

        <div className="mt-6 grid gap-5">
          {product.options.map((g) => (
            <OptionPicker key={g.key} group={g} value={options[g.key]} onChange={(v) => setOptions((o) => ({ ...o, [g.key]: v }))} />
          ))}
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <QtyStepper value={qty} onChange={(n) => setQty(Math.max(1, n))} label={product.name} />
          <button type="button" className="btn btn-primary flex-1 sm:flex-none" disabled={!complete} onClick={addToCart}>
            Add to cart
          </button>
          <button
            type="button"
            className="btn btn-ghost flex-1 sm:flex-none"
            disabled={!complete}
            onClick={() => {
              if (addToCart()) {
                useCart.getState().setOpen(false);
                router.push('/checkout');
              }
            }}
          >
            Buy now
          </button>
        </div>
        {missing && <p className="mt-2 text-sm text-orange">Choose your {missing.label.toLowerCase()} to add this to your cart.</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          <WishButton id={product.id} name={product.name} variant="button" className="btn-sm" />
          <button type="button" onClick={share} className="btn btn-ghost btn-sm">
            <ShareIcon size={16} /> {shared ? 'Link copied' : 'Share'}
          </button>
        </div>

        <div className="mt-7 border-t border-line pt-6">
          <DeliveryCheck delivery={delivery} />
        </div>

        <ul className="mt-5 grid gap-2 text-[15px]">
          {product.highlights.map((h) => (
            <li key={h} className="flex items-start gap-2">
              <CheckIcon size={18} className="mt-0.5 shrink-0 text-lime" />
              {h}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
