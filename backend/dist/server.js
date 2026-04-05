"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// CORS — dynamic origin check (must be FIRST middleware)
const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(o => o.trim())
    : ['http://localhost:3000'];
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
            callback(null, origin);
        }
        else {
            callback(new Error('CORS: origin ' + origin + ' not allowed'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.options('*', (0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
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
// Error handler
app.use(errorHandler_1.default);
// Global catch-all error handler
app.use((err, req, res, next) => {
    console.error('Global error:', err.stack);
    res.status(500).json({ error: err.message });
});
// Connect to DB and start server
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
startServer();
exports.default = app;
//# sourceMappingURL=server.js.map