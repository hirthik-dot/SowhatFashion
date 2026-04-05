import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import razorpay from '../lib/razorpay';
import Order from '../models/Order';

const router = Router();

// POST /api/payment/create-order - create Razorpay order
router.post('/create-order', async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const options = {
      amount: Math.round(amount * 100), // Razorpay expects amount in paise
      currency: 'INR',
      receipt: `order_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    res.status(500).json({ message: 'Payment order creation failed', error: (error as Error).message });
  }
});

// POST /api/payment/verify - verify Razorpay payment and create order
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderData,
    } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    // Create order in DB
    const order = new Order({
      ...orderData,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      paymentStatus: 'paid',
      orderStatus: 'confirmed',
    });
    await order.save();

    res.json({ message: 'Payment verified successfully', order });
  } catch (error) {
    res.status(500).json({ message: 'Payment verification failed', error: (error as Error).message });
  }
});

export default router;
