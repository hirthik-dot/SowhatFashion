'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  adminGetMegaDropdown,
  adminUpdateMegaDropdown,
  adminGetSidebarConfig,
  adminUpdateSidebarConfig,
  getCategories,
} from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
type DropdownItem = { label: string; filterKey: string; filterValue: string };
type DropdownColumn = { header: string; items: DropdownItem[] };

type FilterOption = { label: string; value: string; count?: number };
type RangeConfig = { min: number; max: number; step: number; prefix: string };
type SidebarFilter = {
  id: string;
  label: string;
  type: 'range_slider' | 'checkbox_list' | 'radio_list';
  filterKey: string;
  isVisible: boolean;
  order: number;
  options?: FilterOption[];
  rangeConfig?: RangeConfig;
};

const FALLBACK_CATEGORIES = ['tshirts', 'shirts', 'pants', 'offers', 'sale'] as const;
const CAT_LABELS: Record<string, string> = {
  tshirts: 'T-Shirts', shirts: 'Shirts', pants: 'Pants', offers: 'Offers', sale: 'Sale',
  tshirt: 'T-Shirts', shirt: 'Shirts', pant: 'Pants',
};

// ─── Main Admin Page ──────────────────────────────────────────────────────────
export default function CatalogueLayoutAdmin() {
  const [activeTab, setActiveTab] = useState<'dropdowns' | 'filters' | 'sections'>('dropdowns');

  const tabs = [
    { key: 'dropdowns' as const, label: 'Mega Dropdowns' },
    { key: 'filters' as const, label: 'Sidebar Filters' },
    { key: 'sections' as const, label: 'Homepage Sections' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <h1 className="text-2xl font-bold font-playfair mb-1">Catalogue Layout</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-6">Customize the Catalogue homepage navigation, filters, and sections.</p>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-8">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-md transition-all ${
              activeTab === t.key ? 'bg-white shadow-sm text-black' : 'text-[var(--text-secondary)] hover:text-black'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'dropdowns' && <MegaDropdownEditor />}
      {activeTab === 'filters' && <SidebarFilterEditor />}
      {activeTab === 'sections' && <HomepageSectionsEditor />}
    </div>
  );
}

// ─── Tab 1: Mega Dropdown Editor ──────────────────────────────────────────────
function MegaDropdownEditor() {
  const [selectedCat, setSelectedCat] = useState<string>('tshirts');
  const [columns, setColumns] = useState<DropdownColumn[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [dbCategories, setDbCategories] = useState<any[]>([]);

  // Fetch categories from DB
  useEffect(() => {
    getCategories().then(res => {
      if (Array.isArray(res) && res.length > 0) {
        setDbCategories(res);
        // Set initial selected category from DB
        if (!selectedCat || selectedCat === 'tshirts') {
          setSelectedCat(res[0].slug);
        }
      }
    }).catch(() => {});
  }, []);

  // Categories list: use DB categories if available, otherwise fallback
  const categoryList = dbCategories.length > 0
    ? dbCategories.map(c => ({ slug: c.slug, name: c.name, subCategories: c.subCategories || [] }))
    : FALLBACK_CATEGORIES.map(c => ({ slug: c, name: CAT_LABELS[c] || c, subCategories: [] }));

  const loadDropdown = useCallback(async (cat: string) => {
    setLoading(true);
    try {
      const data = await adminGetMegaDropdown(cat);
      setColumns(data.columns || []);
    } catch {
      setColumns([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadDropdown(selectedCat); }, [selectedCat, loadDropdown]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminUpdateMegaDropdown(selectedCat, columns);
      setToast('Saved successfully!');
      setTimeout(() => setToast(''), 2000);
    } catch {
      setToast('Failed to save');
    }
    setSaving(false);
  };

  const addColumn = () => {
    setColumns([...columns, { header: 'New Column', items: [] }]);
  };

  const removeColumn = (idx: number) => {
    setColumns(columns.filter((_, i) => i !== idx));
  };

  const updateColumnHeader = (idx: number, header: string) => {
    const copy = [...columns];
    copy[idx] = { ...copy[idx], header };
    setColumns(copy);
  };

  const addItem = (colIdx: number) => {
    const copy = [...columns];
    copy[colIdx].items.push({ label: 'New Item', filterKey: 'key', filterValue: 'value' });
    setColumns(copy);
  };

  const removeItem = (colIdx: number, itemIdx: number) => {
    const copy = [...columns];
    copy[colIdx].items = copy[colIdx].items.filter((_, i) => i !== itemIdx);
    setColumns(copy);
  };

  const updateItem = (colIdx: number, itemIdx: number, field: keyof DropdownItem, value: string) => {
    const copy = [...columns];
    copy[colIdx].items[itemIdx] = { ...copy[colIdx].items[itemIdx], [field]: value };
    setColumns(copy);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold">Mega Dropdown Editor</h2>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">Category:</label>
          <select
            value={selectedCat}
            onChange={e => setSelectedCat(e.target.value)}
            className="border border-[var(--border)] rounded-md px-3 py-2 text-sm font-medium bg-white focus:outline-none focus:border-[var(--gold)]"
          >
            {categoryList.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="mb-4">
            <button onClick={addColumn} className="text-sm font-semibold text-[var(--gold)] hover:underline flex items-center gap-1">
              <span className="text-lg leading-none">+</span> Add Column
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {columns.map((col, ci) => (
              <div key={ci} className="border border-[var(--border)] rounded-lg bg-white p-4">
                <div className="flex items-center gap-2 mb-4">
                  <input
                    value={col.header}
                    onChange={e => updateColumnHeader(ci, e.target.value)}
                    className="flex-1 border border-[var(--border)] rounded px-3 py-1.5 text-sm font-semibold focus:outline-none focus:border-[var(--gold)]"
                  />
                  <button onClick={() => removeColumn(ci)} className="text-red-400 hover:text-red-600 p-1" title="Delete column">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>

                <div className="space-y-2 mb-3">
                  {col.items.map((item, ii) => (
                    <div key={ii} className="flex gap-1.5 items-start bg-gray-50 rounded p-2">
                      <div className="flex-1 space-y-1">
                        <input value={item.label} onChange={e => updateItem(ci, ii, 'label', e.target.value)} placeholder="Label" className="w-full px-2 py-1 text-xs border border-[var(--border)] rounded focus:outline-none focus:border-[var(--gold)]" />
                        <div className="flex gap-1">
                          <input value={item.filterKey} onChange={e => updateItem(ci, ii, 'filterKey', e.target.value)} placeholder="filterKey" className="w-1/2 px-2 py-1 text-xs border border-[var(--border)] rounded focus:outline-none focus:border-[var(--gold)] text-[var(--text-secondary)]" />
                          <input value={item.filterValue} onChange={e => updateItem(ci, ii, 'filterValue', e.target.value)} placeholder="filterValue" className="w-1/2 px-2 py-1 text-xs border border-[var(--border)] rounded focus:outline-none focus:border-[var(--gold)] text-[var(--text-secondary)]" />
                        </div>
                      </div>
                      <button onClick={() => removeItem(ci, ii)} className="text-red-300 hover:text-red-500 mt-1 shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  ))}
                </div>

                <button onClick={() => addItem(ci)} className="text-xs text-[var(--gold)] hover:underline font-medium">
                  + Add item
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[var(--gold)] text-black font-bold px-8 py-3 text-sm uppercase hover:opacity-90 disabled:opacity-50 rounded-md"
          >
            {saving ? 'Saving...' : 'Save Dropdown'}
          </button>
        </>
      )}

      {/* Subcategories from Category Collection */}
      {(() => {
        const found = categoryList.find(c => c.slug === selectedCat);
        if (!found?.subCategories?.length) return null;
        return (
          <div className="mt-8 border border-[var(--border)] rounded-lg bg-white p-5">
            <h3 className="font-bold text-sm mb-3">Subcategories for {found.name} <span className="text-xs font-normal text-[var(--text-secondary)]">(from Category DB — manage in Categories page)</span></h3>
            <div className="flex flex-wrap gap-2">
              {found.subCategories.map((sub: any) => (
                <span key={sub.slug} className="text-xs bg-gray-100 border border-[var(--border)] rounded-full px-3 py-1.5 text-[var(--text-secondary)] font-medium">
                  {sub.name} <span className="text-gray-400">({sub.slug})</span>
                  {sub.megaDropdownLabel && <span className="ml-1 text-[10px] bg-gray-200 px-1 rounded">{sub.megaDropdownLabel}</span>}
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      {toast && (
        <div className="fixed bottom-8 right-8 bg-black text-white px-6 py-3 rounded-lg shadow-xl text-sm font-medium animate-fade-in z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

// ─── Tab 2: Sidebar Filter Editor ─────────────────────────────────────────────
function SidebarFilterEditor() {
  const [filters, setFilters] = useState<SidebarFilter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [editingOptions, setEditingOptions] = useState<string | null>(null); // filter id being edited
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await adminGetSidebarConfig();
        setFilters(data.filters || []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminUpdateSidebarConfig(filters);
      setToast('Saved successfully!');
      setTimeout(() => setToast(''), 2000);
    } catch {
      setToast('Failed to save');
    }
    setSaving(false);
  };

  const toggleVisibility = (id: string) => {
    setFilters(filters.map(f => f.id === id ? { ...f, isVisible: !f.isVisible } : f));
  };

  const removeFilter = (id: string) => {
    setFilters(filters.filter(f => f.id !== id));
  };

  const moveFilter = (idx: number, dir: -1 | 1) => {
    if ((dir === -1 && idx === 0) || (dir === 1 && idx === filters.length - 1)) return;
    const copy = [...filters];
    const tmp = copy[idx];
    copy[idx] = copy[idx + dir];
    copy[idx + dir] = tmp;
    copy.forEach((f, i) => { f.order = i; });
    setFilters(copy);
  };

  const addFilter = (newFilter: SidebarFilter) => {
    setFilters([...filters, { ...newFilter, order: filters.length }]);
    setShowAddModal(false);
  };

  const updateFilterOptions = (id: string, options: FilterOption[]) => {
    setFilters(filters.map(f => f.id === id ? { ...f, options } : f));
    setEditingOptions(null);
  };

  const updateRangeConfig = (id: string, field: keyof RangeConfig, value: number | string) => {
    setFilters(filters.map(f => {
      if (f.id !== id) return f;
      return { ...f, rangeConfig: { ...f.rangeConfig!, [field]: field === 'prefix' ? value : Number(value) } };
    }));
  };

  const TYPE_LABELS: Record<string, string> = {
    range_slider: 'Range Slider',
    checkbox_list: 'Checkbox List',
    radio_list: 'Radio Buttons',
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold">Sidebar Filters Editor</h2>
        <button onClick={() => setShowAddModal(true)} className="text-sm font-semibold text-[var(--gold)] hover:underline">+ Add Filter</button>
      </div>

      <div className="space-y-3 mb-8">
        {filters.map((f, idx) => (
          <div key={f.id} className="border border-[var(--border)] rounded-lg bg-white p-4">
            <div className="flex items-center gap-3">
              {/* Drag handle + order buttons */}
              <div className="flex flex-col gap-0.5 text-gray-300">
                <button onClick={() => moveFilter(idx, -1)} className="hover:text-gray-600 text-xs leading-none">▲</button>
                <button onClick={() => moveFilter(idx, 1)} className="hover:text-gray-600 text-xs leading-none">▼</button>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm">{f.label}</span>
                  <span className="text-xs bg-gray-100 rounded px-2 py-0.5 text-[var(--text-secondary)] font-medium">{TYPE_LABELS[f.type]}</span>
                  <span className="text-xs text-[var(--text-secondary)]">key: {f.filterKey}</span>
                </div>

                {/* Range config inline */}
                {f.type === 'range_slider' && f.rangeConfig && (
                  <div className="flex gap-3 mt-2 text-xs">
                    <label className="flex items-center gap-1">Min: <input type="number" value={f.rangeConfig.min} onChange={e => updateRangeConfig(f.id, 'min', e.target.value)} className="w-16 border border-[var(--border)] rounded px-1 py-0.5 text-xs" /></label>
                    <label className="flex items-center gap-1">Max: <input type="number" value={f.rangeConfig.max} onChange={e => updateRangeConfig(f.id, 'max', e.target.value)} className="w-16 border border-[var(--border)] rounded px-1 py-0.5 text-xs" /></label>
                    <label className="flex items-center gap-1">Step: <input type="number" value={f.rangeConfig.step} onChange={e => updateRangeConfig(f.id, 'step', e.target.value)} className="w-14 border border-[var(--border)] rounded px-1 py-0.5 text-xs" /></label>
                    <label className="flex items-center gap-1">Prefix: <input type="text" value={f.rangeConfig.prefix} onChange={e => updateRangeConfig(f.id, 'prefix', e.target.value)} className="w-10 border border-[var(--border)] rounded px-1 py-0.5 text-xs" /></label>
                  </div>
                )}

                {/* Checkbox/Radio options preview */}
                {(f.type === 'checkbox_list' || f.type === 'radio_list') && f.options && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {f.options.slice(0, 5).map(o => (
                      <span key={o.value} className="text-xs bg-gray-100 rounded px-2 py-0.5 text-[var(--text-secondary)]">{o.label}</span>
                    ))}
                    {f.options.length > 5 && <span className="text-xs text-gray-400">+{f.options.length - 5} more</span>}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {(f.type === 'checkbox_list' || f.type === 'radio_list') && (
                  <button onClick={() => setEditingOptions(f.id)} className="text-xs text-[var(--gold)] hover:underline font-medium">Edit Options</button>
                )}
                <button onClick={() => toggleVisibility(f.id)} className={`text-sm ${f.isVisible ? 'text-green-600' : 'text-gray-300'}`} title={f.isVisible ? 'Visible' : 'Hidden'}>
                  👁
                </button>
                <button onClick={() => removeFilter(f.id)} className="text-red-300 hover:text-red-500">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={handleSave} disabled={saving} className="bg-[var(--gold)] text-black font-bold px-8 py-3 text-sm uppercase hover:opacity-90 disabled:opacity-50 rounded-md">
        {saving ? 'Saving...' : 'Save Filter Config'}
      </button>

      {/* Edit Options Modal */}
      {editingOptions && <EditOptionsModal filter={filters.find(f => f.id === editingOptions)!} onSave={(opts) => updateFilterOptions(editingOptions, opts)} onClose={() => setEditingOptions(null)} />}

      {/* Add Filter Modal */}
      {showAddModal && <AddFilterModal onAdd={addFilter} onClose={() => setShowAddModal(false)} />}

      {toast && <div className="fixed bottom-8 right-8 bg-black text-white px-6 py-3 rounded-lg shadow-xl text-sm font-medium animate-fade-in z-50">{toast}</div>}
    </div>
  );
}

// ─── Edit Options Modal ───────────────────────────────────────────────────────
function EditOptionsModal({ filter, onSave, onClose }: { filter: SidebarFilter; onSave: (opts: FilterOption[]) => void; onClose: () => void }) {
  const [options, setOptions] = useState<FilterOption[]>(filter.options || []);

  const addOption = () => setOptions([...options, { label: '', value: '' }]);
  const removeOption = (i: number) => setOptions(options.filter((_, idx) => idx !== i));
  const updateOption = (i: number, field: 'label' | 'value', val: string) => {
    const copy = [...options];
    copy[i] = { ...copy[i], [field]: val };
    setOptions(copy);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h3 className="font-bold text-sm mb-4">Edit: {filter.label} Options</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={o.label} onChange={e => updateOption(i, 'label', e.target.value)} placeholder="Label" className="flex-1 border border-[var(--border)] rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--gold)]" />
              <input value={o.value} onChange={e => updateOption(i, 'value', e.target.value)} placeholder="filterValue" className="w-28 border border-[var(--border)] rounded px-3 py-1.5 text-sm text-[var(--text-secondary)] focus:outline-none focus:border-[var(--gold)]" />
              <button onClick={() => removeOption(i)} className="text-red-300 hover:text-red-500">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          ))}
        </div>
        <button onClick={addOption} className="text-sm text-[var(--gold)] hover:underline mb-4 block">+ Add Option</button>
        <div className="flex gap-3">
          <button onClick={() => onSave(options)} className="flex-1 bg-[var(--gold)] text-black font-bold py-2.5 text-sm uppercase rounded-md">Save</button>
          <button onClick={onClose} className="flex-1 border border-[var(--border)] text-[var(--text-secondary)] font-bold py-2.5 text-sm uppercase rounded-md">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Filter Modal ─────────────────────────────────────────────────────────
function AddFilterModal({ onAdd, onClose }: { onAdd: (f: SidebarFilter) => void; onClose: () => void }) {
  const [label, setLabel] = useState('');
  const [type, setType] = useState<'range_slider' | 'checkbox_list' | 'radio_list'>('checkbox_list');
  const [filterKey, setFilterKey] = useState('');

  const handleAdd = () => {
    if (!label || !filterKey) return;
    const newFilter: SidebarFilter = {
      id: filterKey + '-' + Date.now(),
      label,
      type,
      filterKey,
      isVisible: true,
      order: 0,
      ...(type === 'range_slider' ? { rangeConfig: { min: 0, max: 5000, step: 50, prefix: '₹' } } : { options: [] }),
    };
    onAdd(newFilter);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <h3 className="font-bold text-sm mb-4">Add New Filter</h3>
        <div className="space-y-3 mb-6">
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Label</label>
            <input value={label} onChange={e => setLabel(e.target.value)} className="w-full border border-[var(--border)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--gold)]" />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Type</label>
            <select value={type} onChange={e => setType(e.target.value as any)} className="w-full border border-[var(--border)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--gold)]">
              <option value="checkbox_list">Checkbox</option>
              <option value="range_slider">Range Slider</option>
              <option value="radio_list">Radio Buttons</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Filter key (URL param)</label>
            <input value={filterKey} onChange={e => setFilterKey(e.target.value)} className="w-full border border-[var(--border)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--gold)]" placeholder="e.g. size, color" />
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={handleAdd} className="flex-1 bg-[var(--gold)] text-black font-bold py-2.5 text-sm uppercase rounded-md">Add</button>
          <button onClick={onClose} className="flex-1 border border-[var(--border)] text-[var(--text-secondary)] font-bold py-2.5 text-sm uppercase rounded-md">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 3: Homepage Sections Editor ──────────────────────────────────────────
function HomepageSectionsEditor() {
  const [sections, setSections] = useState([
    { id: 'hero', label: 'Hero Banner', visible: true, canDelete: true },
    { id: 'flash_strip', label: 'Flash Sale Strip', visible: true, canDelete: true },
    { id: 'todays_deals', label: "Today's Deals", visible: true, canDelete: true },
    { id: 'products_grid', label: 'Products Grid', visible: true, canDelete: false },
    { id: 'combo', label: 'Combo Offers', visible: true, canDelete: true },
    { id: 'new_arrivals', label: 'New Arrivals', visible: true, canDelete: true },
  ]);
  const [toast, setToast] = useState('');

  const toggle = (id: string) => {
    setSections(sections.map(s => s.id === id ? { ...s, visible: !s.visible } : s));
  };

  const remove = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
  };

  const move = (idx: number, dir: -1 | 1) => {
    if ((dir === -1 && idx === 0) || (dir === 1 && idx === sections.length - 1)) return;
    const copy = [...sections];
    [copy[idx], copy[idx + dir]] = [copy[idx + dir], copy[idx]];
    setSections(copy);
  };

  return (
    <div>
      <h2 className="text-lg font-bold mb-6">Homepage Sections (Catalogue Theme)</h2>
      <p className="text-sm text-[var(--text-secondary)] mb-4">Drag to reorder ↕</p>


      <div className="space-y-2 mb-8">
        {sections.map((s, idx) => (
          <div key={s.id} className="flex items-center gap-3 border border-[var(--border)] rounded-lg bg-white px-4 py-3">
            <div className="flex flex-col gap-0.5 text-gray-300">
              <button onClick={() => move(idx, -1)} className="hover:text-gray-600 text-xs">▲</button>
              <button onClick={() => move(idx, 1)} className="hover:text-gray-600 text-xs">▼</button>
            </div>
            <span className="text-sm text-gray-400 font-mono">≡</span>
            <span className="flex-1 text-sm font-medium">{s.label}</span>
            <button onClick={() => toggle(s.id)} className={`text-sm ${s.visible ? 'text-green-600' : 'text-gray-300'}`}>👁</button>
            {s.canDelete ? (
              <button onClick={() => remove(s.id)} className="text-red-300 hover:text-red-500">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            ) : (
              <span className="w-4" />
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => { setToast('Saved!'); setTimeout(() => setToast(''), 2000); }}
        className="bg-[var(--gold)] text-black font-bold px-8 py-3 text-sm uppercase hover:opacity-90 rounded-md"
      >
        Save Order
      </button>

      {toast && <div className="fixed bottom-8 right-8 bg-black text-white px-6 py-3 rounded-lg shadow-xl text-sm font-medium animate-fade-in z-50">{toast}</div>}
    </div>
  );
}
