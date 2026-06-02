'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { STOCK_FILTER_TABS, filterStockImages } from '@/lib/stock-images';

export default function StockImagePickerModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string, alt: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<string>('All');

  const images = useMemo(() => filterStockImages(query, tab), [query, tab]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-5 border-b border-[var(--border)] flex justify-between items-center">
          <h3 className="font-bold text-lg">Stock Image Library</h3>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-gray-500">
            ×
          </button>
        </div>
        <div className="p-4 border-b">
          <input
            type="search"
            placeholder="Search stock images..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--gold)]"
          />
          <div className="flex flex-wrap gap-2 mt-3">
            {STOCK_FILTER_TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`text-[10px] uppercase tracking-wider px-3 py-1 border ${
                  tab === t ? 'bg-[#111] text-white border-[#111]' : 'border-[var(--border)] text-gray-600'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 gap-3">
          {images.map((img) => (
            <button
              key={img.id}
              type="button"
              className="relative aspect-square group overflow-hidden bg-gray-100"
              onClick={() => {
                onSelect(img.url, img.alt);
                onClose();
              }}
            >
              <Image src={img.url} alt={img.alt} fill className="object-cover" sizes="200px" />
              <span className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs uppercase tracking-widest font-semibold">
                Select
              </span>
            </button>
          ))}
        </div>
        <div className="p-4 border-t text-center">
          <button type="button" onClick={onClose} className="text-sm text-[var(--gold)] hover:underline">
            Or upload your own →
          </button>
        </div>
      </div>
    </div>
  );
}
