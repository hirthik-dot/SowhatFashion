"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const resend_1 = require("resend");
const Admin_1 = __importDefault(require("../models/Admin"));
const User_1 = require("../models/User");
const OTP_1 = require("../models/OTP");
const router = (0, express_1.Router)();
const resend = new resend_1.Resend(process.env.RESEND_API_KEY || 're_123');
// Helper function to generate OTP template
const otpEmailTemplate = (otp) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #eeeeee;">
  <div style="background-color: #1A1A1A; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #C9A84C; margin: 0; font-size: 24px; font-family: 'Playfair Display', serif;">SOWAAT MENS WEAR</h1>
  </div>
  <div style="padding: 30px 20px; text-align: center;">
    <p style="font-size: 16px; color: #333333; margin-bottom: 20px;">Your verification code is:</p>
    <div style="display: flex; justify-content: center; gap: 10px; margin-bottom: 30px;">
      ${otp.split('').map(digit => `<span style="display: inline-block; width: 40px; height: 50px; line-height: 50px; background-color: #f9f9f9; border: 2px solid #C9A84C; border-radius: 8px; font-size: 24px; font-weight: bold; color: #C9A84C; margin: 0 4px;">${digit}</span>`).join('')}
    </div>
    <p style="font-size: 14px; color: #666666; margin-bottom: 10px;">Valid for 10 minutes</p>
    <p style="font-size: 14px; color: #666666;">Do not share this with anyone</p>
  </div>
  <div style="border-top: 1px solid #eeeeee; padding-top: 20px; text-align: center;">
    <p style="font-size: 12px; color: #999999; margin: 0;">If you didn't request this, ignore this email.</p>
  </div>
</div>
`;
// Rate limiting
const otpRateLimits = new Map();
// POST /api/auth/send-otp (USER)
router.post('/send-otp', async (req, res) => {
    try {
        const { email, purpose } = req.body;
        if (!email || !purpose) {
            return res.status(400).json({ success: false, error: 'Email and purpose are required' });
        }
        const now = Date.now();
        const lastSent = otpRateLimits.get(email);
        if (lastSent && now - lastSent < 60000) {
            return res.status(429).json({ success: false, error: 'Please wait 60 seconds before requesting another OTP' });
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedOtp = await bcryptjs_1.default.hash(otp, 10);
        await OTP_1.OTP.findOneAndDelete({ email, purpose });
        await OTP_1.OTP.create({ email, otp: hashedOtp, purpose });
        otpRateLimits.set(email, now);
        if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_12345') {
            try {
                await resend.emails.send({
                    from: process.env.OTP_FROM_EMAIL || 'Sowaat Mens Wear <orders@sowaatmenswear.com>',
                    to: email,
                    subject: 'Your OTP - Sowaat Mens Wear',
                    html: otpEmailTemplate(otp)
                });
            }
            catch (e) {
                console.error('Failed to send email:', e);
            }
        }
        else {
            console.log(`[DEV MODE] OTP for ${email}: ${otp}`);
        }
        res.json({ success: true, message: 'OTP sent' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to send OTP' });
    }
});
// POST /api/auth/verify-otp (USER)
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp, purpose, name } = req.body;
        if (!email || !otp || !purpose) {
            return res.status(400).json({ success: false, error: 'Email, OTP, and purpose required' });
        }
        const record = await OTP_1.OTP.findOne({ email, purpose });
        if (!record) {
            return res.status(400).json({ success: false, error: 'OTP expired or not found' });
        }
        if (record.attempts >= 3) {
            await OTP_1.OTP.deleteOne({ _id: record._id });
            return res.status(400).json({ success: false, error: 'Too many failed attempts.' });
        }
        const isMatch = await bcryptjs_1.default.compare(otp, record.otp);
        if (!isMatch) {
            record.attempts += 1;
            await record.save();
            return res.status(400).json({ success: false, error: 'Invalid OTP' });
        }
        await OTP_1.OTP.deleteOne({ _id: record._id });
        let user;
        if (purpose === 'login') {
            user = await User_1.User.findOne({ email });
            if (!user) {
                return res.json({ success: true, needsRegistration: true });
            }
        }
        else if (purpose === 'register') {
            user = await User_1.User.findOne({ email });
            if (user) {
                return res.status(400).json({ success: false, error: 'User already exists' });
            }
            user = await User_1.User.create({ name, email, isEmailVerified: true });
        }
        else {
            return res.status(400).json({ success: false, error: 'Invalid purpose' });
        }
        user.lastLoginAt = new Date();
        await user.save();
        const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || '';
        const token = jsonwebtoken_1.default.sign({ id: user._id, email: user.email, name: user.name }, secret, { expiresIn: '7d' });
        res.cookie('user_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/'
        });
        res.json({ success: true, user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar } });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
});
// POST /api/auth/google (USER using NextAuth)
router.post('/google', async (req, res) => {
    try {
        const { email, name, avatar, googleId } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, error: 'Email required' });
        }
        let user = await User_1.User.findOne({ email });
        if (!user) {
            user = await User_1.User.create({ email, name, avatar, googleId, isEmailVerified: true });
        }
        else {
            if (!user.googleId)
                user.googleId = googleId;
            if (!user.avatar)
                user.avatar = avatar;
            await user.save();
        }
        res.json({ success: true, user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar } });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
});
// POST /api/auth/login (ADMIN)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        const admin = await Admin_1.default.findOne({ email: email.toLowerCase() });
        if (!admin) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const isMatch = await admin.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const token = jsonwebtoken_1.default.sign({ id: admin._id }, process.env.JWT_SECRET, {
            expiresIn: '7d',
        });
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/'
        });
        res.json({ message: 'Login successful', admin: { id: admin._id, email: admin.email } });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
router.post('/logout', (req, res) => {
    res.cookie('token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        expires: new Date(0),
        path: '/'
    });
    res.cookie('user_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        expires: new Date(0),
        path: '/'
    });
    // also optionally clear next-auth.session-token
    res.cookie('next-auth.session-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        expires: new Date(0),
        path: '/'
    });
    // Vercel path
    res.cookie('__Secure-next-auth.session-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        expires: new Date(0),
        path: '/'
    });
    res.json({ success: true, message: 'Logged out successfully' });
});
// GET /api/auth/me (COMBINED)
router.get('/me', async (req, res) => {
    try {
        // 1. Check for User authentication
        const userToken = req.cookies?.user_token || req.cookies?.['next-auth.session-token'] || req.cookies?.['__Secure-next-auth.session-token'];
        if (userToken) {
            try {
                const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || '';
                const decoded = jsonwebtoken_1.default.verify(userToken, secret);
                const userId = decoded.id || decoded.sub;
                let user = await User_1.User.findById(userId).select('-__v').populate('wishlist');
                if (!user && decoded.email) {
                    user = await User_1.User.findOne({ email: decoded.email }).select('-__v').populate('wishlist');
                }
                if (user) {
                    return res.json({
                        success: true,
                        user: {
                            id: user._id,
                            name: user.name,
                            email: user.email,
                            avatar: user.avatar,
                            savedAddresses: user.savedAddresses,
                            wishlist: user.wishlist
                        }
                    });
                }
            }
            catch (err) {
                // ignore user token fail, fallback to admin
            }
        }
        // 2. Check for Admin authentication
        const adminToken = req.cookies?.token;
        if (adminToken) {
            try {
                const decoded = jsonwebtoken_1.default.verify(adminToken, process.env.JWT_SECRET);
                const admin = await Admin_1.default.findById(decoded.id).select('-password');
                if (admin) {
                    return res.json(admin);
                }
            }
            catch (err) {
                // Both failed
            }
        }
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map