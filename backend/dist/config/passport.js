"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const User_1 = require("../models/User");
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails?.[0].value;
        let user = await User_1.User.findOne({ googleId: profile.id });
        if (!user && email) {
            user = await User_1.User.findOne({ email });
            if (user) {
                user.googleId = profile.id;
                if (!user.avatar && profile.photos?.[0].value) {
                    user.avatar = profile.photos[0].value;
                }
                await user.save();
            }
        }
        if (!user && email) {
            user = await User_1.User.create({
                googleId: profile.id,
                email: email,
                name: profile.displayName,
                avatar: profile.photos?.[0].value || '',
                isEmailVerified: true,
            });
        }
        return done(null, user || false);
    }
    catch (error) {
        return done(error, false);
    }
}));
exports.default = passport_1.default;
//# sourceMappingURL=passport.js.map