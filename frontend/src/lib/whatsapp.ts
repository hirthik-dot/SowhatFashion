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
