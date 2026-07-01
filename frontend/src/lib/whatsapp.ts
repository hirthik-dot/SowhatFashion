import { WHATSAPP_NUMBER } from './contact';

export interface WhatsAppOrderItem {
  name: string;
  size: string;
  color?: string;
  quantity: number;
  price: number;
}

export function buildWhatsAppOrderMessage(params: {
  customerName: string;
  items: WhatsAppOrderItem[];
  totalAmount: number;
  address: string;
}): string {
  const { customerName, items, totalAmount, address } = params;
  const itemLines = items
    .map((item) => {
      let line = `- ${item.name} | Size: ${item.size}`;
      if (item.color) line += ` | Color: ${item.color}`;
      line += ` | Qty: ${item.quantity} | ₹${item.price}`;
      return line;
    })
    .join('\n');

  return [
    '*New Order — Sowaat Menswear*',
    '',
    `*Customer Name:* ${customerName}`,
    '',
    '*Items Ordered:*',
    itemLines,
    '',
    `*Total Amount:* ₹${totalAmount}`,
    '',
    `*Delivery Address:*`,
    address,
  ].join('\n');
}

export function buildWhatsAppOrderLink(params: {
  customerName: string;
  items: WhatsAppOrderItem[];
  totalAmount: number;
  address: string;
}): string {
  const message = buildWhatsAppOrderMessage(params);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppCancelMessage(params: {
  orderId: string;
  customerName: string;
  items: WhatsAppOrderItem[];
  totalAmount: number;
  reason?: string;
}): string {
  const { orderId, customerName, items, totalAmount, reason } = params;
  const itemLines = items
    .map((item) => {
      let line = `- ${item.name} | Size: ${item.size}`;
      if (item.color) line += ` | Color: ${item.color}`;
      line += ` | Qty: ${item.quantity} | ₹${item.price}`;
      return line;
    })
    .join('\n');

  return [
    '*Cancel Order Request — Sowaat Menswear*',
    '',
    `*Order ID:* ${orderId}`,
    `*Customer Name:* ${customerName}`,
    '',
    '*Items to Cancel:*',
    itemLines,
    '',
    `*Order Total:* ₹${totalAmount}`,
    reason ? `*Reason:* ${reason}` : '',
    '',
    'Please process my cancellation request.',
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildWhatsAppCancelLink(params: {
  orderId: string;
  customerName: string;
  items: WhatsAppOrderItem[];
  totalAmount: number;
  reason?: string;
}): string {
  const message = buildWhatsAppCancelMessage(params);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
