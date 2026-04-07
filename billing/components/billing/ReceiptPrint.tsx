"use client";

import React, { forwardRef } from "react";
import { formatPhone } from "./print-utils";

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

const formatBillDate = (d: Date) =>
  d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const formatBillTime = (d: Date) =>
  d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

const money = (value: number) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const ReceiptPrint = forwardRef<
  HTMLDivElement,
  { bill: ReceiptPrintBill; logoSrc?: string }
>(function ReceiptPrint(
  { bill, logoSrc = "/1775556627469.png" },
  ref
) {
  const createdAt = new Date(bill.createdAt || Date.now());
  const items = bill.items || [];
  const totalQty = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const subtotal = Number(bill.subtotal ?? bill.totalAmount ?? 0);
  const received = Number(bill.cashReceived ?? bill.totalAmount ?? 0);
  const balance = Math.max(0, Number(bill.changeReturned ?? 0));
  const phone = formatPhone(bill.customer?.phone || "");

  return (
    <div id="thermal-receipt" ref={ref} className="thermal-receipt">
      <div className="brand-logo-wrap">
        <img src={logoSrc} alt="Sowaat logo" className="brand-logo" />
      </div>

      <div className="brand-name">SOWAAT</div>
      <div className="brand-subname">MENS WEAR</div>

      <div className="line" />
      <div className="center">sowaat Mens wear</div>
      <div className="center">Railway road (near Indian Bank) sirkali</div>
      <div className="center">Ph.No.: 9360838193</div>
      <div className="center">Email: sowaatmenswear@gmail.com</div>
      <div className="line" />

      <div className="title">Tax Invoice</div>
      <div className="row-between">
        <span>{`Invoice No.: ${bill.billNumber || "N/A"}`}</span>
        <span>{`Date: ${formatBillDate(createdAt)}`}</span>
      </div>
      <div className="row-right">{`Time: ${formatBillTime(createdAt)}`}</div>

      <div className="line" />
      <div className="center">Cash Sale</div>
      <div className="center">{`Ph. No.: ${phone}`}</div>
      <div className="line" />

      <div className="table-head">
        <div className="col-num">#</div>
        <div className="col-item">Item Name<br />Qty</div>
        <div className="col-price">Price</div>
        <div className="col-amt">Amount</div>
      </div>

      {items.map((item, index) => {
        const quantity = Number(item.quantity || 0) || 1;
        const amount = Number(item.lineTotal || 0);
        const unitPrice = quantity > 0 ? amount / quantity : amount;
        return (
          <div key={`${item.barcode || "item"}-${index}`} className="item-row">
            <div className="col-num">{index + 1}</div>
            <div className="col-item">
              <div className="item-name">{item.name || "Item"}</div>
              <div className="item-qty">{`${quantity}Nos`}</div>
            </div>
            <div className="col-price">{money(unitPrice)}</div>
            <div className="col-amt">{money(amount)}</div>
          </div>
        );
      })}

      <div className="line" />
      <div className="row-between">
        <span>{`Qty: ${totalQty}`}</span>
        <span>{money(subtotal)}</span>
      </div>

      <div className="amount-row">
        <span>Total</span>
        <span>:</span>
        <span>{money(subtotal)}</span>
      </div>
      <div className="amount-row">
        <span>Received</span>
        <span>:</span>
        <span>{money(received)}</span>
      </div>
      <div className="amount-row">
        <span>Balance</span>
        <span>:</span>
        <span>{money(balance)}</span>
      </div>

      <div className="line" />
      <div className="points-row">
        <span>Available Points</span>
        <span>:</span>
        <span>0.00</span>
      </div>
      <div className="line" />

      <div className="terms-title">Terms &amp; Conditions</div>
      <div className="center">No replacement without label</div>
      <div className="center">Thank you for doing business with us.</div>
    </div>
  );
});

