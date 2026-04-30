"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useReactToPrint } from "react-to-print";
import BillingShell from "@/components/layout/BillingShell";
import { billingApi } from "@/lib/api";
import BarcodePrintSheet from "@/components/stock/BarcodePrintSheet";

const LABELS_PER_PAGE = 15;

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
  const [currentPage, setCurrentPage] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);

  const barcodes: string[] = entry?.barcodes || [];
  const totalPages = Math.max(1, Math.ceil(barcodes.length / LABELS_PER_PAGE));
  const pageToShow = Math.min(currentPage, totalPages);
  const allPagesPrinted = barcodes.length > 0 && currentPage > totalPages;
  const pageStart = (pageToShow - 1) * LABELS_PER_PAGE;
  const pageBarcodes = barcodes.slice(pageStart, pageStart + LABELS_PER_PAGE);

  const print = useReactToPrint({
    contentRef: gridRef,
    pageStyle: getPageStyle(),
    onAfterPrint: () => {
      setCurrentPage((prev) => prev + 1);
    },
  });

  useEffect(() => {
    if (!entryId) return;
    billingApi
      .stockEntryById(entryId)
      .then(setEntry)
      .catch(() => setEntry(null));
  }, [entryId]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [entryId, barcodes.length]);

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
            font-size: 5pt;
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

          .label-notes {
            font-family: "Courier New", monospace;
            font-size: 5pt;
            font-weight: 600;
            color: #000;
            margin-bottom: 0.01cm;
            text-align: left;
            text-transform: uppercase;
            width: 100%;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
          }

          .label-barcode {
            width: 100%;
            height: 1.2cm;
            display: flex;
            align-items: center;
            justify-content: flex-start;
            overflow: hidden;
          }

          .label-barcode svg,
          .label-barcode canvas {
            width: auto !important;
            height: 100% !important;
            max-width: 100% !important;
            max-height: 100% !important;
            display: block;
          }

          .label-barcode svg {
            shape-rendering: crispEdges;
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
      `}</style>
      <div className="pos-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Barcodes Generated</h2>
          <button
            className="h-11 px-4 rounded bg-[var(--gold)] text-black"
            onClick={() => print()}
            disabled={barcodes.length === 0 || allPagesPrinted}
          >
            {allPagesPrinted
              ? `✅ ALL ${totalPages} PAGES PRINTED`
              : pageToShow < totalPages
              ? `🖨 PRINT PAGE ${pageToShow} OF ${totalPages}`
              : `🖨 PRINT FINAL PAGE ${totalPages} OF ${totalPages}`}
          </button>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-3">
          {[entry?.subCategory?.name, entry?.productName].filter(Boolean).join(" - ")} · Size {entry?.size || "-"} ·{" "}
          {barcodes.length} labels · Showing page {pageToShow} of {totalPages}
        </p>
        <BarcodePrintSheet
          ref={gridRef}
          barcodes={pageBarcodes}
          productName={[entry?.subCategory?.name, entry?.productName].filter(Boolean).join(" - ") || "Product"}
          size={entry?.size || "-"}
          price={entry?.sellingPrice || 0}
          notes={entry?.notes || ""}
        />
      </div>
    </BillingShell>
  );
}
