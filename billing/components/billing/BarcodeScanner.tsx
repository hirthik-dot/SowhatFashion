"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { searchProducts } from "@/lib/api";

type SearchProduct = {
  _id: string;
  name: string;
  barcode?: string;
  size?: string;
  price?: number;
  discountPrice?: number;
  stock?: number;
  category?: string;
  subCategory?: string;
};

function formatMoney(value: number) {
  const safe = Number.isFinite(value) ? value : 0;
  return `₹${Math.round(safe)}`;
}

function getDisplayPrice(p: SearchProduct) {
  const discount = Number(p.discountPrice || 0);
  const price = Number(p.price || 0);
  return discount > 0 ? discount : price;
}

export default function BarcodeScanner(props: {
  inputRef?: React.RefObject<HTMLInputElement | null>;
  flashError?: boolean;
  onAdd: (product: any, source: "scan" | "search") => Promise<void> | void;
  onScanBarcode: (barcode: string) => Promise<any>;
  onToast?: (message: string) => void;
  playSuccess?: () => void;
  playError?: () => void;
}) {
  const { inputRef, flashError, onAdd, onScanBarcode, onToast, playSuccess, playError } = props;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const internalRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? internalRef;

  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const debounceTimer = useRef<number | null>(null);
  const lastKeyAt = useRef(0);
  const scanBuffer = useRef("");
  const scannerActive = useRef(false);
  const searchSeq = useRef(0);

  const query = value.trim();
  const canSearch = useMemo(() => query.length >= 2, [query]);

  const closeDropdown = () => {
    setOpen(false);
    setSelectedIndex(0);
  };

  const clear = () => {
    setValue("");
    scanBuffer.current = "";
    scannerActive.current = false;
    closeDropdown();
  };

  const runScan = async (barcode: string) => {
    const code = barcode.trim();
    if (!code) return;
    try {
      const product = await onScanBarcode(code);
      await onAdd(product, "scan");
      playSuccess?.();
      onToast?.(`${product.name} added`);
      clear();
    } catch (error: any) {
      playError?.();
      onToast?.(error?.message || "Scan failed");
      // keep focus and keep value so user can edit/try again
    }
  };

  const runSelect = async (p: SearchProduct) => {
    if (!p?._id) return;
    if (!p.barcode) {
      onToast?.("Selected product has no barcode");
      return;
    }
    const mrp = getDisplayPrice(p);
    await onAdd(
      {
        _id: p._id,
        barcode: p.barcode,
        name: p.name,
        size: p.size || "",
        category: p.category || "",
        mrp,
        stock: p.stock,
      },
      "search"
    );
    playSuccess?.();
    onToast?.(`${p.name} added`);
    clear();
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
    if (!canSearch) {
      setLoading(false);
      setResults([]);
      closeDropdown();
      return;
    }

    if (scannerActive.current) return;

    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(async () => {
      const mySeq = ++searchSeq.current;
      setLoading(true);
      setOpen(true);
      try {
        const data = await searchProducts(query);
        if (mySeq !== searchSeq.current) return;
        const normalized = Array.isArray(data) ? (data as SearchProduct[]) : [];
        setResults(normalized);
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
  }, [query, canSearch]);

  const onKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    const now = Date.now();
    const delta = now - lastKeyAt.current;
    lastKeyAt.current = now;

    if (e.key === "Escape") {
      e.preventDefault();
      closeDropdown();
      return;
    }

    // Keyboard nav for dropdown
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

    if (e.key === "Enter") {
      e.preventDefault();
      // If dropdown open and we have results, Enter selects
      if (open && results.length > 0 && !scannerActive.current) {
        await runSelect(results[Math.min(selectedIndex, results.length - 1)]);
        return;
      }
      // Otherwise treat as scan/manual add with current value/buffer
      const code = scanBuffer.current.length > 3 ? scanBuffer.current : value;
      scanBuffer.current = "";
      scannerActive.current = false;
      await runScan(code);
      return;
    }

    // scanner detection: if characters come fast, treat as scanner
    if (e.key.length === 1) {
      if (delta > 100) {
        scanBuffer.current = "";
        scannerActive.current = false;
      } else {
        scannerActive.current = true;
      }

      if (scannerActive.current) {
        scanBuffer.current += e.key;
        // Avoid showing search dropdown while scanning
        closeDropdown();
        setLoading(false);
      }
    }
  };

  const showNoResults = open && !loading && canSearch && results.length === 0;

  return (
    <div ref={wrapperRef} className={`pos-card p-3 ${flashError ? "border-[var(--error)]" : ""}`}>
      <div className="relative">
        <input
          ref={ref as any}
          className="pos-input w-full"
          placeholder="Scan barcode or search by name..."
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            // If user is typing (not scanner), allow search
            if (!scannerActive.current) {
              setOpen(e.target.value.trim().length >= 2);
            }
          }}
          onFocus={() => {
            if (!scannerActive.current && value.trim().length >= 2) setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />

        {open ? (
          <div
            className="absolute top-full left-0 right-0 z-50 mt-2 bg-[#222636] border border-[var(--border)] rounded-lg max-h-[300px] overflow-y-auto"
            role="listbox"
            aria-label="Product search results"
          >
            {loading ? (
              <div className="py-3 text-center text-sm text-[var(--text-secondary)] flex items-center justify-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full border-2 border-[var(--text-secondary)] border-t-transparent animate-spin" />
                <span>Searching...</span>
              </div>
            ) : null}

            {!loading && results.length > 0
              ? results.map((p, idx) => {
                  const isSelected = idx === selectedIndex;
                  const price = getDisplayPrice(p);
                  return (
                    <div
                      key={`${p._id}-${p.size || "na"}-${p.barcode || idx}`}
                      className={[
                        "px-3 py-2 cursor-pointer border-l-2",
                        isSelected ? "bg-[color-mix(in_srgb,var(--gold)_20%,transparent)] border-l-[var(--gold)]" : "border-l-transparent hover:bg-[var(--surface)]",
                      ].join(" ")}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onMouseDown={(e) => {
                        // prevent input blur before click
                        e.preventDefault();
                      }}
                      onClick={async () => runSelect(p)}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate">
                            {p.name} {p.size ? <span className="text-[var(--text-secondary)]">({p.size})</span> : null}
                          </div>
                          <div className="text-xs text-[var(--text-secondary)] truncate">
                            {p.category ? p.category : null}
                            {p.subCategory ? (p.category ? ` · ${p.subCategory}` : p.subCategory) : null}
                          </div>
                        </div>
                        <div className="shrink-0 text-right text-sm">
                          <div className="text-[var(--text-secondary)]">Stock: {Number(p.stock || 0)}</div>
                          <div className="font-semibold">{formatMoney(price)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })
              : null}

            {showNoResults ? (
              <div className="py-3 text-center text-sm text-[var(--text-secondary)]">
                No products found for '{query}'
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

