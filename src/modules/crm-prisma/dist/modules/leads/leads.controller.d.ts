import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
export declare const uploadCSV: multer.Multer;
export declare function handleListLeads(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function handleGetLead(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function handleCreateLead(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function handleUpdateLead(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function handleDeleteLead(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function handleImportCSV(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function handleGetLeadMessages(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function handleGetLeadActivities(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function handleCheckWhatsapp(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function handleBulkWhatsappCleanup(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function handleAddNote(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=leads.controller.d.ts.map