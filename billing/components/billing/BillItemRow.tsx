"use client";

import { BillItem } from "@/lib/bill-store";

export default function BillItemRow({
  item,
  index,
  onDiscountType,
  onDiscountValue,
  onQty,
  onRemove,
}: {
  item: BillItem;
  index: number;
  onDiscountType: (type: "percent" | "amount") => void;
  onDiscountValue: (value: number) => void;
  onQty: (qty: number) => void;
  onRemove: () => void;
}) {
  const discountAmount =
    item.itemDiscountType === "percent"
      ? (item.mrp * item.itemDiscountValue) / 100
      : item.itemDiscountType === "amount"
      ? item.itemDiscountValue
      : 0;
  const price = Math.max(0, item.mrp - discountAmount);
  const total = price * item.quantity;
  return (
    <div className="grid grid-cols-2 md:grid-cols-12 gap-2 items-center bg-[var(--surface-2)] rounded p-2 text-sm">
      <div className="col-span-2 md:col-span-1 text-[var(--text-secondary)] md:text-inherit">#{index + 1}</div>
      <div className="col-span-2 md:col-span-3">{item.name} {item.size ? `(${item.size})` : ""}</div>
      <div className="col-span-1 md:col-span-1">₹{item.mrp}</div>
      <div className="col-span-1 md:col-span-2 flex items-center gap-1">
        <button className="h-9 w-9 rounded border border-[var(--border)]" onClick={() => onDiscountType(item.itemDiscountType === "percent" ? "amount" : "percent")}>
          {item.itemDiscountType === "percent" ? "%" : "₹"}
        </button>
        <input className="pos-input h-9 min-h-0 w-full" type="number" value={item.itemDiscountValue} onChange={(e) => onDiscountValue(Number(e.target.value || 0))} />
      </div>
      <div className="col-span-1 md:col-span-1">₹{price.toFixed(2)}</div>
      <div className="col-span-1 md:col-span-2 flex items-center gap-1">
        <button className="h-9 w-9 rounded border border-[var(--border)]" onClick={() => onQty(item.quantity - 1)}>-</button>
        <span className="w-8 text-center">{item.quantity}</span>
        <button className="h-9 w-9 rounded border border-[var(--border)]" onClick={() => onQty(item.quantity + 1)}>+</button>
      </div>
      <div className="col-span-1 md:col-span-1 font-semibold">₹{total.toFixed(2)}</div>
      <button className="col-span-1 md:col-span-1 text-[var(--error)] justify-self-end md:justify-self-start" onClick={onRemove}>✕</button>
    </div>
  );
}
