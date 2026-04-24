"use client";
import BillingShell from "@/components/layout/BillingShell";
import { useEffect, useState } from "react";
import { billingApi } from "@/lib/api";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [expandedSuppliers, setExpandedSuppliers] = useState<Record<string, boolean>>({});
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"main" | "sub" | "edit">("main");
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const initialForm = {
    name: "",
    supplier: "",
    parentCategory: null as string | null,
    order: 0,
    isActive: true,
  };
  const [formData, setFormData] = useState(initialForm);

  const fetchCategories = async () => {
    try {
      const res = await billingApi.categories();
      setCategories(Array.isArray(res) ? res : []);
    } catch {
      console.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await billingApi.suppliers();
      if (Array.isArray(res)) {
        setSuppliers(res);
        // Expand all suppliers by default
        const expandState: Record<string, boolean> = {};
        res.forEach(s => expandState[s._id] = true);
        expandState['unassigned'] = true;
        setExpandedSuppliers(expandState);
      }
    } catch {
      console.error("Failed to load suppliers");
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchSuppliers();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const toggleSupplier = (id: string) => {
    setExpandedSuppliers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddCategory = (supplierId?: string) => {
    setModalMode("main");
    setEditingId(null);
    setFormData({ ...initialForm, supplier: supplierId || "" });
    setIsModalOpen(true);
  };

  const handleAddSubcategory = (parentId: string, supplierId: string) => {
    setModalMode("sub");
    setEditingId(null);
    setFormData({ ...initialForm, parentCategory: parentId, supplier: supplierId });
    setIsModalOpen(true);
  };

  const handleEdit = (category: any, mode: "main" | "sub") => {
    setModalMode("edit");
    setEditingId(category._id);
    setFormData({
      name: category.name,
      supplier: category.supplier || "",
      parentCategory: category.parentCategory || null,
      order: category.order || 0,
      isActive: category.isActive !== false,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData, parentCategory: formData.parentCategory || null };
      if (modalMode === "edit" && editingId) {
        await billingApi.updateCategory(editingId, payload);
        showToast("Category updated!");
      } else {
        await billingApi.createCategory(payload);
        showToast("Category created!");
      }
      setIsModalOpen(false);
      setEditingId(null);
      fetchCategories();
    } catch (err: any) {
      alert(err.message || "Failed to save category");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Delete "${name}"? This will also delete/hide its subcategories.`)) {
      try {
        await billingApi.deleteCategory(id);
        showToast(`"${name}" deleted`);
        fetchCategories();
      } catch (err: any) {
        alert(err.message || "Failed to delete category");
      }
    }
  };

  // Grouping logic
  const groupedData = [
    ...suppliers.map(supplier => ({
      _id: supplier._id,
      name: supplier.name,
      mains: categories.filter(c => String(c.supplier) === String(supplier._id))
    })),
    {
      _id: 'unassigned',
      name: 'Unassigned Categories',
      mains: categories.filter(c => !c.supplier || !suppliers.find(s => String(s._id) === String(c.supplier)))
    }
  ].filter(group => group._id !== 'unassigned' || group.mains.length > 0);

  return (
    <BillingShell title="Categories Management">
      <div className="p-3 sm:p-4 md:p-8 max-w-5xl mx-auto text-[var(--text-primary)]">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-2 mb-6">
          <div>
            <h2 className="text-2xl font-bold font-playfair tracking-tight">Suppliers & Categories</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Hierarchical view of your inventory by Supplier
            </p>
          </div>
          <button onClick={() => handleAddCategory()} className="bg-[var(--gold)] text-black rounded-lg px-4 sm:px-6 py-2.5 shadow-sm text-sm flex items-center gap-2 font-bold cursor-pointer hover:bg-[var(--gold-hover)] transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Category
          </button>
        </div>

        {/* Tree View */}
        <div className="space-y-4">
          {loading ? (
            <div className="pos-card p-8 text-center text-[var(--text-secondary)] animate-pulse">Loading categories architecture...</div>
          ) : groupedData.length === 0 ? (
            <div className="pos-card p-8 text-center text-[var(--text-secondary)]">No data found. Add suppliers and categories to get started.</div>
          ) : (
            groupedData.map((group) => {
              const isExpanded = expandedSuppliers[group._id] ?? true;
              return (
                <div key={group._id} className="pos-card overflow-hidden shadow-lg border border-[var(--border)] transition-all duration-300">
                  {/* Supplier Header */}
                  <div 
                    className="flex items-center justify-between px-3 sm:px-6 py-4 bg-[var(--surface-2)] cursor-pointer hover:bg-[var(--border)] transition-colors border-b border-[var(--border)]"
                    onClick={() => toggleSupplier(group._id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`transform transition-transform duration-200 text-[var(--text-secondary)] ${isExpanded ? 'rotate-90' : ''}`}>
                        ▶
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"/></svg>
                        </div>
                        <h3 className="font-bold text-lg text-white">{group.name}</h3>
                        <span className="text-xs font-semibold bg-[var(--surface)] text-[var(--text-secondary)] px-2 py-1 rounded-md ml-2 border border-[var(--border)]">
                          {group.mains.length} Categories
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                       <button
                        onClick={(e) => { e.stopPropagation(); handleAddCategory(group._id !== 'unassigned' ? group._id : undefined); }}
                        className="text-xs bg-[var(--surface)] border border-[var(--gold)] text-[var(--gold)] font-bold px-3 py-1.5 rounded hover:bg-[var(--gold)] hover:text-black transition-colors flex items-center gap-1"
                        title={`Add main category for ${group.name}`}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Add Category
                      </button>
                    </div>
                  </div>

                  {/* Supplier Content (Categories) */}
                  {isExpanded && (
                    <div className="bg-[var(--surface)]">
                      {group.mains.length === 0 ? (
                        <div className="p-6 text-center text-sm text-[var(--text-secondary)] italic border-t border-[var(--border)]/50">
                          No categories for this supplier yet.
                        </div>
                      ) : (
                        <div className="divide-y divide-[var(--border)]/50">
                          {group.mains.map((parent) => {
                            const subCats = parent.subCategories || [];
                            return (
                              <div key={parent._id} className="group">
                                {/* Main Category Row */}
                                <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-6 py-3 sm:pl-12 hover:bg-[var(--surface-2)] transition-colors">
                                  <div className="flex items-center gap-3">
                                    <span className="text-[var(--text-secondary)]">↳</span>
                                    <span className={`w-2 h-2 rounded-full ${parent.isActive !== false ? 'bg-[var(--success)] shadow-[0_0_8px_var(--success)]' : 'bg-gray-500'}`}></span>
                                    <span className="font-bold text-[var(--text-primary)]">{parent.name}</span>
                                    <span className="text-xs text-[var(--text-secondary)]/70">· {subCats.length} sub</span>
                                  </div>
                                  <div className="flex items-center gap-3 opacity-80 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => handleAddSubcategory(parent._id, parent.supplier)}
                                      className="text-xs bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] font-semibold px-2.5 py-1 rounded hover:border-[var(--info)] hover:text-[var(--info)] transition-colors flex items-center gap-1"
                                    >
                                      + Sub
                                    </button>
                                    <span className="text-[10px] text-[var(--text-secondary)] px-1">Ord: #{parent.order}</span>
                                    <button onClick={() => handleEdit(parent, "main")} className="text-[var(--info)] hover:text-white font-medium text-xs px-1 transition-colors">Edit</button>
                                    <button onClick={() => handleDelete(parent._id, parent.name)} className="text-[var(--error)] hover:text-red-400 font-medium text-xs transition-colors">Delete</button>
                                  </div>
                                </div>

                                {/* Subcategories */}
                                <div className="bg-[var(--surface)] pl-6 sm:pl-20">
                                  {subCats.map((child: any) => (
                                    <div key={child._id} className="flex items-center justify-between py-2.5 pr-6 border-l border-[var(--border)] pl-4 hover:bg-[var(--surface-2)]/50 transition-colors group/sub">
                                      <div className="flex items-center gap-2">
                                        <span className={`w-1.5 h-1.5 rounded-full ${child.isActive !== false ? 'bg-[var(--success)]' : 'bg-gray-500'}`}></span>
                                        <span className="text-sm font-medium text-[var(--text-secondary)] group-hover/sub:text-[var(--text-primary)] transition-colors">{child.name}</span>
                                      </div>
                                      <div className="flex items-center gap-3 opacity-60 group-hover/sub:opacity-100 transition-opacity">
                                        <span className="text-[10px] text-[var(--text-secondary)]">Ord: #{child.order}</span>
                                        <button onClick={() => handleEdit(child, "sub")} className="text-[var(--info)] hover:text-white font-medium text-xs px-1 transition-colors">Edit</button>
                                        <button onClick={() => handleDelete(child._id, child.name)} className="text-[var(--error)] hover:text-red-400 font-medium text-xs transition-colors">Delete</button>
                                      </div>
                                    </div>
                                  ))}
                                  {subCats.length === 0 && (
                                    <div className="py-2 pr-6 border-l border-[var(--border)] pl-4">
                                      <span className="text-xs text-[var(--text-secondary)] italic opacity-60">No subcategories</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Add/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="pos-card w-full max-w-md overflow-hidden shadow-2xl border border-[var(--border)] rounded-xl transform scale-100 transition-all">
              <div className="p-5 border-b border-[var(--border)] flex justify-between items-center bg-[var(--surface-2)]">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {modalMode === "edit" ? "Edit Category" : modalMode === "sub" ? "Add Subcategory" : "Add Main Category"}
                  </h2>
                  {modalMode === "sub" && !editingId && formData.parentCategory && (
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      Parent: <strong className="text-[var(--gold)]">{categories.find(c => c._id === formData.parentCategory)?.name || "Unknown"}</strong>
                    </p>
                  )}
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-[var(--text-secondary)] hover:text-white transition-colors bg-[var(--surface)] rounded p-1.5">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    {(modalMode === "sub" || (modalMode === "edit" && formData.parentCategory)) ? "Subcategory Name" : "Main Category Name"}
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="pos-input w-full bg-[var(--surface-2)] focus:bg-[var(--surface)] transition-colors border-[var(--border)] text-white"
                    placeholder="e.g. Shirts, Pants, Polo"
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Supplier</label>
                  <select
                    value={formData.supplier}
                    onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                    className="pos-input w-full appearance-none bg-[var(--surface-2)] focus:bg-[var(--surface)] text-white border-[var(--border)] cursor-pointer"
                  >
                    <option value="">Select Supplier (Optional)</option>
                    {suppliers.map(s => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Order Position</label>
                    <input
                      type="number"
                      value={formData.order}
                      onChange={e => setFormData({ ...formData, order: Number(e.target.value) })}
                      className="pos-input w-full bg-[var(--surface-2)] focus:bg-[var(--surface)] text-white border-[var(--border)]"
                    />
                  </div>
                  <div className="flex items-center justify-end pb-1">
                    <label className="flex items-center gap-2.5 cursor-pointer bg-[var(--surface-2)] px-4 py-3 rounded-lg border border-[var(--border)] w-full">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-4 h-4 cursor-pointer accent-[var(--success)] rounded"
                      />
                      <span className="font-semibold text-sm text-[var(--text-primary)]">Is Active</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-5 border-t border-[var(--border)] mt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 border border-[var(--border)] rounded text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer disabled:opacity-50">
                    Cancel
                  </button>
                  <button type="submit" className="bg-[var(--gold)] text-black rounded px-6 py-2.5 text-sm font-bold border border-transparent hover:bg-[var(--gold-hover)] hover:shadow-lg transition-all cursor-pointer">
                    {editingId ? "Save Changes" : "Create Category"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-8 right-8 bg-[var(--success)] text-white px-6 py-3 rounded-lg shadow-xl text-sm font-semibold z-50 flex items-center gap-2 transform transition-all translate-y-0 opacity-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            {toast}
          </div>
        )}
      </div>
    </BillingShell>
  );
}
