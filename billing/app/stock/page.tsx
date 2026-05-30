"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BillingShell from "@/components/layout/BillingShell";
import { billingApi } from "@/lib/api";
import { useRole } from "@/hooks/useRole";
import StockProductNameSearch, { StockProductSearchResult } from "@/components/stock/StockProductNameSearch";

const SIZE_PRESETS: Record<string, string[]> = {
  alpha: ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL", "Free Size"],
  cm70to100: ["70", "75", "80", "85", "90", "95", "100", "Free Size"],
  even6to14: ["6", "8", "10", "12", "14", "Free Size"],
  pants: ["28", "30", "32", "34", "36", "38", "40", "42", "44", "46", "48", "50", "Free Size"],
  footwear: ["6", "7", "8", "9", "10", "11", "12", "13", "14", "Free Size"],
};

export default function StockPage() {
  const router = useRouter();
  const { can } = useRole();
  const canAccess = can("canManageStock");
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [sizeOptions, setSizeOptions] = useState<string[]>(SIZE_PRESETS.alpha);
  const [sizePreset, setSizePreset] = useState<keyof typeof SIZE_PRESETS>("alpha");
  const [customSize, setCustomSize] = useState("");
  const [loading, setLoading] = useState(false);

  // Multi-size mode
  const [multiSizeMode, setMultiSizeMode] = useState(true);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, number>>({}); // { size: quantity }

  const [form, setForm] = useState({
    supplier: "",
    category: "",
    subCategory: "",
    productName: "",
    size: "",
    quantity: "",
    incomingPrice: "",
    sellingPrice: "",
    notes: "",
  });

  const getSizeOptions = (categoryName: string): string[] => {
    const name = String(categoryName || "").toLowerCase();

    if (name.includes("pant") || name.includes("trouser") || name.includes("jean") || name.includes("short")) {
      return SIZE_PRESETS.pants;
    }

    if (name.includes("brief") || name.includes("underwear") || name.includes("innerwear")) {
      return SIZE_PRESETS.cm70to100;
    }

    if (
      name.includes("slipper") ||
      name.includes("sandal") ||
      name.includes("footwear") ||
      name.includes("shoe")
    ) {
      return SIZE_PRESETS.footwear;
    }

    return SIZE_PRESETS.alpha;
  };

  useEffect(() => {
    if (!canAccess) router.push("/billing");
  }, [canAccess, router]);

  useEffect(() => {
    billingApi.suppliers().then(setSuppliers).catch(() => setSuppliers([]));
  }, []);

  useEffect(() => {
    if (!form.supplier) {
      setCategories([]);
      return;
    }
    billingApi.categoriesFlat(form.supplier).then(setCategories).catch(() => setCategories([]));
  }, [form.supplier]);

  const filteredCategories = useMemo(
    () =>
      categories.filter((category) => {
        const supplierValue = String((category.supplier && category.supplier._id) || category.supplier || "");
        return !category.parentCategory && (!form.supplier || supplierValue === form.supplier);
      }),
    [categories, form.supplier]
  );
  const filteredSubcategories = useMemo(
    () =>
      subcategories.filter((subCategory) => {
        const supplierValue = String((subCategory.supplier && subCategory.supplier._id) || subCategory.supplier || "");
        return !form.supplier || supplierValue === form.supplier;
      }),
    [subcategories, form.supplier]
  );


  useEffect(() => {
    if (!form.category) return setSubcategories([]);
    billingApi.categorySubcategories(form.category, form.supplier).then(setSubcategories).catch(() => setSubcategories([]));
  }, [form.category, form.supplier]);

  useEffect(() => {
    const selectedCategory = categories.find((c) => String(c._id) === String(form.category));
    const categoryName = selectedCategory?.name || "";
    const options = getSizeOptions(categoryName);
    const presetKey = (Object.entries(SIZE_PRESETS).find(([, values]) => values.join("|") === options.join("|"))?.[0] ||
      "alpha") as keyof typeof SIZE_PRESETS;
    setSizePreset(presetKey);
    setSizeOptions(options);
    setCustomSize("");
    setForm((prev) => ({ ...prev, size: "" }));
    setSelectedSizes({});
  }, [form.category, form.subCategory, categories]);

  // Toggle a size in multi-select mode
  const toggleSize = (size: string) => {
    setSelectedSizes((prev) => {
      const next = { ...prev };
      if (size in next) {
        delete next[size];
      } else {
        next[size] = 1; // default quantity = 1
      }
      return next;
    });
  };

  // Update quantity for a specific size
  const updateSizeQuantity = (size: string, qty: number) => {
    setSelectedSizes((prev) => ({
      ...prev,
      [size]: Math.max(1, qty),
    }));
  };

  const selectedSizeCount = Object.keys(selectedSizes).length;

  const totalMultiQty = Object.values(selectedSizes).reduce((sum, q) => sum + q, 0);

  const clearProductFields = () => ({
    productName: "",
    incomingPrice: "",
    sellingPrice: "",
    notes: "",
  });

  const applySelectedProduct = (product: StockProductSearchResult) => {
    setForm((prev) => ({
      ...prev,
      productName: product.name,
      incomingPrice:
        product.incomingPrice != null && product.incomingPrice > 0
          ? String(product.incomingPrice)
          : prev.incomingPrice,
      sellingPrice:
        product.sellingPrice != null && product.sellingPrice > 0
          ? String(product.sellingPrice)
          : prev.sellingPrice,
      notes: product.notes || prev.notes,
    }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      if (multiSizeMode) {
        // Build sizeEntries array
        const sizeEntries = Object.entries(selectedSizes).map(([size, quantity]) => ({
          size,
          quantity,
        }));
        if (sizeEntries.length === 0) {
          alert("Please select at least one size");
          setLoading(false);
          return;
        }
        const result = await billingApi.stockEntryBulk({
          supplier: form.supplier,
          category: form.category,
          subCategory: form.subCategory,
          productName: form.productName,
          incomingPrice: Number(form.incomingPrice),
          sellingPrice: Number(form.sellingPrice),
          notes: form.notes,
          sizeEntries,
        });
        // Navigate to barcodes page with all entry IDs
        const entryIds = result.entries.map((e: any) => e._id).join(",");
        router.push(`/stock/barcodes?entryIds=${entryIds}`);
      } else {
        // Single size mode (original flow)
        const normalizedForm = {
          ...form,
          quantity: Number(form.quantity),
          incomingPrice: Number(form.incomingPrice),
          sellingPrice: Number(form.sellingPrice),
        };
        const entry = await billingApi.stockEntry(normalizedForm);
        router.push(`/stock/barcodes?entryId=${entry._id}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!canAccess) return null;

  return (
    <BillingShell title="Stock Entry">
      <form className="pos-card p-4 space-y-3 max-w-2xl" onSubmit={submit}>
        <h2 className="font-semibold">New Stock Entry</h2>
        <label className="block text-sm text-[var(--text-secondary)]">Supplier</label>
        <select
          className="pos-input w-full"
          value={form.supplier}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              supplier: e.target.value,
              category: "",
              subCategory: "",
              size: "",
              ...clearProductFields(),
            }))
          }
          required
        >
          <option value="">Select Supplier</option>
          {suppliers.map((supplier) => <option key={supplier._id} value={supplier._id}>{supplier.name}</option>)}
        </select>
        <label className="block text-sm text-[var(--text-secondary)]">Category</label>
        <select
          className="pos-input w-full"
          value={form.category}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              category: e.target.value,
              subCategory: "",
              size: "",
              ...clearProductFields(),
            }))
          }
          required
        >
          <option value="">Select Category</option>
          {filteredCategories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
        </select>
        <label className="block text-sm text-[var(--text-secondary)]">Subcategory</label>
        <select
          className="pos-input w-full"
          value={form.subCategory}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, subCategory: e.target.value, size: "", ...clearProductFields() }))
          }
          required
        >
          <option value="">Select Subcategory</option>
          {filteredSubcategories.map((subCategory) => <option key={subCategory._id} value={subCategory._id}>{subCategory.name}</option>)}
        </select>

        <label className="block text-sm text-[var(--text-secondary)]">Product Name</label>
        <StockProductNameSearch
          supplierId={form.supplier}
          categoryId={form.category}
          subCategoryId={form.subCategory}
          productName={form.productName}
          onProductNameChange={(name) => setForm((prev) => ({ ...prev, productName: name }))}
          onSelectProduct={applySelectedProduct}
        />

        {/* Mode toggle */}
        <div className="flex items-center gap-3 pt-1">
          <label className="block text-sm text-[var(--text-secondary)]">Size Mode</label>
          <button
            type="button"
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              multiSizeMode
                ? "bg-[var(--gold)] text-black"
                : "bg-[var(--card-bg)] text-[var(--text-secondary)] border border-[var(--border)]"
            }`}
            onClick={() => setMultiSizeMode(true)}
          >
            Multi-Size
          </button>
          <button
            type="button"
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              !multiSizeMode
                ? "bg-[var(--gold)] text-black"
                : "bg-[var(--card-bg)] text-[var(--text-secondary)] border border-[var(--border)]"
            }`}
            onClick={() => setMultiSizeMode(false)}
          >
            Single Size
          </button>
        </div>

        {/* Size preset selector */}
        <label className="block text-sm text-[var(--text-secondary)]">Size Chart</label>
        <select
          className="pos-input w-full"
          value={sizePreset}
          onChange={(e) => {
            const nextPreset = e.target.value as keyof typeof SIZE_PRESETS;
            setSizePreset(nextPreset);
            setSizeOptions(SIZE_PRESETS[nextPreset] || SIZE_PRESETS.alpha);
            setCustomSize("");
            setForm((prev) => ({ ...prev, size: "" }));
            setSelectedSizes({});
          }}
        >
          <option value="alpha">Alpha sizes (S to 6XL)</option>
          <option value="cm70to100">Numeric sizes (70 to 100)</option>
          <option value="even6to14">Even sizes (6 to 14)</option>
          <option value="pants">Waist sizes (28 to 50)</option>
          <option value="footwear">Footwear sizes (6 to 14)</option>
        </select>

        {multiSizeMode ? (
          <>
            {/* Multi-size checkbox grid */}
            <label className="block text-sm text-[var(--text-secondary)]">
              Select Sizes & Quantities
              {selectedSizeCount > 0 && (
                <span className="ml-2 text-[var(--gold)]">
                  ({selectedSizeCount} sizes, {totalMultiQty} total units)
                </span>
              )}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                    <span className={`text-sm font-medium flex-shrink-0 min-w-[40px] ${isSelected ? "text-[var(--gold)]" : ""}`}>
                      {size}
                    </span>
                    {isSelected && (
                      <input
                        type="number"
                        min={1}
                        value={selectedSizes[size]}
                        onChange={(e) => {
                          e.stopPropagation();
                          updateSizeQuantity(size, Number(e.target.value) || 1);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="pos-input w-16 text-center text-sm py-1 ml-auto"
                        placeholder="Qty"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Custom size input for multi-mode */}
            <div className="flex gap-2 items-end">
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

            {/* Quick fill all with same quantity */}
            {selectedSizeCount > 1 && (
              <div className="flex gap-2 items-center p-2 rounded bg-[var(--card-bg)] border border-[var(--border)]">
                <span className="text-sm text-[var(--text-secondary)]">Set all quantities to:</span>
                <input
                  type="number"
                  min={1}
                  className="pos-input w-20 text-center text-sm py-1"
                  placeholder="Qty"
                  onChange={(e) => {
                    const qty = Number(e.target.value) || 1;
                    setSelectedSizes((prev) => {
                      const next: Record<string, number> = {};
                      for (const key of Object.keys(prev)) {
                        next[key] = qty;
                      }
                      return next;
                    });
                  }}
                />
              </div>
            )}
          </>
        ) : (
          <>
            {/* Single size mode (original) */}
            <label className="block text-sm text-[var(--text-secondary)]">Size</label>
            <select
              className="pos-input w-full"
              value={form.size}
              onChange={(e) => setForm((prev) => ({ ...prev, size: e.target.value }))}
              required
            >
              <option value="">Select Size</option>
              {sizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <input
              className="pos-input w-full"
              value={customSize}
              onChange={(e) => {
                const value = e.target.value;
                setCustomSize(value);
                setForm((prev) => ({ ...prev, size: value.trim() }));
              }}
              placeholder="Or type custom size (e.g. 58, XXL Tall)"
            />
            <label className="block text-sm text-[var(--text-secondary)]">Quantity</label>
            <input
              className="pos-input w-full"
              type="number"
              min={1}
              value={form.quantity}
              onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
              placeholder="Quantity"
              required
            />
          </>
        )}

        <label className="block text-sm text-[var(--text-secondary)]">Incoming Price (Cost Price)</label>
        <input
          className="pos-input w-full"
          type="number"
          min={0}
          inputMode="decimal"
          value={form.incomingPrice}
          onChange={(e) => setForm((prev) => ({ ...prev, incomingPrice: e.target.value }))}
          placeholder="Incoming Price"
          required
        />
        <label className="block text-sm text-[var(--text-secondary)]">Selling Price (MRP)</label>
        <input
          className="pos-input w-full"
          type="number"
          min={0}
          inputMode="decimal"
          value={form.sellingPrice}
          onChange={(e) => setForm((prev) => ({ ...prev, sellingPrice: e.target.value }))}
          placeholder="Selling Price"
          required
        />
        <label className="block text-sm text-[var(--text-secondary)]">Notes</label>
        <textarea className="pos-input w-full min-h-24 py-2" value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Notes" />

        {/* Summary before submit in multi mode */}
        {multiSizeMode && selectedSizeCount > 0 && (
          <div className="p-3 rounded bg-[var(--card-bg)] border border-[var(--border)] space-y-1">
            <p className="text-sm font-semibold text-[var(--gold)]">Summary — {selectedSizeCount} batch{selectedSizeCount > 1 ? "es" : ""} will be created:</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(selectedSizes).map(([size, qty]) => (
                <span key={size} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-[var(--gold)]/15 text-[var(--gold)] border border-[var(--gold)]/30">
                  {size} × {qty}
                </span>
              ))}
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Total: {totalMultiQty} units across {selectedSizeCount} separate batches
            </p>
          </div>
        )}

        <button
          className="h-12 px-4 rounded bg-[var(--gold)] text-black font-semibold"
          type="submit"
          disabled={loading || (multiSizeMode && selectedSizeCount === 0)}
        >
          {loading
            ? "Saving..."
            : multiSizeMode
            ? `SAVE ${selectedSizeCount} BATCH${selectedSizeCount !== 1 ? "ES" : ""} & GENERATE BARCODES`
            : "SAVE & GENERATE BARCODES"}
        </button>
      </form>
    </BillingShell>
  );
}
