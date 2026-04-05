import jwt from 'jsonwebtoken';
import { Request } from 'express';

export function isAdminRequest(req: Request): boolean {
  const token = req.cookies?.token;
  if (!token || !process.env.JWT_SECRET) return false;
  try {
    jwt.verify(token, process.env.JWT_SECRET as string);
    return true;
  } catch {
    return false;
  }
}
