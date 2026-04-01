import { Request, Response, NextFunction } from 'express';
/**
 * GET /campaigns
 * Lista campanhas com paginação e filtro por status.
 */
export declare function list(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * GET /campaigns/:id
 * Retorna uma campanha com steps e contagens.
 */
export declare function getById(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * POST /campaigns
 * Cria uma nova campanha.
 */
export declare function create(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * PUT /campaigns/:id
 * Atualiza campos de uma campanha.
 */
export declare function update(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * POST /campaigns/:id/start
 * Inicia uma campanha.
 */
export declare function start(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * POST /campaigns/:id/pause
 * Pausa uma campanha ativa.
 */
export declare function pause(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * POST /campaigns/:id/leads
 * Adiciona leads a uma campanha.
 */
export declare function addLeads(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * POST /campaigns/:id/steps
 * Define os steps de uma campanha.
 */
export declare function addSteps(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * GET /campaigns/:id/stats
 * Retorna estatísticas de uma campanha com breakdown por step.
 */
export declare function getStats(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * DELETE /campaigns/:id
 * Deleta uma campanha (apenas draft, paused ou completed).
 */
export declare function deleteCampaign(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * GET /campaigns/:id/leads
 * Lista leads de uma campanha com paginação e filtro por status.
 */
export declare function listLeads(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * DELETE /campaigns/:id/leads/:leadId
 * Remove um lead de uma campanha.
 */
export declare function removeLead(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * POST /campaigns/:id/duplicate
 * Clona uma campanha (mesmo nome + " (cópia)"), copiando todos os steps.
 * Não copia leads. Status da cópia é 'draft'.
 */
export declare function duplicate(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=campaigns.controller.d.ts.map