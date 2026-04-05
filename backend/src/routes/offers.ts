import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import Offer from '../models/Offer';
import authMiddleware from '../middleware/authMiddleware';
import { isAdminRequest } from '../lib/authToken';
import { triggerRevalidate } from '../lib/revalidateFrontend';

const router = Router();

function activeEndTimeCond() {
  return {
    $or: [{ endTime: null }, { endTime: { $gte: new Date() } }],
  };
}

// GET /api/offers/active-slugs — for generateStaticParams (before /:slugOrId)
router.get('/active-slugs', async (_req: Request, res: Response) => {
  try {
    const rows = await Offer.find({
      isActive: true,
      ...activeEndTimeCond(),
    })
      .select('slug')
      .lean();
    const slugs = rows.map((r) => r.slug).filter(Boolean) as string[];
    res.json(slugs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// GET /api/offers — public active; ?showOnCarousel=true | ?showOnHomepage=true; ?manage=true + admin cookie = all
router.get('/', async (req: Request, res: Response) => {
  try {
    if (req.query.manage === 'true') {
      if (!isAdminRequest(req)) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      const offers = await Offer.find().populate('products').sort({ order: 1, createdAt: -1 });
      return res.json(offers);
    }

    const filter: Record<string, unknown> = { isActive: true, ...activeEndTimeCond() };
    if (req.query.showOnCarousel === 'true') {
      filter.showOnCarousel = true;
    }
    if (req.query.showOnHomepage === 'true') {
      filter.showOnHomepage = true;
    }

    const offers = await Offer.find(filter).populate('products').sort({ order: 1, createdAt: -1 });
    res.json(offers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// PATCH /api/offers/reorder — must be before /:slugOrId
router.patch('/reorder', authMiddleware, async (req: Request, res: Response) => {
  try {
    const body = req.body as { id: string; order: number }[];
    if (!Array.isArray(body)) {
      return res.status(400).json({ message: 'Expected array of { id, order }' });
    }
    await Promise.all(
      body.map((row) =>
        Offer.findByIdAndUpdate(row.id, { order: row.order }).exec()
      )
    );
    await triggerRevalidate(['/']);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// POST /api/offers
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const payload = { ...req.body };
    if (payload.endTime === '' || payload.endTime === undefined) payload.endTime = null;
    const offer = new Offer(payload);
    await offer.save();
    await offer.populate('products');
    await triggerRevalidate(['/', `/offers/${offer.slug}`]);
    res.status(201).json(offer);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// PUT /api/offers/:id
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const payload = { ...req.body };
    if (payload.endTime === '' || payload.endTime === undefined) payload.endTime = null;
    const offer = await Offer.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    }).populate('products');
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    await triggerRevalidate(['/', `/offers/${offer.slug}`]);
    res.json(offer);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// DELETE /api/offers/:id
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    await triggerRevalidate(['/', `/offers/${offer.slug}`]);
    res.json({ message: 'Offer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// PATCH /api/offers/:id/toggle
router.patch('/:id/toggle', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { field } = req.body as { field?: 'isActive' | 'showOnCarousel' };
    if (field !== 'isActive' && field !== 'showOnCarousel') {
      return res.status(400).json({ message: 'field must be isActive or showOnCarousel' });
    }
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    offer[field] = !offer[field];
    await offer.save();
    await offer.populate('products');
    await triggerRevalidate(['/', `/offers/${offer.slug}`]);
    res.json(offer);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// GET /api/offers/:slugOrId — single offer (public); includes expired for landing page
router.get('/:slugOrId', async (req: Request, res: Response) => {
  try {
    const param = req.params.slugOrId;
    let offer = null;
    if (mongoose.Types.ObjectId.isValid(param) && String(new mongoose.Types.ObjectId(param)) === param) {
      offer = await Offer.findById(param).populate('products');
    } else {
      offer = await Offer.findOne({ slug: param }).populate('products');
    }
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    res.json(offer);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

export default router;
