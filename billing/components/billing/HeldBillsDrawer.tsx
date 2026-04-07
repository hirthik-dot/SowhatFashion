"use client";

export default function HeldBillsDrawer({
  open,
  onClose,
  bills,
  onResume,
  onDiscard,
}: {
  open: boolean;
  onClose: () => void;
  bills: any[];
  onResume: (bill: any) => void;
  onDiscard: (id: string) => void;
}) {
  return (
    <div className={`fixed inset-0 z-50 ${open ? "pointer-events-auto" : "pointer-events-none"}`}>
      <div className={`absolute inset-0 bg-black/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <aside className={`absolute right-0 top-0 h-full w-full max-w-md bg-[var(--surface)] border-l border-[var(--border)] p-4 transition-transform ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">HELD BILLS</h3>
          <button onClick={onClose}>Close</button>
        </div>
        <div className="space-y-2">
          {bills.map((bill) => (
            <div key={bill._id} className="pos-card p-3">
              <p className="font-medium">{bill.customer?.name || "Walk-in Customer"}</p>
              <p className="text-sm text-[var(--text-secondary)]">{bill.items?.length || 0} items · ₹{bill.totalAmount || 0}</p>
              <div className="mt-2 flex gap-2">
                <button className="h-10 px-3 rounded bg-[var(--gold)] text-black" onClick={() => onResume(bill)}>Resume</button>
                <button className="h-10 px-3 rounded border border-[var(--border)]" onClick={() => onDiscard(bill._id)}>Discard</button>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
