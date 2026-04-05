'use client';

import { useEffect, useMemo, useState } from 'react';
import ProductCard from '@/components/shared/ProductCard';

type P = { _id: string; price: number; discountPrice?: number; name?: string; slug?: string; images?: string[] };

export function OfferCountdownLive({ end }: { end: string | null | undefined }) {
  const [, setT] = useState(0);
  const t = end ? new Date(end).getTime() : null;
  useEffect(() => {
    if (!t) return;
    const id = setInterval(() => setT((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [t]);

  if (!t) return null;
  const ms = t - Date.now();
  if (ms <= 0) return <span className="text-sm text-white/80">Ended</span>;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    <span className="font-mono text-lg text-[var(--gold)]">
      {pad(h)}:{pad(m)}:{pad(s)}
    </span>
  );
}

export default function OfferProductsClient({ products }: { products: P[] }) {
  const [sort, setSort] = useState('Relevance');

  const sorted = useMemo(() => {
    const copy = [...products];
    if (sort === 'price_asc') {
      copy.sort((a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
    } else if (sort === 'price_desc') {
      copy.sort((a, b) => (b.discountPrice || b.price) - (a.discountPrice || a.price));
    }
    return copy;
  }, [products, sort]);

  if (!sorted.length) {
    return <p className="text-[var(--text-secondary)]">No products linked to this offer yet.</p>;
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-bold uppercase tracking-wider shrink-0">Sort by</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="flex-1 md:flex-none border border-[var(--border)] rounded-sm px-3 py-2 text-sm bg-white min-w-0"
          >
            <option value="Relevance">Relevance</option>
            <option value="price_asc">Price: Low-High</option>
            <option value="price_desc">Price: High-Low</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {sorted.map((p) => (
          <ProductCard key={p._id} product={p as any} />
        ))}
      </div>
    </div>
  );
}
