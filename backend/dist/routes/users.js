"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const User_1 = require("../models/User");
const userAuthMiddleware_1 = __importDefault(require("../middleware/userAuthMiddleware"));
const Product_1 = __importDefault(require("../models/Product"));
const router = (0, express_1.Router)();
router.use(userAuthMiddleware_1.default);
// ============ ADDRESSES ============
router.get('/addresses', async (req, res) => {
    try {
        res.json({ success: true, addresses: req.user.savedAddresses });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
});
router.post('/addresses', async (req, res) => {
    try {
        const user = await User_1.User.findById(req.user._id);
        if (!user)
            return res.status(404).json({ success: false, error: 'User not found' });
        const newAddress = req.body;
        if (newAddress.isDefault) {
            user.savedAddresses.forEach(addr => {
                // Need to cast to any since subdocument typing can be tricky
                addr.isDefault = false;
            });
        }
        user.savedAddresses.push(newAddress);
        await user.save();
        res.json({ success: true, addresses: user.savedAddresses });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
});
router.put('/addresses/:id', async (req, res) => {
    try {
        const user = await User_1.User.findById(req.user._id);
        if (!user)
            return res.status(404).json({ success: false, error: 'User not found' });
        const updatedData = req.body;
        const address = user.savedAddresses.id(req.params.id);
        if (!address)
            return res.status(404).json({ success: false, error: 'Address not found' });
        if (updatedData.isDefault) {
            user.savedAddresses.forEach(addr => {
                if (addr._id?.toString() !== req.params.id) {
                    addr.isDefault = false;
                }
            });
        }
        address.set(updatedData);
        await user.save();
        res.json({ success: true, addresses: user.savedAddresses });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
});
router.delete('/addresses/:id', async (req, res) => {
    try {
        const user = await User_1.User.findById(req.user._id);
        if (!user)
            return res.status(404).json({ success: false, error: 'User not found' });
        user.savedAddresses.pull(req.params.id);
        await user.save();
        res.json({ success: true, addresses: user.savedAddresses });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
});
// ============ WISHLIST ============
router.get('/wishlist', async (req, res) => {
    try {
        const user = await User_1.User.findById(req.user._id).populate('wishlist');
        res.json({ success: true, wishlist: user?.wishlist || [] });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
});
router.post('/wishlist', async (req, res) => {
    try {
        const { productId } = req.body;
        const user = await User_1.User.findById(req.user._id);
        if (!user)
            return res.status(404).json({ success: false, error: 'User not found' });
        const product = await Product_1.default.findById(productId);
        if (!product)
            return res.status(404).json({ success: false, error: 'Product not found' });
        if (!user.wishlist.includes(productId)) {
            user.wishlist.push(productId);
            await user.save();
        }
        // return array of strings
        res.json({ success: true, wishlist: user.wishlist });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
});
router.delete('/wishlist/:productId', async (req, res) => {
    try {
        const user = await User_1.User.findById(req.user._id);
        if (!user)
            return res.status(404).json({ success: false, error: 'User not found' });
        user.wishlist = user.wishlist.filter(id => id.toString() !== req.params.productId);
        await user.save();
        res.json({ success: true, wishlist: user.wishlist });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map