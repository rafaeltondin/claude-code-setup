import { Request, Response, NextFunction } from 'express';
export declare class AppError extends Error {
    statusCode: number;
    code?: string | undefined;
    constructor(statusCode: number, message: string, code?: string | undefined);
}
export declare function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void;
//# sourceMappingURL=errors.d.ts.map