export const EARN_RUPEES_PER_POINT = 10;
export const REDEEM_RUPEES_PER_POINT = 0.25;
export const MIN_REDEEM_POINTS = 100;

export type PointsMode = "earn" | "redeem";

export const normalizeBillingPhone = (phone: string): string => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
};

export const calcPointsEarned = (prePointsTotalRupees: number): number =>
  Math.floor(Math.max(0, prePointsTotalRupees) / EARN_RUPEES_PER_POINT);

export const calcPointsDiscountRupees = (pointsRedeemed: number): number =>
  Math.max(0, pointsRedeemed) * REDEEM_RUPEES_PER_POINT;

export const maxRedeemablePoints = (prePointsTotalRupees: number, balance: number): number => {
  const byBill = Math.floor((Math.max(0, prePointsTotalRupees) * 0.5) / REDEEM_RUPEES_PER_POINT);
  return Math.max(0, Math.min(Math.max(0, balance), byBill));
};
