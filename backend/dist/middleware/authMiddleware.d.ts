import { Request, Response, NextFunction } from 'express';
export interface AuthRequest extends Request {
    adminId?: string;
}
declare const authMiddleware: (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export default authMiddleware;
//# sourceMappingURL=authMiddleware.d.ts.map