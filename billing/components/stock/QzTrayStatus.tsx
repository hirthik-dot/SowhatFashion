"use client";

import type { QzStatus } from "@/hooks/useQzTray";

export default function QzTrayStatus({ qzStatus }: { qzStatus: QzStatus }) {
  return (
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
        {qzStatus === "connecting" ? "Connecting…" : qzStatus === "connected" ? "Connected" : "Disconnected"}
      </span>
    </span>
  );
}
