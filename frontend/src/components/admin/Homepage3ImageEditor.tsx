'use client';

import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import { adminUpdateSettings, adminUploadImage } from '@/lib/api';
import {
  DEFAULT_HOMEPAGE3_PLACEHOLDERS,
  DEFAULT_CATEGORY_TILES,
  mergeHomepage3Placeholders,
  type Homepage3Placeholders,
  type CategoryTileSlot,
} from '@/lib/homepage3-config';
import StockImagePickerModal from './StockImagePickerModal';

type SlotTarget =
  | { type: 'field'; field: keyof Homepage3Placeholders }
  | { type: 'carousel'; index: number }
  | { type: 'instagram'; index: number }
  | { type: 'category'; index: number };

function ImageSlotEditor({
  label,
  previewUrl,
  alt,
  onAltChange,
  onUpload,
  onStock,
  uploading,
}: {
  label: string;
  previewUrl?: string;
  alt?: string;
  onAltChange?: (v: string) => void;
  onUpload: () => void;
  onStock: () => void;
  uploading?: boolean;
}) {
  return (
    <div className="border border-[var(--border)] p-4 space-y-3">
      <p className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">{label}</p>
      <div className="relative w-full h-[120px] bg-gray-100 overflow-hidden">
        {previewUrl ? (
          <Image src={previewUrl} alt="" fill className="object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">No image</span>
        )}
      </div>
      {onAltChange && (
        <input
          type="text"
          placeholder="Alt text (SEO)"
          value={alt || ''}
          onChange={(e) => onAltChange(e.target.value)}
          className="w-full border border-[var(--border)] px-3 py-2 text-sm"
        />
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onUpload} disabled={uploading} className="btn-gold-outline text-xs px-4 py-2">
          {uploading ? 'Uploading…' : 'Upload New Image'}
        </button>
        <button type="button" onClick={onStock} className="border border-[var(--border)] text-xs px-4 py-2 uppercase tracking-wider hover:border-[#111]">
          Use Stock Image
        </button>
      </div>
    </div>
  );
}

export default function Homepage3ImageEditor({
  settings,
  onUpdate,
}: {
  settings: any;
  onUpdate: () => void;
}) {
  const merged = mergeHomepage3Placeholders(settings?.placeholders?.catalogue);
  const [draft, setDraft] = useState<Homepage3Placeholders>(merged);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [uploading, setUploading] = useState(false);
  const [stockTarget, setStockTarget] = useState<SlotTarget | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingUploadTarget = useRef<SlotTarget | null>(null);

  const markDirty = useCallback((next: Homepage3Placeholders) => {
    setDraft(next);
    setDirty(true);
  }, []);

  const applyStock = (url: string, alt: string) => {
    if (!stockTarget) return;
    const next = { ...draft };
    if (stockTarget.type === 'field') {
      (next as Record<string, unknown>)[stockTarget.field] = url;
      if (stockTarget.field === 'heroDesktop') next.heroDesktopAlt = alt;
      if (stockTarget.field === 'heroMobile') next.heroMobileAlt = alt;
      if (stockTarget.field === 'brandStoryImage') next.brandStoryAlt = alt;
    } else if (stockTarget.type === 'carousel') {
      const arr = [...(next.carouselImages || [])];
      arr[stockTarget.index] = url;
      next.carouselImages = arr;
    } else if (stockTarget.type === 'instagram') {
      const arr = [...(next.instagramImages || [])];
      arr[stockTarget.index] = url;
      next.instagramImages = arr;
    } else if (stockTarget.type === 'category') {
      const tiles = [...(next.categoryTiles || DEFAULT_CATEGORY_TILES)];
      tiles[stockTarget.index] = { ...tiles[stockTarget.index], image: url, alt };
      next.categoryTiles = tiles;
    }
    markDirty(next);
    setStockTarget(null);
  };

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const res = await adminUploadImage(file);
      if (!res.url || !pendingUploadTarget.current) return;
      const t = pendingUploadTarget.current;
      const next = { ...draft };
      if (t.type === 'field') {
        (next as Record<string, unknown>)[t.field] = res.url;
      } else if (t.type === 'carousel') {
        const arr = [...(next.carouselImages || [])];
        arr[t.index] = res.url;
        next.carouselImages = arr;
      } else if (t.type === 'instagram') {
        const arr = [...(next.instagramImages || [])];
        arr[t.index] = res.url;
        next.instagramImages = arr;
      } else if (t.type === 'category') {
        const tiles = [...(next.categoryTiles || DEFAULT_CATEGORY_TILES)];
        tiles[t.index] = { ...tiles[t.index], image: res.url };
        next.categoryTiles = tiles;
      }
      markDirty(next);
    } catch {
      alert('Upload failed');
    } finally {
      setUploading(false);
      pendingUploadTarget.current = null;
    }
  };

  const triggerUpload = (target: SlotTarget) => {
    pendingUploadTarget.current = target;
    fileRef.current?.click();
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      await adminUpdateSettings({
        ...settings,
        placeholders: {
          ...settings?.placeholders,
          catalogue: draft,
        },
      });
      setDirty(false);
      setToast('Homepage 3 updated successfully ✓');
      setTimeout(() => setToast(''), 4000);
      onUpdate();
    } catch {
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = () => {
    if (!confirm('Reset all Homepage 3 images to defaults?')) return;
    markDirty({ ...DEFAULT_HOMEPAGE3_PLACEHOLDERS, categoryTiles: [...DEFAULT_CATEGORY_TILES] });
  };

  const updateCategoryTile = (index: number, patch: Partial<CategoryTileSlot>) => {
    const tiles = [...(draft.categoryTiles || DEFAULT_CATEGORY_TILES)];
    tiles[index] = { ...tiles[index], ...patch };
    markDirty({ ...draft, categoryTiles: tiles });
  };

  const tiles = draft.categoryTiles || DEFAULT_CATEGORY_TILES;

  return (
    <div className="mt-8">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            if (f.size > 5 * 1024 * 1024) {
              alert('Max file size is 5MB');
              return;
            }
            handleFile(f);
          }
          e.target.value = '';
        }}
      />

      {toast && (
        <div className="fixed top-4 right-4 z-[400] bg-[var(--success)] text-white px-6 py-3 shadow-lg text-sm font-medium">
          {toast}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="space-y-8 bg-white p-6 md:p-8 border border-[var(--border)]">
          <div>
            <h2 className="text-xl font-bold font-playfair mb-1">Homepage 3 — Image Editor</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Premium minimalist layout. Upload or pick stock images for each slot.
            </p>
          </div>

          <section className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider border-b pb-2">Section 1 — Hero Banner</h3>
            <ImageSlotEditor
              label="Hero Background (Desktop)"
              previewUrl={draft.heroDesktop}
              alt={draft.heroDesktopAlt}
              onAltChange={(v) => markDirty({ ...draft, heroDesktopAlt: v })}
              uploading={uploading}
              onUpload={() => triggerUpload({ type: 'field', field: 'heroDesktop' })}
              onStock={() => setStockTarget({ type: 'field', field: 'heroDesktop' })}
            />
            <ImageSlotEditor
              label="Hero Background (Mobile)"
              previewUrl={draft.heroMobile}
              alt={draft.heroMobileAlt}
              onAltChange={(v) => markDirty({ ...draft, heroMobileAlt: v })}
              uploading={uploading}
              onUpload={() => triggerUpload({ type: 'field', field: 'heroMobile' })}
              onStock={() => setStockTarget({ type: 'field', field: 'heroMobile' })}
            />
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider border-b pb-2">Section 2 — Category Tiles</h3>
            {tiles.map((tile, i) => (
              <div key={tile.key} className="border border-[var(--border)] p-4 space-y-3">
                <p className="font-bold text-sm uppercase">Category: {tile.label}</p>
                <div className="relative w-full h-[120px] bg-gray-100">
                  {tile.image && <Image src={tile.image} alt="" fill className="object-cover" />}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <label>
                    Tile Label
                    <input
                      className="w-full border mt-1 px-2 py-1"
                      value={tile.label}
                      onChange={(e) => updateCategoryTile(i, { label: e.target.value })}
                    />
                  </label>
                  <label>
                    Link
                    <input
                      className="w-full border mt-1 px-2 py-1"
                      value={tile.link}
                      onChange={(e) => updateCategoryTile(i, { link: e.target.value })}
                    />
                  </label>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="btn-gold-outline text-xs px-3 py-2" onClick={() => triggerUpload({ type: 'category', index: i })}>
                    Upload New
                  </button>
                  <button type="button" className="border text-xs px-3 py-2" onClick={() => setStockTarget({ type: 'category', index: i })}>
                    Stock Image
                  </button>
                </div>
              </div>
            ))}
          </section>

          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider border-b pb-2 mb-4">Section 3 — New Arrivals Background</h3>
            <ImageSlotEditor
              label="New Arrivals Section Background"
              previewUrl={draft.newArrivalsBg}
              onUpload={() => triggerUpload({ type: 'field', field: 'newArrivalsBg' })}
              onStock={() => setStockTarget({ type: 'field', field: 'newArrivalsBg' })}
            />
          </section>

          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider border-b pb-2 mb-4">Section 4 — Brand Story</h3>
            <ImageSlotEditor
              label="Left Editorial Image"
              previewUrl={draft.brandStoryImage}
              alt={draft.brandStoryAlt}
              onAltChange={(v) => markDirty({ ...draft, brandStoryAlt: v })}
              onUpload={() => triggerUpload({ type: 'field', field: 'brandStoryImage' })}
              onStock={() => setStockTarget({ type: 'field', field: 'brandStoryImage' })}
            />
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider border-b pb-2">Section 5 — Sale / Promo</h3>
            <ImageSlotEditor
              label="Promo Banner Background"
              previewUrl={draft.promoBannerBg}
              onUpload={() => triggerUpload({ type: 'field', field: 'promoBannerBg' })}
              onStock={() => setStockTarget({ type: 'field', field: 'promoBannerBg' })}
            />
            <label className="block text-sm">
              Banner Text Override
              <input
                className="w-full border mt-1 px-3 py-2"
                value={draft.promoBannerText || ''}
                onChange={(e) => markDirty({ ...draft, promoBannerText: e.target.value })}
              />
            </label>
          </section>

          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider border-b pb-2 mb-4">Section 6 — Instagram / UGC (6 slots)</h3>
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <ImageSlotEditor
                  key={i}
                  label={`UGC Image ${i + 1}`}
                  previewUrl={draft.instagramImages?.[i]}
                  onUpload={() => triggerUpload({ type: 'instagram', index: i })}
                  onStock={() => setStockTarget({ type: 'instagram', index: i })}
                />
              ))}
            </div>
          </section>

          <div className="flex flex-col sm:flex-row gap-3 sticky bottom-0 bg-white py-4 border-t">
            <button type="button" onClick={saveAll} disabled={saving || !dirty} className="flex-1 bg-[#111] text-white py-3 text-sm uppercase tracking-widest font-semibold disabled:opacity-40">
              {saving ? 'Saving…' : 'Save All Changes'}
            </button>
            <button type="button" onClick={resetDefaults} className="flex-1 border border-[#111] py-3 text-sm uppercase tracking-widest">
              Reset to Defaults
            </button>
          </div>
        </div>

        <div className="hidden xl:block sticky top-8 h-[calc(100vh-120px)]">
          <p className="text-xs uppercase tracking-widest text-[var(--text-secondary)] mb-2">Live preview</p>
          <iframe title="Homepage 3 preview" src="/" className="w-full h-full border border-[var(--border)] bg-white" />
        </div>
      </div>

      <StockImagePickerModal open={!!stockTarget} onClose={() => setStockTarget(null)} onSelect={applyStock} />
    </div>
  );
}
