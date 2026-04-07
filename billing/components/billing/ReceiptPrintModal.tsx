"use client";

import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { ReceiptPrint, type ReceiptPrintBill } from "./ReceiptPrint";

export default function ReceiptPrintModal({
  open,
  bill,
  onClose,
}: {
  open: boolean;
  bill: any;
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
                padding: 16px;
                font-family: 'Courier New', Courier, monospace;
                font-size: 12px;
                font-weight: 600;
                color: #000000;
                background: #ffffff;
                line-height: 1.4;
              }

              .receipt-store-name {
                font-size: 15px;
                font-weight: 900;
                text-align: center;
                letter-spacing: 1px;
              }

              .receipt-store-subtitle {
                font-size: 11px;
                font-weight: 600;
                text-align: center;
                font-style: italic;
              }

              .receipt-divider-major {
                font-size: 12px;
                font-weight: 700;
                color: #000;
                display: block;
                letter-spacing: 0;
                white-space: pre;
              }

              .receipt-divider-minor {
                font-size: 12px;
                font-weight: 600;
                color: #000;
                white-space: pre;
              }

              .receipt-section-header {
                font-size: 12px;
                font-weight: 800;
                text-align: center;
                letter-spacing: 2px;
              }

              .receipt-item-name {
                font-size: 12px;
                font-weight: 700;
                color: #000;
              }

              .receipt-item-detail {
                font-size: 11px;
                font-weight: 600;
                display: flex;
                justify-content: space-between;
              }

              .receipt-row-text {
                font-size: 11px;
                font-weight: 600;
                white-space: pre;
              }

              .receipt-row {
                display: flex;
                justify-content: space-between;
                font-size: 11px;
                font-weight: 600;
              }
              .receipt-row > span:last-child,
              .receipt-item-detail > span:last-child {
                text-align: right;
              }

              .receipt-total-row {
                display: flex;
                justify-content: space-between;
                font-size: 13px;
                font-weight: 900;
                letter-spacing: 0.5px;
              }

              .receipt-footer-text {
                text-align: center;
                font-size: 11px;
                font-weight: 600;
                font-style: italic;
              }

              .receipt-terms {
                text-align: center;
                font-size: 10px;
                font-weight: 500;
                line-height: 1.3;
              }

              @media print {
                * {
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                body * { visibility: hidden; }
                #thermal-receipt,
                #thermal-receipt * { visibility: visible; }
                
                #thermal-receipt {
                  position: fixed;
                  top: 0;
                  left: 0;
                  margin: 0;
                  padding: 3mm 1mm 3mm 0mm;
                  width: 74mm;
                  font-family: 'Courier New', Courier, monospace;
                  font-size: 12px;
                  font-weight: 600;
                  color: #000000;
                  background: #ffffff;
                  line-height: 1.4;
                }
                
                .receipt-store-name {
                  font-size: 15px;
                  font-weight: 900;
                  text-align: center;
                  letter-spacing: 1px;
                }
                
                .receipt-store-subtitle {
                  font-size: 11px;
                  font-weight: 600;
                  text-align: center;
                  font-style: italic;
                }
                
                .receipt-divider-major {
                  font-size: 12px;
                  font-weight: 700;
                  color: #000;
                  display: block;
                  letter-spacing: 0;
                }
                
                .receipt-divider-minor {
                  font-size: 12px;
                  font-weight: 600;
                  color: #000;
                }
                
                .receipt-section-header {
                  font-size: 12px;
                  font-weight: 800;
                  text-align: center;
                  letter-spacing: 2px;
                }
                
                .receipt-item-name {
                  font-size: 12px;
                  font-weight: 700;
                  color: #000;
                }
                
                .receipt-item-detail {
                  font-size: 11px;
                  font-weight: 600;
                  display: flex;
                  justify-content: space-between;
                }
                
                .receipt-row {
                  display: flex;
                  justify-content: space-between;
                  font-size: 11px;
                  font-weight: 600;
                }
                .receipt-row > span:last-child,
                .receipt-item-detail > span:last-child {
                  text-align: right;
                }
                
                .receipt-total-row {
                  display: flex;
                  justify-content: space-between;
                  font-size: 13px;
                  font-weight: 900;
                  letter-spacing: 0.5px;
                }
                
                .receipt-footer-text {
                  text-align: center;
                  font-size: 11px;
                  font-weight: 600;
                  font-style: italic;
                }
                
                .receipt-terms {
                  text-align: center;
                  font-size: 10px;
                  font-weight: 500;
                  line-height: 1.3;
                }
              }
            `}</style>

            <div className="px-4 pt-4 pb-2 text-center text-sm font-semibold text-[#111827]">Receipt Preview</div>
            <ReceiptPrint ref={ref} bill={bill as ReceiptPrintBill} />
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
