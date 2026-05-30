"use client";

import { useEffect, useMemo, useState } from "react";
import { billingApi } from "@/lib/api";
import {
  calcPointsDiscountRupees,
  calcPointsEarned,
  maxRedeemablePoints,
  MIN_REDEEM_POINTS,
  normalizeBillingPhone,
  REDEEM_RUPEES_PER_POINT,
  type PointsMode,
} from "@/lib/points";

type Props = {
  phone: string;
  pointsMode: PointsMode;
  awardPoints: boolean;
  pointsToRedeem: number;
  prePointsTotal: number;
  onModeChange: (mode: PointsMode) => void;
  onAwardChange: (award: boolean) => void;
  onRedeemChange: (points: number) => void;
};

export default function PointsPanel({
  phone,
  pointsMode,
  awardPoints,
  pointsToRedeem,
  prePointsTotal,
  onModeChange,
  onAwardChange,
  onRedeemChange,
}: Props) {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  const normalized = useMemo(() => normalizeBillingPhone(phone), [phone]);
  const hasPhone = normalized.length >= 10;

  useEffect(() => {
    if (!hasPhone) {
      setBalance(0);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      billingApi
        .pointsBalance(normalized)
        .then((data: any) => {
          if (!cancelled) setBalance(Number(data?.balance || 0));
        })
        .catch(() => {
          if (!cancelled) setBalance(0);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [normalized, hasPhone]);

  const maxRedeem = useMemo(
    () => (hasPhone ? maxRedeemablePoints(prePointsTotal, balance) : 0),
    [hasPhone, prePointsTotal, balance]
  );

  const redeemDiscount = calcPointsDiscountRupees(pointsToRedeem);
  const wouldEarn = calcPointsEarned(prePointsTotal);

  return (
    <div className="rounded border border-[var(--border)] p-2 space-y-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-[var(--text-primary)]">Loyalty points</span>
        {hasPhone ? (
          <span className="text-[var(--gold)] font-semibold">
            {loading ? "…" : `${balance} pts`}
          </span>
        ) : (
          <span className="text-xs text-[var(--text-secondary)]">Enter phone for balance</span>
        )}
      </div>

      <div className="flex rounded border border-[var(--border)] overflow-hidden">
        <button
          type="button"
          className={`flex-1 py-1.5 text-xs font-medium ${
            pointsMode === "earn" ? "bg-[var(--gold)] text-black" : "bg-transparent text-[var(--text-secondary)]"
          }`}
          onClick={() => onModeChange("earn")}
        >
          Earn
        </button>
        <button
          type="button"
          className={`flex-1 py-1.5 text-xs font-medium ${
            pointsMode === "redeem" ? "bg-[var(--gold)] text-black" : "bg-transparent text-[var(--text-secondary)]"
          }`}
          disabled={!hasPhone || balance < MIN_REDEEM_POINTS}
          onClick={() => onModeChange("redeem")}
        >
          Redeem
        </button>
      </div>

      {pointsMode === "earn" ? (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={awardPoints}
            onChange={(e) => onAwardChange(e.target.checked)}
            className="rounded"
          />
          <span>Award points on this bill</span>
          {awardPoints && prePointsTotal > 0 ? (
            <span className="ml-auto text-[var(--success)]">+{wouldEarn} pts</span>
          ) : null}
        </label>
      ) : (
        <div className="space-y-1">
          {balance < MIN_REDEEM_POINTS ? (
            <p className="text-xs text-[var(--text-secondary)]">
              Need at least {MIN_REDEEM_POINTS} points to redeem (balance: {balance})
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={MIN_REDEEM_POINTS}
                  max={maxRedeem}
                  step={1}
                  className="pos-input h-9 min-h-0 flex-1"
                  value={pointsToRedeem || ""}
                  placeholder={`Min ${MIN_REDEEM_POINTS}`}
                  onChange={(e) => onRedeemChange(Number(e.target.value || 0))}
                />
                <button
                  type="button"
                  className="text-xs px-2 py-1 rounded border border-[var(--border)]"
                  onClick={() => onRedeemChange(maxRedeem)}
                >
                  Max
                </button>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Max {maxRedeem} pts · Discount ₹{redeemDiscount.toFixed(2)}
              </p>
            </>
          )}
        </div>
      )}

      <p className="text-[10px] text-[var(--text-secondary)] leading-snug">
        ₹10 spent = 1 pt · 1 pt = ₹{REDEEM_RUPEES_PER_POINT} · Min {MIN_REDEEM_POINTS} to redeem · No earn + redeem on same bill
      </p>
    </div>
  );
}
