"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAnalyzeTags = handleAnalyzeTags;
const zod_1 = require("zod");
const logger_1 = require("../../utils/logger");
const errors_1 = require("../../utils/errors");
const tags_service_1 = require("./tags.service");
// ---------------------------------------------------------------------------
// Schemas de validação Zod
// ---------------------------------------------------------------------------
const analyzeTagsSchema = zod_1.z
    .object({
    leadId: zod_1.z.string().min(1).optional(),
    analyzeAll: zod_1.z.boolean().optional(),
})
    .refine((data) => data.leadId !== undefined || data.analyzeAll === true, {
    message: 'Informe "leadId" ou "analyzeAll: true"',
});
// ---------------------------------------------------------------------------
// Handler: POST /api/tags/analyze
// ---------------------------------------------------------------------------
async function handleAnalyzeTags(req, res, next) {
    logger_1.logger.info('[tags.controller.handleAnalyzeTags] INÍCIO', {
        userId: req.userId,
        body: {
            leadId: req.body.leadId,
            analyzeAll: req.body.analyzeAll,
        },
    });
    try {
        const { leadId, analyzeAll } = analyzeTagsSchema.parse(req.body);
        // Análise de um único lead
        if (leadId) {
            logger_1.logger.info('[tags.controller.handleAnalyzeTags] Analisando lead único...', {
                leadId,
            });
            const resultado = await (0, tags_service_1.analisarTagsLead)(leadId);
            logger_1.logger.info('[tags.controller.handleAnalyzeTags] FIM - Análise individual concluída', {
                leadId,
                score: resultado.score,
                temperaturaDepois: resultado.temperaturaDepois,
                alterado: resultado.alterado,
            });
            res.json({
                success: true,
                data: resultado,
            });
            return;
        }
        // Análise de todos os leads
        if (analyzeAll) {
            logger_1.logger.info('[tags.controller.handleAnalyzeTags] Analisando todos os leads...', {
                userId: req.userId,
            });
            const resultado = await (0, tags_service_1.analisarTagsTodos)();
            logger_1.logger.info('[tags.controller.handleAnalyzeTags] FIM - Análise em massa concluída', {
                total: resultado.total,
                analisados: resultado.analisados,
                alterados: resultado.alterados,
                erros: resultado.erros,
            });
            res.json({
                success: true,
                data: resultado,
            });
            return;
        }
        // Caso não esperado (refine deveria ter capturado)
        next(new errors_1.AppError(400, 'Informe "leadId" ou "analyzeAll: true"', 'VALIDATION_ERROR'));
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            logger_1.logger.warn('[tags.controller.handleAnalyzeTags] Erro de validação', {
                errors: error.errors,
            });
            return next(new errors_1.AppError(400, error.errors[0].message, 'VALIDATION_ERROR'));
        }
        next(error);
    }
}
//# sourceMappingURL=tags.controller.js.map