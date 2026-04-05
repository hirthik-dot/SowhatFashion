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
    next: { revalidate: 60 },
  });
  return res.json();
};

/** All active, non-expired offers (public) */
export const getPublicOffers = async () => {
  const res = await fetch(`${API}/api/offers`, {
    next: { revalidate: 60 },
  });
  return res.json();
};

export const getCarouselOffers = async () => {
  const res = await fetch(`${API}/api/offers?showOnCarousel=true`, {
    next: { revalidate: 60 },
  });
  return res.json();
};

export const getOfferBySlugOrId = async (slugOrId: string) => {
  const res = await fetch(`${API}/api/offers/${encodeURIComponent(slugOrId)}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error('Offer not found');
  return res.json();
};

export const getOfferById = getOfferBySlugOrId;

export const getActiveOfferSlugs = async (): Promise<string[]> => {
  const res = await fetch(`${API}/api/offers/active-slugs`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return [];
  return res.json();
};

// ============ NEW ARRIVALS (PUBLIC) ============
export const getNewArrivals = async (skip = 0, limit = 8) => {
  const res = await fetch(`${API}/api/new-arrivals?skip=${skip}&limit=${limit}`, {
    next: { revalidate: 300 },
  });
  return res.json();
};

// ============ HOMEPAGE SECTIONS ============
export const getHomepageSections = async (theme: string) => {
  const res = await fetch(`${API}/api/homepage-sections/${encodeURIComponent(theme)}`, {
    next: { revalidate: 300 },
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
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Login failed');
  }
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
  const res = await fetch(`${API}/api/offers?manage=true`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to load offers');
  return res.json();
};

export const adminReorderOffers = async (rows: { id: string; order: number }[]) => {
  const res = await fetch(`${API}/api/offers/reorder`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error('Reorder failed');
  return res.json();
};

export const adminToggleOfferField = async (id: string, field: 'isActive' | 'showOnCarousel') => {
  const res = await fetch(`${API}/api/offers/${id}/toggle`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ field }),
  });
  if (!res.ok) throw new Error('Toggle failed');
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

// Admin New Arrivals
export const adminListNewArrivals = async () => {
  const res = await fetch(`${API}/api/admin/new-arrivals`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to load new arrivals');
  return res.json();
};

export const adminAddNewArrival = async (productId: string, weekLabel?: string) => {
  const res = await fetch(`${API}/api/admin/new-arrivals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ productId, weekLabel }),
  });
  return res.json();
};

export const adminDeleteNewArrival = async (id: string) => {
  const res = await fetch(`${API}/api/admin/new-arrivals/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return res.json();
};

export const adminReorderNewArrivals = async (rows: { id: string; order: number }[]) => {
  const res = await fetch(`${API}/api/admin/new-arrivals/reorder`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error('Reorder failed');
  return res.json();
};

export const adminToggleNewArrival = async (id: string) => {
  const res = await fetch(`${API}/api/admin/new-arrivals/${id}/toggle`, {
    method: 'PATCH',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Toggle failed');
  return res.json();
};

// Admin Homepage Sections
export const adminGetHomepageSectionStats = async (theme: string) => {
  const res = await fetch(`${API}/api/homepage-sections/admin/${encodeURIComponent(theme)}/stats`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed stats');
  return res.json();
};

export const adminPutHomepageSections = async (theme: string, sections: unknown[]) => {
  const res = await fetch(`${API}/api/homepage-sections/admin/${encodeURIComponent(theme)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ sections }),
  });
  if (!res.ok) throw new Error('Save failed');
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

// ============ CATEGORIES ============

// Public — get categories with hierarchy (for navbar mega dropdown)
export const getCategories = async () => {
  const res = await fetch(`${API}/api/categories`, {
    next: { revalidate: 300 },
  });
  return res.json();
};

// Admin — get flat list of all categories (including inactive)
export const adminGetCategories = async () => {
  const res = await fetch(`${API}/api/categories/all`, {
    credentials: 'include',
  });
  return res.json();
};

// Admin — create category
export const adminCreateCategory = async (data: any) => {
  const res = await fetch(`${API}/api/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return res.json();
};

// Admin — update category
export const adminUpdateCategory = async (id: string, data: any) => {
  const res = await fetch(`${API}/api/categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return res.json();
};

// Admin — delete category
export const adminDeleteCategory = async (id: string) => {
  const res = await fetch(`${API}/api/categories/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return res.json();
};

// ============ ADMIN DASHBOARD & CUSTOMERS ============

export const adminGetStats = async () => {
  const res = await fetch(`${API}/api/admin/stats`, {
    credentials: 'include',
  });
  return res.json();
};

export const adminGetRevenueChart = async (period: string = 'week') => {
  const res = await fetch(`${API}/api/admin/revenue-chart?period=${period}`, {
    credentials: 'include',
  });
  return res.json();
};

export const adminGetPopularProducts = async () => {
  const res = await fetch(`${API}/api/admin/popular-products`, {
    credentials: 'include',
  });
  return res.json();
};

export const adminGetCustomers = async () => {
  const res = await fetch(`${API}/api/admin/customers`, {
    credentials: 'include',
  });
  return res.json();
};

export const adminGetCustomerById = async (id: string) => {
  const res = await fetch(`${API}/api/admin/customers/${id}`, {
    credentials: 'include',
  });
  return res.json();
};

