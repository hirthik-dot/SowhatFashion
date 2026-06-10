"use client";

import { useEffect, useRef, useState } from "react";

export type PriceVariant = {
  sellingPrice: number;
  incomingPrice?: number;
  stock: number;
  sizeStock?: { size: string; stock: number }[];
};

function formatMoney(value: number) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

export default function PriceVariantsDropdown({
  variants = [],
  showCost = false,
}: {
  variants?: PriceVariant[];
  showCost?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target || !rootRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!variants || variants.length < 2) return null;

  return (
    <div ref={rootRef} className="relative inline-flex items-center">
      <button
        type="button"
        className="inline-flex h-7 w-7 items-center justify-center rounded border border-[var(--error)] text-[var(--error)] hover:bg-[color-mix(in_srgb,var(--error)_12%,transparent)]"
        aria-label="Show price variants"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 max-h-56 overflow-y-auto rounded-lg border border-[var(--border)] bg-[#222636] shadow-xl">
          <div className="sticky top-0 border-b border-[var(--border)] bg-[#1b1f2b] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            Price Variants ({variants.length})
          </div>
          {variants.map((variant) => (
            <div
              key={variant.sellingPrice}
              className="border-b border-[var(--border)] px-3 py-2 last:border-b-0"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-[var(--error)]">{formatMoney(variant.sellingPrice)}</div>
                <div className="text-xs text-[var(--text-secondary)]">Stock: {variant.stock}</div>
              </div>
              {showCost && variant.incomingPrice != null ? (
                <div className="mt-1 text-xs text-[var(--text-secondary)]">
                  Cost: {formatMoney(variant.incomingPrice)}
                </div>
              ) : null}
              {variant.sizeStock?.length ? (
                <div className="mt-1 text-xs text-[var(--text-secondary)]">
                  Sizes: {variant.sizeStock.map((row) => `${row.size}:${row.stock}`).join(" · ")}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
