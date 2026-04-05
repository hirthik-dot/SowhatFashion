import passport from 'passport';
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { User } from '../models/User';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
    },
    async (accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback) => {
      try {
        const email = profile.emails?.[0].value;
        let user = await User.findOne({ googleId: profile.id });

        if (!user && email) {
          user = await User.findOne({ email });
          if (user) {
            user.googleId = profile.id;
            if (!user.avatar && profile.photos?.[0].value) {
              user.avatar = profile.photos[0].value;
            }
            await user.save();
          }
        }

        if (!user && email) {
          user = await User.create({
            googleId: profile.id,
            email: email,
            name: profile.displayName,
            avatar: profile.photos?.[0].value || '',
            isEmailVerified: true,
          });
        }

        return done(null, user || false);
      } catch (error) {
        return done(error as Error, false);
      }
    }
  )
);

export default passport;
