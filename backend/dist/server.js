"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const db_1 = __importDefault(require("./lib/db"));
const errorHandler_1 = __importDefault(require("./middleware/errorHandler"));
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const products_1 = __importDefault(require("./routes/products"));
const offers_1 = __importDefault(require("./routes/offers"));
const newArrivals_1 = require("./routes/newArrivals");
const homepageSections_1 = __importDefault(require("./routes/homepageSections"));
const orders_1 = __importDefault(require("./routes/orders"));
const settings_1 = __importDefault(require("./routes/settings"));
const payment_1 = __importDefault(require("./routes/payment"));
const upload_1 = __importDefault(require("./routes/upload"));
const users_1 = __importDefault(require("./routes/users"));
const catalogue_1 = __importDefault(require("./routes/catalogue"));
const categories_1 = __importDefault(require("./routes/categories"));
const admin_1 = __importDefault(require("./routes/admin"));
const billing_auth_1 = __importDefault(require("./routes/billing-auth"));
const billing_suppliers_1 = __importDefault(require("./routes/billing-suppliers"));
const billing_categories_1 = __importDefault(require("./routes/billing-categories"));
const billing_stock_1 = __importDefault(require("./routes/billing-stock"));
const billing_bills_1 = __importDefault(require("./routes/billing-bills"));
const billing_returns_1 = __importDefault(require("./routes/billing-returns"));
const billing_reports_1 = __importDefault(require("./routes/billing-reports"));
const billing_admin_1 = __importDefault(require("./routes/billing-admin"));
const billing_inventory_1 = __importDefault(require("./routes/billing-inventory"));
const billingAuthMiddleware_1 = require("./middleware/billingAuthMiddleware");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const isServerlessRuntime = Boolean(process.env.VERCEL);
// Behind Render/reverse proxies, trust X-Forwarded-* so IP-based middleware
// (like rate limiting) uses the real client IP instead of the proxy IP.
app.set('trust proxy', 1);
// CORS — dynamic origin check (must be FIRST middleware)
const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(o => o.trim())
    : ['http://localhost:3000'];
const allowVercelPreview = process.env.ALLOW_VERCEL_PREVIEW === 'true';
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        const isLocalDevOrigin = origin.startsWith('http://localhost:') ||
            origin.startsWith('http://127.0.0.1:');
        const isVercelPreviewOrigin = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
        if (allowedOrigins.includes(origin) ||
            isLocalDevOrigin ||
            (allowVercelPreview && isVercelPreviewOrigin)) {
            callback(null, origin);
        }
        else {
            callback(new Error('CORS: origin ' + origin + ' not allowed'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
};
app.use((0, cors_1.default)(corsOptions));
app.options('*', (0, cors_1.default)(corsOptions));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
// Ensure DB connection is initialized for each serverless invocation.
app.use(async (_req, _res, next) => {
    try {
        await (0, db_1.default)();
        next();
    }
    catch (error) {
        next(error);
    }
});
const passport_1 = __importDefault(require("./config/passport"));
app.use(passport_1.default.initialize());
// Health check endpoints
app.get('/', (req, res) => {
    res.json({
        status: "ok",
        message: "SoWhat Fashion API is running",
        dbConnected: mongoose_1.default.connection.readyState === 1,
    });
});
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        dbState: mongoose_1.default.connection.readyState,
        allowedOrigins,
    });
});
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/products', products_1.default);
app.use('/api/offers', offers_1.default);
app.use('/api/new-arrivals', newArrivals_1.newArrivalsPublicRoutes);
app.use('/api/admin/new-arrivals', newArrivals_1.newArrivalsAdminRoutes);
app.use('/api/homepage-sections', homepageSections_1.default);
app.use('/api/orders', orders_1.default);
app.use('/api/settings', settings_1.default);
app.use('/api/payment', payment_1.default);
app.use('/api/upload', upload_1.default);
app.use('/api/users', users_1.default);
app.use('/api/catalogue', catalogue_1.default);
app.use('/api/categories', categories_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/billing/auth', billing_auth_1.default);
app.use('/api/billing/suppliers', billingAuthMiddleware_1.billingAuthMiddleware, billing_suppliers_1.default);
app.use('/api/billing/categories', billingAuthMiddleware_1.billingAuthMiddleware, billing_categories_1.default);
app.use('/api/billing/stock', billingAuthMiddleware_1.billingAuthMiddleware, billing_stock_1.default);
app.use('/api/billing/bills', billingAuthMiddleware_1.billingAuthMiddleware, billing_bills_1.default);
app.use('/api/billing/returns', billingAuthMiddleware_1.billingAuthMiddleware, billing_returns_1.default);
app.use('/api/billing/reports', billingAuthMiddleware_1.billingAuthMiddleware, billing_reports_1.default);
app.use('/api/billing/admin', billingAuthMiddleware_1.billingAuthMiddleware, billing_admin_1.default);
app.use('/api/billing/inventory', billingAuthMiddleware_1.billingAuthMiddleware, billing_inventory_1.default);
// Error handler
app.use(errorHandler_1.default);
// Global catch-all error handler
app.use((err, req, res, next) => {
    console.error('Global error:', err.stack);
    res.status(500).json({ error: err.message });
});
const startServer = async () => {
    try {
        await (0, db_1.default)();
        console.log('✅ Database connected');
    }
    catch (err) {
        console.error('❌ Database connection failed:', err);
        // Don't exit — start server anyway so health checks work
    }
    app.listen(PORT, () => {
        console.log(`🚀 So What Menswear API running on port ${PORT}`);
        console.log(`🌐 Allowed origins: ${allowedOrigins.join(', ')}`);
    });
};
exports.startServer = startServer;
if (!isServerlessRuntime) {
    void (0, exports.startServer)();
}
exports.default = app;
//# sourceMappingURL=server.js.map