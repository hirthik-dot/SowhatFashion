'use client';

import { useEffect, useState } from 'react';
import { adminGetSidebarConfig } from '@/lib/api';
import type { SidebarFilterConfig } from '@/lib/sidebar-filters';

type Props = {
  filterTags: Record<string, string[]>;
  onChange: (filterTags: Record<string, string[]>) => void;
  productHints?: {
    category?: string;
    subCategory?: string;
    tags?: string[];
    sizes?: string[];
    isFeatured?: boolean;
    isNewArrival?: boolean;
  };
};

const SKIP_KEYS = new Set(['price']);

export default function ProductFilterAssignments({ filterTags, onChange, productHints }: Props) {
  const [filters, setFilters] = useState<SidebarFilterConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminGetSidebarConfig()
      .then((data) =>
        setFilters(
          (data.filters || []).filter(
            (f: SidebarFilterConfig) =>
              f.isVisible && (f.type !== 'range_slider') && !SKIP_KEYS.has(f.filterKey),
          ),
        ),
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = (filterKey: string, value: string, single = false) => {
    const current = filterTags[filterKey] || [];
    let next: string[];
    if (single) {
      next = current.includes(value) ? [] : [value];
    } else {
      next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    }
    onChange({ ...filterTags, [filterKey]: next });
  };

  if (loading) {
    return <p className="text-xs text-[var(--text-secondary)]">Loading filter options…</p>;
  }

  if (!filters.length) {
    return (
      <p className="text-sm text-[var(--text-secondary)]">
        No filters configured. Add filters in{' '}
        <a href="/admin/layout/catalogue" className="text-[var(--gold)] underline">
          Catalogue Layout → Sidebar Filters
        </a>
        . When left empty here, assignments are inferred from category, sizes, tags, and flags on save.
      </p>
    );
  }

  const hasAny = Object.values(filterTags).some((v) => v?.length);

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--text-secondary)]">
        {hasAny
          ? 'Manual selections override auto-assigned values for those filters.'
          : 'Leave all unchecked to auto-assign from category, sizes, tags, and product flags when you save.'}
      </p>
      {filters.map((f) => (
        <div key={f.id} className="border border-[var(--border)] rounded p-3">
          <p className="text-xs font-bold uppercase tracking-wider mb-2">{f.label}</p>
          <div className="flex flex-wrap gap-2">
            {(f.options || []).map((opt) => {
              const selected = (filterTags[f.filterKey] || []).includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggle(f.filterKey, opt.value, f.type === 'radio_list')}
                  className={`text-xs px-3 py-1.5 border rounded transition-colors ${
                    selected
                      ? 'bg-[#111] text-white border-[#111]'
                      : 'border-[var(--border)] hover:border-[#111]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {productHints?.category && (
        <p className="text-[10px] text-[var(--text-secondary)]">
          Auto will use category “{productHints.category}”
          {productHints.sizes?.length ? `, sizes ${productHints.sizes.join(', ')}` : ''}
          {productHints.isNewArrival ? ', new arrival' : ''}
          {productHints.isFeatured ? ', featured' : ''}.
        </p>
      )}
    </div>
  );
}
