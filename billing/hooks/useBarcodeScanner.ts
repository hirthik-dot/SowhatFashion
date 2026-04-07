"use client";

import { useEffect, useRef } from "react";

export function useBarcodeScanner(onScan: (barcode: string) => Promise<void> | void) {
  const buffer = useRef("");
  const lastKeyTime = useRef(0);

  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      const now = Date.now();
      if (event.key === "Enter" && buffer.current.length > 3) {
        const scanned = buffer.current;
        buffer.current = "";
        await onScan(scanned);
        return;
      }
      if (now - lastKeyTime.current > 100) {
        buffer.current = "";
      }
      if (event.key.length === 1) {
        buffer.current += event.key;
      }
      lastKeyTime.current = now;
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onScan]);
}
