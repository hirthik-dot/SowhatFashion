"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const userAuthMiddleware = async (req, res, next) => {
    try {
        let token = req.cookies?.user_token ||
            req.cookies?.['next-auth.session-token'] ||
            req.cookies?.['__Secure-next-auth.session-token'];
        const authHeader = req.headers.authorization;
        if (!token && authHeader?.startsWith('Bearer ')) {
            token = authHeader.slice(7);
        }
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        // Verify token using NEXTAUTH_SECRET (or fallback to JWT_SECRET)
        const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || '';
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        // The "id" could be in "id" or "sub" (NextAuth standard)
        const userId = decoded.id || decoded.sub;
        const user = await User_1.User.findById(userId).select('-__v');
        if (!user) {
            // If NextAuth just created the user but token has email instead of ID?
            // NextAuth default JWT includes email. Let's check by email if id fails
            if (decoded.email) {
                const userByEmail = await User_1.User.findOne({ email: decoded.email }).select('-__v');
                if (userByEmail) {
                    req.user = userByEmail;
                    return next();
                }
            }
            return res.status(401).json({ message: 'User not found' });
        }
        req.user = user;
        next();
    }
    catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};
exports.default = userAuthMiddleware;
//# sourceMappingURL=userAuthMiddleware.js.map