"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Offer_1 = __importDefault(require("../models/Offer"));
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const router = (0, express_1.Router)();
// GET /api/offers - all active offers
router.get('/', async (req, res) => {
    try {
        const { showOnHomepage } = req.query;
        const filter = { isActive: true, endTime: { $gte: new Date() } };
        if (showOnHomepage === 'true')
            filter.showOnHomepage = true;
        const offers = await Offer_1.default.find(filter).populate('products').sort({ createdAt: -1 });
        res.json(offers);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// GET /api/offers/:id - single offer
router.get('/:id', async (req, res) => {
    try {
        const offer = await Offer_1.default.findById(req.params.id).populate('products');
        if (!offer) {
            return res.status(404).json({ message: 'Offer not found' });
        }
        res.json(offer);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// POST /api/offers - create offer (protected)
router.post('/', authMiddleware_1.default, async (req, res) => {
    try {
        const offer = new Offer_1.default(req.body);
        await offer.save();
        res.status(201).json(offer);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// PUT /api/offers/:id - update offer (protected)
router.put('/:id', authMiddleware_1.default, async (req, res) => {
    try {
        const offer = await Offer_1.default.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!offer) {
            return res.status(404).json({ message: 'Offer not found' });
        }
        res.json(offer);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// DELETE /api/offers/:id - delete offer (protected)
router.delete('/:id', authMiddleware_1.default, async (req, res) => {
    try {
        const offer = await Offer_1.default.findByIdAndDelete(req.params.id);
        if (!offer) {
            return res.status(404).json({ message: 'Offer not found' });
        }
        res.json({ message: 'Offer deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=offers.js.map