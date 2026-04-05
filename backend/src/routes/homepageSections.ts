import { Router, Request, Response } from 'express';
import Settings, { HomepageSectionRow } from '../models/Settings';
import authMiddleware from '../middleware/authMiddleware';
import { triggerRevalidate } from '../lib/revalidateFrontend';
import Offer from '../models/Offer';
import NewArrival from '../models/NewArrival';
import Product from '../models/Product';

const router = Router();

const THEME_KEYS = ['catalogue', 'allensolly', 'magazine'] as const;
type ThemeKey = (typeof THEME_KEYS)[number];

export const DEFAULT_CATALOGUE_SECTIONS: HomepageSectionRow[] = [
  {
    id: 'offer-carousel',
    label: 'Offer Carousel',
    isVisible: true,
    order: 0,
    canDelete: false,
  },
  {
    id: 'new-arrivals',
    label: 'New Arrivals',
    isVisible: true,
    order: 1,
    canDelete: true,
  },
  {
    id: 'products-grid',
    label: 'Products Grid',
    isVisible: true,
    order: 2,
    canDelete: false,
  },
  {
    id: 'combo-offers',
    label: 'Combo Offers',
    isVisible: true,
    order: 3,
    canDelete: true,
  },
];

function normalizeTheme(t: string): ThemeKey | null {
  if (THEME_KEYS.includes(t as ThemeKey)) return t as ThemeKey;
  return null;
}

function mergeSections(stored: HomepageSectionRow[] | undefined, defaults: HomepageSectionRow[]): HomepageSectionRow[] {
  if (!stored?.length) return defaults.map((d) => ({ ...d }));
  const byId = new Map(stored.map((s) => [s.id, { ...s }]));
  const result: HomepageSectionRow[] = [];
  for (const def of defaults) {
    const row = byId.get(def.id);
    if (row) {
      result.push({
        ...def,
        ...row,
        canDelete: def.canDelete,
        label: row.label || def.label,
      });
      byId.delete(def.id);
    } else {
      result.push({ ...def });
    }
  }
  for (const [, extra] of byId) {
    result.push(extra);
  }
  return result.sort((a, b) => a.order - b.order);
}

// Admin routes first (before /:theme would match "admin")
router.get('/admin/:theme/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const theme = normalizeTheme(req.params.theme);
    if (theme !== 'catalogue') {
      return res.json({ carouselCount: 0, newArrivalsCount: 0, productsCount: 0, comboCount: 0 });
    }
    const now = new Date();
    const carouselCount = await Offer.countDocuments({
      isActive: true,
      showOnCarousel: true,
      $or: [{ endTime: null }, { endTime: { $gte: now } }],
    });
    const newArrivalsCount = await NewArrival.countDocuments({ isActive: true });
    const productsCount = await Product.countDocuments({ isActive: true });
    const comboCount = await Offer.countDocuments({
      isActive: true,
      type: 'combo',
      $or: [{ endTime: null }, { endTime: { $gte: now } }],
    });
    res.json({ carouselCount, newArrivalsCount, productsCount, comboCount });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

router.put('/admin/:theme', authMiddleware, async (req: Request, res: Response) => {
  try {
    const theme = normalizeTheme(req.params.theme);
    if (!theme) {
      return res.status(400).json({ message: 'Invalid theme' });
    }
    const { sections } = req.body as { sections: HomepageSectionRow[] };
    if (!Array.isArray(sections)) {
      return res.status(400).json({ message: 'sections array required' });
    }

    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    if (!settings.homepageSections) {
      settings.homepageSections = {};
    }
    (settings.homepageSections as Record<string, HomepageSectionRow[]>)[theme] = sections.map((s, i) => ({
      id: s.id,
      label: s.label,
      isVisible: s.isVisible,
      order: typeof s.order === 'number' ? s.order : i,
      canDelete: s.canDelete,
    }));
    await settings.save();
    await triggerRevalidate(['/']);
    res.json({ theme, sections: settings.homepageSections[theme] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// GET /api/homepage-sections/:theme
router.get('/:theme', async (req: Request, res: Response) => {
  try {
    const theme = normalizeTheme(req.params.theme);
    if (!theme) {
      return res.status(400).json({ message: 'Invalid theme' });
    }
    let doc = await Settings.findOne();
    if (!doc) {
      doc = await Settings.create({});
    }
    const settings = doc.toObject() as {
      homepageSections?: Record<string, HomepageSectionRow[] | undefined>;
    };

    let sections: HomepageSectionRow[] = [];
    if (theme === 'catalogue') {
      const raw = settings.homepageSections?.catalogue;
      sections = mergeSections(raw, DEFAULT_CATALOGUE_SECTIONS);
    } else {
      sections = (settings.homepageSections?.[theme] as HomepageSectionRow[]) || [];
    }

    res.json({ theme, sections });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

export default router;
