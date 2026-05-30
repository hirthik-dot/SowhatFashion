"use client";

import { useEffect, useRef, useState } from "react";
import { billingApi } from "@/lib/api";

export type StockProductSearchResult = {
  _id: string;
  name: string;
  incomingPrice?: number;
  sellingPrice?: number;
  notes?: string;
  totalStock?: number;
  sizeStock?: { size: string; stock: number }[];
};

function formatMoney(value: number) {
  const safe = Number.isFinite(value) ? value : 0;
  return `₹${Math.round(safe)}`;
}

export default function StockProductNameSearch({
  supplierId,
  categoryId,
  subCategoryId,
  productName,
  onProductNameChange,
  onSelectProduct,
}: {
  supplierId: string;
  categoryId: string;
  subCategoryId: string;
  productName: string;
  onProductNameChange: (name: string) => void;
  onSelectProduct: (product: StockProductSearchResult) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<number | null>(null);
  const searchSeq = useRef(0);
  const skipSearch = useRef(false);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<StockProductSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtersReady = Boolean(supplierId && categoryId && subCategoryId);
  const query = productName.trim();

  const closeDropdown = () => {
    setOpen(false);
    setSelectedIndex(0);
  };

  const selectProduct = (product: StockProductSearchResult) => {
    skipSearch.current = true;
    onSelectProduct(product);
    closeDropdown();
    setResults([]);
    setLoading(false);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (wrapperRef.current && !wrapperRef.current.contains(target)) {
        closeDropdown();
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (skipSearch.current) {
      skipSearch.current = false;
      closeDropdown();
      return;
    }

    if (!filtersReady || !open) {
      setLoading(false);
      setResults([]);
      if (!filtersReady) closeDropdown();
      return;
    }

    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(async () => {
      const mySeq = ++searchSeq.current;
      setLoading(true);
      try {
        const data = await billingApi.searchStockProducts({
          supplier: supplierId,
          category: categoryId,
          subCategory: subCategoryId,
          q: query.length >= 1 ? query : undefined,
        });
        if (mySeq !== searchSeq.current) return;
        setResults(Array.isArray(data) ? data : []);
        setSelectedIndex(0);
      } catch {
        if (mySeq !== searchSeq.current) return;
        setResults([]);
      } finally {
        if (mySeq === searchSeq.current) setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    };
  }, [query, filtersReady, open, supplierId, categoryId, subCategoryId]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!filtersReady) return;

    if (e.key === "Escape") {
      e.preventDefault();
      closeDropdown();
      return;
    }

    if (open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      const max = results.length;
      if (max <= 0) return;
      setSelectedIndex((idx) => {
        const next = e.key === "ArrowDown" ? idx + 1 : idx - 1;
        if (next < 0) return max - 1;
        if (next >= max) return 0;
        return next;
      });
      return;
    }

    if (e.key === "Enter" && open && results.length > 0) {
      e.preventDefault();
      selectProduct(results[Math.min(selectedIndex, results.length - 1)]);
    }
  };

  const showDropdown = open && filtersReady;
  const showNoResults = showDropdown && !loading && results.length === 0;

  return (
    <div ref={wrapperRef} className="relative">
      <input
        className="pos-input w-full"
        value={productName}
        onChange={(e) => onProductNameChange(e.target.value)}
        onFocus={() => {
          if (!filtersReady) return;
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        placeholder={
          filtersReady
            ? "Search or select existing product name"
            : "Select supplier, category & subcategory first"
        }
        disabled={!filtersReady}
        required={filtersReady}
      />

      {!filtersReady ? (
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Choose supplier, category, and subcategory to see matching products.
        </p>
      ) : null}

      {showDropdown ? (
        <div
          className="absolute top-full left-0 right-0 z-50 mt-1 bg-[#222636] border border-[var(--border)] rounded-lg max-h-[280px] overflow-y-auto shadow-lg"
          role="listbox"
          aria-label="Product search results"
        >
          {loading ? (
            <div className="py-3 text-center text-sm text-[var(--text-secondary)] flex items-center justify-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full border-2 border-[var(--text-secondary)] border-t-transparent animate-spin" />
              <span>Loading products...</span>
            </div>
          ) : null}

          {!loading && results.length > 0
            ? results.map((product, idx) => {
                const isSelected = idx === selectedIndex;
                const stock = Number(product.totalStock || 0);
                const sizeCount = product.sizeStock?.length || 0;
                return (
                  <div
                    key={product._id}
                    className={[
                      "px-3 py-2 cursor-pointer border-l-2",
                      isSelected
                        ? "bg-[color-mix(in_srgb,var(--gold)_20%,transparent)] border-l-[var(--gold)]"
                        : "border-l-transparent hover:bg-[var(--surface)]",
                    ].join(" ")}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectProduct(product)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{product.name}</div>
                        <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                          Stock: {stock}
                          {sizeCount > 0 ? ` · ${sizeCount} size${sizeCount === 1 ? "" : "s"}` : ""}
                        </div>
                      </div>
                      <div className="shrink-0 text-right text-xs">
                        {product.sellingPrice != null ? (
                          <div className="font-semibold">{formatMoney(product.sellingPrice)}</div>
                        ) : null}
                        {product.incomingPrice != null && product.incomingPrice > 0 ? (
                          <div className="text-[var(--text-secondary)]">Cost: {formatMoney(product.incomingPrice)}</div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            : null}

          {showNoResults ? (
            <div className="py-3 px-3 text-center text-sm text-[var(--text-secondary)]">
              {query ? (
                <>No products found for &ldquo;{query}&rdquo;. Type a new name to create one on save.</>
              ) : (
                <>No products in this subcategory yet. Enter a name to add the first one.</>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
