import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './lib/db';
import errorHandler from './middleware/errorHandler';

// Import routes
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import offerRoutes from './routes/offers';
import { newArrivalsPublicRoutes, newArrivalsAdminRoutes } from './routes/newArrivals';
import homepageSectionsRoutes from './routes/homepageSections';
import orderRoutes from './routes/orders';
import settingsRoutes from './routes/settings';
import paymentRoutes from './routes/payment';
import uploadRoutes from './routes/upload';
import usersRoutes from './routes/users';
import catalogueRoutes from './routes/catalogue';
import categoryRoutes from './routes/categories';
import adminRoutes from './routes/admin';
import billingAuthRoutes from './routes/billing-auth';
import billingSuppliersRoutes from './routes/billing-suppliers';
import billingCategoriesRoutes from './routes/billing-categories';
import billingStockRoutes from './routes/billing-stock';
import billingBillsRoutes from './routes/billing-bills';
import billingReturnsRoutes from './routes/billing-returns';
import billingReportsRoutes from './routes/billing-reports';
import billingAdminRoutes from './routes/billing-admin';
import billingInventoryRoutes from './routes/billing-inventory';
import { billingAuthMiddleware } from './middleware/billingAuthMiddleware';

const app = express();
const PORT = process.env.PORT || 5000;

// Behind Render/reverse proxies, trust X-Forwarded-* so IP-based middleware
// (like rate limiting) uses the real client IP instead of the proxy IP.
app.set('trust proxy', 1);

// CORS — dynamic origin check (must be FIRST middleware)
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(o => o.trim())
  : ['http://localhost:3000'];

const corsOptions: cors.CorsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      callback(null, origin);
    } else {
      callback(new Error('CORS: origin ' + origin + ' not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

import passport from './config/passport';
app.use(passport.initialize());

// Health check endpoints
app.get('/', (req, res) => {
  res.json({
    status: "ok",
    message: "SoWhat Fashion API is running",
    dbConnected: mongoose.connection.readyState === 1,
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    dbState: mongoose.connection.readyState,
    allowedOrigins,
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/new-arrivals', newArrivalsPublicRoutes);
app.use('/api/admin/new-arrivals', newArrivalsAdminRoutes);
app.use('/api/homepage-sections', homepageSectionsRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/catalogue', catalogueRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/billing/auth', billingAuthRoutes);
app.use('/api/billing/suppliers', billingAuthMiddleware, billingSuppliersRoutes);
app.use('/api/billing/categories', billingAuthMiddleware, billingCategoriesRoutes);
app.use('/api/billing/stock', billingAuthMiddleware, billingStockRoutes);
app.use('/api/billing/bills', billingAuthMiddleware, billingBillsRoutes);
app.use('/api/billing/returns', billingAuthMiddleware, billingReturnsRoutes);
app.use('/api/billing/reports', billingAuthMiddleware, billingReportsRoutes);
app.use('/api/billing/admin', billingAuthMiddleware, billingAdminRoutes);
app.use('/api/billing/inventory', billingAuthMiddleware, billingInventoryRoutes);

// Error handler
app.use(errorHandler);

// Global catch-all error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error:', err.stack);
  res.status(500).json({ error: err.message });
});

// Connect to DB and start server
const startServer = async () => {
  try {
    await connectDB();
    console.log('✅ Database connected');
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    // Don't exit — start server anyway so health checks work
  }

  app.listen(PORT, () => {
    console.log(`🚀 So What Menswear API running on port ${PORT}`);
    console.log(`🌐 Allowed origins: ${allowedOrigins.join(', ')}`);
  });
};

startServer();

export default app;
