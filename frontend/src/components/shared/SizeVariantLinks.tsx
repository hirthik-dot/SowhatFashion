'use client';

import Link from 'next/link';
import type { ProductSizeVariantSummary } from '@/lib/product-size-variants';
import { isSizeVariantOutOfStock } from '@/lib/product-size-variants';

type Props = {
  sizeVariants: ProductSizeVariantSummary[];
  currentSlug: string;
  activeSizeName?: string;
};

export default function SizeVariantLinks({ sizeVariants, currentSlug, activeSizeName }: Props) {
  if (!sizeVariants.length || sizeVariants.length <= 1) return null;

  const active = sizeVariants.find((v) => v.slug === currentSlug);

  return (
    <div className="mb-8 border-t border-[var(--border)] pt-8">
      <span className="font-semibold uppercase tracking-wider text-sm block mb-4">
        Size{active || activeSizeName ? `: ${active?.sizeName || activeSizeName}` : ''}
      </span>
      <div className="flex flex-wrap gap-2">
        {sizeVariants.map((variant) => {
          const isSelected = variant.slug === currentSlug;
          const outOfStock = isSizeVariantOutOfStock(variant);

          return (
            <Link
              key={variant._id || variant.slug}
              href={`/products/${variant.slug}`}
              scroll={false}
              className={`min-w-[3rem] px-4 py-2.5 border-2 text-sm font-semibold transition-all rounded-sm text-center ${
                isSelected
                  ? 'border-black bg-black text-white'
                  : 'border-[var(--border)] hover:border-black/60'
              } ${outOfStock ? 'opacity-50 line-through' : ''}`}
              title={`Size ${variant.sizeName}${outOfStock ? ' (out of stock)' : ''}`}
              aria-current={isSelected ? 'true' : undefined}
            >
              {variant.sizeName}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
