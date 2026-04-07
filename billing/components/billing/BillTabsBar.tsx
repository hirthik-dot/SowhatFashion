"use client";

import { BillTab } from "@/lib/bill-store";

export default function BillTabsBar({
  tabs,
  activeTabId,
  onNewTab,
  onSetActive,
  onClose,
  heldCount,
  onOpenHeld,
}: {
  tabs: BillTab[];
  activeTabId: string;
  onNewTab: () => void;
  onSetActive: (id: string) => void;
  onClose: (id: string) => void;
  heldCount: number;
  onOpenHeld: () => void;
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {tabs.map((tab, index) => {
        const active = tab.id === activeTabId;
        return (
          <button
            key={tab.id}
            onClick={() => onSetActive(tab.id)}
            className={`min-h-11 px-3 rounded-md border ${active ? "bg-[var(--surface-2)] border-t-2 border-t-[var(--gold)] border-[var(--border)]" : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)]"} flex items-center gap-2`}
          >
            <span>{`Bill #${index + 1}`}</span>
            <span
              className="text-sm hover:text-[var(--error)]"
              onClick={(event) => {
                event.stopPropagation();
                onClose(tab.id);
              }}
            >
              ×
            </span>
          </button>
        );
      })}
      <button onClick={onNewTab} className="min-h-11 px-3 rounded-md border border-dashed border-[var(--gold)] text-[var(--gold)]">
        + New Bill
      </button>
      <button onClick={onOpenHeld} className="min-h-11 px-3 rounded-md border border-[var(--border)] bg-[var(--surface)]">
        Held Bills ({heldCount})
      </button>
    </div>
  );
}
