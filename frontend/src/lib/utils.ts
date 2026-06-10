export function formatPrice(price: number): string {
  return `₹${price.toLocaleString('en-IN')}`;
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

export function calculateDiscount(price: number, discountPrice: number): number {
  if (!discountPrice || discountPrice >= price) return 0;
  return Math.round(((price - discountPrice) / price) * 100);
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
