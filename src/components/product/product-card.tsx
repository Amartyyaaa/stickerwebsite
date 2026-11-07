import Link from 'next/link';
import { Art } from '@/components/art';
import type { ProductCard as Card } from '@/lib/catalog/types';
import { formatINR } from '@/lib/money';
import { QuickAddButton } from './quick-add-button';
import { WishButton } from './wish-button';

export function ProductCard({
  product,
  idPrefix,
  action,
  price,
}: {
  product: Card;
  idPrefix?: string;
  /** Replaces the quick "Add" button, for example with a pack counter. */
  action?: React.ReactNode;
  /** Replaces the "from ₹…" price line. */
  price?: React.ReactNode;
}) {
  const href = `/p/${product.slug}`;
  return (
    <article className="group relative flex min-w-0 flex-col overflow-hidden rounded-card border border-line bg-surface transition hover:border-lime hover:shadow-glow">
      <Link href={href} className="relative block aspect-square border-b border-line" tabIndex={-1} aria-hidden="true">
        <div className="absolute inset-[11%] transition duration-300 group-hover:scale-[1.04]">
          <Art spec={product.art} image={product.image} idPrefix={idPrefix} />
        </div>
        {product.isNew && (
          <span className="absolute left-2.5 top-2.5 rounded-[2px] bg-red px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-white">New</span>
        )}
      </Link>
      <WishButton id={product.id} name={product.name} className="absolute right-2 top-2 z-10" />
      <div className="flex flex-1 flex-col gap-0.5 p-3 sm:p-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{product.typeName}</p>
        <h3 className="font-display text-[16px] uppercase leading-[1.1] sm:text-[19px]">
          <Link href={href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {product.name}
          </Link>
        </h3>
        <div className="relative z-10 mt-auto flex items-center justify-between gap-2 pt-2.5">
          {price ?? (
            <p className="font-bold tabular-nums text-lime">
              <span className="text-[11.5px] font-semibold text-muted">from </span>
              {formatINR(product.priceFrom)}
            </p>
          )}
          {action ?? <QuickAddButton product={product} />}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, idPrefix }: { products: Card[]; idPrefix?: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} idPrefix={idPrefix} />
      ))}
    </div>
  );
}
