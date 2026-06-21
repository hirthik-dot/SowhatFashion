'use client';

import { useRouter } from 'next/navigation';
import type { ProductSizeVariantSummary } from '@/lib/product-size-variants';
import { isSizeVariantOutOfStock } from '@/lib/product-size-variants';

type Props = {
  sizeVariants?: ProductSizeVariantSummary[];
  sizes?: string[];
  productSlug?: string;
  variant?: 'overlay' | 'inline';
  className?: string;
};

export default function ProductCardSizePicker({
  sizeVariants,
  sizes,
  productSlug,
  variant = 'inline',
  className = '',
}: Props) {
  const router = useRouter();
  const useLinks = Boolean(sizeVariants?.length);

  const items = useLinks
    ? sizeVariants!.map((sv) => ({
        key: sv.slug || sv.sizeName,
        label: sv.sizeName,
        href: `/products/${sv.slug}`,
        outOfStock: isSizeVariantOutOfStock(sv),
      }))
    : (sizes || []).map((size) => ({
        key: size,
        label: size,
        href: productSlug ? `/products/${productSlug}` : undefined,
        outOfStock: false,
      }));

  if (!items.length) return null;

  const baseClass =
    variant === 'overlay'
      ? 'text-[11px] px-2 py-1 rounded border min-w-[32px] min-h-[32px] transition-all'
      : 'flex items-center justify-center text-[11px] font-medium min-w-[36px] h-9 rounded border transition-all';

  const selectedOverlay = 'bg-[var(--gold)] border-[var(--gold)] text-black';
  const idleOverlay = 'border-white/40 text-white hover:border-white hover:bg-white/10';
  const selectedInline =
    'bg-[var(--gold)] border-[var(--gold)] text-black';
  const idleInline =
    'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-primary)]';

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {items.map((item) => {
        const classNames = `${baseClass} ${
          variant === 'overlay'
            ? item.outOfStock
              ? `${idleOverlay} opacity-40 line-through`
              : idleOverlay
            : item.outOfStock
              ? `${idleInline} opacity-40 line-through`
              : idleInline
        }`;

        if (useLinks && item.href) {
          return (
            <button
              key={item.key}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(item.href!);
              }}
              className={classNames}
              title={`Size ${item.label}${item.outOfStock ? ' (out of stock)' : ''}`}
            >
              {item.label}
            </button>
          );
        }

        return (
          <span key={item.key} className={classNames}>
            {item.label}
          </span>
        );
      })}
    </div>
  );
}
