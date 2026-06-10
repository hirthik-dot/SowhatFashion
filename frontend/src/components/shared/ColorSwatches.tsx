'use client';

import type { ProductColor } from '@/lib/product-colors';
import { isValidHex, normalizeHex } from '@/lib/product-colors';

type Props = {
  colors: ProductColor[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  size?: 'sm' | 'md';
  showLabels?: boolean;
};

export default function ColorSwatches({
  colors,
  selectedIndex,
  onSelect,
  size = 'md',
  showLabels = true,
}: Props) {
  if (!colors?.length) return null;

  const dim = size === 'sm' ? 'w-6 h-6' : 'w-9 h-9';

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {colors.map((color, index) => {
        const hex = isValidHex(color.hex) ? normalizeHex(color.hex) : '#cccccc';
        const selected = selectedIndex === index;
        const isLight =
          parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16) >
          600;

        return (
          <button
            key={index}
            type="button"
            onClick={() => onSelect(index)}
            title={color.name || hex}
            className={`group relative ${dim} rounded-full border-2 transition-all shrink-0 ${
              selected
                ? 'border-[var(--gold)] ring-2 ring-[var(--gold)] ring-offset-1 scale-110'
                : 'border-gray-300 hover:border-gray-500 hover:scale-105'
            }`}
            style={{ backgroundColor: hex }}
            aria-label={color.name || `Color ${index + 1}`}
            aria-pressed={selected}
          >
            {selected && (
              <span
                className={`absolute inset-0 flex items-center justify-center ${
                  isLight ? 'text-black' : 'text-white'
                }`}
              >
                <svg width={size === 'sm' ? 10 : 14} height={size === 'sm' ? 10 : 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            )}
          </button>
        );
      })}
      {showLabels && colors[selectedIndex]?.name && (
        <span className="text-sm text-[var(--text-secondary)] ml-1">{colors[selectedIndex].name}</span>
      )}
    </div>
  );
}
