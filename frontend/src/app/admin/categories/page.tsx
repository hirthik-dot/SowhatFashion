'use client';

import { useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { adminGetCategories, adminCreateCategory, adminUpdateCategory, adminDeleteCategory } from '@/lib/api';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const initialForm = {
    name: '',
    parentSlug: '',
    megaDropdownLabel: '',
    order: 0,
    isActive: true,
  };
  const [formData, setFormData] = useState(initialForm);

  const fetchCategories = async () => {
    try {
      const res = await adminGetCategories();
      setCategories(Array.isArray(res) ? res : []);
    } catch {
      console.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const topLevel = categories.filter(c => !c.parentSlug);
  const getChildren = (parentSlug: string) => categories.filter(c => c.parentSlug === parentSlug);

  // Open modal to add a new top-level category
  const handleAddCategory = () => {
    setEditingId(null);
    setFormData(initialForm);
    setIsModalOpen(true);
  };

  // Open modal to add a subcategory under a specific parent
  const handleAddSubcategory = (parentSlug: string) => {
    setEditingId(null);
    setFormData({ ...initialForm, parentSlug });
    setIsModalOpen(true);
  };

  // Open modal to edit an existing category
  const handleEdit = (category: any) => {
    setEditingId(category._id);
    setFormData({
      name: category.name,
      parentSlug: category.parentSlug || '',
      megaDropdownLabel: category.megaDropdownLabel || '',
      order: category.order || 0,
      isActive: category.isActive !== false,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData, parentSlug: formData.parentSlug || null };
      if (editingId) {
        await adminUpdateCategory(editingId, payload);
        showToast('Category updated!');
      } else {
        await adminCreateCategory(payload);
        showToast('Category created!');
      }
      setIsModalOpen(false);
      setEditingId(null);
      fetchCategories();
    } catch {
      alert('Failed to save category');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Delete "${name}"? This will also delete its subcategories.`)) {
      try {
        await adminDeleteCategory(id);
        showToast(`"${name}" deleted`);
        fetchCategories();
      } catch {
        alert('Failed to delete category');
      }
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  return (
    <div>
      <AdminHeader title="Categories Management" />

      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-xl font-bold font-playfair">All Categories</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {topLevel.length} categories, {categories.length - topLevel.length} subcategories
            </p>
          </div>
          <button onClick={handleAddCategory} className="btn-gold rounded px-6 py-2.5 shadow-sm text-sm flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Category
          </button>
        </div>

        {/* Categories List */}
        <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-[var(--text-secondary)]">Loading categories...</div>
          ) : categories.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-secondary)]">No categories found. Add one to get started.</div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {topLevel.map(parent => {
                const children = getChildren(parent.slug);
                return (
                  <div key={parent._id}>
                    {/* Parent Row */}
                    <div className="flex items-center justify-between px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className={`w-2.5 h-2.5 rounded-full ${parent.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                        <div>
                          <span className="font-bold text-sm">{parent.name}</span>
                          <span className="text-xs text-[var(--text-secondary)] ml-2">({parent.slug})</span>
                          <span className="text-xs text-gray-400 ml-2">· {children.length} sub</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAddSubcategory(parent.slug)}
                          className="text-xs bg-[var(--gold)] text-black font-bold px-3 py-1.5 rounded hover:opacity-90 transition-opacity flex items-center gap-1"
                          title={`Add subcategory under ${parent.name}`}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          Sub
                        </button>
                        <span className="text-xs text-[var(--text-secondary)]">#{parent.order}</span>
                        <button onClick={() => handleEdit(parent)} className="text-[var(--gold)] hover:underline font-semibold text-sm">Edit</button>
                        <button onClick={() => handleDelete(parent._id, parent.name)} className="text-red-400 hover:text-red-600 hover:underline font-semibold text-sm">Delete</button>
                      </div>
                    </div>

                    {/* Children */}
                    {children.map(child => (
                      <div key={child._id} className="flex items-center justify-between px-6 py-3 pl-14 hover:bg-gray-50 transition-colors border-t border-gray-100">
                        <div className="flex items-center gap-3">
                          <span className="text-gray-300 text-sm">↳</span>
                          <span className={`w-2 h-2 rounded-full ${child.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm">{child.name}</span>
                            <span className="text-xs text-gray-400">({child.slug})</span>
                            {child.megaDropdownLabel && (
                              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-medium">{child.megaDropdownLabel}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[var(--text-secondary)]">#{child.order}</span>
                          <button onClick={() => handleEdit(child)} className="text-[var(--gold)] hover:underline font-semibold text-sm">Edit</button>
                          <button onClick={() => handleDelete(child._id, child.name)} className="text-red-400 hover:text-red-600 hover:underline font-semibold text-sm">Delete</button>
                        </div>
                      </div>
                    ))}

                    {/* Empty state for no children */}
                    {children.length === 0 && (
                      <div className="px-6 py-3 pl-14 text-xs text-gray-400 italic border-t border-gray-100">
                        No subcategories yet — <button onClick={() => handleAddSubcategory(parent.slug)} className="text-[var(--gold)] font-semibold not-italic hover:underline">add one</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Info box */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          <strong>💡 Tip:</strong> Subcategories you create here will automatically appear in the <strong>Product Add/Edit form</strong> as subcategory options, and in the <strong>Mega Dropdown</strong> navigation on the storefront.
        </div>

        {/* Add/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
              <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-gray-50 rounded-t-xl">
                <div>
                  <h2 className="text-xl font-bold font-playfair">
                    {editingId ? 'Edit Category' : formData.parentSlug ? 'Add Subcategory' : 'Add Category'}
                  </h2>
                  {formData.parentSlug && !editingId && (
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      Adding under: <strong>{topLevel.find(c => c.slug === formData.parentSlug)?.name || formData.parentSlug}</strong>
                    </p>
                  )}
                </div>
                <button onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="text-gray-500 hover:text-black p-1">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">
                    {formData.parentSlug ? 'Subcategory Name' : 'Category Name'}
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full border border-[var(--border)] rounded px-3 py-2.5 outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/20"
                    placeholder={formData.parentSlug ? 'e.g. Full Sleeve, Polo, Chinos' : 'e.g. T-Shirts, Shirts, Pants'}
                    autoFocus
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Parent Category</label>
                  <select
                    value={formData.parentSlug}
                    onChange={e => setFormData({...formData, parentSlug: e.target.value})}
                    className="w-full border border-[var(--border)] rounded px-3 py-2.5 outline-none focus:border-[var(--gold)]"
                  >
                    <option value="">None (Top Level)</option>
                    {topLevel.map(p => (
                      <option key={p.slug} value={p.slug}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {formData.parentSlug && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Mega Dropdown Group Label</label>
                    <input
                      type="text"
                      value={formData.megaDropdownLabel}
                      onChange={e => setFormData({...formData, megaDropdownLabel: e.target.value})}
                      className="w-full border border-[var(--border)] rounded px-3 py-2.5 outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/20"
                      placeholder="e.g. By Sleeve, By Fabric, By Style"
                    />
                    <p className="text-xs text-[var(--text-secondary)]">Subcategories with the same label are grouped together in the navigation mega dropdown</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Sort Order</label>
                    <input
                      type="number"
                      value={formData.order}
                      onChange={e => setFormData({...formData, order: Number(e.target.value)})}
                      className="w-full border border-[var(--border)] rounded px-3 py-2.5 outline-none focus:border-[var(--gold)]"
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={e => setFormData({...formData, isActive: e.target.checked})}
                        className="w-5 h-5 accent-green-500"
                      />
                      <span className="font-semibold text-sm">Active</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                  <button type="button" onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="px-6 py-2.5 border border-gray-300 rounded font-semibold text-gray-700 hover:bg-gray-100 transition-colors">Cancel</button>
                  <button type="submit" className="btn-gold rounded px-8 py-2.5 font-bold">
                    {editingId ? 'Update' : formData.parentSlug ? 'Add Subcategory' : 'Add Category'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-8 right-8 bg-black text-white px-6 py-3 rounded-lg shadow-xl text-sm font-medium animate-fade-in z-50">
            ✓ {toast}
          </div>
        )}
      </div>
    </div>
  );
}
