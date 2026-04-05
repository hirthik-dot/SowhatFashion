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
import orderRoutes from './routes/orders';
import settingsRoutes from './routes/settings';
import paymentRoutes from './routes/payment';
import uploadRoutes from './routes/upload';
import usersRoutes from './routes/users';
import catalogueRoutes from './routes/catalogue';
import categoryRoutes from './routes/categories';
import adminRoutes from './routes/admin';

const app = express();
const PORT = process.env.PORT || 5000;

// CORS — dynamic origin check (must be FIRST middleware)
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(o => o.trim())
  : ['http://localhost:3000'];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, origin || '*');
    } else {
      callback(new Error('CORS: origin ' + origin + ' not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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
app.use('/api/orders', orderRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/catalogue', catalogueRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/admin', adminRoutes);

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
