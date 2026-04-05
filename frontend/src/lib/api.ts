const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// ============ SETTINGS ============
export const getSettings = async () => {
  const res = await fetch(`${API}/api/settings`, { next: { revalidate: 60 } });
  return res.json();
};

// ============ PRODUCTS ============
export const getProducts = async (params?: string) => {
  const res = await fetch(`${API}/api/products${params ? `?${params}` : ''}`, {
    next: { revalidate: 60 },
  });
  return res.json();
};

export const getProductBySlug = async (slug: string) => {
  const res = await fetch(`${API}/api/products/${slug}`, {
    next: { revalidate: 60 },
  });
  return res.json();
};

export const getAllProductSlugs = async () => {
  const res = await fetch(`${API}/api/products?limit=1000`, {
    next: { revalidate: 300 },
  });
  const data = await res.json();
  return data.products?.map((p: any) => p.slug) || [];
};

// ============ OFFERS ============
export const getOffers = async (showOnHomepage?: boolean) => {
  const params = showOnHomepage ? '?showOnHomepage=true' : '';
  const res = await fetch(`${API}/api/offers${params}`, {
    next: { revalidate: 30 },
  });
  return res.json();
};

export const getOfferById = async (id: string) => {
  const res = await fetch(`${API}/api/offers/${id}`, {
    next: { revalidate: 60 },
  });
  return res.json();
};

// ============ ORDERS ============
export const createOrder = async (orderData: any) => {
  const res = await fetch(`${API}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });
  return res.json();
};

export const getOrderById = async (id: string) => {
  const res = await fetch(`${API}/api/orders/${id}`); // Note: Removed credentials: 'include' so it works natively for guests
  return res.json();
};

export const getOrdersByCustomer = async (email: string, phone: string) => {
  const res = await fetch(`${API}/api/orders/customer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, phone }),
  });
  if (!res.ok) throw new Error('Failed to fetch user orders');
  return res.json();
};

// ============ PAYMENT ============
export const createPaymentOrder = async (amount: number) => {
  const res = await fetch(`${API}/api/payment/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount }),
  });
  return res.json();
};

export const verifyPayment = async (paymentData: any) => {
  const res = await fetch(`${API}/api/payment/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paymentData),
  });
  return res.json();
};

// ============ ADMIN API CALLS ============
export const adminLogin = async (email: string, password: string) => {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  return res.json();
};

export const adminLogout = async () => {
  const res = await fetch(`${API}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  return res.json();
};

export const adminMe = async () => {
  const res = await fetch(`${API}/api/auth/me`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Not authenticated');
  return res.json();
};

// Admin Products
export const adminGetProducts = async () => {
  const res = await fetch(`${API}/api/products?limit=1000`, {
    credentials: 'include',
  });
  return res.json();
};

export const adminCreateProduct = async (data: any) => {
  const res = await fetch(`${API}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return res.json();
};

export const adminUpdateProduct = async (id: string, data: any) => {
  const res = await fetch(`${API}/api/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return res.json();
};

export const adminDeleteProduct = async (id: string) => {
  const res = await fetch(`${API}/api/products/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return res.json();
};

// Admin Offers
export const adminGetOffers = async () => {
  const res = await fetch(`${API}/api/offers`, {
    credentials: 'include',
  });
  return res.json();
};

export const adminCreateOffer = async (data: any) => {
  const res = await fetch(`${API}/api/offers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return res.json();
};

export const adminUpdateOffer = async (id: string, data: any) => {
  const res = await fetch(`${API}/api/offers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return res.json();
};

export const adminDeleteOffer = async (id: string) => {
  const res = await fetch(`${API}/api/offers/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return res.json();
};

// Admin Orders
export const adminGetOrders = async (page = 1, limit = 20) => {
  const res = await fetch(`${API}/api/orders?page=${page}&limit=${limit}`, {
    credentials: 'include',
  });
  return res.json();
};

export const adminGetOrderById = async (id: string) => {
  const res = await fetch(`${API}/api/orders/${id}`, {
    credentials: 'include',
  });
  return res.json();
};

export const adminUpdateOrderStatus = async (id: string, orderStatus: string) => {
  const res = await fetch(`${API}/api/orders/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ orderStatus }),
  });
  return res.json();
};

// Admin Settings
export const adminGetSettings = async () => {
  const res = await fetch(`${API}/api/settings`, {
    credentials: 'include',
  });
  return res.json();
};

export const adminUpdateSettings = async (data: any) => {
  const res = await fetch(`${API}/api/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return res.json();
};

export const adminSwitchHomepage = async (activeHomepage: string) => {
  const res = await fetch(`${API}/api/settings/homepage`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ activeHomepage }),
  });
  return res.json();
};

// Admin Upload
export const adminUploadImage = async (file: File) => {
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch(`${API}/api/upload/image`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  return res.json();
};

// ============ CATALOGUE LAYOUT ============

// Public — Mega Dropdown
export const getMegaDropdown = async (category: string) => {
  const res = await fetch(`${API}/api/catalogue/mega-dropdown/${category}`, {
    next: { revalidate: 300 },
  });
  return res.json();
};

// Public — Sidebar Config
export const getSidebarConfig = async () => {
  const res = await fetch(`${API}/api/catalogue/sidebar-config`, {
    next: { revalidate: 300 },
  });
  return res.json();
};

// Public — Product Counts for filter badges
export const getProductCounts = async (category?: string) => {
  const params = category ? `?category=${category}` : '';
  const res = await fetch(`${API}/api/catalogue/product-counts${params}`, {
    next: { revalidate: 60 },
  });
  return res.json();
};

// Admin — Mega Dropdown
export const adminGetMegaDropdown = async (category: string) => {
  const res = await fetch(`${API}/api/catalogue/admin/mega-dropdown/${category}`, {
    credentials: 'include',
  });
  return res.json();
};

export const adminUpdateMegaDropdown = async (category: string, columns: any[]) => {
  const res = await fetch(`${API}/api/catalogue/admin/mega-dropdown/${category}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ columns }),
  });
  return res.json();
};

// Admin — Sidebar Config
export const adminGetSidebarConfig = async () => {
  const res = await fetch(`${API}/api/catalogue/admin/sidebar-config`, {
    credentials: 'include',
  });
  return res.json();
};

export const adminUpdateSidebarConfig = async (filters: any[]) => {
  const res = await fetch(`${API}/api/catalogue/admin/sidebar-config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ filters }),
  });
  return res.json();
};
