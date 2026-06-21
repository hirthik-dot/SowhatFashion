'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ProductVariantSummary } from '@/lib/product-variants';
import { isVariantOutOfStock, variantThumbnail } from '@/lib/product-variants';

type Props = {
  variants: ProductVariantSummary[];
  currentSlug: string;
  colorLabel?: string;
};

export default function VariantThumbnailGrid({ variants, currentSlug, colorLabel }: Props) {
  if (!variants.length) return null;

  const activeVariant = variants.find((v) => v.slug === currentSlug);
  if (variants.length === 1 && activeVariant) return null;

  return (
    <div className="mb-8 border-t border-[var(--border)] pt-8">
      <span className="font-semibold uppercase tracking-wider text-sm block mb-1">
        Color{activeVariant ? `: ${activeVariant.colorName}` : ''}
      </span>
      {colorLabel && !activeVariant && (
        <span className="text-sm text-[var(--text-secondary)] block mb-4">{colorLabel}</span>
      )}
      {!colorLabel && activeVariant && <div className="mb-4" />}

      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
        {variants.map((variant) => {
          const isSelected = variant.slug === currentSlug;
          const outOfStock = isVariantOutOfStock(variant);
          const thumb = variantThumbnail(variant);

          return (
            <Link
              key={variant._id || variant.slug}
              href={`/products/${variant.slug}`}
              scroll={false}
              className={`relative aspect-[3/4] border-2 transition-all overflow-hidden rounded-sm ${
                isSelected
                  ? 'border-black ring-1 ring-black'
                  : 'border-[var(--border)] hover:border-black/60'
              } ${outOfStock ? 'opacity-50' : ''}`}
              title={variant.colorName}
              aria-label={`${variant.colorName}${outOfStock ? ' (out of stock)' : ''}`}
              aria-current={isSelected ? 'true' : undefined}
            >
              <Image
                src={thumb}
                alt={variant.colorName}
                fill
                className="object-cover"
                sizes="80px"
              />
              {outOfStock && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-full h-0.5 bg-gray-600 rotate-45 absolute" />
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
