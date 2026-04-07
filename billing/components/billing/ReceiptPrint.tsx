"use client";

import React, { forwardRef } from "react";
import { formatCurrency, formatPhone, receiptRow } from "./print-utils";

export type ReceiptPrintBill = {
  billNumber?: string;
  createdAt?: string | number | Date;
  createdBy?: { name?: string };
  salesmanName?: string;
  salesman?: { name?: string };
  paymentMethod?: string;
  paymentBreakdown?: Array<{ method?: string; amount?: number }>;
  customer?: { name?: string; phone?: string };
  items?: Array<{
    barcode?: string;
    name?: string;
    size?: string;
    quantity?: number;
    lineTotal?: number;
  }>;
  subtotal?: number;
  totalItemDiscount?: number;
  billDiscountAmount?: number;
  taxableAmount?: number;
  gstAmount?: number;
  cgst?: number;
  sgst?: number;
  roundOff?: number;
  totalAmount?: number;
  cashReceived?: number;
  changeReturned?: number;
};

const MAJOR_DIVIDER = "================================";
const MINOR_DIVIDER = "--------------------------------";

const formatBillDate = (d: Date) =>
  d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const formatBillTime = (d: Date) =>
  d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

export const ReceiptPrint = forwardRef<HTMLDivElement, { bill: ReceiptPrintBill }>(function ReceiptPrint(
  { bill },
  ref
) {
  const createdAt = new Date(bill.createdAt || Date.now());
  const totalDiscount = Number(bill.totalItemDiscount || 0) + Number(bill.billDiscountAmount || 0);
  const gstAmount = Number(bill.gstAmount || 0);
  const cgst = Number(bill.cgst ?? gstAmount / 2);
  const sgst = Number(bill.sgst ?? gstAmount / 2);

  const paymentMethod = String(bill.paymentMethod || "").toLowerCase();
  const paymentMethodLabel = String(bill.paymentMethod || "N/A").toUpperCase();
  const paymentBreakdown = bill.paymentBreakdown || [];
  const cashBreakdown = paymentBreakdown.find(
    (entry) => String(entry.method || "").toLowerCase() === "cash"
  );
  const hasCashComponent = paymentMethod === "cash" || Number(cashBreakdown?.amount || 0) > 0;

  const cashReceived = hasCashComponent
    ? paymentMethod === "cash"
      ? Number(bill.cashReceived || 0)
      : Number(cashBreakdown?.amount || 0)
    : 0;
  const safeChange = Math.max(0, Number(bill.changeReturned || 0));

  const effectiveSalesman =
    !bill.salesman || !bill.salesmanName ? "Counter Sale" : String(bill.salesmanName).trim() || "Counter Sale";
  const customerName = bill.customer?.name?.trim() || "Walk-in Customer";
  const phone = formatPhone(bill.customer?.phone || "");

  return (
    <div id="thermal-receipt" ref={ref} className="thermal-receipt">
      <div className="receipt-divider-major">{MAJOR_DIVIDER}</div>

      <div className="receipt-store-name">SOWAAT MENS WEAR</div>
      <div className="receipt-store-subtitle">Premium Menswear Store</div>

      <div className="receipt-divider-major">{MAJOR_DIVIDER}</div>

      <div className="receipt-row-text">
        {receiptRow(`Bill: ${bill.billNumber || "N/A"}`, formatBillDate(createdAt))}
      </div>
      <div className="receipt-row-text">{receiptRow("Time:", formatBillTime(createdAt))}</div>
      <div className="receipt-row-text">{receiptRow("Salesman :", effectiveSalesman)}</div>
      <div className="receipt-row-text">{receiptRow("Payment  :", paymentMethodLabel)}</div>
      <div className="receipt-row-text">{receiptRow("Customer :", customerName)}</div>
      <div className="receipt-row-text">{receiptRow("Phone    :", phone)}</div>

      <div className="receipt-divider-major">{MAJOR_DIVIDER}</div>
      <div className="receipt-section-header">ITEMS</div>
      <div className="receipt-divider-minor">{MINOR_DIVIDER}</div>

      {(bill.items || []).map((item, index) => {
        const quantity = Number(item.quantity || 0);
        const lineTotal = Number(item.lineTotal || 0);
        return (
          <div key={`${item.barcode || "item"}-${index}`}>
            <div className="receipt-item-name">
              {`${item.name || "Item"} (${item.size || "-"})`}
            </div>
            <div className="receipt-item-detail">
              <span>{`Qty: ${quantity}  MRP:${formatCurrency(lineTotal / Math.max(1, quantity))}`}</span>
              <span>{formatCurrency(lineTotal)}</span>
            </div>
            {index !== (bill.items || []).length - 1 && (
              <div className="receipt-divider-minor">{MINOR_DIVIDER}</div>
            )}
          </div>
        );
      })}

      <div className="receipt-divider-minor">{MINOR_DIVIDER}</div>

      <div className="receipt-row">
        <span>Subtotal         :</span>
        <span>{formatCurrency(Number(bill.subtotal || 0))}</span>
      </div>
      {totalDiscount > 0 && (
        <div className="receipt-row">
          <span>Total Discount   :</span>
          <span>{`-${formatCurrency(totalDiscount)}`}</span>
        </div>
      )}
      <div className="receipt-divider-minor">{MINOR_DIVIDER}</div>
      <div className="receipt-row">
        <span>Taxable Amt      :</span>
        <span>{formatCurrency(Number(bill.taxableAmount || 0))}</span>
      </div>
      <div className="receipt-row">
        <span>CGST @ 2.5%      :</span>
        <span>{formatCurrency(cgst)}</span>
      </div>
      <div className="receipt-row">
        <span>SGST @ 2.5%      :</span>
        <span>{formatCurrency(sgst)}</span>
      </div>
      <div className="receipt-row">
        <span>Round Off        :</span>
        <span>{formatCurrency(Number(bill.roundOff || 0))}</span>
      </div>
      <div className="receipt-divider-major">{MAJOR_DIVIDER}</div>
      <div className="receipt-total-row">
        <span>** TOTAL         :</span>
        <span>{`${formatCurrency(Number(bill.totalAmount || 0))} **`}</span>
      </div>
      <div className="receipt-divider-major">{MAJOR_DIVIDER}</div>

      {paymentMethod === "partial" &&
        paymentBreakdown.map((entry, index) => (
          <div key={`${entry.method || "partial"}-${index}`} className="receipt-row">
            <span>{`${String(entry.method || "OTHER").toUpperCase()} Payment :`}</span>
            <span>{formatCurrency(Number(entry.amount || 0))}</span>
          </div>
        ))}

      {hasCashComponent && (
        <>
          <div className="receipt-row">
            <span>Cash Received    :</span>
            <span>{formatCurrency(cashReceived)}</span>
          </div>
          <div className="receipt-row">
            <span>Change           :</span>
            <span>{formatCurrency(safeChange <= 0 ? 0 : safeChange)}</span>
          </div>
        </>
      )}

      <div className="receipt-divider-major">{MAJOR_DIVIDER}</div>
      <div className="receipt-footer-text">Thank you for shopping with us!</div>
      <div className="receipt-footer-text">Please visit us again :)</div>
      <div className="receipt-divider-minor">{MINOR_DIVIDER}</div>
      <div className="receipt-terms">
        Non-returnable without original bill.
        <br />
        Subject to store policy.
      </div>
      <div className="receipt-divider-major">{MAJOR_DIVIDER}</div>
    </div>
  );
});

