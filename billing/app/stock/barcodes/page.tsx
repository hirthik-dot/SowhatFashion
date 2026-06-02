"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import BillingShell from "@/components/layout/BillingShell";
import { billingApi } from "@/lib/api";
import BarcodePrintSheet from "@/components/stock/BarcodePrintSheet";

/* ─── types ─── */
type QzStatus = "connecting" | "connected" | "disconnected";

/* ─── QZ Tray CDN loader ─── */
function loadQzScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).qz) { resolve(); return; }
    if (document.querySelector('script[data-qz-tray]')) {
      // script tag exists but hasn't finished loading yet
      const existing = document.querySelector('script[data-qz-tray]') as HTMLScriptElement;
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("QZ Tray script failed to load")));
      return;
    }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.js";
    s.setAttribute("data-qz-tray", "true");
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("QZ Tray script failed to load"));
    document.head.appendChild(s);
  });
}

/* ─── label print CSS (shared between screen‑print and QZ HTML) ─── */
const LABEL_CSS = `
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
    height: fit-content;
    overflow: visible;
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
`;

export default function BarcodePage() {
  const params = useSearchParams();
  const entryId = params.get("entryId");
  const entryIds = params.get("entryIds"); // comma-separated for bulk
  const [entries, setEntries] = useState<any[]>([]);
  const [currentEntryIndex, setCurrentEntryIndex] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);

  /* ─── QZ Tray state ─── */
  const [qzStatus, setQzStatus] = useState<QzStatus>("disconnected");
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>("");
  const [qzError, setQzError] = useState<{ type: "not-running" | "offline"; message: string } | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const isBulkMode = !!entryIds;
  const entry = entries[currentEntryIndex] || null;
  const rawBarcodes: string[] = entry?.barcodes || [];

  // Sort barcodes in ascending order so the earliest sequence is at the top
  const barcodes = [...rawBarcodes].sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ""), 10);
    const numB = parseInt(b.replace(/\D/g, ""), 10);
    return numA - numB;
  });

  // Debug log to verify the exact barcodes received from the backend
  useEffect(() => {
    if (barcodes.length > 0) {
      console.log("Total labels generated:", barcodes.length);
      console.log("First label:", barcodes[0]);
      console.log("Last label:", barcodes[barcodes.length - 1]);
      console.log("All serials:", barcodes);
    }
  }, [barcodes]);

  /* ─── fetch entries ─── */
  useEffect(() => {
    if (entryIds) {
      const ids = entryIds.split(",").filter(Boolean);
      Promise.all(ids.map((id) => billingApi.stockEntryById(id).catch(() => null)))
        .then((results) => setEntries(results.filter(Boolean)));
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

  /* ─── QZ Tray connect ─── */
  const connectQz = useCallback(async () => {
    setQzStatus("connecting");
    setQzError(null);

    try {
      await loadQzScript();
      const qz = (window as any).qz;
      if (!qz) throw new Error("QZ Tray library not available");

      // certificates & signing – secure production mode
      qz.security.setCertificatePromise((resolve: any, reject: any) => {
        billingApi.qzCertificate()
          .then(resolve)
          .catch(reject);
      });
      qz.security.setSignatureAlgorithm("SHA512");
      qz.security.setSignaturePromise((toSign: any) => {
        return (resolve: any, reject: any) => {
          billingApi.qzSign(toSign)
            .then(resolve)
            .catch(reject);
        };
      });

      // disconnect first if already connected (idempotent reconnect)
      if (qz.websocket.isActive()) {
        try { await qz.websocket.disconnect(); } catch { /* ignore */ }
      }

      await qz.websocket.connect();

      // fetch printers
      const list: string[] = await qz.printers.find();
      setPrinters(list);

      // default printer selection
      const preferred = "TVS LP 46 Neo";
      const found = list.find((p: string) => p === preferred);
      setSelectedPrinter(found || list[0] || "");

      setQzStatus("connected");
    } catch (err: any) {
      setQzStatus("disconnected");
      const msg = String(err?.message || err || "");
      if (/websocket|connection refused|ECONNREFUSED|not running/i.test(msg)) {
        setQzError({
          type: "not-running",
          message: "QZ Tray is not running. Download at https://qz.io/download",
        });
      } else {
        setQzError({ type: "not-running", message: msg });
      }
    }
  }, []);

  /* mount / unmount */
  useEffect(() => {
    connectQz();

    const handleBeforeUnload = () => {
      try {
        const qz = (window as any).qz;
        if (qz?.websocket?.isActive()) qz.websocket.disconnect();
      } catch { /* best effort */ }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      handleBeforeUnload();
    };
  }, [connectQz]);

  /* ─── build print HTML ─── */
  const buildPrintHtml = (heightInCm: number): string => {
    if (!gridRef.current) return "";
    const gridHtml = gridRef.current.outerHTML;

    return `<html>
  <head>
    <style>
      @page {
        size: 10.7cm ${heightInCm}cm;
        margin: 0;
        padding: 0;
      }
      html, body {
        margin: 0;
        padding: 0;
        width: 10.7cm;
        height: ${heightInCm}cm;
        overflow: hidden;
      }
      ${LABEL_CSS}
    </style>
  </head>
  <body>
    <div style="margin:0;padding:0;padding-left:0.5cm;">
      ${gridHtml}
    </div>
  </body>
</html>`;
  };

  /* ─── QZ print ─── */
  const handlePrint = async () => {
    const qz = (window as any).qz;
    if (!qz || qzStatus !== "connected" || !selectedPrinter || !gridRef.current) return;

    setIsPrinting(true);
    setQzError(null);

    try {
      // Scroll to top so the full grid is in the DOM viewport
      window.scrollTo(0, 0);
      gridRef.current.scrollIntoView();

      // Wait for React to finish rendering + DOM to settle
      await new Promise((r) => setTimeout(r, 200));

      // Calculate height mathematically instead of relying on DOM measurements
      const LABEL_ROW_HEIGHT_CM = 2.8; // 2.5cm height + 0.3cm gap
      const rows = Math.ceil(barcodes.length / 3);
      const heightInCm = rows * LABEL_ROW_HEIGHT_CM;

      // Debug: verify all labels are captured
      console.log("[QZ Print]", {
        totalBarcodes: barcodes.length,
        gridScrollHeight: gridRef.current.scrollHeight,
        calculatedHeightInCm: heightInCm.toFixed(2),
        childCount: gridRef.current.children.length,
      });

      const config = qz.configs.create(selectedPrinter, {
        scaleContent: false,
        colorType: "blackwhite",
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        units: "cm",
        size: { width: 10.7, height: heightInCm },
      });

      const data = [
        {
          type: "pixel",
          format: "html",
          flavor: "plain",
          data: buildPrintHtml(heightInCm),
        },
      ];

      await qz.print(config, data);

      // advance to next entry in bulk mode
      if (isBulkMode && currentEntryIndex < entries.length - 1) {
        setCurrentEntryIndex((prev) => prev + 1);
      }
    } catch (err: any) {
      const msg = String(err?.message || err || "");
      if (/offline|not ready/i.test(msg)) {
        setQzError({
          type: "offline",
          message: `Printer "${selectedPrinter}" appears to be offline or not ready.`,
        });
      } else {
        setQzError({ type: "not-running", message: msg });
      }
    } finally {
      setIsPrinting(false);
    }
  };

  /* ─── status dot ─── */
  const statusDot = (
    <span className="inline-flex items-center gap-1.5 text-xs mb-2">
      <span
        className={`inline-block w-2.5 h-2.5 rounded-full ${
          qzStatus === "connecting"
            ? "bg-yellow-400 animate-pulse"
            : qzStatus === "connected"
            ? "bg-green-500"
            : "bg-red-500"
        }`}
      />
      <span className="text-[var(--text-secondary)]">
        QZ Tray:{" "}
        {qzStatus === "connecting"
          ? "Connecting…"
          : qzStatus === "connected"
          ? "Connected"
          : "Disconnected"}
      </span>
    </span>
  );

  const printDisabled =
    qzStatus !== "connected" || barcodes.length === 0 || isPrinting;

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

      {/* ─── QZ status ─── */}
      {statusDot}

      {/* ─── Error banners ─── */}
      {qzError?.type === "not-running" && (
        <div className="mb-3 p-3 rounded-lg bg-red-950/60 border border-red-800 flex items-center justify-between gap-3">
          <p className="text-sm text-red-300">
            {qzError.message}
          </p>
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
          <p className="text-sm text-yellow-300">
            {qzError.message}
          </p>
        </div>
      )}

      <div className="pos-card p-4">
        {/* ─── Printer selector ─── */}
        {qzStatus === "connected" && printers.length > 0 && (
          <div className="mb-4 flex items-center gap-3">
            <label className="text-sm text-[var(--text-secondary)] shrink-0">
              Printer:
            </label>
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

        {/* Bulk mode: entry list overview */}
        {isBulkMode && entries.length > 1 && (
          <div className="mb-4 p-3 rounded bg-[var(--card-bg)] border border-[var(--border)]">
            <p className="text-sm font-semibold mb-2 text-[var(--gold)]">
              Bulk Entry — {entries.length} batches
            </p>
            <div className="flex flex-wrap gap-2">
              {entries.map((e, idx) => (
                <button
                  key={e._id}
                  type="button"
                  onClick={() => {
                    setCurrentEntryIndex(idx);
                  }}
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
            {isPrinting
              ? "⏳ PRINTING…"
              : `🖨 PRINT ${barcodes.length} LABELS`}
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

        {/* Render ALL barcodes at once — no pagination */}
        <BarcodePrintSheet
          ref={gridRef}
          barcodes={barcodes}
          productName={[entry?.subCategory?.name, entry?.productName].filter(Boolean).join(" - ") || "Product"}
          size={entry?.size || "-"}
          price={entry?.sellingPrice || 0}
          notes={entry?.notes || ""}
        />

        {/* Navigate between entries in bulk mode */}
        {isBulkMode && entries.length > 1 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              className="px-3 py-2 rounded text-sm bg-[var(--card-bg)] border border-[var(--border)] hover:border-[var(--gold)] transition-colors disabled:opacity-40"
              disabled={currentEntryIndex === 0}
              onClick={() => { setCurrentEntryIndex((prev) => prev - 1); }}
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
              onClick={() => { setCurrentEntryIndex((prev) => prev + 1); }}
            >
              Next Batch →
            </button>
          </div>
        )}
      </div>
    </BillingShell>
  );
}