"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useReactToPrint } from "react-to-print";
import BillingShell from "@/components/layout/BillingShell";
import { billingApi } from "@/lib/api";
import BarcodePrintSheet from "@/components/stock/BarcodePrintSheet";

const getPageStyle = (): string => `
  @page {
    size: 10.7cm auto;
    margin: 0;
  }

  @media print {
    html,
    body {
      margin: 0 !important;
      padding: 0 !important;
    }
  }
`;

export default function BarcodePage() {
  const params = useSearchParams();
  const entryId = params.get("entryId");
  const [entry, setEntry] = useState<any>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const print = useReactToPrint({
    contentRef: gridRef,
    pageStyle: getPageStyle(),
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
            margin-left: -0.25cm;
            margin-top: 1.4cm;
            padding: 0.3cm;
            width: 10.7cm;
            box-sizing: border-box;
            background: white;
          }

          .label-grid {
            display: grid;
            grid-template-columns: repeat(3, 3.4cm);
            grid-auto-rows: 2.5cm;
            column-gap: 0;
            row-gap: 0.3cm;
            margin: 0;
            padding: 0;
            width: auto;
            align-content: start;
          }

          .barcode-label {
            width: 100%;
            height: 2.4cm;
            box-sizing: border-box;
            padding: 0.08cm 0.1cm;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            justify-content: flex-start;
            page-break-inside: avoid;
            break-inside: avoid;
            overflow: hidden;
            position: relative;
          }

          .barcode-label-empty {
            visibility: hidden;
          }

          .label-name {
            font-family: "Courier New", monospace;
            font-size: 7pt;
            font-weight: 800;
            color: #000;
            text-align: left;
            margin-bottom: 0.01cm;
            text-transform: uppercase;
            width: 100%;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
          }

          .label-size {
            font-family: "Courier New", monospace;
            font-size: 6pt;
            font-weight: 600;
            color: #000;
            margin-bottom: 0.01cm;
            text-align: left;
          }

          .label-barcode {
            width: 100%;
            height: 1.05cm;
            display: flex;
            align-items: center;
            justify-content: flex-start;
            overflow: hidden;
          }

          .label-barcode svg,
          .label-barcode canvas {
            width: 100% !important;
            height: 100% !important;
            max-width: 100% !important;
            max-height: 100% !important;
          }

          .label-barcode-number {
            font-family: "Courier New", monospace;
            font-size: 5pt;
            font-weight: 600;
            color: #000;
            letter-spacing: 0.01cm;
            margin-top: 0.02cm;
            text-align: left;
            line-height: 1;
            width: 100%;
          }

          .label-price {
            font-family: "Courier New", monospace;
            font-size: 6pt;
            font-weight: 900;
            color: #000;
            margin-top: 0.01cm;
            line-height: 1;
            text-align: left;
            width: 100%;
          }

          .label-shop-name {
            position: absolute;
            right: 0.08cm;
            bottom: 0.06cm;
            font-family: "Courier New", monospace;
            font-size: 5pt;
            font-weight: 700;
            color: #000;
            text-align: right;
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
