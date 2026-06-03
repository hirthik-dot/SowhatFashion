"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import BillingShell from "@/components/layout/BillingShell";
import { billingApi } from "@/lib/api";
import BarcodePrintSheet from "@/components/stock/BarcodePrintSheet";
import { useQzTray } from "@/hooks/useQzTray";
import { LABEL_CSS, LABEL_SCREEN_CSS } from "@/lib/label-print-css";
import QzTrayStatus from "@/components/stock/QzTrayStatus";

export default function BarcodePage() {
  const params = useSearchParams();
  const entryId = params.get("entryId");
  const entryIds = params.get("entryIds");
  const [entries, setEntries] = useState<any[]>([]);
  const [currentEntryIndex, setCurrentEntryIndex] = useState(0);
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

  const isBulkMode = !!entryIds;
  const entry = entries[currentEntryIndex] || null;
  const rawBarcodes: string[] = entry?.barcodes || [];

  const barcodes = [...rawBarcodes].sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ""), 10);
    const numB = parseInt(b.replace(/\D/g, ""), 10);
    return numA - numB;
  });

  useEffect(() => {
    if (entryIds) {
      const ids = entryIds.split(",").filter(Boolean);
      Promise.all(ids.map((id) => billingApi.stockEntryById(id).catch(() => null))).then((results) =>
        setEntries(results.filter(Boolean))
      );
    } else if (entryId) {
      billingApi
        .stockEntryById(entryId)
        .then((e) => setEntries(e ? [e] : []))
        .catch(() => setEntries([]));
    }
  }, [entryId, entryIds]);

  useEffect(() => {
    setCurrentEntryIndex(0);
  }, [entryId, entryIds]);

  const handlePrint = async () => {
    const printed = await printLabels(gridRef, barcodes.length);
    if (printed && isBulkMode && currentEntryIndex < entries.length - 1) {
      setCurrentEntryIndex((prev) => prev + 1);
    }
  };

  const printDisabled = qzStatus !== "connected" || barcodes.length === 0 || isPrinting;

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

          ${LABEL_CSS}
        }

        ${LABEL_SCREEN_CSS}
      `}</style>

      <QzTrayStatus qzStatus={qzStatus} />

      {qzError?.type === "not-running" && (
        <div className="mb-3 p-3 rounded-lg bg-red-950/60 border border-red-800 flex items-center justify-between gap-3">
          <p className="text-sm text-red-300">{qzError.message}</p>
          <button
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

      <div className="pos-card p-4">
        {qzStatus === "connected" && printers.length > 0 && (
          <div className="mb-4 flex items-center gap-3">
            <label className="text-sm text-[var(--text-secondary)] shrink-0">Printer:</label>
            <select
              value={selectedPrinter}
              onChange={(e) => setSelectedPrinter(e.target.value)}
              className="flex-1 h-9 px-3 rounded bg-[var(--card-bg)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:border-[var(--gold)] outline-none transition-colors"
            >
              {printers.map((p: string) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        )}

        {isBulkMode && entries.length > 1 && (
          <div className="mb-4 p-3 rounded bg-[var(--card-bg)] border border-[var(--border)]">
            <p className="text-sm font-semibold mb-2 text-[var(--gold)]">Bulk Entry — {entries.length} batches</p>
            <div className="flex flex-wrap gap-2">
              {entries.map((e, idx) => (
                <button
                  key={e._id}
                  type="button"
                  onClick={() => setCurrentEntryIndex(idx)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    idx === currentEntryIndex
                      ? "bg-[var(--gold)] text-black"
                      : "bg-[var(--card-bg)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--gold)]"
                  }`}
                >
                  {e.size} × {e.quantity}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Barcodes Generated</h2>
          <button
            className="h-11 px-4 rounded bg-[var(--gold)] text-black font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            onClick={handlePrint}
            disabled={printDisabled}
          >
            {isPrinting ? "⏳ PRINTING…" : `🖨 PRINT ${barcodes.length} LABELS`}
          </button>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-3">
          {[entry?.subCategory?.name, entry?.productName].filter(Boolean).join(" - ")} · Size {entry?.size || "-"} ·{" "}
          {barcodes.length} labels
          {isBulkMode && entries.length > 1 && (
            <span className="ml-1">
              · Batch {currentEntryIndex + 1} of {entries.length}
            </span>
          )}
        </p>

        <BarcodePrintSheet
          ref={gridRef}
          barcodes={barcodes}
          productName={[entry?.subCategory?.name, entry?.productName].filter(Boolean).join(" - ") || "Product"}
          size={entry?.size || "-"}
          price={entry?.sellingPrice || 0}
          notes={entry?.notes || ""}
        />

        {isBulkMode && entries.length > 1 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              className="px-3 py-2 rounded text-sm bg-[var(--card-bg)] border border-[var(--border)] hover:border-[var(--gold)] transition-colors disabled:opacity-40"
              disabled={currentEntryIndex === 0}
              onClick={() => setCurrentEntryIndex((prev) => prev - 1)}
            >
              ← Previous Batch
            </button>
            <span className="text-sm text-[var(--text-secondary)]">
              Batch {currentEntryIndex + 1} / {entries.length}
            </span>
            <button
              type="button"
              className="px-3 py-2 rounded text-sm bg-[var(--card-bg)] border border-[var(--border)] hover:border-[var(--gold)] transition-colors disabled:opacity-40"
              disabled={currentEntryIndex >= entries.length - 1}
              onClick={() => setCurrentEntryIndex((prev) => prev + 1)}
            >
              Next Batch →
            </button>
          </div>
        )}
      </div>
    </BillingShell>
  );
}
