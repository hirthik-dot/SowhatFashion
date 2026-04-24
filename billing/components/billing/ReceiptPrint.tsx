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
  customer?: { name?: string; phone?: string; mobile?: string; mobileNumber?: string };
  items?: Array<{
    barcode?: string;
    name?: string;
    size?: string;
    quantity?: number;
    mrp?: number;
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
  const customerPhone = formatPhone(
    bill.customer?.phone || bill.customer?.mobile || bill.customer?.mobileNumber || ""
  );

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
      <div className="customer-row">
        <span className="customer-label">Customer:</span>
        <span className="customer-value">{bill.customer?.name || "Walk-in"}</span>
      </div>
      <div className="customer-row">
        <span className="customer-label">Mobile:</span>
        <span className="customer-value">{customerPhone}</span>
      </div>
      <div className="customer-row">
        <span className="customer-label">Salesman:</span>
        <span className="customer-value">
          {bill.salesmanName ||
            bill.salesman?.name ||
            "—"}
        </span>
      </div>
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
        const mrpPrice = Number(item.mrp || 0) || (quantity > 0 ? amount / quantity : amount);
        return (
          <div key={`${item.barcode || "item"}-${index}`} className="item-row">
            <div className="col-num">{index + 1}</div>
            <div className="col-item">
              <div className="item-name">{item.name || "Item"}</div>
              <div className="item-qty">{`Size: ${item.size || "-"}`}</div>
              <div className="item-qty">{`${quantity}Nos`}</div>
            </div>
            <div className="col-price">{money(mrpPrice)}</div>
            <div className="col-amt">{money(mrpPrice * quantity)}</div>
          </div>
        );
      })}

      <div className="line" />
      <div className="row-between">
        <span>{`Qty: ${totalQty}`}</span>
        <span>{money(subtotal)}</span>
      </div>

      <div className="amount-row">
        <span>Total MRP</span>
        <span>:</span>
        <span>{money(subtotal)}</span>
      </div>
      {Number(bill.totalItemDiscount || 0) > 0 && (
        <div className="amount-row">
          <span>Item Disc</span>
          <span>:</span>
          <span>-{money(Number(bill.totalItemDiscount))}</span>
        </div>
      )}
      {Number(bill.billDiscountAmount || 0) > 0 && (
        <div className="amount-row">
          <span>Bill Disc</span>
          <span>:</span>
          <span>-{money(Number(bill.billDiscountAmount))}</span>
        </div>
      )}

      {/* GST Breakdown Table */}
      <div className="line" />
      <div className="gst-table">
        <div className="gst-row gst-head">
          <span>Taxable Amt</span>
          <span>CGST(2.5%)</span>
          <span>SGST(2.5%)</span>
          <span>Amount</span>
        </div>
        <div className="gst-row">
          <span>{money(Number(bill.taxableAmount || 0))}</span>
          <span>{money(Number(bill.cgst || 0))}</span>
          <span>{money(Number(bill.sgst || 0))}</span>
          <span>{money(Number(bill.totalAmount || 0))}</span>
        </div>
      </div>
      <div className="line" />

      <div className="amount-row" style={{ fontWeight: 'bold' }}>
        <span>Net Total</span>
        <span>:</span>
        <span>{money(Number(bill.totalAmount || 0))}</span>
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

