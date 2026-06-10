"use strict";
/** Loyalty points rules — earn on pre-points bill total; redeem before payment. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.clawbackPointsOnReturn = exports.applyPointsLedger = exports.getOrCreatePointsAccount = exports.validatePointsForBill = exports.maxRedeemablePoints = exports.calcPointsDiscountRupees = exports.calcPointsEarned = exports.normalizeBillingPhone = exports.MIN_REDEEM_POINTS = exports.REDEEM_RUPEES_PER_POINT = exports.EARN_RUPEES_PER_POINT = void 0;
exports.EARN_RUPEES_PER_POINT = 10;
exports.REDEEM_RUPEES_PER_POINT = 0.25;
exports.MIN_REDEEM_POINTS = 100;
const normalizeBillingPhone = (phone) => {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.length >= 10)
        return digits.slice(-10);
    return digits;
};
exports.normalizeBillingPhone = normalizeBillingPhone;
const calcPointsEarned = (prePointsTotalRupees) => Math.floor(Math.max(0, prePointsTotalRupees) / exports.EARN_RUPEES_PER_POINT);
exports.calcPointsEarned = calcPointsEarned;
const calcPointsDiscountRupees = (pointsRedeemed) => Math.max(0, pointsRedeemed) * exports.REDEEM_RUPEES_PER_POINT;
exports.calcPointsDiscountRupees = calcPointsDiscountRupees;
const maxRedeemablePoints = (prePointsTotalRupees, balance) => {
    const byBill = Math.floor((Math.max(0, prePointsTotalRupees) * 0.5) / exports.REDEEM_RUPEES_PER_POINT);
    return Math.max(0, Math.min(Math.max(0, balance), byBill));
};
exports.maxRedeemablePoints = maxRedeemablePoints;
const validatePointsForBill = (params) => {
    const phone = (0, exports.normalizeBillingPhone)(params.phone);
    if (!phone || phone.length < 10) {
        if (params.pointsMode === 'redeem' || (params.pointsMode === 'earn' && params.awardPoints && params.pointsToRedeem > 0)) {
            return { pointsEarned: 0, pointsRedeemed: 0, pointsDiscountAmount: 0, error: 'Valid customer phone is required for points' };
        }
        return { pointsEarned: 0, pointsRedeemed: 0, pointsDiscountAmount: 0 };
    }
    const mode = params.pointsMode === 'redeem' ? 'redeem' : params.pointsMode === 'earn' ? 'earn' : 'none';
    const redeemRequested = mode === 'redeem' && params.pointsToRedeem > 0;
    const earnRequested = mode === 'earn' && params.awardPoints;
    if (redeemRequested && earnRequested) {
        return { pointsEarned: 0, pointsRedeemed: 0, pointsDiscountAmount: 0, error: 'Cannot earn and redeem points on the same bill' };
    }
    if (mode === 'redeem') {
        const pointsRedeemed = Math.floor(Math.max(0, params.pointsToRedeem));
        if (pointsRedeemed === 0) {
            return { pointsEarned: 0, pointsRedeemed: 0, pointsDiscountAmount: 0 };
        }
        if (pointsRedeemed < exports.MIN_REDEEM_POINTS) {
            return {
                pointsEarned: 0,
                pointsRedeemed: 0,
                pointsDiscountAmount: 0,
                error: `Minimum ${exports.MIN_REDEEM_POINTS} points required to redeem`,
            };
        }
        if (pointsRedeemed > params.balance) {
            return {
                pointsEarned: 0,
                pointsRedeemed: 0,
                pointsDiscountAmount: 0,
                error: 'Insufficient points balance',
            };
        }
        const maxPts = (0, exports.maxRedeemablePoints)(params.prePointsTotal, params.balance);
        if (pointsRedeemed > maxPts) {
            return {
                pointsEarned: 0,
                pointsRedeemed: 0,
                pointsDiscountAmount: 0,
                error: `Cannot redeem more than ${maxPts} points for this bill`,
            };
        }
        return {
            pointsEarned: 0,
            pointsRedeemed,
            pointsDiscountAmount: (0, exports.calcPointsDiscountRupees)(pointsRedeemed),
        };
    }
    if (mode === 'earn' && earnRequested) {
        const pointsEarned = (0, exports.calcPointsEarned)(params.prePointsTotal);
        return { pointsEarned, pointsRedeemed: 0, pointsDiscountAmount: 0 };
    }
    return { pointsEarned: 0, pointsRedeemed: 0, pointsDiscountAmount: 0 };
};
exports.validatePointsForBill = validatePointsForBill;
const getOrCreatePointsAccount = async (phone, customerName, BillingPointsAccount) => {
    const normalized = (0, exports.normalizeBillingPhone)(phone);
    let account = await BillingPointsAccount.findOne({ phone: normalized }).lean();
    if (!account) {
        account = await BillingPointsAccount.create({
            phone: normalized,
            customerName: customerName || '',
            balance: 0,
        });
    }
    return { account, normalized };
};
exports.getOrCreatePointsAccount = getOrCreatePointsAccount;
const applyPointsLedger = async (params) => {
    const { normalized } = await (0, exports.getOrCreatePointsAccount)(params.phone, params.customerName, params.BillingPointsAccount);
    const netDelta = params.pointsEarned - params.pointsRedeemed;
    if (netDelta === 0 && params.pointsRedeemed === 0) {
        const acc = await params.BillingPointsAccount.findOne({ phone: normalized });
        return Number(acc?.balance || 0);
    }
    const account = await params.BillingPointsAccount.findOne({ phone: normalized });
    if (!account)
        throw new Error('Points account not found');
    const previousBalance = Number(account.balance || 0);
    const newBalance = Math.max(0, previousBalance + netDelta);
    account.balance = newBalance;
    if (params.customerName)
        account.customerName = params.customerName;
    await account.save();
    if (params.pointsEarned > 0) {
        await params.BillingPointsLedger.create({
            phone: normalized,
            type: 'earn',
            points: params.pointsEarned,
            bill: params.billId,
            billNumber: params.billNumber,
            balanceAfter: newBalance,
            createdBy: params.createdBy,
        });
    }
    if (params.pointsRedeemed > 0) {
        await params.BillingPointsLedger.create({
            phone: normalized,
            type: 'redeem',
            points: -params.pointsRedeemed,
            rupees: params.pointsDiscountAmount,
            bill: params.billId,
            billNumber: params.billNumber,
            balanceAfter: newBalance,
            createdBy: params.createdBy,
        });
    }
    return newBalance;
};
exports.applyPointsLedger = applyPointsLedger;
const clawbackPointsOnReturn = async (params) => {
    const normalized = (0, exports.normalizeBillingPhone)(params.phone);
    if (!normalized || normalized.length < 10)
        return;
    const claw = Math.min(Math.max(0, params.originalPointsEarned), (0, exports.calcPointsEarned)(params.refundAmount));
    if (claw <= 0)
        return;
    const account = await params.BillingPointsAccount.findOne({ phone: normalized });
    if (!account)
        return;
    const previousBalance = Number(account.balance || 0);
    const newBalance = Math.max(0, previousBalance - claw);
    account.balance = newBalance;
    await account.save();
    await params.BillingPointsLedger.create({
        phone: normalized,
        type: 'return_clawback',
        points: -claw,
        bill: params.billId,
        billNumber: params.billNumber,
        balanceAfter: newBalance,
        createdBy: params.createdBy,
        note: `Clawback on return (refund ₹${params.refundAmount})`,
    });
};
exports.clawbackPointsOnReturn = clawbackPointsOnReturn;
//# sourceMappingURL=billing-points.js.map