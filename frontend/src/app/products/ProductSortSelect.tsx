"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function ProductSortSelect({ initialSort }: { initialSort: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <select
      name="sort"
      defaultValue={initialSort}
      onChange={(e) => {
        const currentParams = new URLSearchParams(Array.from(searchParams.entries()));
        currentParams.set('sort', e.target.value);
        router.push(`?${currentParams.toString()}`);
      }}
      className="w-full md:w-auto bg-white border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)]"
    >
      <option value="">Recommended</option>
      <option value="price_asc">Price: Low to High</option>
      <option value="price_desc">Price: High to Low</option>
      <option value="newest">Newest Arrivals</option>
    </select>
  );
}
