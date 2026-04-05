import { Router, Request, Response } from 'express';
import Order from '../models/Order';
import authMiddleware from '../middleware/authMiddleware';
import rateLimit from 'express-rate-limit';

const router = Router();

const lookupLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { message: 'Too many requests from this IP, please try again in a minute.' }
});

// GET /api/orders - all orders with pagination (protected)
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { page, limit, status } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {};
    if (status) filter.orderStatus = status;

    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Order.countDocuments(filter),
    ]);

    res.json({
      orders,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// POST /api/orders/customer - get orders by customer email and phone (public)
router.post('/customer', async (req: Request, res: Response) => {
  try {
    const { email, phone } = req.body;
    if (!email || !phone) {
      return res.status(400).json({ message: 'Email and phone are required' });
    }

    const orders = await Order.find({ 
      'customer.email': email, 
      'customer.phone': phone 
    }).sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// POST /api/orders/lookup - search orders by phone or email without login (public)
router.post('/lookup', lookupLimiter, async (req: Request, res: Response) => {
  try {
    const { contact } = req.body;
    if (!contact) {
      return res.status(400).json({ message: 'Contact is required' });
    }

    const orders = await Order.find({
      $or: [
        { 'customer.email': contact },
        { 'customer.phone': contact }
      ]
    }).sort({ createdAt: -1 });

    const safeOrders = orders.map((order: any) => ({
      _id: order._id,
      customer: {
        name: order.customer.name,
        email: order.customer.email,
        phone: order.customer.phone,
        address: order.customer.address,
      },
      items: order.items,
      totalAmount: order.totalAmount,
      razorpayOrderId: order.razorpayOrderId,
      razorpayPaymentId: order.razorpayPaymentId,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      createdAt: order.createdAt,
    }));

    res.json(safeOrders);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// GET /api/orders/:id - single order (public for now, so track order works, but ideally should be protected by email/phone or token. We allow it public for Track Order simplicity)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// POST /api/orders - create order (public, after payment)
router.post('/', async (req: Request, res: Response) => {
  try {
    const order = new Order(req.body);
    await order.save();
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// PUT /api/orders/:id/status - update order status (protected)
router.put('/:id/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { orderStatus } = req.body;
    if (!['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].includes(orderStatus)) {
      return res.status(400).json({ message: 'Invalid order status' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

export default router;
