"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongoose_1 = __importDefault(require("mongoose"));
const Offer_1 = __importDefault(require("../models/Offer"));
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const authToken_1 = require("../lib/authToken");
const revalidateFrontend_1 = require("../lib/revalidateFrontend");
const router = (0, express_1.Router)();
function activeEndTimeCond() {
    return {
        $or: [{ endTime: null }, { endTime: { $gte: new Date() } }],
    };
}
// GET /api/offers/active-slugs — for generateStaticParams (before /:slugOrId)
router.get('/active-slugs', async (_req, res) => {
    try {
        const rows = await Offer_1.default.find({
            isActive: true,
            ...activeEndTimeCond(),
        })
            .select('slug')
            .lean();
        const slugs = rows.map((r) => r.slug).filter(Boolean);
        res.json(slugs);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// GET /api/offers — public active; ?showOnCarousel=true | ?showOnHomepage=true; ?manage=true + admin cookie = all
router.get('/', async (req, res) => {
    try {
        if (req.query.manage === 'true') {
            if (!(0, authToken_1.isAdminRequest)(req)) {
                return res.status(401).json({ message: 'Authentication required' });
            }
            const offers = await Offer_1.default.find().populate('products').sort({ order: 1, createdAt: -1 });
            return res.json(offers);
        }
        const filter = { isActive: true, ...activeEndTimeCond() };
        if (req.query.showOnCarousel === 'true') {
            filter.showOnCarousel = true;
        }
        if (req.query.showOnHomepage === 'true') {
            filter.showOnHomepage = true;
        }
        const offers = await Offer_1.default.find(filter).populate('products').sort({ order: 1, createdAt: -1 });
        res.json(offers);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// PATCH /api/offers/reorder — must be before /:slugOrId
router.patch('/reorder', authMiddleware_1.default, async (req, res) => {
    try {
        const body = req.body;
        if (!Array.isArray(body)) {
            return res.status(400).json({ message: 'Expected array of { id, order }' });
        }
        await Promise.all(body.map((row) => Offer_1.default.findByIdAndUpdate(row.id, { order: row.order }).exec()));
        await (0, revalidateFrontend_1.triggerRevalidate)(['/']);
        res.json({ ok: true });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// POST /api/offers
router.post('/', authMiddleware_1.default, async (req, res) => {
    try {
        const payload = { ...req.body };
        if (payload.endTime === '' || payload.endTime === undefined)
            payload.endTime = null;
        const offer = new Offer_1.default(payload);
        await offer.save();
        await offer.populate('products');
        await (0, revalidateFrontend_1.triggerRevalidate)(['/', `/offers/${offer.slug}`]);
        res.status(201).json(offer);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// PUT /api/offers/:id
router.put('/:id', authMiddleware_1.default, async (req, res) => {
    try {
        const payload = { ...req.body };
        if (payload.endTime === '' || payload.endTime === undefined)
            payload.endTime = null;
        const offer = await Offer_1.default.findByIdAndUpdate(req.params.id, payload, {
            new: true,
            runValidators: true,
        }).populate('products');
        if (!offer) {
            return res.status(404).json({ message: 'Offer not found' });
        }
        await (0, revalidateFrontend_1.triggerRevalidate)(['/', `/offers/${offer.slug}`]);
        res.json(offer);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// DELETE /api/offers/:id
router.delete('/:id', authMiddleware_1.default, async (req, res) => {
    try {
        const offer = await Offer_1.default.findByIdAndDelete(req.params.id);
        if (!offer) {
            return res.status(404).json({ message: 'Offer not found' });
        }
        await (0, revalidateFrontend_1.triggerRevalidate)(['/', `/offers/${offer.slug}`]);
        res.json({ message: 'Offer deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// PATCH /api/offers/:id/toggle
router.patch('/:id/toggle', authMiddleware_1.default, async (req, res) => {
    try {
        const { field } = req.body;
        if (field !== 'isActive' && field !== 'showOnCarousel') {
            return res.status(400).json({ message: 'field must be isActive or showOnCarousel' });
        }
        const offer = await Offer_1.default.findById(req.params.id);
        if (!offer) {
            return res.status(404).json({ message: 'Offer not found' });
        }
        offer[field] = !offer[field];
        await offer.save();
        await offer.populate('products');
        await (0, revalidateFrontend_1.triggerRevalidate)(['/', `/offers/${offer.slug}`]);
        res.json(offer);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// GET /api/offers/:slugOrId — single offer (public); includes expired for landing page
router.get('/:slugOrId', async (req, res) => {
    try {
        const param = req.params.slugOrId;
        let offer = null;
        if (mongoose_1.default.Types.ObjectId.isValid(param) && String(new mongoose_1.default.Types.ObjectId(param)) === param) {
            offer = await Offer_1.default.findById(param).populate('products');
        }
        else {
            offer = await Offer_1.default.findOne({ slug: param }).populate('products');
        }
        if (!offer) {
            return res.status(404).json({ message: 'Offer not found' });
        }
        res.json(offer);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=offers.js.map