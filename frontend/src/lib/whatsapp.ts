import { WHATSAPP_NUMBER } from './contact';

export interface WhatsAppOrderItem {
  name: string;
  size: string;
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
    .map((item) => `- ${item.name} | Size: ${item.size} | Qty: ${item.quantity} | ₹${item.price}`)
    .join('\n');

  return [
    '*New Order — Sowaat Menswear*',
    '',
    `Name: ${customerName}`,
    'Items:',
    itemLines,
    '',
    `Total: ₹${totalAmount}`,
    '',
    `Address: ${address}`,
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
