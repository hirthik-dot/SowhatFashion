import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import BillingAdmin from '../models/BillingAdmin';
import {
  billingAuthMiddleware,
  BillingAdminPermissions,
  BillingAuthRequest,
  BillingRole,
} from '../middleware/billingAuthMiddleware';

const router = express.Router();
const isProduction = process.env.NODE_ENV === 'production';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts, please try again later.' },
});

const signBillingToken = (id: string, role: BillingRole, permissions: BillingAdminPermissions) => {
  return jwt.sign({ id, role, permissions }, process.env.BILLING_JWT_SECRET as string, { expiresIn: '7d' });
};

router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};
    const admin = await BillingAdmin.findOne({ email: String(email).toLowerCase().trim(), isActive: true });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await admin.comparePassword(String(password || ''));
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    admin.lastLogin = new Date();
    await admin.save();

    const token = signBillingToken(
      admin._id.toString(),
      admin.role as BillingRole,
      admin.permissions as BillingAdminPermissions
    );
    res.cookie('billing_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Login failed' });
  }
});

router.post('/logout', async (_req: Request, res: Response) => {
  res.clearCookie('billing_token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  });
  return res.json({ message: 'Logged out' });
});

router.get('/me', billingAuthMiddleware, async (req: BillingAuthRequest, res: Response) => {
  return res.json({ admin: req.billingAdmin });
});

export default router;
