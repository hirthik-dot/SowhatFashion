export function formatPrice(price: number | null | undefined): string {
  const value = Number(price);
  if (!Number.isFinite(value)) return '—';
  return `₹${value.toLocaleString('en-IN')}`;
}

/** Stable React key for product lists (handles multi-price ecommerce variants). */
export function productListKey(product: {
  _id?: string;
  slug?: string;
  priceVariant?: number;
  isPriceVariant?: boolean;
}): string {
  if (product.slug) return String(product.slug);
  if (product.isPriceVariant && product._id != null && product.priceVariant != null) {
    return `${product._id}-${Math.round(Number(product.priceVariant))}`;
  }
  return String(product._id ?? '');
}

/** One entry per MongoDB product (drops duplicate price-variant rows). */
export function dedupeProductsById<T extends { _id?: string }>(products: T[]): T[] {
  const seen = new Set<string>();
  return products.filter((product) => {
    const id = String(product._id ?? '');
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function calculateDiscount(price: number, discountPrice: number): number {
  const base = Number(price);
  const discounted = Number(discountPrice);
  if (!Number.isFinite(base) || !Number.isFinite(discounted) || discounted <= 0 || discounted >= base) return 0;
  return Math.round(((base - discounted) / base) * 100);
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len) + '...';
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Awaiting Confirmation',
  confirmed: 'Order Placed',
};

export function getOrderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] || status;
}

export function getOrderStatusColors(status: string): { bg: string; text: string } {
  switch (status) {
    case 'pending':
      return { bg: '#FEF3C7', text: '#92400E' };
    case 'confirmed':
      return { bg: '#D1FAE5', text: '#065F46' };
    case 'shipped':
      return { bg: '#EDE9FE', text: '#5B21B6' };
    case 'delivered':
      return { bg: '#D1FAE5', text: '#065F46' };
    case 'cancelled':
      return { bg: '#FEE2E2', text: '#991B1B' };
    default:
      return { bg: '#FEF3C7', text: '#92400E' };
  }
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Payment Pending',
  paid: 'Paid',
  failed: 'Payment Failed',
};

export function getPaymentStatusLabel(status: string): string {
  return PAYMENT_STATUS_LABELS[status] || status;
}

export function getPaymentStatusColors(status: string): { bg: string; text: string } {
  switch (status) {
    case 'paid':
      return { bg: '#D1FAE5', text: '#065F46' };
    case 'failed':
      return { bg: '#FEE2E2', text: '#991B1B' };
    case 'pending':
    default:
      return { bg: '#FEF3C7', text: '#92400E' };
  }
}
