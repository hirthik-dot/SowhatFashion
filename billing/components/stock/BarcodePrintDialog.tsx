"use client";

import { useMemo, useRef } from "react";
import BarcodePrintSheet from "@/components/stock/BarcodePrintSheet";
import { useQzTray } from "@/hooks/useQzTray";
import { LABEL_CSS, LABEL_SCREEN_CSS } from "@/lib/label-print-css";
import QzTrayStatus from "@/components/stock/QzTrayStatus";

export type BarcodePrintDialogProps = {
  open: boolean;
  title: string;
  barcodes: string[];
  productName: string;
  size: string;
  price: number;
  notes?: string;
  onClose: () => void;
};

function sortBarcodes(barcodes: string[]) {
  return [...barcodes].sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ""), 10);
    const numB = parseInt(b.replace(/\D/g, ""), 10);
    return numA - numB;
  });
}

export default function BarcodePrintDialog({
  open,
  title,
  barcodes,
  productName,
  size,
  price,
  notes,
  onClose,
}: BarcodePrintDialogProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const {
    qzStatus,
    printers,
    selectedPrinter,
    setSelectedPrinter,
    qzError,
    isPrinting,
    connectQz,
    printLabels,
  } = useQzTray();

  const sortedBarcodes = useMemo(() => sortBarcodes(barcodes), [barcodes]);
  const printDisabled = qzStatus !== "connected" || sortedBarcodes.length === 0 || isPrinting;

  if (!open) return null;

  const handlePrint = async () => {
    await printLabels(gridRef, sortedBarcodes.length);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] grid place-items-center p-4">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #barcode-label-sheet,
          #barcode-label-sheet * { visibility: visible; }
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
          ${LABEL_CSS}
        }
        ${LABEL_SCREEN_CSS}
      `}</style>
      <div className="pos-card p-4 w-full max-w-3xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">{title}</h3>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <QzTrayStatus qzStatus={qzStatus} />

        {qzError?.type === "not-running" && (
          <div className="mb-3 p-3 rounded-lg bg-red-950/60 border border-red-800 flex items-center justify-between gap-3">
            <p className="text-sm text-red-300">{qzError.message}</p>
            <button
              type="button"
              className="px-3 py-1.5 rounded text-xs font-semibold bg-red-700 hover:bg-red-600 text-white transition-colors shrink-0"
              onClick={connectQz}
            >
              Retry
            </button>
          </div>
        )}

        {qzError?.type === "offline" && (
          <div className="mb-3 p-3 rounded-lg bg-yellow-950/60 border border-yellow-800">
            <p className="text-sm text-yellow-300">{qzError.message}</p>
          </div>
        )}

        {qzStatus === "connected" && printers.length > 0 && (
          <div className="mb-4 flex items-center gap-3">
            <label className="text-sm text-[var(--text-secondary)] shrink-0">Printer:</label>
            <select
              value={selectedPrinter}
              onChange={(e) => setSelectedPrinter(e.target.value)}
              className="flex-1 h-9 px-3 rounded bg-[var(--card-bg)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:border-[var(--gold)] outline-none transition-colors"
            >
              {printers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        )}

        <p className="text-sm text-[var(--text-secondary)] mb-3">
          {productName} · Size {size} · ₹{Number(price || 0).toFixed(2)} · {sortedBarcodes.length} label
          {sortedBarcodes.length !== 1 ? "s" : ""}
        </p>

        <div className="mb-4">
          <BarcodePrintSheet
            ref={gridRef}
            barcodes={sortedBarcodes}
            productName={productName}
            size={size}
            price={price}
            notes={notes}
          />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="h-10 px-4 rounded bg-[var(--gold)] text-black font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={handlePrint}
            disabled={printDisabled}
          >
            {isPrinting ? "⏳ PRINTING…" : `🖨 PRINT ${sortedBarcodes.length} LABEL${sortedBarcodes.length !== 1 ? "S" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
