'use client';

import Link from 'next/link';
import { PlusIcon } from '@/components/icons';
import type { ProductCard } from '@/lib/catalog/types';
import { useCart } from '@/lib/store/cart';

const base =
  'inline-flex min-h-9 items-center gap-1 rounded-[2px] border border-line-2 px-2.5 text-[12px] font-bold uppercase tracking-[0.06em] transition hover:border-lime hover:text-lime';

/** "Add" on a product card: adds the default size and finish. */
export function QuickAddButton({ product }: { product: ProductCard }) {
  const add = useCart((s) => s.add);
  if (!product.quick) {
    return (
      <Link href={`/p/${product.slug}`} className={base} aria-label={`Choose options for ${product.name}`}>
        Choose
      </Link>
    );
  }
  const quick = product.quick;
  return (
    <button
      type="button"
      className={base}
      aria-label={`Add ${product.name} to cart`}
      onClick={() =>
        add({
          productId: product.id,
          slug: product.slug,
          name: product.name,
          typeName: product.typeName,
          art: product.art,
          image: product.image,
          options: quick.options,
          optionLabels: quick.labels,
          unit: quick.unit,
        })
      }
    >
      <PlusIcon size={15} />
      <span className="max-sm:sr-only">Add</span>
    </button>
  );
}
