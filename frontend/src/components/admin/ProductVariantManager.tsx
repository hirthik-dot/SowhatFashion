'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { ProductVariantForm } from '@/lib/product-variants';
import { emptyVariantForm } from '@/lib/product-variants';
import { isValidHex, normalizeHex, applyPickedHex } from '@/lib/product-colors';
import { adminUploadImage } from '@/lib/api';

type Props = {
  variants: ProductVariantForm[];
  baseSlug?: string;
  parentPrice: number;
  parentStock: number;
  onChange: (variants: ProductVariantForm[]) => void;
};

async function pickColorFromScreen(): Promise<string | null> {
  if (typeof window === 'undefined' || !('EyeDropper' in window)) return null;
  try {
    const dropper = new (window as Window & { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper();
    const result = await dropper.open();
    return normalizeHex(result.sRGBHex);
  } catch {
    return null;
  }
}

export default function ProductVariantManager({
  variants,
  baseSlug,
  parentPrice,
  parentStock,
  onChange,
}: Props) {
  const [uploadingFor, setUploadingFor] = useState<number | null>(null);
  const [hasEyeDropper, setHasEyeDropper] = useState(false);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setHasEyeDropper('EyeDropper' in window);
  }, []);

  const updateVariant = (index: number, patch: Partial<ProductVariantForm>) => {
    onChange(variants.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  };

  const applyColorPick = (index: number, hex: string) => {
    updateVariant(index, applyPickedHex(hex));
  };

  const addVariant = () => onChange([...variants, emptyVariantForm()]);

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

  const suggestedSlug = (colorName: string) => {
    if (!baseSlug || !colorName.trim()) return '';
    return `${baseSlug}-${colorName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider">Color Variants</h4>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Each color gets its own URL, image gallery, and optional price/stock override.
          </p>
        </div>
        <button
          type="button"
          onClick={addVariant}
          className="shrink-0 text-xs font-bold uppercase tracking-wider px-3 py-2 border border-[var(--border)] rounded hover:border-[var(--gold)] hover:bg-[var(--gold-light)] transition-colors"
        >
          + Add Variant
        </button>
      </div>

      {variants.length === 0 ? (
        <div className="border border-dashed border-[var(--border)] rounded-lg p-6 text-center text-sm text-[var(--text-secondary)]">
          No color variants. Add one variant per color — each becomes its own product page.
        </div>
      ) : (
        <div className="space-y-4">
          {variants.map((variant, index) => (
            <div key={variant._id || index} className="border border-[var(--border)] rounded-lg p-4 bg-gray-50/50 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full border-2 border-white shadow shrink-0 ring-1 ring-[var(--border)]"
                    style={{ backgroundColor: isValidHex(variant.colorHex) ? normalizeHex(variant.colorHex) : '#ccc' }}
                  />
                  <span className="text-xs font-bold uppercase text-[var(--text-secondary)]">Variant {index + 1}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeVariant(index)}
                  className="text-[var(--text-secondary)] hover:text-[var(--sale-red)] p-1"
                  title="Remove variant"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">Color name</label>
                  <input
                    type="text"
                    value={variant.colorName}
                    onChange={(e) => updateVariant(index, { colorName: e.target.value })}
                    placeholder="Auto-filled when you pick a color"
                    className="w-full mt-1 border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
                  />
                  <p className="text-[10px] text-[var(--text-secondary)] mt-1">Filled automatically from hex when using the color picker or eyedropper.</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">URL slug</label>
                  <input
                    type="text"
                    value={variant.slug || ''}
                    onChange={(e) => updateVariant(index, { slug: e.target.value })}
                    placeholder={suggestedSlug(variant.colorName) || 'auto-generated on save'}
                    className="w-full mt-1 border border-[var(--border)] rounded px-3 py-2 text-sm font-mono outline-none focus:border-[var(--gold)]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">Hex</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      value={variant.colorHex}
                      onChange={(e) => updateVariant(index, { colorHex: e.target.value })}
                      onBlur={(e) => {
                        if (isValidHex(e.target.value)) applyColorPick(index, e.target.value);
                      }}
                      className="flex-1 border border-[var(--border)] rounded px-3 py-2 text-sm font-mono outline-none focus:border-[var(--gold)]"
                    />
                    <input
                      type="color"
                      value={isValidHex(variant.colorHex) ? normalizeHex(variant.colorHex) : '#000000'}
                      onChange={(e) => applyColorPick(index, e.target.value)}
                      className="w-11 h-10 rounded border border-[var(--border)] cursor-pointer p-0.5"
                    />
                    {hasEyeDropper && (
                      <button
                        type="button"
                        onClick={async () => {
                          const hex = await pickColorFromScreen();
                          if (hex) applyColorPick(index, hex);
                        }}
                        className="text-xs px-2 border border-[var(--border)] rounded hover:border-[var(--gold)]"
                        title="Screen color picker"
                      >
                        Pick
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">SKU (optional)</label>
                  <input
                    type="text"
                    value={variant.sku || ''}
                    onChange={(e) => updateVariant(index, { sku: e.target.value })}
                    className="w-full mt-1 border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">
                    Price override (parent: ₹{parentPrice})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={variant.price ?? ''}
                    onChange={(e) =>
                      updateVariant(index, { price: e.target.value === '' ? null : Number(e.target.value) })
                    }
                    placeholder="Uses parent price"
                    className="w-full mt-1 border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">
                    Stock override (parent: {parentStock})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={variant.stock ?? ''}
                    onChange={(e) =>
                      updateVariant(index, { stock: e.target.value === '' ? null : Number(e.target.value) })
                    }
                    placeholder="Uses parent stock"
                    className="w-full mt-1 border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-[var(--text-secondary)] block mb-2">
                  Variant images
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
                      ref={(el) => { fileInputRefs.current[index] = el; }}
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
