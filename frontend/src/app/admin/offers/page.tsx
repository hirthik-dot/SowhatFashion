'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import AdminHeader from '@/components/admin/AdminHeader';
import { arrayMove } from '@dnd-kit/sortable';
import {
  adminGetOffers,
  adminCreateOffer,
  adminUpdateOffer,
  adminDeleteOffer,
  adminUploadImage,
  adminReorderOffers,
  adminToggleOfferField,
} from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type Template = 'fullbleed' | 'splitcard' | 'spotlight';

const emptyForm = () => ({
  title: '',
  subtitle: '',
  description: '',
  carouselTemplate: 'fullbleed' as Template,
  image: '',
  backgroundImage: '',
  accentColor: '',
  discountPercent: 0,
  discountLabel: '',
  ctaText: 'SHOP NOW',
  products: [] as string[],
  startTime: new Date().toISOString().slice(0, 16),
  endTime: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16),
  noExpiry: false,
  hasCountdown: true,
  isActive: true,
  showOnCarousel: true,
  type: 'flash' as 'flash' | 'combo' | 'seasonal',
  comboDetails: '',
});

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [productSearch, setProductSearch] = useState('');
  const [searchHits, setSearchHits] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const data = await adminGetOffers();
    setOffers(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    load().catch(() => {}).finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (!productSearch.trim()) {
      setSearchHits([]);
      return;
    }
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/api/products?search=${encodeURIComponent(productSearch)}&limit=25`);
        const data = await res.json();
        setSearchHits(data.products || []);
      } catch {
        setSearchHits([]);
      }
    }, 280);
    return () => clearTimeout(id);
  }, [productSearch]);

  const carouselLive = useMemo(() => {
    const now = Date.now();
    return offers.filter((o) => {
      if (!o.isActive || !o.showOnCarousel) return false;
      if (o.endTime && new Date(o.endTime).getTime() < now) return false;
      return true;
    });
  }, [offers]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setSelectedProducts([]);
    setProductSearch('');
    setDrawerOpen(true);
  };

  const openEdit = (o: any) => {
    setEditingId(o._id);
    setForm({
      title: o.title || '',
      subtitle: o.subtitle || '',
      description: o.description || '',
      carouselTemplate: o.carouselTemplate || 'fullbleed',
      image: o.image || '',
      backgroundImage: o.backgroundImage || '',
      accentColor: o.accentColor || '',
      discountPercent: o.discountPercent ?? 0,
      discountLabel: o.discountLabel || '',
      ctaText: o.ctaText || 'SHOP NOW',
      products: (o.products || []).map((p: any) => p._id || p),
      startTime: o.startTime ? new Date(o.startTime).toISOString().slice(0, 16) : emptyForm().startTime,
      endTime: o.endTime ? new Date(o.endTime).toISOString().slice(0, 16) : emptyForm().endTime,
      noExpiry: !o.endTime,
      hasCountdown: o.hasCountdown !== false,
      isActive: o.isActive !== false,
      showOnCarousel: !!o.showOnCarousel,
      type: o.type || 'flash',
      comboDetails: o.comboDetails || '',
    });
    setSelectedProducts((o.products || []).filter(Boolean));
    setProductSearch('');
    setDrawerOpen(true);
  };

  const persist = async () => {
    setSaving(true);
    try {
      const payload: any = {
        title: form.title,
        subtitle: form.subtitle,
        description: form.description,
        carouselTemplate: form.carouselTemplate,
        image: form.image,
        backgroundImage: form.backgroundImage,
        accentColor: form.accentColor,
        discountPercent: Number(form.discountPercent) || 0,
        discountLabel: form.discountLabel,
        ctaText: form.ctaText,
        products: form.products,
        startTime: new Date(form.startTime).toISOString(),
        endTime: form.noExpiry ? null : new Date(form.endTime).toISOString(),
        hasCountdown: form.hasCountdown,
        isActive: form.isActive,
        showOnCarousel: form.showOnCarousel,
        showOnHomepage: form.showOnCarousel,
        type: form.type,
        comboDetails: form.comboDetails,
      };
      if (editingId) {
        await adminUpdateOffer(editingId, payload);
      } else {
        await adminCreateOffer(payload);
      }
      setDrawerOpen(false);
      await load();
    } catch (e) {
      console.error(e);
      alert('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const removeOffer = async (id: string) => {
    if (!confirm('Delete this offer?')) return;
    try {
      await adminDeleteOffer(id);
      await load();
    } catch {
      alert('Delete failed');
    }
  };

  const moveCarousel = async (id: string, dir: -1 | 1) => {
    const carousel = [...offers].filter((o) => o.showOnCarousel).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const idx = carousel.findIndex((o) => o._id === id);
    const sw = idx + dir;
    if (idx < 0 || sw < 0 || sw >= carousel.length) return;
    const reordered = arrayMove(carousel, idx, sw);
    const payload = reordered.map((o, i) => ({ id: o._id, order: i }));
    try {
      await adminReorderOffers(payload);
      await load();
    } catch {
      alert('Reorder failed');
    }
  };

  const uploadField = async (field: 'image' | 'backgroundImage', file: File) => {
    const res = await adminUploadImage(file);
    if (res?.url) setForm((f) => ({ ...f, [field]: res.url }));
  };

  const addProduct = (p: any) => {
    if (form.products.includes(p._id)) return;
    setForm((f) => ({ ...f, products: [...f.products, p._id] }));
    setSelectedProducts((prev) => [...prev, p]);
    setProductSearch('');
    setSearchHits([]);
  };

  const removeProduct = (id: string) => {
    setForm((f) => ({ ...f, products: f.products.filter((x) => x !== id) }));
    setSelectedProducts((prev) => prev.filter((p) => p._id !== id));
  };

  return (
    <div>
      <AdminHeader title="Offers" />
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold font-playfair">Offers & carousel</h2>
          <button type="button" onClick={openCreate} className="btn-gold rounded px-6 py-2.5 text-sm font-bold">
            + Create
          </button>
        </div>

        <div className="mb-10 border border-[var(--border)] rounded-xl p-4 bg-white">
          <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-[var(--text-secondary)]">
            Active carousel ({carouselLive.length} live)
          </h3>
          <div className="flex flex-wrap gap-4">
            {carouselLive.map((o) => (
              <div key={o._id} className="border border-[var(--border)] rounded-lg p-3 w-[200px] bg-[var(--surface)]">
                <div className="relative h-24 bg-gray-100 mb-2 rounded overflow-hidden">
                  {o.image ? (
                    <Image src={o.image} alt="" fill className="object-cover" sizes="200px" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-gray-400">No image</div>
                  )}
                </div>
                <div className="text-xs font-bold truncate">{o.title}</div>
                <div className="text-[10px] text-[var(--text-secondary)]">{o.carouselTemplate}</div>
                <div className="flex gap-2 mt-2">
                  <button type="button" className="text-xs text-[var(--gold)] font-bold" onClick={() => openEdit(o)}>
                    Edit
                  </button>
                  <button type="button" className="text-xs" onClick={() => moveCarousel(o._id, -1)}>
                    ↑
                  </button>
                  <button type="button" className="text-xs" onClick={() => moveCarousel(o._id, 1)}>
                    ↓
                  </button>
                </div>
              </div>
            ))}
            {carouselLive.length === 0 && <p className="text-sm text-[var(--text-secondary)]">No slides on carousel.</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[var(--border)] overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[640px]">
            <thead className="bg-gray-50 border-b text-xs uppercase text-[var(--text-secondary)]">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Template</th>
                <th className="px-4 py-3">Carousel</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center">
                    Loading…
                  </td>
                </tr>
              ) : (
                offers.map((o) => (
                  <tr key={o._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{o.title}</td>
                    <td className="px-4 py-3">{o.carouselTemplate}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={async () => {
                          await adminToggleOfferField(o._id, 'showOnCarousel');
                          await load();
                        }}
                        className={o.showOnCarousel ? 'text-green-600 font-bold' : 'text-gray-400'}
                      >
                        {o.showOnCarousel ? 'ON' : 'OFF'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={async () => {
                          await adminToggleOfferField(o._id, 'isActive');
                          await load();
                        }}
                        className={o.isActive ? 'text-green-600 font-bold' : 'text-gray-400'}
                      >
                        {o.isActive ? 'ON' : 'OFF'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button type="button" className="text-[var(--gold)] font-semibold" onClick={() => openEdit(o)}>
                        Edit
                      </button>
                      <button type="button" className="text-red-500 font-semibold" onClick={() => removeOffer(o._id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="w-full max-w-[700px] bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
              <h2 className="text-lg font-bold font-playfair">{editingId ? 'Edit offer' : 'Create offer'}</h2>
              <button type="button" onClick={() => setDrawerOpen(false)} className="text-2xl leading-none text-gray-500">
                ×
              </button>
            </div>

            <div className="p-6 space-y-8 flex-1">
              <section>
                <h3 className="text-xs font-bold uppercase text-[var(--text-secondary)] mb-3">Basic</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold">Title *</label>
                    <input
                      className="w-full border border-[var(--border)] rounded px-3 py-2 mt-1"
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold">Subtitle</label>
                    <input
                      className="w-full border border-[var(--border)] rounded px-3 py-2 mt-1"
                      value={form.subtitle}
                      onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold">Description</label>
                    <textarea
                      className="w-full border border-[var(--border)] rounded px-3 py-2 mt-1 min-h-[80px]"
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase text-[var(--text-secondary)] mb-3">Carousel template *</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(
                    [
                      ['fullbleed', 'Full bleed'],
                      ['splitcard', 'Split card'],
                      ['spotlight', 'Spotlight'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, carouselTemplate: id }))}
                      className={`border-2 rounded-lg p-4 text-left text-sm font-semibold transition-colors ${
                        form.carouselTemplate === id ? 'border-[var(--gold)] bg-[var(--surface)]' : 'border-[var(--border)]'
                      }`}
                    >
                      <div className="h-16 bg-gray-100 rounded mb-2 flex items-center justify-center text-[10px] text-gray-500">
                        Preview
                      </div>
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase text-[var(--text-secondary)] mb-3">Offer image *</h3>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-[var(--border)] rounded-lg py-8 cursor-pointer hover:border-[var(--gold)]">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadField('image', f);
                    }}
                  />
                  <span className="text-sm font-medium">Upload image</span>
                  {form.image && (
                    <div className="relative w-full h-32 mt-4 mx-4">
                      <Image src={form.image} alt="" fill className="object-contain" sizes="400px" />
                    </div>
                  )}
                </label>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase text-[var(--text-secondary)] mb-3">Discount</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs">Discount %</label>
                    <input
                      type="number"
                      className="w-full border rounded px-3 py-2 mt-1"
                      value={form.discountPercent}
                      onChange={(e) => setForm((f) => ({ ...f, discountPercent: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs">Custom label (overrides %)</label>
                    <input
                      className="w-full border rounded px-3 py-2 mt-1"
                      value={form.discountLabel}
                      onChange={(e) => setForm((f) => ({ ...f, discountLabel: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-xs">CTA text</label>
                  <input
                    className="w-full border rounded px-3 py-2 mt-1"
                    value={form.ctaText}
                    onChange={(e) => setForm((f) => ({ ...f, ctaText: e.target.value }))}
                  />
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase text-[var(--text-secondary)] mb-3">Schedule</h3>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs">Start</label>
                    <input
                      type="datetime-local"
                      className="w-full border rounded px-3 py-2 mt-1"
                      value={form.startTime}
                      onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs">End</label>
                    <input
                      type="datetime-local"
                      disabled={form.noExpiry}
                      className="w-full border rounded px-3 py-2 mt-1 disabled:opacity-50"
                      value={form.endTime}
                      onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.noExpiry}
                      onChange={(e) => setForm((f) => ({ ...f, noExpiry: e.target.checked }))}
                    />
                    No expiry
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.hasCountdown}
                      onChange={(e) => setForm((f) => ({ ...f, hasCountdown: e.target.checked }))}
                    />
                    Show countdown
                  </label>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase text-[var(--text-secondary)] mb-3">Legacy type (Allen Solly / listing)</h3>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as any }))}
                >
                  <option value="flash">Flash</option>
                  <option value="combo">Combo</option>
                  <option value="seasonal">Seasonal</option>
                </select>
                {form.type === 'combo' && (
                  <textarea
                    className="w-full border rounded px-3 py-2 mt-2 min-h-[60px]"
                    placeholder="Combo details"
                    value={form.comboDetails}
                    onChange={(e) => setForm((f) => ({ ...f, comboDetails: e.target.value }))}
                  />
                )}
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase text-[var(--text-secondary)] mb-3">Products</h3>
                <input
                  className="w-full border rounded px-3 py-2 mb-2"
                  placeholder="Search products…"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
                {searchHits.length > 0 && (
                  <div className="border rounded max-h-40 overflow-y-auto mb-3 bg-white shadow-sm">
                    {searchHits.map((p) => (
                      <button
                        key={p._id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b last:border-0"
                        onClick={() => addProduct(p)}
                      >
                        {p.name} · ₹{p.price}
                      </button>
                    ))}
                  </div>
                )}
                <div className="space-y-2">
                  {selectedProducts.map((p) => (
                    <div key={p._id} className="flex items-center gap-3 border rounded px-3 py-2">
                      <div className="relative w-10 h-10 rounded overflow-hidden bg-gray-100 shrink-0">
                        <Image src={p.images?.[0] || '/placeholder.jpg'} alt="" fill className="object-cover" sizes="40px" />
                      </div>
                      <span className="flex-1 text-sm truncate">{p.name}</span>
                      <button type="button" className="text-red-500 text-sm" onClick={() => removeProduct(p._id)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase text-[var(--text-secondary)] mb-3">Visibility</h3>
                <label className="flex items-center gap-2 text-sm mb-2">
                  <input
                    type="checkbox"
                    checked={form.showOnCarousel}
                    onChange={(e) => setForm((f) => ({ ...f, showOnCarousel: e.target.checked }))}
                  />
                  Show on homepage carousel
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  />
                  Offer active
                </label>
              </section>
            </div>

            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3">
              <button type="button" className="px-6 py-2 border rounded font-semibold" onClick={() => setDrawerOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || !form.title.trim() || !form.image}
                className="px-8 py-2 bg-[var(--gold)] text-black font-bold rounded disabled:opacity-40"
                onClick={persist}
              >
                {saving ? 'Saving…' : 'Save offer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
