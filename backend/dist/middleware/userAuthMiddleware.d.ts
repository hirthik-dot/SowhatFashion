import { Request, Response, NextFunction } from 'express';
export interface UserAuthRequest extends Request {
    user?: any;
}
declare const userAuthMiddleware: (req: UserAuthRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export default userAuthMiddleware;
//# sourceMappingURL=userAuthMiddleware.d.ts.map