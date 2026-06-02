'use client';

import { useState } from 'react';
import { COLLECTION_FILTER_GROUPS, type FilterGroup } from '@/lib/collection-filters';
import { cn } from '@/lib/utils';

type Draft = Record<string, string | string[] | boolean>;

type Props = {
  draft: Draft;
  onChange: (draft: Draft) => void;
  onClear: () => void;
  onApply: () => void;
  resultCount: number;
  className?: string;
};

function FilterSection({
  group,
  draft,
  onChange,
}: {
  group: FilterGroup;
  draft: Draft;
  onChange: (d: Draft) => void;
}) {
  const [open, setOpen] = useState(true);
  const key = group.paramKey || group.id;

  const toggleCheckbox = (value: string) => {
    const current = (draft[key] as string[]) || [];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    onChange({ ...draft, [key]: next });
  };

  if (group.type === 'toggle') {
    const on = Boolean(draft[key]);
    return (
      <div className="border-b border-[#E8E4DF] py-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.15em] font-semibold text-[#111]">{group.label}</span>
          <button
            type="button"
            role="switch"
            aria-checked={on}
            onClick={() => onChange({ ...draft, [key]: !on })}
            className={cn('w-10 h-5 relative transition-colors', on ? 'bg-[#111]' : 'bg-[#E8E4DF]')}
          >
            <span
              className={cn(
                'absolute top-0.5 w-4 h-4 bg-white transition-all',
                on ? 'left-[22px]' : 'left-0.5'
              )}
            />
          </button>
        </div>
      </div>
    );
  }

  if (group.type === 'price-range') {
    const min = Number(draft.minPrice) || 0;
    const max = Number(draft.maxPrice) || 15000;
    return (
      <div className="border-b border-[#E8E4DF] py-4">
        <button type="button" className="w-full flex justify-between items-center mb-4" onClick={() => setOpen(!open)}>
          <span className="text-[11px] uppercase tracking-[0.15em] font-semibold">{group.label}</span>
          <Chevron open={open} />
        </button>
        {open && (
          <div className="space-y-3">
            <input
              type="range"
              min={0}
              max={15000}
              step={100}
              value={max}
              onChange={(e) => onChange({ ...draft, maxPrice: e.target.value, minPrice: String(min) })}
              className="w-full accent-[#111]"
            />
            <div className="flex gap-2 text-xs">
              <input
                type="number"
                value={min}
                onChange={(e) => onChange({ ...draft, minPrice: e.target.value })}
                className="w-full border border-[#E8E4DF] px-2 py-1.5 text-center"
              />
              <span className="text-[#999] self-center">—</span>
              <input
                type="number"
                value={max}
                onChange={(e) => onChange({ ...draft, maxPrice: e.target.value })}
                className="w-full border border-[#E8E4DF] px-2 py-1.5 text-center"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="border-b border-[#E8E4DF] py-4">
      <button type="button" className="w-full flex justify-between items-center mb-3" onClick={() => setOpen(!open)}>
        <span className="text-[11px] uppercase tracking-[0.15em] font-semibold text-[#111]">{group.label}</span>
        <Chevron open={open} />
      </button>
      {open && (
        <>
          {group.type === 'size-buttons' && (
            <div className="flex flex-wrap gap-1.5">
              {group.options?.map((opt) => {
                const selected = ((draft.size as string[]) || []).includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleCheckbox(opt.value)}
                    className={cn(
                      'min-w-[40px] h-8 text-[11px] border transition-colors',
                      selected ? 'bg-[#111] text-white border-[#111]' : 'border-[#E8E4DF] text-[#111] hover:border-[#111]'
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}
          {group.type === 'color-swatches' && (
            <div className="flex flex-wrap gap-2">
              {group.options?.map((opt) => {
                const selected = ((draft.color as string[]) || []).includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    title={opt.label}
                    onClick={() => toggleCheckbox(opt.value)}
                    className="relative w-4 h-4 rounded-full border border-[#ccc]"
                    style={{ backgroundColor: opt.value }}
                  >
                    {selected && (
                      <span className="absolute inset-0 flex items-center justify-center text-[8px] text-white mix-blend-difference">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {group.type === 'checkbox' && (
            <ul className="space-y-2 max-h-[200px] overflow-y-auto">
              {group.options?.map((opt) => {
                const checked = ((draft[key] as string[]) || []).includes(opt.value);
                return (
                  <li key={opt.value}>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-[#333]">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCheckbox(opt.value)}
                        className="w-4 h-4 accent-[#111]"
                      />
                      <span>
                        {opt.label}
                        {opt.count != null && <span className="text-[#999] ml-1">({opt.count})</span>}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={cn('transition-transform', open && 'rotate-180')}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export default function CollectionFilterSidebar({
  draft,
  onChange,
  onClear,
  onApply,
  resultCount,
  className,
}: Props) {
  return (
    <aside className={cn('flex flex-col', className)}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[#111]">FILTERS</span>
        <button type="button" onClick={onClear} className="text-[11px] uppercase tracking-wider underline text-[#666]">
          CLEAR ALL
        </button>
      </div>
      <div className="flex-1 overflow-y-auto pr-2 -mr-2">
        {COLLECTION_FILTER_GROUPS.map((g) => (
          <FilterSection key={g.id} group={g} draft={draft} onChange={onChange} />
        ))}
      </div>
      <button
        type="button"
        onClick={onApply}
        className="mt-6 w-full bg-[#111] text-white text-[11px] uppercase tracking-[0.15em] py-4 font-semibold hover:bg-black/90 sticky bottom-0"
      >
        VIEW {resultCount} RESULTS
      </button>
    </aside>
  );
}
