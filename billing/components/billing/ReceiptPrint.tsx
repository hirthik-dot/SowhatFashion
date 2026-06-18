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
    sellingPrice?: number;
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
  pointsEarned?: number;
  pointsRedeemed?: number;
  pointsDiscountAmount?: number;
  pointsBalanceAfter?: number;
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

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  gpay: "GPay",
  upi: "UPI",
  card: "Card",
  partial: "Partial",
};

export const ReceiptPrint = forwardRef<
  HTMLDivElement,
  { bill: ReceiptPrintBill; logoSrc?: string }
>(function ReceiptPrint(
  { bill, logoSrc = "/1775556627469.png" },
  ref
) {
  const createdAt = bill.createdAt ? new Date(bill.createdAt) : new Date();
  const items = (bill.items || []).filter((item: any) => !item.replacedOut);
  const totalQty = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const subtotal = Number(bill.subtotal ?? bill.totalAmount ?? 0);
  const totalItemDiscount = Number(bill.totalItemDiscount || 0);
  const billDiscountAmount = Number(bill.billDiscountAmount || 0);
  const afterItemDiscount = Math.max(0, subtotal - totalItemDiscount);
  const taxableAmount = Math.max(
    0,
    Number(bill.taxableAmount || 0) > 0 ? Number(bill.taxableAmount) : afterItemDiscount
  );
  const gstAmount =
    Number(bill.gstAmount || 0) > 0 ? Number(bill.gstAmount) : taxableAmount * 0.05;
  const cgst = Number(bill.cgst || 0) > 0 ? Number(bill.cgst) : gstAmount / 2;
  const sgst = Number(bill.sgst || 0) > 0 ? Number(bill.sgst) : gstAmount / 2;
  const grossWithGst = taxableAmount + gstAmount;
  const pointsDiscountAmount = Number(bill.pointsDiscountAmount || 0);
  const pointsEarned = Number(bill.pointsEarned || 0);
  const pointsRedeemed = Number(bill.pointsRedeemed || 0);
  const pointsBalance = Number(bill.pointsBalanceAfter ?? 0);
  const hasCustomerPhone = Boolean(
    String(bill.customer?.phone || bill.customer?.mobile || bill.customer?.mobileNumber || "").replace(/\D/g, "").length >= 10
  );
  const showPoints =
    hasCustomerPhone || pointsEarned > 0 || pointsRedeemed > 0 || pointsDiscountAmount > 0 || pointsBalance > 0;
  const totalSavings = totalItemDiscount + billDiscountAmount + pointsDiscountAmount;
  const rawGrandTotal =
    Number(bill.totalAmount || 0) > 0
      ? Number(bill.totalAmount)
      : Math.max(0, grossWithGst - billDiscountAmount - pointsDiscountAmount);
  const billGrandTotal = Math.round(rawGrandTotal);
  const receiptRoundOff =
    Number(bill.roundOff || 0) !== 0 ? Number(bill.roundOff) : billGrandTotal - rawGrandTotal;
  const paymentMethod = String(bill.paymentMethod || "cash").toLowerCase();
  const paymentBreakdown = (bill.paymentBreakdown || []).filter((entry) => Number(entry.amount || 0) > 0);
  const totalPaidFromBreakdown = paymentBreakdown.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const storedCashReceived = Number(bill.cashReceived || 0);
  const storedChange = Math.max(0, Number(bill.changeReturned ?? 0));

  let received: number;
  let balance: number;
  if (paymentMethod === "partial" && paymentBreakdown.length > 0) {
    received = totalPaidFromBreakdown;
    balance = storedChange;
  } else if (paymentMethod === "cash") {
    received = storedCashReceived > 0 ? storedCashReceived : billGrandTotal;
    balance = storedChange > 0 ? storedChange : Math.max(0, received - billGrandTotal);
  } else {
    received = billGrandTotal;
    balance = 0;
  }
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
      <div className="center">GST No.: 33CLRPB9946G1ZQ</div>
      <div className="line" />

      <div className="title">Tax Invoice</div>
      <div className="row-between">
        <span>{`Invoice No.: ${bill.billNumber || "N/A"}`}</span>
        <span>{`Date: ${formatBillDate(createdAt)}`}</span>
      </div>
      <div className="row-right">{`Time: ${formatBillTime(createdAt)}`}</div>

      <div className="line" />
      <div className="receipt-body-inset">
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
        <div className="col-item">Item</div>
        <div className="col-qty">Qty</div>
        <div className="col-price">MRP/SP</div>
        <div className="col-amt">Amount</div>
      </div>

      {items.map((item, index) => {
        const quantity = Number(item.quantity || 0) || 1;
        const amount = Number(item.lineTotal || 0);
        const mrpPrice = Number(item.mrp || 0) || (quantity > 0 ? amount / quantity : amount);
        const sellingPrice = Number(item.sellingPrice || 0) || (quantity > 0 ? amount / quantity : amount);
        const hasItemDiscount = mrpPrice > sellingPrice + 0.009;
        return (
          <div key={`${item.barcode || "item"}-${index}`} className="item-row">
            <div className="col-num">{index + 1}</div>
            <div className="col-item">
              <div className="item-name">{item.name || "Item"}</div>
              <div className="item-size">{`Size: ${item.size || "-"}`}</div>
              {hasItemDiscount ? (
                <div className="item-discount-tag">{`Disc: -${money(mrpPrice - sellingPrice)}`}</div>
              ) : null}
            </div>
            <div className="col-qty">{quantity}</div>
            <div className="col-price">
              {hasItemDiscount ? (
                <>
                  <span className="price-struck">{money(mrpPrice)}</span>
                  <span>{` / ${money(sellingPrice)}`}</span>
                </>
              ) : (
                `${money(mrpPrice)} / ${money(sellingPrice)}`
              )}
            </div>
            <div className={`col-amt${hasItemDiscount ? " price-discounted" : ""}`}>{money(sellingPrice * quantity)}</div>
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
      <div className="amount-row">
        <span>GST (5%)</span>
        <span>:</span>
        <span>+{money(gstAmount)}</span>
      </div>
      <div className="amount-row">
        <span>Before Discount</span>
        <span>:</span>
        <span>{money(grossWithGst)}</span>
      </div>
      {totalSavings > 0 && (
        <div className="discount-section">
          {totalItemDiscount > 0 && (
            <div className="amount-row discount-row">
              <span>Item Disc</span>
              <span>:</span>
              <span>-{money(totalItemDiscount)}</span>
            </div>
          )}
          {billDiscountAmount > 0 && (
            <div className="amount-row discount-row">
              <span>Customer Disc</span>
              <span>:</span>
              <span>-{money(billDiscountAmount)}</span>
            </div>
          )}
          {pointsDiscountAmount > 0 && (
            <div className="amount-row discount-row">
              <span>Points Disc</span>
              <span>:</span>
              <span>
                {pointsRedeemed} (-{money(pointsDiscountAmount)})
              </span>
            </div>
          )}
          <div className="you-saved">You saved ₹{money(totalSavings)}</div>
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
          <span>{money(taxableAmount)}</span>
          <span>{money(cgst)}</span>
          <span>{money(sgst)}</span>
          <span>{money(grossWithGst)}</span>
        </div>
      </div>
      <div className="line" />

      {receiptRoundOff !== 0 && (
        <div className="amount-row">
          <span>Round Off</span>
          <span>:</span>
          <span>{receiptRoundOff > 0 ? "+" : ""}{money(receiptRoundOff)}</span>
        </div>
      )}

      <div className="amount-row net-total-row">
        <span>Net Total</span>
        <span>:</span>
        <span>{money(billGrandTotal)}</span>
      </div>

      {paymentMethod === "partial" && paymentBreakdown.length > 0 ? (
        <>
          <div className="amount-row">
            <span>Payment</span>
            <span>:</span>
            <span>Partial</span>
          </div>
          {paymentBreakdown.map((entry, index) => (
            <div key={`${entry.method || "split"}-${index}`} className="amount-row">
              <span>{PAYMENT_LABELS[String(entry.method || "").toLowerCase()] || entry.method || "Split"}</span>
              <span>:</span>
              <span>{money(Number(entry.amount || 0))}</span>
            </div>
          ))}
        </>
      ) : paymentMethod !== "partial" ? (
        <div className="amount-row">
          <span>Payment</span>
          <span>:</span>
          <span>{PAYMENT_LABELS[paymentMethod] || paymentMethod}</span>
        </div>
      ) : null}

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

      {showPoints ? (
        <>
          {pointsEarned > 0 ? (
            <div className="amount-row">
              <span>Points earned</span>
              <span>:</span>
              <span>+{pointsEarned}</span>
            </div>
          ) : null}
          <div className="line" />
          <div className="points-row">
            <span>Available Points</span>
            <span>:</span>
            <span>{pointsBalance.toFixed(0)}</span>
          </div>
          <div className="line" />
        </>
      ) : null}

      <div className="terms-title">Terms &amp; Conditions</div>
      <div className="terms-item">* No return &amp; no refund.</div>
      <div className="terms-item">* Exchange allowed only with original bill and tag.</div>
      <div className="terms-item">* No exchange on offer items.</div>
      <div className="terms-item">* Exchange accepted within 7 days from the date of purchase.</div>
      </div>
      <div className="center">Thank you for doing business with us.</div>
    </div>
  );
});

