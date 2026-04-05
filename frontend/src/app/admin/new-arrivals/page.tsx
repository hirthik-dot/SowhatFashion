'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AdminHeader from '@/components/admin/AdminHeader';
import {
  adminListNewArrivals,
  adminAddNewArrival,
  adminDeleteNewArrival,
  adminReorderNewArrivals,
  adminToggleNewArrival,
} from '@/lib/api';
import Image from 'next/image';

function SortableRow({
  row,
  onToggle,
  onDelete,
}: {
  row: any;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: row._id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const p = row.product;
  if (!p) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 border border-[var(--border)] rounded-lg bg-white px-4 py-3"
    >
      <button type="button" className="text-gray-400 cursor-grab touch-none px-1" {...attributes} {...listeners}>
        ≡
      </button>
      <div className="relative w-14 h-14 rounded overflow-hidden bg-gray-100 shrink-0">
        <Image src={p.images?.[0] || '/placeholder.jpg'} alt="" fill className="object-cover" sizes="56px" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{p.name}</div>
        <div className="text-xs text-[var(--text-secondary)]">
          ₹{p.discountPrice || p.price} · {row.weekLabel} · Added {new Date(row.addedAt).toLocaleDateString()}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onToggle(row._id)}
        className={`text-sm px-2 ${row.isActive ? 'text-green-600' : 'text-gray-400'}`}
        title="Toggle visibility"
      >
        {row.isActive ? 'ON' : 'OFF'}
      </button>
      <button type="button" onClick={() => onDelete(row._id)} className="text-red-400 hover:text-red-600 text-sm px-2">
        🗑
      </button>
    </div>
  );
}

export default function AdminNewArrivalsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [weekLabel, setWeekLabel] = useState('This Week');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [existingIds, setExistingIds] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const load = useCallback(async () => {
    const data = await adminListNewArrivals();
    setRows(Array.isArray(data) ? data : []);
    setExistingIds(new Set((Array.isArray(data) ? data : []).map((r: any) => String(r.product?._id || r.product))));
  }, []);

  useEffect(() => {
    load().catch(() => {}).finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const res = await fetch(`${API}/api/products?search=${encodeURIComponent(search)}&limit=30`);
        const data = await res.json();
        setSearchResults(data.products || []);
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const saveOrder = async () => {
    try {
      const payload = rows.map((r, i) => ({ id: r._id, order: i }));
      await adminReorderNewArrivals(payload);
      setToast('Order saved');
      setTimeout(() => setToast(''), 2000);
    } catch {
      alert('Failed to save order');
    }
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setRows((items) => {
      const oldIndex = items.findIndex((x) => x._id === active.id);
      const newIndex = items.findIndex((x) => x._id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const toggle = async (id: string) => {
    try {
      const updated = await adminToggleNewArrival(id);
      setRows((prev) => prev.map((r) => (r._id === id ? updated : r)));
    } catch {
      alert('Toggle failed');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Remove from new arrivals?')) return;
    try {
      await adminDeleteNewArrival(id);
      await load();
    } catch {
      alert('Delete failed');
    }
  };

  const bulkAdd = async () => {
    try {
      for (const id of selected) {
        await adminAddNewArrival(id, weekLabel);
      }
      setModalOpen(false);
      setSelected(new Set());
      setSearch('');
      await load();
    } catch (e: any) {
      alert(e?.message || 'Some products could not be added (duplicates skipped)');
      await load();
    }
  };

  return (
    <div>
      <AdminHeader title="New Arrivals" />
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl font-bold font-playfair">Homepage new arrivals</h2>
            <p className="text-sm text-[var(--text-secondary)]">Drag to reorder. Toggle controls the live homepage.</p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="bg-[var(--gold)] text-black font-bold px-6 py-2.5 text-sm uppercase rounded-md"
          >
            + Add products
          </button>
        </div>

        {loading ? (
          <p>Loading…</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={rows.map((r) => r._id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2 mb-6">
                {rows.map((row) => (
                  <SortableRow key={row._id} row={row} onToggle={toggle} onDelete={remove} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <button
          type="button"
          onClick={saveOrder}
          className="bg-black text-white font-bold px-8 py-3 text-sm uppercase rounded-md"
        >
          Save order
        </button>

        {toast && (
          <div className="fixed bottom-8 right-8 bg-black text-white px-6 py-3 rounded-lg text-sm z-50">{toast}</div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold">Add new arrivals</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-gray-500">
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-[var(--text-secondary)]">Week label</label>
                <input
                  value={weekLabel}
                  onChange={(e) => setWeekLabel(e.target.value)}
                  className="mt-1 w-full border border-[var(--border)] rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-[var(--text-secondary)]">Search products</label>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Type to search…"
                  className="mt-1 w-full border border-[var(--border)] rounded px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto border border-[var(--border)] rounded p-2">
                {searchResults.map((p) => {
                  const inList = existingIds.has(String(p._id));
                  const isSel = selected.has(String(p._id));
                  return (
                    <label
                      key={p._id}
                      className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-gray-50 ${inList ? 'opacity-50' : ''}`}
                    >
                      <input
                        type="checkbox"
                        disabled={inList}
                        checked={isSel}
                        onChange={() => {
                          setSelected((prev) => {
                            const n = new Set(prev);
                            if (n.has(p._id)) n.delete(p._id);
                            else n.add(p._id);
                            return n;
                          });
                        }}
                      />
                      <span className="text-sm flex-1 truncate">
                        {p.name} · ₹{p.price}
                        {inList && ' ✓'}
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="text-sm text-[var(--text-secondary)]">Selected: {selected.size}</p>
            </div>
            <div className="p-4 border-t flex gap-3 justify-end">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border rounded text-sm">
                Cancel
              </button>
              <button
                type="button"
                onClick={bulkAdd}
                disabled={selected.size === 0}
                className="px-4 py-2 bg-[var(--gold)] text-black font-bold text-sm rounded disabled:opacity-40"
              >
                Add selected
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
