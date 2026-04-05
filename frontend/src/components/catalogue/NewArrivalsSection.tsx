'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import CatalogueProductCard from '@/components/catalogue/CatalogueProductCard';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type Item = { _id: string; product: any };

export default function NewArrivalsSection({
  initialItems,
  initialHasMore,
}: {
  initialItems: Item[];
  initialHasMore: boolean;
}) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const skip = items.length;
      const res = await fetch(`${API}/api/new-arrivals?skip=${skip}&limit=8`);
      const data = await res.json();
      const next: Item[] = data.items || [];
      setItems((prev) => [...prev, ...next]);
      setHasMore(Boolean(data.hasMore));
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [hasMore, items.length, loading]);

  if (!items.length) return null;

  return (
    <section className="bg-white py-16 px-6">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-playfair font-bold text-[32px] text-[var(--text-primary)]">NEW ARRIVALS</h2>
            <div className="w-12 h-[3px] bg-[var(--gold)] mt-2 mb-3" />
            <p className="text-sm text-[var(--text-secondary)] font-sans">Fresh styles added this week</p>
          </div>
          <Link
            href="/products?newArrival=true"
            className="text-sm uppercase tracking-widest text-[var(--gold)] hover:underline shrink-0"
          >
            View all new arrivals →
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((row) =>
            row.product ? (
              <div key={row._id} className="bg-white p-2 md:p-3 border border-[var(--border)]">
                <CatalogueProductCard product={row.product} forceNewBadge />
              </div>
            ) : null
          )}
        </div>

        {hasMore && (
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="mt-10 block w-full md:w-auto md:mx-auto border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--gold)] hover:text-[var(--gold)] px-8 py-3 text-sm font-medium transition-colors"
          >
            {loading ? 'Loading…' : 'LOAD MORE'}
          </button>
        )}
      </div>
    </section>
  );
}
