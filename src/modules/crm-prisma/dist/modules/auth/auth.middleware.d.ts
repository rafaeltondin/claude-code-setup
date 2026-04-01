import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            userId: string;
        }
    }
}
export declare function authMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=auth.middleware.d.ts.map