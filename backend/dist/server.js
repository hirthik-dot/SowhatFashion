"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const db_1 = __importDefault(require("./lib/db"));
const errorHandler_1 = __importDefault(require("./middleware/errorHandler"));
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const products_1 = __importDefault(require("./routes/products"));
const offers_1 = __importDefault(require("./routes/offers"));
const orders_1 = __importDefault(require("./routes/orders"));
const settings_1 = __importDefault(require("./routes/settings"));
const payment_1 = __importDefault(require("./routes/payment"));
const upload_1 = __importDefault(require("./routes/upload"));
const users_1 = __importDefault(require("./routes/users"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/products', products_1.default);
app.use('/api/offers', offers_1.default);
app.use('/api/orders', orders_1.default);
app.use('/api/settings', settings_1.default);
app.use('/api/payment', payment_1.default);
app.use('/api/upload', upload_1.default);
app.use('/api/users', users_1.default);
// Error handler
app.use(errorHandler_1.default);
// Connect to DB and start server
(0, db_1.default)().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 So What Menswear API running on port ${PORT}`);
    });
});
exports.default = app;
//# sourceMappingURL=server.js.map