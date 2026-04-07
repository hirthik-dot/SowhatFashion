"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useReactToPrint } from "react-to-print";
import BillingShell from "@/components/layout/BillingShell";
import { billingApi } from "@/lib/api";
import BarcodePrintSheet from "@/components/stock/BarcodePrintSheet";

const getPageStyle = (totalLabels: number): string => {
  const LABELS_PER_ROW = 3;
  const ROW_HEIGHT_MM = 36; // height of each label row in mm
  const totalRows = Math.ceil(totalLabels / LABELS_PER_ROW);
  const totalHeightMm = totalRows * ROW_HEIGHT_MM + 4; // +4mm buffer

  return `
    @page {
      size: 105mm ${totalHeightMm}mm;
      margin: 0;
      padding: 0;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
    }
  `;
};

export default function BarcodePage() {
  const params = useSearchParams();
  const entryId = params.get("entryId");
  const [entry, setEntry] = useState<any>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const print = useReactToPrint({
    contentRef: gridRef,
    pageStyle: getPageStyle(entry?.barcodes?.length || 0),
  });

  useEffect(() => {
    if (!entryId) return;
    billingApi
      .stockEntryById(entryId)
      .then(setEntry)
      .catch(() => setEntry(null));
  }, [entryId]);

  const barcodes: string[] = entry?.barcodes || [];

  return (
    <BillingShell title="Barcode Print">
      <style>{`
        @media print {
          body * { visibility: hidden; }

          #barcode-label-sheet,
          #barcode-label-sheet * {
            visibility: visible;
          }

          #barcode-label-sheet {
            position: fixed;
            top: 0;
            left: 0;
            margin: 0;
            padding: 0;
            width: 105mm;
            background: white;
          }

          .label-grid {
            display: grid;
            grid-template-columns: repeat(3, 35mm);
            grid-auto-rows: auto;
            margin: 0;
            padding: 0;
            width: 105mm;
            align-content: start;
            gap: 0;
          }

          .barcode-label {
            width: 35mm;
            box-sizing: border-box;
            padding-top: 2mm;
            padding-left: 1mm;
            padding-right: 1mm;
            padding-bottom: 5mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            page-break-inside: avoid;
            break-inside: avoid;
            border-bottom: 1.5px dashed #000;
            border-right: 1px dotted #aaa;
          }

          .barcode-label:nth-child(3n) {
            border-right: none;
          }

          .barcode-label:nth-last-child(-n+3) {
            border-bottom: none;
          }

          .label-name {
            font-family: "Courier New", monospace;
            font-size: 7px;
            font-weight: 800;
            color: #000;
            text-align: center;
            margin-bottom: 0.5mm;
            text-transform: uppercase;
            max-width: 33mm;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
          }

          .label-size {
            font-family: "Courier New", monospace;
            font-size: 7px;
            font-weight: 600;
            color: #000;
            margin-bottom: 0.5mm;
          }

          .label-barcode svg,
          .label-barcode canvas {
            max-width: 33mm !important;
            width: 33mm !important;
            height: 40px !important;
          }

          .label-barcode-number {
            font-family: "Courier New", monospace;
            font-size: 6px;
            font-weight: 600;
            color: #000;
            letter-spacing: 0.5px;
            margin-top: 0.5mm;
            text-align: center;
          }

          .label-price {
            font-family: "Courier New", monospace;
            font-size: 11px;
            font-weight: 900;
            color: #000;
            margin-top: 1mm;
          }
        }

        .barcode-label-screen {
          border: 1px solid #2E3347;
          border-radius: 4px;
          padding: 8px;
          background: #1A1D27;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .label-grid-screen {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          row-gap: 16px;
        }

        .label-grid-screen::after {
          content: "- - - - - - - - - - cut here - - - - - - - - - -";
          color: #6B6B6B;
          font-size: 10px;
          text-align: center;
          grid-column: 1 / -1;
        }
      `}</style>
      <div className="pos-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Barcodes Generated</h2>
          <button
            className="h-11 px-4 rounded bg-[var(--gold)] text-black"
            onClick={() => print()}
          >
            🖨 PRINT ALL BARCODES
          </button>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-3">
          {entry?.subCategory?.name || ""} · Size {entry?.size || "-"} ·{" "}
          {barcodes.length} labels
        </p>
        <BarcodePrintSheet
          ref={gridRef}
          barcodes={barcodes}
          productName={entry?.subCategory?.name || "Product"}
          size={entry?.size || "-"}
          price={entry?.sellingPrice || 0}
        />
      </div>
    </BillingShell>
  );
}
