"use client";

import { useEffect, useMemo, useState } from "react";
import { billingApi } from "@/lib/api";

const SIZE_PRESETS: Record<string, string[]> = {
  alpha: ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL", "Free Size"],
  cm70to100: ["70", "75", "80", "85", "90", "95", "100", "Free Size"],
  even6to14: ["6", "8", "10", "12", "14", "Free Size"],
  pants: ["28", "30", "32", "34", "36", "38", "40", "42", "44", "46", "48", "50", "Free Size"],
  footwear: ["6", "7", "8", "9", "10", "11", "12", "13", "14", "Free Size"],
};

interface EditProductModalProps {
  editingProduct: any;
  setEditingProduct: (product: any) => void;
  suppliers: any[];
  isSuperAdmin: boolean;
  savingProduct: boolean;
  onSave: (e: React.FormEvent) => void;
}

export default function EditProductModal({
  editingProduct,
  setEditingProduct,
  suppliers,
  isSuperAdmin,
  savingProduct,
  onSave,
}: EditProductModalProps) {
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  
  const [sizeOptions, setSizeOptions] = useState<string[]>(SIZE_PRESETS.alpha);
  const [sizePreset, setSizePreset] = useState<keyof typeof SIZE_PRESETS>("alpha");
  const [customSize, setCustomSize] = useState("");
  const [selectedSizes, setSelectedSizes] = useState<Record<string, number>>({});

  const supplierId = useMemo(() => {
    if (editingProduct._editSupplierId) return editingProduct._editSupplierId;
    if (editingProduct.supplier?._id) return editingProduct.supplier._id;
    if (typeof editingProduct.supplier === "string") {
      const found = suppliers.find((s) => s.name === editingProduct.supplier);
      return found ? found._id : editingProduct.supplier;
    }
    return "";
  }, [editingProduct, suppliers]);

  useEffect(() => {
    if (!supplierId) {
      setCategories([]);
      return;
    }
    billingApi
      .categoriesFlat(supplierId)
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [supplierId]);

  const filteredCategories = useMemo(
    () =>
      categories.filter((cat) => {
        const catSupplier = String((cat.supplier && cat.supplier._id) || cat.supplier || "");
        return !cat.parentCategory && (!supplierId || catSupplier === supplierId);
      }),
    [categories, supplierId]
  );

  const categoryId = useMemo(() => {
    if (editingProduct._editCategoryId) return editingProduct._editCategoryId;
    if (editingProduct.billingCategory) {
      const found = filteredCategories.find(c => c._id === editingProduct.billingCategory);
      if (found) return found._id;
    }
    if (editingProduct.category) {
      const found = filteredCategories.find((c) => c.name === editingProduct.category);
      return found ? found._id : "";
    }
    return "";
  }, [editingProduct, filteredCategories]);
  useEffect(() => {
    if (!categoryId) {
      setSubcategories([]);
      return;
    }
    billingApi
      .categorySubcategories(categoryId, supplierId)
      .then(setSubcategories)
      .catch(() => setSubcategories([]));
  }, [categoryId, supplierId]);

  const filteredSubcategories = useMemo(
    () =>
      subcategories.filter((sub) => {
        const subSupplier = String((sub.supplier && sub.supplier._id) || sub.supplier || "");
        return !supplierId || subSupplier === supplierId;
      }),
    [subcategories, supplierId]
  );

  // Initialize sizes from editingProduct.sizeStock
  useEffect(() => {
    if (editingProduct && editingProduct.sizeStock && !editingProduct._sizesInitialized) {
      const initialSizes: Record<string, number> = {};
      editingProduct.sizeStock.forEach((s: any) => {
        initialSizes[s.size] = s.stock;
      });
      setEditingProduct({ 
        ...editingProduct, 
        sizeEntries: Object.entries(initialSizes).map(([size, quantity]) => ({ size, quantity })),
        _sizesInitialized: true 
      });
      setSelectedSizes(initialSizes);
      
      // Try to auto-detect size preset based on category name
      const catName = String(editingProduct.category || "").toLowerCase();
      let options = SIZE_PRESETS.alpha;
      let preset: keyof typeof SIZE_PRESETS = "alpha";
      
      if (catName.includes("pant") || catName.includes("trouser") || catName.includes("jean") || catName.includes("short")) {
        options = SIZE_PRESETS.pants;
        preset = "pants";
      } else if (catName.includes("brief") || catName.includes("underwear") || catName.includes("innerwear")) {
        options = SIZE_PRESETS.cm70to100;
        preset = "cm70to100";
      } else if (catName.includes("slipper") || catName.includes("sandal") || catName.includes("footwear") || catName.includes("shoe")) {
        options = SIZE_PRESETS.footwear;
        preset = "footwear";
      }
      
      setSizePreset(preset);
      setSizeOptions(options);
    }
  }, [editingProduct, setEditingProduct]);

  // Sync selectedSizes to editingProduct.sizeEntries
  useEffect(() => {
    if (editingProduct && editingProduct._sizesInitialized) {
      const entries = Object.entries(selectedSizes).map(([size, quantity]) => ({ size, quantity }));
      setEditingProduct((prev: any) => ({ ...prev, sizeEntries: entries }));
    }
  }, [selectedSizes, setEditingProduct, editingProduct?._sizesInitialized]);

  const subCategoryId = useMemo(() => {
    if (editingProduct._editSubCategoryId) return editingProduct._editSubCategoryId;
    if (editingProduct.billingSubCategory) {
      const found = filteredSubcategories.find(c => c._id === editingProduct.billingSubCategory);
      if (found) return found._id;
    }
    if (editingProduct.subCategory) {
      const found = filteredSubcategories.find((s) => s.name === editingProduct.subCategory);
      return found ? found._id : "";
    }
    return "";
  }, [editingProduct, filteredSubcategories]);



  const handleSupplierChange = (newSupplierId: string) => {
    setEditingProduct({
      ...editingProduct,
      _editSupplierId: newSupplierId,
      _editCategoryId: "",
      _editSubCategoryId: "",
      category: "",
      subCategory: "",
      supplier: newSupplierId,
    });
  };

  const handleCategoryChange = (catId: string) => {
    const catDoc = filteredCategories.find((c) => c._id === catId);
    setEditingProduct({
      ...editingProduct,
      _editCategoryId: catId,
      _editSubCategoryId: "",
      category: catDoc?.name || "",
      subCategory: "",
    });
  };

  const handleSubCategoryChange = (subId: string) => {
    const subDoc = filteredSubcategories.find((s) => s._id === subId);
    setEditingProduct({
      ...editingProduct,
      _editSubCategoryId: subId,
      subCategory: subDoc?.name || "",
    });
  };
  
  const toggleSize = (size: string) => {
    setSelectedSizes((prev) => {
      const next = { ...prev };
      if (size in next) {
        delete next[size];
      } else {
        next[size] = 1;
      }
      return next;
    });
  };

  const updateSizeQuantity = (size: string, qty: number) => {
    setSelectedSizes((prev) => ({
      ...prev,
      [size]: Math.max(0, qty), // allow 0 to delete stock maybe? Actually StockEntry allows 1. But here we edit total quantity, so 0 is valid.
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[80] grid place-items-center p-4">
      <div className="pos-card p-4 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Edit Product</h3>
          <button onClick={() => setEditingProduct(null)}>Close</button>
        </div>
        <form onSubmit={onSave} className="space-y-4">
          {/* Product Name */}
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Product Name</label>
            <input
              required
              className="pos-input w-full"
              value={editingProduct.name || ""}
              onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Supplier dropdown */}
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Supplier</label>
              <select
                className="pos-input w-full"
                value={supplierId}
                onChange={(e) => handleSupplierChange(e.target.value)}
              >
                <option value="">Select Supplier</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category dropdown */}
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Category</label>
              {supplierId ? (
                <select
                  className="pos-input w-full"
                  value={categoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                >
                  <option value="">Select Category</option>
                  {filteredCategories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="pos-input w-full"
                  value={editingProduct.category || ""}
                  onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                  placeholder="Select a supplier first"
                />
              )}
              {editingProduct.category && !categoryId && supplierId && (
                <p className="text-xs text-[var(--text-secondary)] mt-1 truncate" title={editingProduct.category}>
                  Current: {editingProduct.category}
                </p>
              )}
            </div>

            {/* Subcategory dropdown */}
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Subcategory</label>
              {categoryId ? (
                <select
                  className="pos-input w-full"
                  value={subCategoryId}
                  onChange={(e) => handleSubCategoryChange(e.target.value)}
                >
                  <option value="">Select Subcategory</option>
                  {filteredSubcategories.map((sub) => (
                    <option key={sub._id} value={sub._id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="pos-input w-full"
                  value={subCategoryId}
                  onChange={(e) => setEditingProduct({ ...editingProduct, subCategory: e.target.value })}
                  placeholder="Select a category first"
                />
              )}
              {editingProduct.subCategory && !editingProduct._editSubCategoryId && categoryId && (
                <p className="text-xs text-[var(--text-secondary)] mt-1 truncate" title={editingProduct.subCategory}>
                  Current: {editingProduct.subCategory}
                </p>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--border)]">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm text-[var(--text-secondary)]">Size Chart</label>
              <select
                className="pos-input text-sm py-1 h-8"
                value={sizePreset}
                onChange={(e) => {
                  const nextPreset = e.target.value as keyof typeof SIZE_PRESETS;
                  setSizePreset(nextPreset);
                  setSizeOptions(SIZE_PRESETS[nextPreset] || SIZE_PRESETS.alpha);
                  setCustomSize("");
                }}
              >
                <option value="alpha">Alpha sizes (S to 6XL)</option>
                <option value="cm70to100">Numeric sizes (70 to 100)</option>
                <option value="even6to14">Even sizes (6 to 14)</option>
                <option value="pants">Waist sizes (28 to 50)</option>
                <option value="footwear">Footwear sizes (6 to 14)</option>
              </select>
            </div>
            
            <label className="block text-sm text-[var(--text-secondary)] mb-2">
              Adjust Total Stock Quantities (Reduces/Increases barcodes)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {sizeOptions.map((size) => {
                const isSelected = size in selectedSizes;
                return (
                  <div
                    key={size}
                    className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-all ${
                      isSelected
                        ? "border-[var(--gold)] bg-[var(--gold)]/10"
                        : "border-[var(--border)] bg-[var(--card-bg)] hover:border-[var(--text-secondary)]"
                    }`}
                    onClick={() => toggleSize(size)}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSize(size)}
                      className="accent-[var(--gold)] w-4 h-4 flex-shrink-0 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className={`text-sm font-medium flex-shrink-0 min-w-[30px] ${isSelected ? "text-[var(--gold)]" : ""}`}>
                      {size}
                    </span>
                    {isSelected && (
                      <input
                        type="number"
                        min={0}
                        value={selectedSizes[size]}
                        onChange={(e) => {
                          e.stopPropagation();
                          updateSizeQuantity(size, Number(e.target.value) || 0);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="pos-input w-14 text-center text-sm py-1 ml-auto"
                        placeholder="Qty"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 items-end mt-2">
              <div className="flex-1">
                <label className="block text-sm text-[var(--text-secondary)] mb-1">Add Custom Size</label>
                <input
                  className="pos-input w-full"
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                  placeholder="e.g. 58, XXL Tall"
                />
              </div>
              <button
                type="button"
                className="h-10 px-3 rounded bg-[var(--card-bg)] border border-[var(--border)] text-sm font-medium hover:border-[var(--gold)] transition-colors"
                onClick={() => {
                  const trimmed = customSize.trim();
                  if (trimmed && !(trimmed in selectedSizes)) {
                    setSelectedSizes((prev) => ({ ...prev, [trimmed]: 1 }));
                    setCustomSize("");
                  }
                }}
                disabled={!customSize.trim()}
              >
                + Add
              </button>
            </div>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--border)]">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">MRP (Selling Price)</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                className="pos-input w-full"
                value={editingProduct.mrp || 0}
                onChange={(e) => setEditingProduct({ ...editingProduct, mrp: Number(e.target.value) })}
              />
              <p className="text-xs text-[var(--text-secondary)] mt-1">Updates all available items</p>
            </div>
            {isSuperAdmin && (
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1">Incoming Price</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  className="pos-input w-full"
                  value={editingProduct.incomingPrice || 0}
                  onChange={(e) => setEditingProduct({ ...editingProduct, incomingPrice: Number(e.target.value) })}
                />
                <p className="text-xs text-[var(--text-secondary)] mt-1">Updates all available items</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Notes</label>
            <textarea
              className="pos-input w-full min-h-20 py-2"
              value={editingProduct.notes || ""}
              onChange={(e) => setEditingProduct({ ...editingProduct, notes: e.target.value })}
              placeholder="Notes"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setEditingProduct(null)}
              className="h-11 px-4 rounded border border-[var(--border)] text-[var(--text-secondary)] font-medium hover:border-[var(--gold)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingProduct}
              className="h-11 px-4 rounded bg-[var(--gold)] text-black font-semibold disabled:opacity-50"
            >
              {savingProduct ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
