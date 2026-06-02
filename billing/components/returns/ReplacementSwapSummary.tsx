"use client";

export type SwapLine = {
  barcode?: string;
  name?: string;
  size?: string;
  quantity?: number;
  mrp?: number;
  sellingPrice?: number;
  itemDiscountAmount?: number;
  billDiscountShare?: number;
  lineTotal?: number;
  reason?: string;
};

export type ReturnSwapRecord = {
  returnNumber?: string;
  createdAt?: string | Date;
  returnType?: string;
  returnedItems?: SwapLine[];
  replacementItems?: SwapLine[];
  priceDifference?: number;
  replacementItemDiscount?: number;
  replacementBillDiscount?: number;
  processedByName?: string;
};

const formatMoney = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function SwapLineCard({ item, tone }: { item: SwapLine; tone: "out" | "in" }) {
  const qty = Math.max(1, Number(item.quantity || 1));
  const mrp = Number(item.mrp ?? item.sellingPrice ?? 0);
  const lineDisc =
    Number(item.itemDiscountAmount || 0) * qty + Number(item.billDiscountShare || 0);
  const net =
    Number(item.lineTotal || 0) > 0
      ? Number(item.lineTotal)
      : Math.max(0, mrp * qty - lineDisc);

  return (
    <div
      className={`rounded border p-2 text-sm ${
        tone === "out"
          ? "border-red-500/40 bg-red-950/20"
          : "border-green-500/40 bg-green-950/20"
      }`}
    >
      <p className="font-medium text-white">
        {item.name || "Item"} <span className="text-[var(--text-secondary)]">({item.size || "-"})</span>
      </p>
      <p className="text-xs text-[var(--text-secondary)] mt-0.5">Barcode: {item.barcode || "-"}</p>
      <p className="text-xs mt-1">
        Qty {qty} · MRP {formatMoney(mrp)}
        {lineDisc > 0 ? ` · Disc -${formatMoney(lineDisc)}` : ""} · Net {formatMoney(net)}
      </p>
      {item.reason ? <p className="text-xs text-[var(--text-secondary)] mt-1">Reason: {item.reason}</p> : null}
    </div>
  );
}

export default function ReplacementSwapSummary({ records }: { records: ReturnSwapRecord[] }) {
  if (!records.length) return null;

  return (
    <div className="space-y-4">
      {records.map((record) => (
        <div key={record.returnNumber || String(record.createdAt)} className="rounded-lg border border-[var(--border)] p-3 bg-[var(--surface-2)]">
          <div className="flex flex-wrap justify-between gap-2 mb-3 text-sm">
            <div>
              <p className="font-semibold text-white">
                Return {record.returnNumber || "-"}
                <span className="ml-2 text-xs font-normal text-[var(--text-secondary)]">
                  {record.returnType === "partial" ? "Partial replacement" : "Full replacement"}
                </span>
              </p>
              {record.createdAt ? (
                <p className="text-xs text-[var(--text-secondary)]">
                  {new Date(record.createdAt).toLocaleString("en-IN")}
                  {record.processedByName ? ` · by ${record.processedByName}` : ""}
                </p>
              ) : null}
            </div>
            <div className="text-right text-xs">
              {Number(record.replacementItemDiscount || 0) > 0 ? (
                <p className="text-red-300">Item disc: -{formatMoney(Number(record.replacementItemDiscount))}</p>
              ) : null}
              {Number(record.replacementBillDiscount || 0) > 0 ? (
                <p className="text-red-300">Bill disc: -{formatMoney(Number(record.replacementBillDiscount))}</p>
              ) : null}
              <p className="text-[var(--text-secondary)] mt-1">
                Price diff: {formatMoney(Number(record.priceDifference || 0))}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-center">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase text-red-300">Returned (out)</p>
              {(record.returnedItems || []).map((item, i) => (
                <SwapLineCard key={`${item.barcode}-out-${i}`} item={item} tone="out" />
              ))}
            </div>
            <p className="text-center text-2xl text-[var(--gold)] hidden md:block">→</p>
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase text-green-300">Replacement (in)</p>
              {(record.replacementItems || []).map((item, i) => (
                <SwapLineCard key={`${item.barcode}-in-${i}`} item={item} tone="in" />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
