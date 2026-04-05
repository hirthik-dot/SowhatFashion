import { Router, Request, Response } from 'express';
import Offer from '../models/Offer';
import authMiddleware from '../middleware/authMiddleware';

const router = Router();

// GET /api/offers - all active offers
router.get('/', async (req: Request, res: Response) => {
  try {
    const { showOnHomepage } = req.query;
    const filter: any = { isActive: true, endTime: { $gte: new Date() } };
    if (showOnHomepage === 'true') filter.showOnHomepage = true;

    const offers = await Offer.find(filter).populate('products').sort({ createdAt: -1 });
    res.json(offers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// GET /api/offers/:id - single offer
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const offer = await Offer.findById(req.params.id).populate('products');
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    res.json(offer);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// POST /api/offers - create offer (protected)
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const offer = new Offer(req.body);
    await offer.save();
    res.status(201).json(offer);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// PUT /api/offers/:id - update offer (protected)
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const offer = await Offer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    res.json(offer);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// DELETE /api/offers/:id - delete offer (protected)
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    res.json({ message: 'Offer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

export default router;
