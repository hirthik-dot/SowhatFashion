import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

export interface UserAuthRequest extends Request {
  user?: any;
}

const userAuthMiddleware = async (req: UserAuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.user_token;

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Verify token using NEXTAUTH_SECRET (or fallback to JWT_SECRET)
    const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || '';
    const decoded = jwt.verify(token, secret) as any;
    
    // The "id" could be in "id" or "sub" (NextAuth standard)
    const userId = decoded.id || decoded.sub;

    const user = await User.findById(userId).select('-__v');
    if (!user) {
      // If NextAuth just created the user but token has email instead of ID?
      // NextAuth default JWT includes email. Let's check by email if id fails
      if (decoded.email) {
         const userByEmail = await User.findOne({ email: decoded.email }).select('-__v');
         if (userByEmail) {
            req.user = userByEmail;
            return next();
         }
      }
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export default userAuthMiddleware;
