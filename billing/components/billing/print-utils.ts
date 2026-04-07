// Format currency
export const formatCurrency = (amount: number): string => {
  if (!amount || amount === 0) return "₹0.00";
  return (
    "₹" +
    Math.abs(amount).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
};

// Format phone (mask last 5 digits)
export const formatPhone = (phone: string): string => {
  if (!phone) return "N/A";
  const p = phone.replace(/\D/g, "");
  if (p.length === 10) return p.slice(0, 5) + " " + p.slice(5);
  return phone;
};

// Pad string for alignment
export const padRight = (str: string, len: number): string => str.toString().padEnd(len, " ");

export const padLeft = (str: string, len: number): string => str.toString().padStart(len, " ");

// Format receipt row (label left, value right, total width 40 chars)
export const receiptRow = (label: string, value: string, width = 40): string => {
  const remaining = width - label.length - value.length;
  return label + " ".repeat(Math.max(1, remaining)) + value;
};
