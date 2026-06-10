import { Router, Request, Response } from 'express';
import NewsletterSubscriber from '../models/NewsletterSubscriber';

const router = Router();

router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }

    const existing = await NewsletterSubscriber.findOne({ email });
    if (existing) {
      return res.json({ success: true, message: 'You are already subscribed.' });
    }

    await NewsletterSubscriber.create({
      email,
      source: String(req.body?.source || 'inner-circle'),
    });

    res.json({ success: true, message: 'Thank you for subscribing.' });
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.json({ success: true, message: 'You are already subscribed.' });
    }
    res.status(500).json({ success: false, error: 'Subscription failed. Please try again.' });
  }
});

export default router;
