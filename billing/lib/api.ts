const API = process.env.NEXT_PUBLIC_API_URL;

async function request(path: string, init?: RequestInit) {
  if (!API) throw new Error("NEXT_PUBLIC_API_URL is not set");

  const response = await fetch(`${API}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    let data: any = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = {};
      }
    }
    const message =
      (data && typeof data === "object" && "message" in data && typeof data.message === "string" && data.message) ||
      (data && typeof data === "object" && "error" in data && typeof data.error === "string" && data.error) ||
      `${response.status} ${response.statusText}` ||
      "Request failed";
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

export const searchProducts = async (q: string) => {
  if (!API) throw new Error("NEXT_PUBLIC_API_URL is not set");
  const res = await fetch(`${API}/api/billing/bills/search?q=${encodeURIComponent(q)}`, {
    credentials: "include",
  });
  return res.json();
};

export type CustomerSearchResult = {
  name: string;
  phone: string;
  totalBills?: number;
  lastVisit?: string;
  pointsBalance?: number;
  pendingBalance?: number;
};

export const searchCustomers = async (q: string): Promise<CustomerSearchResult[]> => {
  if (!API) throw new Error("NEXT_PUBLIC_API_URL is not set");
  const trimmed = q.trim();
  if (trimmed.length < 2) return [];
  const res = await fetch(`${API}/api/billing/bills/customers/search?q=${encodeURIComponent(trimmed)}`, {
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Customer search failed");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

export const billingApi = {
  login: (email: string, password: string) =>
    request("/api/billing/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => request("/api/billing/auth/me"),
  logout: () => request("/api/billing/auth/logout", { method: "POST" }),
  dashboardSummary: () => request("/api/billing/reports/summary"),
  scanBarcode: (barcode: string) => request(`/api/billing/bills/scan/${encodeURIComponent(barcode)}`),
  nextBarcode: (
    productId: string,
    size: string,
    exclude: string[] = [],
    sellingPrice?: number
  ) => {
    const params = new URLSearchParams({ productId });
    if (size) params.set("size", size);
    if (exclude.length) params.set("exclude", exclude.join(","));
    if (sellingPrice !== undefined && Number.isFinite(sellingPrice)) {
      params.set("sellingPrice", String(sellingPrice));
    }
    return request(`/api/billing/bills/next-barcode?${params.toString()}`);
  },
  calculateBill: (payload: any) =>
    request("/api/billing/bills/calculate", { method: "POST", body: JSON.stringify(payload) }),
  holdBill: (payload: any) =>
    request("/api/billing/bills/hold", { method: "POST", body: JSON.stringify(payload) }),
  completeBill: (payload: any) =>
    request("/api/billing/bills/complete", { method: "POST", body: JSON.stringify(payload) }),
  pointsBalance: (phone: string) =>
    request(`/api/billing/points/balance?phone=${encodeURIComponent(phone)}`),
  pointsLedger: (phone: string, limit = 20) =>
    request(`/api/billing/points/ledger?phone=${encodeURIComponent(phone)}&limit=${limit}`),
  getHeldBills: () => request("/api/billing/bills/held"),
  discardHeldBill: (id: string) => request(`/api/billing/bills/held/${id}`, { method: "DELETE" }),
  nextBillNumber: () => request("/api/billing/bills/next-number"),
  bills: (query = "") => request(`/api/billing/bills${query ? `?${query}` : ""}`),
  billHistory: (query = "") => request(`/api/billing/bills/history${query ? `?${query}` : ""}`),
  editBill: (id: string, payload: any) =>
    request(`/api/billing/bills/${id}/edit`, { method: "PUT", body: JSON.stringify(payload) }),
  billById: (id: string) => request(`/api/billing/bills/${id}`),
  billByNumber: (billNumber: string) => request(`/api/billing/bills/number/${billNumber}`),
  suppliers: () => request("/api/billing/suppliers"),
  createSupplier: (payload: any) =>
    request("/api/billing/suppliers", { method: "POST", body: JSON.stringify(payload) }),
  updateSupplier: (id: string, payload: any) =>
    request(`/api/billing/suppliers/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteSupplier: (id: string) => request(`/api/billing/suppliers/${id}`, { method: "DELETE" }),
  categories: () => request("/api/billing/categories"),
  categoriesFlat: (supplier?: string) =>
    request(`/api/billing/categories/flat${supplier ? `?supplier=${encodeURIComponent(supplier)}` : ""}`),
  categorySubcategories: (id: string, supplier?: string) =>
    request(`/api/billing/categories/${id}/subcategories${supplier ? `?supplier=${encodeURIComponent(supplier)}` : ""}`),
  createCategory: (payload: any) =>
    request("/api/billing/categories", { method: "POST", body: JSON.stringify(payload) }),
  updateCategory: (id: string, payload: any) =>
    request(`/api/billing/categories/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteCategory: (id: string) => request(`/api/billing/categories/${id}`, { method: "DELETE" }),
  stockEntry: (payload: any) =>
    request("/api/billing/stock/entry", { method: "POST", body: JSON.stringify(payload) }),
  stockEntryBulk: (payload: any) =>
    request("/api/billing/stock/entry/bulk", { method: "POST", body: JSON.stringify(payload) }),
  stockEntryById: (id: string) => request(`/api/billing/stock/entries/${id}`),
  lowStock: () => request("/api/billing/stock/low-stock"),
  salesmen: () => request("/api/billing/admin/salesmen"),
  createSalesman: (payload: any) =>
    request("/api/billing/admin/salesmen", { method: "POST", body: JSON.stringify(payload) }),
  updateSalesman: (id: string, payload: any) =>
    request(`/api/billing/admin/salesmen/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteSalesman: (id: string) => request(`/api/billing/admin/salesmen/${id}`, { method: "DELETE" }),
  admins: () => request("/api/billing/admin/admins"),
  staffRecordsSummary: (id: string) => request(`/api/billing/admin/admins/${id}/records/summary`),
  createAdmin: (payload: any) =>
    request("/api/billing/admin/admins", { method: "POST", body: JSON.stringify(payload) }),
  updateAdmin: (id: string, payload: any) =>
    request(`/api/billing/admin/admins/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteAdmin: (id: string) => request(`/api/billing/admin/admins/${id}`, { method: "DELETE" }),
  returns: (payload: any) => request("/api/billing/returns", { method: "POST", body: JSON.stringify(payload) }),
  returnScan: (barcode: string) => request(`/api/billing/returns/scan/${barcode}`),
  returnsHistory: (query = "") => request(`/api/billing/returns/history${query ? `?${query}` : ""}`),
  returnById: (id: string) => request(`/api/billing/returns/${id}`),
  reportSummary: (startDate?: string, endDate?: string) =>
    request(`/api/billing/reports/summary${startDate || endDate ? `?startDate=${startDate || ""}&endDate=${endDate || ""}` : ""}`),
  reportBills: (query: string) => request(`/api/billing/reports/bills?${query}`),
  reportCustomers: (query = "") => request(`/api/billing/reports/customers${query ? `?${query}` : ""}`),
  reportCustomerProfile: (phone: string) => request(`/api/billing/reports/customers/${encodeURIComponent(phone)}`),
  inventorySummary: () => request("/api/billing/inventory/summary"),
  inventoryProducts: (query = "") => request(`/api/billing/inventory/products${query ? `?${query}` : ""}`),
  updateInventoryProduct: (id: string, payload: any) =>
    request(`/api/billing/inventory/products/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  inventoryEntries: (query = "") => request(`/api/billing/inventory/entries${query ? `?${query}` : ""}`),
  stockInventory: (query = "") => request(`/api/billing/stock/inventory${query ? `?${query}` : ""}`),
  searchStockProducts: (params: { supplier: string; category: string; subCategory: string; q?: string }) => {
    const searchParams = new URLSearchParams({
      supplier: params.supplier,
      category: params.category,
      subCategory: params.subCategory,
    });
    if (params.q?.trim()) searchParams.set("q", params.q.trim());
    return request(`/api/billing/stock/products/search?${searchParams.toString()}`);
  },
  stockInventoryItems: (productId: string, size?: string) =>
    request(`/api/billing/stock/inventory/${productId}/items${size ? `?size=${encodeURIComponent(size)}` : ""}`),
  stockInventoryBreakdown: (productId: string) =>
    request(`/api/billing/stock/inventory/${productId}/stock-breakdown`),
  reportProfit: (
    page = 1,
    sort = "entryDate",
    supplier = "",
    startDate = "",
    endDate = "",
    search = ""
  ) => {
    const params = new URLSearchParams({ page: String(page), sort });
    if (supplier) params.set("supplier", supplier);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (search) params.set("search", search);
    return request(`/api/billing/reports/profit?${params.toString()}`);
  },
  reportProfitSupplierSummary: (startDate = "", endDate = "") => {
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    const qs = params.toString();
    return request(`/api/billing/reports/profit/supplier-summary${qs ? `?${qs}` : ""}`);
  },
  reportBillProfit: (query = "") => request(`/api/billing/reports/bill-profit${query ? `?${query}` : ""}`),
  reportBillProfitDetail: (id: string) => request(`/api/billing/reports/bill-profit/${id}`),
  pendingSummary: () => request("/api/billing/pending/summary"),
  pendingBalance: (phone: string) =>
    request(`/api/billing/pending/balance?phone=${encodeURIComponent(phone)}`),
  pendingCustomer: (phone: string) =>
    request(`/api/billing/pending/customer/${encodeURIComponent(phone)}`),
  pendingSettlements: (limit = 50) => request(`/api/billing/pending/settlements?limit=${limit}`),
  settlePending: (payload: { phone: string; amount: number; paymentMethod: string; note?: string; customerName?: string }) =>
    request("/api/billing/pending/settle", { method: "POST", body: JSON.stringify(payload) }),
  qzCertificate: async () => {
    if (!API) throw new Error("NEXT_PUBLIC_API_URL is not set");
    const res = await fetch(`${API}/api/billing/qz/certificate`, { credentials: "include" });
    if (!res.ok) throw new Error(await res.text());
    return res.text();
  },
  qzSign: async (requestStr: string) => {
    if (!API) throw new Error("NEXT_PUBLIC_API_URL is not set");
    const res = await fetch(`${API}/api/billing/qz/sign`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request: requestStr }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.text();
  },
};
