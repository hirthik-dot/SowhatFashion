"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BillingShell from "@/components/layout/BillingShell";
import { billingApi } from "@/lib/api";
import { useRole } from "@/hooks/useRole";

export default function StockPage() {
  const router = useRouter();
  const { isAdmin } = useRole();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [sizeOptions, setSizeOptions] = useState<string[]>(["S", "M", "L", "XL", "XXL", "Free Size"]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    supplier: "",
    category: "",
    subCategory: "",
    productName: "",
    size: "",
    quantity: 1,
    incomingPrice: 0,
    sellingPrice: 0,
    gstPercent: 5,
    notes: "",
  });

  const getSizeOptions = (categoryName: string): string[] => {
    const name = String(categoryName || "").toLowerCase();

    if (name.includes("pant") || name.includes("trouser") || name.includes("jean") || name.includes("short")) {
      return ["28", "30", "32", "34", "36", "38", "40", "42", "44", "46", "48", "50", "Free Size"];
    }

    if (name.includes("brief") || name.includes("underwear") || name.includes("innerwear")) {
      return ["75", "80", "85", "90", "95", "100", "Free Size"];
    }

    if (
      name.includes("slipper") ||
      name.includes("sandal") ||
      name.includes("footwear") ||
      name.includes("shoe")
    ) {
      return ["6", "7", "8", "9", "10", "11", "12", "13", "14", "Free Size"];
    }

    return ["S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "Free Size"];
  };

  useEffect(() => {
    if (!isAdmin) router.push("/billing");
  }, [isAdmin, router]);

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
    setSizeOptions(options);
    setForm((prev) => ({ ...prev, size: "" }));
  }, [form.category, form.subCategory, categories]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const entry = await billingApi.stockEntry(form);
      router.push(`/stock/barcodes?entryId=${entry._id}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <BillingShell title="Stock Entry">
      <form className="pos-card p-4 space-y-3 max-w-2xl" onSubmit={submit}>
        <h2 className="font-semibold">New Stock Entry</h2>
        <label className="block text-sm text-[var(--text-secondary)]">Supplier</label>
        <select
          className="pos-input w-full"
          value={form.supplier}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, supplier: e.target.value, category: "", subCategory: "", size: "" }))
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
          onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value, subCategory: "", size: "" }))}
          required
        >
          <option value="">Select Category</option>
          {filteredCategories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
        </select>
        <label className="block text-sm text-[var(--text-secondary)]">Subcategory</label>
        <select
          className="pos-input w-full"
          value={form.subCategory}
          onChange={(e) => setForm((prev) => ({ ...prev, subCategory: e.target.value, size: "" }))}
          required
        >
          <option value="">Select Subcategory</option>
          {filteredSubcategories.map((subCategory) => <option key={subCategory._id} value={subCategory._id}>{subCategory.name}</option>)}
        </select>

        <label className="block text-sm text-[var(--text-secondary)]">Product Name</label>
        <input
          className="pos-input w-full"
          value={form.productName}
          onChange={(e) => setForm((prev) => ({ ...prev, productName: e.target.value }))}
          placeholder="Product display name"
          required
        />

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
        <label className="block text-sm text-[var(--text-secondary)]">Quantity</label>
        <input className="pos-input w-full" type="number" min={1} value={form.quantity} onChange={(e) => setForm((prev) => ({ ...prev, quantity: Number(e.target.value || 1) }))} placeholder="Quantity" required />
        <label className="block text-sm text-[var(--text-secondary)]">Incoming Price (Cost Price)</label>
        <input className="pos-input w-full" type="number" min={0} inputMode="decimal" value={form.incomingPrice} onChange={(e) => setForm((prev) => ({ ...prev, incomingPrice: Number(e.target.value || 0) }))} placeholder="Incoming Price" required />
        <label className="block text-sm text-[var(--text-secondary)]">Selling Price (MRP)</label>
        <input className="pos-input w-full" type="number" min={0} inputMode="decimal" value={form.sellingPrice} onChange={(e) => setForm((prev) => ({ ...prev, sellingPrice: Number(e.target.value || 0) }))} placeholder="Selling Price" required />
        <label className="block text-sm text-[var(--text-secondary)]">GST %</label>
        <input className="pos-input w-full" type="number" min={0} inputMode="decimal" value={form.gstPercent} onChange={(e) => setForm((prev) => ({ ...prev, gstPercent: Number(e.target.value || 5) }))} placeholder="GST %" />
        <label className="block text-sm text-[var(--text-secondary)]">Notes</label>
        <textarea className="pos-input w-full min-h-24 py-2" value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Notes" />
        <button className="h-12 px-4 rounded bg-[var(--gold)] text-black font-semibold" type="submit" disabled={loading}>{loading ? "Saving..." : "SAVE & GENERATE BARCODES"}</button>
      </form>
    </BillingShell>
  );
}
