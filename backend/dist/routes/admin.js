"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const Order_1 = __importDefault(require("../models/Order"));
const User_1 = require("../models/User");
const router = express_1.default.Router();
router.use(authMiddleware_1.default);
// GET /api/admin/stats
router.get('/stats', async (req, res) => {
    try {
        const totalCustomers = await User_1.User.countDocuments();
        const totalOrders = await Order_1.default.countDocuments();
        const pendingOrders = await Order_1.default.countDocuments({ orderStatus: 'pending' });
        const revenueResult = await Order_1.default.aggregate([
            { $match: { orderStatus: { $ne: 'cancelled' } } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        const totalRevenue = revenueResult[0]?.total || 0;
        // Simple growth calculation (comparing to 0 for simplicity, ideally would compare date ranges)
        // Here we'll return 0% growth or compute a basic one, for now setting 0 to avoid complex date queries
        const revenueGrowth = 0;
        const customerGrowth = 0;
        const orderGrowth = 0;
        res.json({
            totalCustomers,
            totalRevenue,
            totalOrders,
            pendingOrders,
            revenueGrowth,
            customerGrowth,
            orderGrowth
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// GET /api/admin/revenue-chart
router.get('/revenue-chart', async (req, res) => {
    try {
        const period = req.query.period || 'week'; // week | month | year
        let startDate = new Date();
        if (period === 'week')
            startDate.setDate(startDate.getDate() - 7);
        else if (period === 'month')
            startDate.setMonth(startDate.getMonth() - 1);
        else if (period === 'year')
            startDate.setFullYear(startDate.getFullYear() - 1);
        else
            startDate.setDate(startDate.getDate() - 7);
        const data = await Order_1.default.aggregate([
            { $match: { createdAt: { $gte: startDate }, orderStatus: { $ne: 'cancelled' } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    revenue: { $sum: "$totalAmount" }
                }
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    _id: 0,
                    date: "$_id",
                    revenue: 1
                }
            }
        ]);
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// GET /api/admin/popular-products
router.get('/popular-products', async (req, res) => {
    try {
        const topProducts = await Order_1.default.aggregate([
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.product",
                    name: { $first: "$items.name" },
                    image: { $first: "$items.image" },
                    totalSold: { $sum: "$items.quantity" },
                    earnings: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 },
            {
                $project: {
                    _id: 0,
                    productId: "$_id",
                    name: 1,
                    image: 1,
                    thumbnail: "$image", // Added thumbnail alias for frontend
                    earnings: 1,
                    totalSold: 1
                }
            }
        ]);
        res.json(topProducts);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// GET /api/admin/customers
router.get('/customers', async (req, res) => {
    try {
        const customers = await User_1.User.aggregate([
            {
                $lookup: {
                    from: 'orders',
                    localField: 'email',
                    foreignField: 'customer.email',
                    as: 'orders'
                }
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    email: 1,
                    phone: 1,
                    avatar: 1,
                    createdAt: 1,
                    totalOrders: { $size: "$orders" },
                    totalSpent: {
                        $sum: {
                            $map: {
                                input: "$orders",
                                as: "order",
                                in: "$$order.totalAmount"
                            }
                        }
                    }
                }
            },
            { $sort: { createdAt: -1 } }
        ]);
        res.json(customers);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// GET /api/admin/customers/:id
router.get('/customers/:id', async (req, res) => {
    try {
        const user = await User_1.User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        const orders = await Order_1.default.find({ 'customer.email': user.email }).sort({ createdAt: -1 });
        const totalOrders = orders.length;
        const totalSpent = orders.reduce((sum, order) => sum + order.totalAmount, 0);
        res.json({
            ...user.toObject(),
            totalOrders,
            totalSpent,
            orders
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map