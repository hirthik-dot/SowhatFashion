'use client';

import { useCallback, useState } from 'react';
import Image from 'next/image';
import type { ProductSizeVariantForm } from '@/lib/product-size-variants';
import { formatPrice } from '@/lib/utils';
import { adminUploadImage } from '@/lib/api';
import ProductVariantManager from '@/components/admin/ProductVariantManager';

type Props = {
  variants: ProductSizeVariantForm[];
  baseSlug?: string;
  isBillingProduct?: boolean;
  onChange: (variants: ProductSizeVariantForm[]) => void;
};

export default function ProductSizeVariantManager({
  variants,
  baseSlug,
  isBillingProduct = false,
  onChange,
}: Props) {
  const [uploadingFor, setUploadingFor] = useState<number | null>(null);

  const updateVariant = (index: number, patch: Partial<ProductSizeVariantForm>) => {
    onChange(variants.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  };

  const addVariant = () => onChange([...variants, { sizeName: '', images: [], isActive: true }]);

  const removeVariant = (index: number) => onChange(variants.filter((_, i) => i !== index));

  const handleImageUpload = useCallback(
    async (index: number, files: FileList | null) => {
      if (!files?.length) return;
      setUploadingFor(index);
      try {
        const urls: string[] = [];
        for (let i = 0; i < files.length; i++) {
          const res = await adminUploadImage(files[i]);
          if (res.url) urls.push(res.url);
        }
        onChange(
          variants.map((v, i) =>
            i === index ? { ...v, images: [...(v.images || []), ...urls] } : v
          )
        );
      } catch {
        alert('Failed to upload image');
      } finally {
        setUploadingFor(null);
      }
    },
    [variants, onChange]
  );

  const removeImage = (variantIndex: number, imageIndex: number) => {
    const imgs = [...(variants[variantIndex].images || [])];
    imgs.splice(imageIndex, 1);
    updateVariant(variantIndex, { images: imgs });
  };

  const suggestedSlug = (sizeName: string) => {
    if (!baseSlug || !sizeName.trim()) return '';
    const part = sizeName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return `${baseSlug}-sz-${part}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider">Size Variants</h4>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {isBillingProduct
              ? 'Each size from billing inventory gets its own product page. Billing price syncs automatically; set an e-commerce price override below without affecting billing.'
              : 'Each size gets its own URL, image gallery, and optional price override.'}
          </p>
        </div>
        {!isBillingProduct && (
          <button
            type="button"
            onClick={addVariant}
            className="shrink-0 text-xs font-bold uppercase tracking-wider px-3 py-2 border border-[var(--border)] rounded hover:border-[var(--gold)] hover:bg-[var(--gold-light)] transition-colors"
          >
            + Add Size
          </button>
        )}
      </div>

      {variants.length === 0 ? (
        <div className="border border-dashed border-[var(--border)] rounded-lg p-6 text-center text-sm text-[var(--text-secondary)]">
          {isBillingProduct
            ? 'No sizes in billing inventory yet. Add stock with sizes in billing to create size variants here.'
            : 'No size variants. Add one per size — each becomes its own product page.'}
        </div>
      ) : (
        <div className="space-y-4">
          {variants.map((variant, index) => (
            <div
              key={variant._id || `${variant.sizeName}-${index}`}
              className="border border-[var(--border)] rounded-lg p-4 bg-gray-50/50 space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded border-2 border-white shadow shrink-0 ring-1 ring-[var(--border)] bg-black text-white flex items-center justify-center text-xs font-bold">
                    {variant.sizeName || '?'}
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase text-[var(--text-secondary)] block">
                      Size {index + 1}
                    </span>
                    {variant.slug && (
                      <span className="text-[10px] font-mono text-[var(--text-secondary)]">{variant.slug}</span>
                    )}
                  </div>
                </div>
                {!isBillingProduct && (
                  <button
                    type="button"
                    onClick={() => removeVariant(index)}
                    className="text-[var(--text-secondary)] hover:text-[var(--sale-red)] p-1"
                    title="Remove size variant"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {!isBillingProduct && (
                  <div>
                    <label className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">Size</label>
                    <input
                      type="text"
                      value={variant.sizeName}
                      onChange={(e) => updateVariant(index, { sizeName: e.target.value.toUpperCase() })}
                      placeholder="M, L, XL..."
                      className="w-full mt-1 border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
                    />
                  </div>
                )}
                {isBillingProduct && (
                  <div>
                    <label className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">Size</label>
                    <div className="mt-1 px-3 py-2 text-sm font-semibold bg-white border border-[var(--border)] rounded">
                      {variant.sizeName}
                    </div>
                  </div>
                )}
                {!isBillingProduct && (
                  <div>
                    <label className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">URL slug</label>
                    <input
                      type="text"
                      value={variant.slug || ''}
                      onChange={(e) => updateVariant(index, { slug: e.target.value })}
                      placeholder={suggestedSlug(variant.sizeName) || 'auto-generated on save'}
                      className="w-full mt-1 border border-[var(--border)] rounded px-3 py-2 text-sm font-mono outline-none focus:border-[var(--gold)]"
                    />
                  </div>
                )}
                {isBillingProduct && variant.billingPrice != null && (
                  <div>
                    <label className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">
                      Billing price (read-only)
                    </label>
                    <div className="mt-1 px-3 py-2 text-sm bg-gray-100 border border-[var(--border)] rounded text-[var(--text-secondary)]">
                      {formatPrice(variant.billingPrice)}
                      <span className="text-[10px] ml-2">syncs from billing inventory</span>
                    </div>
                  </div>
                )}
                {isBillingProduct && variant.stock != null && (
                  <div>
                    <label className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">
                      Stock (from billing)
                    </label>
                    <div className="mt-1 px-3 py-2 text-sm bg-gray-100 border border-[var(--border)] rounded">
                      {variant.stock} units
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">
                    {isBillingProduct ? 'E-commerce price override' : 'Price override'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={variant.ecommercePrice ?? ''}
                    onChange={(e) =>
                      updateVariant(index, {
                        ecommercePrice: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    placeholder={
                      isBillingProduct && variant.billingPrice != null
                        ? `Uses billing price (${formatPrice(variant.billingPrice)})`
                        : 'Uses parent price'
                    }
                    className="w-full mt-1 border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
                  />
                  {isBillingProduct && variant.effectivePrice != null && (
                    <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                      Storefront shows: {formatPrice(variant.effectivePrice)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">
                    Discount price (e-commerce only)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={variant.ecommerceDiscountPrice ?? ''}
                    onChange={(e) =>
                      updateVariant(index, {
                        ecommerceDiscountPrice: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    placeholder="Optional"
                    className="w-full mt-1 border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-[var(--text-secondary)] block mb-2">
                  Size-specific images (optional)
                </label>
                <div className="flex flex-wrap gap-3">
                  {(variant.images || []).map((img, imgIdx) => (
                    <div key={imgIdx} className="relative w-20 h-24 border border-[var(--border)] rounded overflow-hidden group">
                      <Image src={img} alt="" fill className="object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(index, imgIdx)}
                        className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow opacity-0 group-hover:opacity-100 text-red-500"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <label className="w-20 h-24 border-2 border-dashed border-[var(--border)] rounded flex items-center justify-center cursor-pointer hover:border-[var(--gold)] text-xs text-gray-500">
                    {uploadingFor === index ? (
                      <span className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full" />
                    ) : (
                      '+ Add'
                    )}
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingFor === index}
                      onChange={(e) => handleImageUpload(index, e.target.files)}
                    />
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border)]">
                <ProductVariantManager
                  variants={variant.colorVariants || []}
                  baseSlug={variant.slug || suggestedSlug(variant.sizeName)}
                  parentPrice={
                    variant.effectivePrice ??
                    (variant.ecommercePrice != null ? variant.ecommercePrice : variant.billingPrice) ??
                    0
                  }
                  parentStock={variant.stock ?? 0}
                  onChange={(colorVariants) => updateVariant(index, { colorVariants })}
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={variant.isActive !== false}
                  onChange={(e) => updateVariant(index, { isActive: e.target.checked })}
                  className="w-4 h-4 accent-[var(--gold)]"
                />
                Active (visible on storefront)
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
