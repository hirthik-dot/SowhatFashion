"use client";

function formatPrice(value: number) {
  return `₹${Math.round(Number(value || 0))}`;
}

export default function MultiplePriceBadge({
  hasMultiplePrices,
  sellingPrices = [],
}: {
  hasMultiplePrices?: boolean;
  sellingPrices?: number[];
}) {
  if (!hasMultiplePrices || sellingPrices.length < 2) return null;

  const label = sellingPrices.map(formatPrice).join(", ");

  return (
    <span
      className="inline-flex items-center gap-1.5 ml-2 align-middle"
      title={`Multiple prices in stock: ${label}`}
    >
      <span
        className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--error)] shrink-0 ring-2 ring-[color-mix(in_srgb,var(--error)_35%,transparent)]"
        aria-hidden
      />
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--error)]">
        Multi-price
      </span>
    </span>
  );
}
