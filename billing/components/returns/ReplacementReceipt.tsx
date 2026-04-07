"use client";

import React, { useMemo, useRef } from "react";
import { useReactToPrint } from "react-to-print";

export type ReturnLineItem = {
  product?: string;
  barcode?: string;
  name?: string;
  size?: string;
  quantity?: number;
  sellingPrice?: number;
  reason?: string;
};

export type ReturnDocument = {
  _id?: string;
  bill?: string;
  billNumber?: string;
  returnNumber?: string;
  createdAt?: string | number | Date;
  customer?: { name?: string; phone?: string };
  returnedItems?: ReturnLineItem[];
  replacementItems?: ReturnLineItem[];
  returnType?: "replacement" | "partial" | "refund";
  priceDifference?: number;
  refundAmount?: number;
  refundMethod?: string;
  processedByName?: string;
};

const formatMoney = (value: number) => {
  const n = Number(value || 0);
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatSignedMoney = (value: number) => {
  const n = Number(value || 0);
  const abs = Math.abs(n);
  const money = formatMoney(abs);
  if (n > 0) return `+${money}`;
  if (n < 0) return `-${money}`;
  return formatMoney(0);
};

const formatBillDateTime = (d: Date) => {
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} ${time}`;
};

const maskPhone = (phone?: string) => {
  const raw = String(phone || "").replace(/\s+/g, "");
  if (!raw) return "-";
  if (raw.length <= 5) return `${raw}XXXXX`;
  return `${raw.slice(0, 5)}XXXXX`;
};

const lineValue = (item: ReturnLineItem) =>
  Number(item.sellingPrice || 0) * Math.max(1, Number(item.quantity || 1));

function ReceiptRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="receipt-row receipt-row-2col">
      <span className="label">{label}</span>
      <span className="value">{value}</span>
    </div>
  );
}

export default function ReplacementReceipt({
  returnData,
  onClose,
}: {
  returnData: ReturnDocument;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const print = useReactToPrint({ contentRef: ref });

  const createdAt = useMemo(
    () => new Date(returnData.createdAt || Date.now()),
    [returnData.createdAt]
  );

  const isRefund =
    returnData.returnType === "refund" || (returnData.replacementItems || []).length === 0;

  const returnedTotal = useMemo(() => {
    return (returnData.returnedItems || []).reduce((sum, item) => sum + lineValue(item), 0);
  }, [returnData.returnedItems]);

  const replacementTotal = useMemo(() => {
    return (returnData.replacementItems || []).reduce((sum, item) => sum + lineValue(item), 0);
  }, [returnData.replacementItems]);

  const priceDifference = useMemo(() => {
    if (typeof returnData.priceDifference === "number") return returnData.priceDifference;
    return replacementTotal - returnedTotal;
  }, [returnData.priceDifference, replacementTotal, returnedTotal]);

  const refundAmount = useMemo(() => {
    if (typeof returnData.refundAmount === "number" && returnData.refundAmount > 0) return returnData.refundAmount;
    if (isRefund) return returnedTotal;
    if (priceDifference < 0) return Math.abs(priceDifference);
    return 0;
  }, [isRefund, priceDifference, returnData.refundAmount, returnedTotal]);

  const paymentLabel = useMemo(() => {
    const method = String(returnData.refundMethod || "").trim();
    if (method && method !== "none") return method.toUpperCase();
    return "CASH";
  }, [returnData.refundMethod]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50">
      <div className="h-full w-full grid place-items-center p-3">
        <div className="w-full max-w-md bg-white text-black rounded-xl overflow-hidden">
          <div
            className="max-h-[80vh] overflow-y-auto [-webkit-overflow-scrolling:touch]"
            role="dialog"
            aria-modal="true"
          >
            <style>{`
              @media print {
                * { margin: 0; padding: 0; }
                body * { visibility: hidden; }
                #thermal-replacement-receipt, #thermal-replacement-receipt * { visibility: visible; }
                #thermal-replacement-receipt {
                  position: fixed;
                  top: 0;
                  left: 0;
                  margin: 0;
                  padding: 2mm 2mm 2mm 0mm;
                  width: 72mm;
                  font-family: 'Courier New', monospace;
                  color: #000000;
                  background: #ffffff;
                  font-weight: 700;
                }

                .thermal-receipt { font-weight: 700; color: #000000; }
                .receipt-header { text-align: center; }
                .receipt-title { font-size: 14px; font-weight: 900; }
                .receipt-subtitle { font-size: 14px; font-weight: 900; }
                .receipt-section-title { font-size: 12px; font-weight: 900; margin-top: 1mm; }
                .receipt-meta { font-size: 11px; line-height: 1.2; }
                .receipt-items { font-size: 12px; line-height: 1.2; }
                .label { font-size: 11px; }
                .value { font-size: 11px; }
                .receipt-divider-double { border-top: 2px double #000; margin: 1mm 0; }
                .receipt-row-2col { display: flex; justify-content: space-between; gap: 8px; }
                .receipt-item { margin: 1mm 0; }
                .receipt-item-name { font-weight: 900; }
                .receipt-note { text-align: center; font-size: 11px; line-height: 1.2; margin-top: 1mm; }
              }

              .thermal-receipt {
                background: #ffffff;
                color: #000000;
                font-family: 'Courier New', monospace;
                font-weight: 700;
              }
              .receipt-header { text-align: center; }
              .receipt-title { font-size: 14px; font-weight: 900; }
              .receipt-subtitle { font-size: 14px; font-weight: 900; }
              .receipt-divider-double { border-top: 2px double #000; margin: 6px 0; }
              .receipt-meta { font-size: 11px; line-height: 1.2; }
              .receipt-items { font-size: 12px; line-height: 1.2; }
              .receipt-row-2col { display: flex; justify-content: space-between; gap: 8px; }
              .label, .value { font-size: 11px; }
              .receipt-section-title { font-size: 12px; font-weight: 900; margin-top: 8px; }
              .receipt-item { margin: 8px 0; }
              .receipt-item-name { font-weight: 900; }
              .receipt-note { text-align: center; font-size: 11px; line-height: 1.2; margin-top: 8px; }
            `}</style>

            <div className="p-4">
              <div id="thermal-replacement-receipt" ref={ref} className="thermal-receipt">
                <div className="receipt-header">
                  <div className="receipt-title">SOWAAT MENS WEAR</div>
                  <div className="receipt-subtitle">Premium Menswear Store</div>
                </div>

                <div className="receipt-divider-double" />

                <div className="receipt-header">
                  <div className="receipt-title">{isRefund ? "RETURN RECEIPT" : "REPLACEMENT RECEIPT"}</div>
                </div>

                <div className="receipt-meta">
                  <div>Return No : {returnData.returnNumber || "-"}</div>
                  <div>Date      : {formatBillDateTime(createdAt)}</div>
                  <div>Ref Bill  : {returnData.billNumber || "-"}</div>
                  <div>Customer  : {returnData.customer?.name || "-"}</div>
                  <div>Phone     : {maskPhone(returnData.customer?.phone)}</div>
                  {!isRefund ? <div>Processed : {returnData.processedByName || "-"}</div> : null}
                </div>

                <div className="receipt-divider-double" />

                <div className="receipt-section-title">RETURNED ITEMS:</div>
                <div className="receipt-items">
                  {(returnData.returnedItems || []).map((item, index) => (
                    <div key={`${item.barcode || "ret"}-${index}`} className="receipt-item">
                      <div className="receipt-item-name">
                        {item.name || "Item"} ({item.size || "-"}) x{Math.max(1, Number(item.quantity || 1))}
                      </div>
                      <div>Barcode: {item.barcode || "-"}</div>
                      <div>Reason : {item.reason || "Other"}</div>
                      <div>Value  : {formatMoney(lineValue(item))}</div>
                    </div>
                  ))}
                </div>

                {!isRefund ? (
                  <>
                    <div className="receipt-section-title">REPLACEMENT ITEMS:</div>
                    <div className="receipt-items">
                      {(returnData.replacementItems || []).map((item, index) => (
                        <div key={`${item.barcode || "rep"}-${index}`} className="receipt-item">
                          <div className="receipt-item-name">
                            {item.name || "Item"} ({item.size || "-"}) x{Math.max(1, Number(item.quantity || 1))}
                          </div>
                          <div>Barcode: {item.barcode || "-"}</div>
                          <div>Value  : {formatMoney(lineValue(item))}</div>
                        </div>
                      ))}
                    </div>

                    <div className="receipt-divider-double" />

                    <ReceiptRow label="Returned Value" value={formatMoney(returnedTotal)} />
                    <ReceiptRow label="Replacement Value" value={formatMoney(replacementTotal)} />
                    <ReceiptRow label="Price Difference" value={formatSignedMoney(priceDifference)} />
                    <ReceiptRow label="Collected via" value={paymentLabel} />

                    <div className="receipt-note">
                      <div>Exchange completed successfully</div>
                      <div>Keep this receipt for reference</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="receipt-divider-double" />
                    <ReceiptRow label="REFUND AMOUNT" value={formatMoney(refundAmount)} />
                    <ReceiptRow label="Refund via" value={paymentLabel} />
                    <div className="receipt-note">
                      <div>Refund processed successfully</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-white p-3 border-t border-[#ccc] flex gap-2">
              <button
                className="h-11 flex-1 rounded bg-[var(--gold)] text-black font-bold"
                onClick={() => print()}
              >
                {isRefund ? "🖨 Print Return Receipt" : "🖨 Print Replacement Bill"}
              </button>
              <button className="h-11 flex-1 rounded border border-[var(--border)] font-bold" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

