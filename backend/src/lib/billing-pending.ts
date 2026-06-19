import Bill from '../models/Bill';
import { normalizeBillingPhone } from './billing-points';

export const PENDING_BILL_STATUSES = ['completed', 'partial_replaced'];

const phoneRegex = (normalized: string) => {
  const suffix = normalized.slice(-10).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`${suffix}$`);
};

export const getCustomerPendingBalance = async (phone: string): Promise<number> => {
  const normalized = normalizeBillingPhone(phone);
  if (normalized.length < 10) return 0;

  const rows = await Bill.aggregate([
    {
      $match: {
        status: { $in: PENDING_BILL_STATUSES },
        pendingAmount: { $gt: 0 },
        'customer.phone': phoneRegex(normalized),
      },
    },
    { $group: { _id: null, total: { $sum: '$pendingAmount' } } },
  ]);

  return Number(rows[0]?.total || 0);
};

export const getPendingBalancesByPhones = async (phones: string[]): Promise<Map<string, number>> => {
  const normalizedPhones = [...new Set(phones.map((p) => normalizeBillingPhone(p)).filter((p) => p.length >= 10))];
  const result = new Map<string, number>();

  await Promise.all(
    normalizedPhones.map(async (phone) => {
      const balance = await getCustomerPendingBalance(phone);
      if (balance > 0) result.set(phone, balance);
    })
  );

  return result;
};

export const findPendingBillsForPhone = async (phone: string) => {
  const normalized = normalizeBillingPhone(phone);
  if (normalized.length < 10) return [];

  return Bill.find({
    status: { $in: PENDING_BILL_STATUSES },
    pendingAmount: { $gt: 0 },
    'customer.phone': phoneRegex(normalized),
  })
    .select('billNumber customer totalAmount pendingAmount paymentMethod paymentBreakdown completedAt createdAt')
    .sort({ completedAt: 1 })
    .lean();
};
