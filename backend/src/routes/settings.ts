import { Router, Request, Response } from 'express';
import Settings from '../models/Settings';
import authMiddleware from '../middleware/authMiddleware';
import { triggerRevalidate } from '../lib/revalidateFrontend';

const router = Router();

// GET /api/settings - get settings (public)
router.get('/', async (req: Request, res: Response) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// PUT /api/settings - update settings (protected)
router.put('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create(req.body);
    } else {
      Object.assign(settings, req.body);
      await settings.save();
    }
    if (req.body?.homepageSections) {
      await triggerRevalidate(['/']);
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// PUT /api/settings/homepage - update activeHomepage and trigger revalidation (protected)
router.put('/homepage', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { activeHomepage } = req.body;
    if (!['allensolly', 'magazine', 'catalogue'].includes(activeHomepage)) {
      return res.status(400).json({ message: 'Invalid homepage type' });
    }

    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({ activeHomepage });
    } else {
      settings.activeHomepage = activeHomepage;
      await settings.save();
    }

    // Trigger Next.js on-demand revalidation
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const revalidateSecret = process.env.REVALIDATE_SECRET;
      await fetch(`${frontendUrl}/api/revalidate?secret=${revalidateSecret}&path=/`);
    } catch (revalError) {
      console.error('Revalidation trigger failed:', revalError);
    }

    res.json({ message: `Homepage switched to ${activeHomepage}`, settings });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

export default router;
