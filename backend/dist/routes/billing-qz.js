"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const crypto_1 = __importDefault(require("crypto"));
const router = express_1.default.Router();
// Health check to verify QZ environment variables are configured correctly
router.get('/health', (req, res) => {
    const hasCert = !!process.env.QZ_CERTIFICATE;
    const hasKey = !!process.env.QZ_PRIVATE_KEY;
    if (hasCert && hasKey) {
        res.json({ status: 'ok', message: 'QZ Tray environment variables are loaded correctly' });
    }
    else {
        res.status(500).json({
            status: 'error',
            message: 'Missing environment variables',
            hasCert,
            hasKey
        });
    }
});
// Get the digital certificate public key for QZ Tray
router.get('/certificate', (req, res) => {
    try {
        const certRaw = process.env.QZ_CERTIFICATE;
        if (!certRaw) {
            return res.status(500).json({ error: 'QZ_CERTIFICATE environment variable is missing on the server' });
        }
        // Convert literal "\n" strings (often injected by Vercel) back into actual newlines
        const cert = certRaw.replace(/\\n/g, '\n');
        res.type('text/plain').send(cert);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Sign a request from QZ Tray using the private key
router.post('/sign', (req, res) => {
    try {
        const requestStr = req.body.request;
        if (!requestStr)
            return res.status(400).json({ error: 'Request string is required' });
        const keyRaw = process.env.QZ_PRIVATE_KEY;
        if (!keyRaw) {
            return res.status(500).json({ error: 'QZ_PRIVATE_KEY environment variable is missing on the server' });
        }
        // Convert literal "\n" strings back into actual newlines
        const privateKey = keyRaw.replace(/\\n/g, '\n');
        const sign = crypto_1.default.createSign('SHA512');
        sign.update(requestStr);
        const signature = sign.sign(privateKey, 'base64');
        res.type('text/plain').send(signature);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
//# sourceMappingURL=billing-qz.js.map