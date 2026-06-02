"use client";

import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { ReceiptPrint, type ReceiptPrintBill } from "./ReceiptPrint";

export default function ReceiptPrintModal({
  open,
  bill,
  logoSrc,
  onClose,
}: {
  open: boolean;
  bill: any;
  logoSrc?: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const print = useReactToPrint({ contentRef: ref });
  if (!open || !bill) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[rgba(0,0,0,0.8)]">
      <div className="h-full w-full grid place-items-center p-3">
        <div className="w-full max-w-xs bg-white text-black overflow-hidden rounded-md">
          <div className="max-h-[75vh] overflow-y-auto receipt-scroll" role="dialog" aria-modal="true">
            <style>{`
              .receipt-scroll {
                scrollbar-width: thin;
                scrollbar-color: #777 #f3f4f6;
              }
              .receipt-scroll::-webkit-scrollbar { width: 8px; }
              .receipt-scroll::-webkit-scrollbar-track { background: #f3f4f6; }
              .receipt-scroll::-webkit-scrollbar-thumb { background: #888; border-radius: 8px; }

              #thermal-receipt {
                width: 78mm;
                margin: 0 auto;
                transform: translateX(calc(-0.6cm + 1mm));
                padding: 2mm 3mm;
                box-sizing: border-box;
                font-family: 'Courier New', Courier, monospace;
                font-size: 12px;
                font-weight: 600;
                color: #000000;
                background: #ffffff;
                line-height: 1.2;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }

              #thermal-receipt .center,
              #thermal-receipt .brand-subname,
              #thermal-receipt .row-between,
              #thermal-receipt .row-right,
              #thermal-receipt .item-row,
              #thermal-receipt .amount-row,
              #thermal-receipt .points-row,
              #thermal-receipt .terms-item,
              #thermal-receipt .customer-value,
              #thermal-receipt .gst-row:not(.gst-head) {
                font-weight: 600;
              }

              .brand-logo-wrap {
                text-align: center;
                margin-bottom: 2px;
              }
              .brand-logo {
                width: 60px;
                height: auto;
                display: inline-block;
              }
              .brand-name {
                text-align: center;
                font-size: 24px;
                font-weight: 800;
                letter-spacing: 2px;
                margin-top: 1px;
              }
              .brand-subname {
                text-align: center;
                font-size: 12px;
                letter-spacing: 3px;
                margin-bottom: 4px;
              }
              .center {
                text-align: center;
                margin: 1px 0;
              }
              .title {
                text-align: center;
                font-weight: 700;
                font-size: 19px;
                margin: 4px 0 2px;
              }
              .line {
                border-top: 1px dashed #000;
                margin: 4px 0;
              }
              .row-between {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 8px;
              }
              .row-right {
                text-align: right;
              }
              .table-head,
              .item-row {
                display: flex;
                align-items: flex-start;
                margin: 1px 0;
              }
              .table-head {
                font-weight: 700;
              }
              .col-num {
                width: 6%;
              }
              .col-item {
                width: 49%;
              }
              .col-price {
                width: 20%;
                text-align: right;
              }
              .col-amt {
                width: 25%;
                text-align: right;
              }
              .item-name,
              .item-qty {
                word-break: break-word;
              }
              .item-discount-tag {
                font-weight: 700;
                font-size: 10px;
                margin-top: 1px;
              }
              .price-struck {
                text-decoration: line-through;
              }
              .price-discounted {
                font-weight: 700;
              }
              .discount-section {
                background: #000;
                color: #fff;
                padding: 3px 4px;
                margin: 3px 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .discount-section .amount-row {
                color: #fff;
              }
              .amount-row.discount-row {
                font-weight: 700;
                padding: 1px 0;
                margin: 0;
              }
              .you-saved {
                text-align: center;
                font-weight: 800;
                font-size: 13px;
                padding: 3px 0 1px;
                border-top: 1px dashed #fff;
                margin-top: 2px;
              }
              .amount-row,
              .points-row {
                display: flex;
                justify-content: flex-end;
                gap: 6px;
              }
              .amount-row > span:first-child {
                min-width: 55px;
                text-align: left;
              }
              .amount-row > span:nth-child(2),
              .points-row > span:nth-child(2) {
                width: 8px;
                text-align: center;
              }
              .amount-row > span:last-child,
              .points-row > span:last-child {
                min-width: 84px;
                text-align: right;
              }
              .points-row {
                justify-content: space-between;
              }
              .customer-row {
                display: flex;
                justify-content: space-between;
                margin: 1px 0;
              }
              .customer-label {
                font-weight: 700;
                white-space: nowrap;
                margin-right: 4px;
              }
              .customer-value {
                text-align: right;
                word-break: break-word;
              }
              .gst-table {
                width: 100%;
                margin: 2px 0;
              }
              .gst-row {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr 1fr;
                gap: 2px;
                text-align: right;
                font-size: 10px;
              }
              .gst-row > span:first-child {
                text-align: left;
              }
              .gst-head {
                font-weight: 700;
                border-bottom: 1px solid #000;
                padding-bottom: 2px;
                margin-bottom: 2px;
              }
              .terms-title {
                text-align: center;
                font-weight: 700;
                margin: 4px 0 2px;
              }
              .terms-item {
                font-size: 10px;
                line-height: 1.25;
                margin: 1px 0;
                text-align: left;
              }

              @media print {
                body * { visibility: hidden; }
                #thermal-receipt,
                #thermal-receipt * { visibility: visible; }

                @page {
                  size: 80mm auto;
                  margin: 0;
                }

                #thermal-receipt {
                  position: fixed;
                  top: 0;
                  left: calc(-0.6cm + 1mm);
                  margin: 0;
                  transform: none;
                  width: 78mm;
                  padding: 2mm 3mm;
                  box-sizing: border-box;
                  font-family: 'Courier New', Courier, monospace;
                  font-size: 11px;
                  font-weight: 600;
                  line-height: 1.2;
                  color: #000000;
                  background: #ffffff;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }

                /* Regular body text */
                #thermal-receipt .center,
                #thermal-receipt .brand-subname,
                #thermal-receipt .row-between,
                #thermal-receipt .row-right,
                #thermal-receipt .item-row,
                #thermal-receipt .amount-row,
                #thermal-receipt .points-row,
                #thermal-receipt .terms-item,
                #thermal-receipt .customer-value,
                #thermal-receipt .gst-row:not(.gst-head) {
                  font-weight: 600;
                }

                /* Emphasis sections */
                #thermal-receipt .title,
                #thermal-receipt .table-head,
                #thermal-receipt .customer-label,
                #thermal-receipt .item-discount-tag,
                #thermal-receipt .price-discounted,
                #thermal-receipt .gst-head,
                #thermal-receipt .terms-title,
                #thermal-receipt .amount-row.discount-row {
                  font-weight: 700;
                }

                #thermal-receipt .brand-name,
                #thermal-receipt .you-saved {
                  font-weight: 800;
                }
              }
            `}</style>

            <div className="px-4 pt-4 pb-2 text-center text-sm font-semibold text-[#111827]">Receipt Preview</div>
            <ReceiptPrint ref={ref} bill={bill as ReceiptPrintBill} logoSrc={logoSrc} />
            <div className="sticky bottom-0 bg-white border-t border-[#ccc] p-3 flex gap-2">
              <button
                className="h-11 flex-1 rounded bg-[#C9A84C] text-black font-bold"
                onClick={() => print()}
              >
                🖨 Print Receipt
              </button>
              <button
                className="h-11 flex-1 rounded bg-[#f3f4f6] text-gray-700 font-semibold"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
