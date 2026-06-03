"use client";

import { useCallback, useEffect, useState } from "react";
import { billingApi } from "@/lib/api";
import { LABEL_CSS } from "@/lib/label-print-css";

export type QzStatus = "connecting" | "connected" | "disconnected";
export type QzError = { type: "not-running" | "offline"; message: string } | null;

function loadQzScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).qz) {
      resolve();
      return;
    }
    if (document.querySelector('script[data-qz-tray]')) {
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

function buildPrintHtml(gridEl: HTMLElement, heightInCm: number): string {
  const gridHtml = gridEl.outerHTML;
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
}

const LABEL_ROW_HEIGHT_CM = 2.8;

export function useQzTray() {
  const [qzStatus, setQzStatus] = useState<QzStatus>("disconnected");
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState("");
  const [qzError, setQzError] = useState<QzError>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const connectQz = useCallback(async () => {
    setQzStatus("connecting");
    setQzError(null);

    try {
      await loadQzScript();
      const qz = (window as any).qz;
      if (!qz) throw new Error("QZ Tray library not available");

      qz.security.setCertificatePromise((resolve: any, reject: any) => {
        billingApi.qzCertificate().then(resolve).catch(reject);
      });
      qz.security.setSignatureAlgorithm("SHA512");
      qz.security.setSignaturePromise((toSign: any) => {
        return (resolve: any, reject: any) => {
          billingApi.qzSign(toSign).then(resolve).catch(reject);
        };
      });

      if (qz.websocket.isActive()) {
        try {
          await qz.websocket.disconnect();
        } catch {
          /* ignore */
        }
      }

      await qz.websocket.connect();

      const list: string[] = await qz.printers.find();
      setPrinters(list);

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

  useEffect(() => {
    connectQz();

    const handleBeforeUnload = () => {
      try {
        const qz = (window as any).qz;
        if (qz?.websocket?.isActive()) qz.websocket.disconnect();
      } catch {
        /* best effort */
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      handleBeforeUnload();
    };
  }, [connectQz]);

  const printLabels = useCallback(
    async (gridRef: React.RefObject<HTMLDivElement | null>, barcodeCount: number) => {
      const qz = (window as any).qz;
      if (!qz || qzStatus !== "connected" || !selectedPrinter || !gridRef.current || barcodeCount === 0) {
        return false;
      }

      setIsPrinting(true);
      setQzError(null);

      try {
        window.scrollTo(0, 0);
        gridRef.current.scrollIntoView();
        await new Promise((r) => setTimeout(r, 200));

        const rows = Math.ceil(barcodeCount / 3);
        const heightInCm = rows * LABEL_ROW_HEIGHT_CM;

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
            data: buildPrintHtml(gridRef.current, heightInCm),
          },
        ];

        await qz.print(config, data);
        return true;
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
        return false;
      } finally {
        setIsPrinting(false);
      }
    },
    [qzStatus, selectedPrinter]
  );

  return {
    qzStatus,
    printers,
    selectedPrinter,
    setSelectedPrinter,
    qzError,
    isPrinting,
    connectQz,
    printLabels,
  };
}
