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
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Request failed");
  }
  return response.json();
}

export const searchProducts = async (q: string) => {
  if (!API) throw new Error("NEXT_PUBLIC_API_URL is not set");
  const res = await fetch(`${API}/api/billing/bills/search?q=${encodeURIComponent(q)}`, {
    credentials: "include",
  });
  return res.json();
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
  scanBarcode: (barcode: string) => request(`/api/billing/bills/scan/${barcode}`),
  calculateBill: (payload: any) =>
    request("/api/billing/bills/calculate", { method: "POST", body: JSON.stringify(payload) }),
  holdBill: (payload: any) =>
    request("/api/billing/bills/hold", { method: "POST", body: JSON.stringify(payload) }),
  completeBill: (payload: any) =>
    request("/api/billing/bills/complete", { method: "POST", body: JSON.stringify(payload) }),
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
  stockEntryById: (id: string) => request(`/api/billing/stock/entries/${id}`),
  lowStock: () => request("/api/billing/stock/low-stock"),
  salesmen: () => request("/api/billing/admin/salesmen"),
  createSalesman: (payload: any) =>
    request("/api/billing/admin/salesmen", { method: "POST", body: JSON.stringify(payload) }),
  updateSalesman: (id: string, payload: any) =>
    request(`/api/billing/admin/salesmen/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteSalesman: (id: string) => request(`/api/billing/admin/salesmen/${id}`, { method: "DELETE" }),
  admins: () => request("/api/billing/admin/admins"),
  createAdmin: (payload: any) =>
    request("/api/billing/admin/admins", { method: "POST", body: JSON.stringify(payload) }),
  updateAdmin: (id: string, payload: any) =>
    request(`/api/billing/admin/admins/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteAdmin: (id: string) => request(`/api/billing/admin/admins/${id}`, { method: "DELETE" }),
  returns: (payload: any) => request("/api/billing/returns", { method: "POST", body: JSON.stringify(payload) }),
  returnScan: (barcode: string) => request(`/api/billing/returns/scan/${barcode}`),
  reportSummary: (startDate?: string, endDate?: string) =>
    request(`/api/billing/reports/summary${startDate || endDate ? `?startDate=${startDate || ""}&endDate=${endDate || ""}` : ""}`),
  reportBills: (query: string) => request(`/api/billing/reports/bills?${query}`),
  reportCustomers: (query = "") => request(`/api/billing/reports/customers${query ? `?${query}` : ""}`),
  reportCustomerProfile: (phone: string) => request(`/api/billing/reports/customers/${encodeURIComponent(phone)}`),
  inventorySummary: () => request("/api/billing/inventory/summary"),
  inventoryProducts: (query = "") => request(`/api/billing/inventory/products${query ? `?${query}` : ""}`),
  inventoryEntries: (query = "") => request(`/api/billing/inventory/entries${query ? `?${query}` : ""}`),
  stockInventory: (query = "") => request(`/api/billing/stock/inventory${query ? `?${query}` : ""}`),
  stockInventoryItems: (productId: string, size?: string) =>
    request(`/api/billing/stock/inventory/${productId}/items${size ? `?size=${encodeURIComponent(size)}` : ""}`),
};
