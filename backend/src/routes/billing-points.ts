import express, { Response } from 'express';
import BillingPointsAccount from '../models/BillingPointsAccount';
import BillingPointsLedger from '../models/BillingPointsLedger';
import { BillingAuthRequest } from '../middleware/billingAuthMiddleware';
import { normalizeBillingPhone } from '../lib/billing-points';

const router = express.Router();

router.get('/balance', async (req: BillingAuthRequest, res: Response) => {
  const phone = normalizeBillingPhone(String(req.query.phone || ''));
  if (!phone || phone.length < 10) {
    return res.json({ phone: phone || '', balance: 0 });
  }
  const account = await BillingPointsAccount.findOne({ phone }).lean();
  return res.json({
    phone,
    balance: Number(account?.balance || 0),
    customerName: account?.customerName || '',
  });
});

router.get('/ledger', async (req: BillingAuthRequest, res: Response) => {
  const phone = normalizeBillingPhone(String(req.query.phone || ''));
  if (!phone || phone.length < 10) {
    return res.status(400).json({ message: 'Valid phone is required' });
  }
  const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
  const entries = await BillingPointsLedger.find({ phone })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  const account = await BillingPointsAccount.findOne({ phone }).lean();
  return res.json({
    phone,
    balance: Number(account?.balance || 0),
    entries,
  });
});

export default router;
