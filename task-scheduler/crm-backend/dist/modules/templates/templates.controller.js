"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleListTemplates = handleListTemplates;
exports.handleGetTemplate = handleGetTemplate;
exports.handleCreateTemplate = handleCreateTemplate;
exports.handleUpdateTemplate = handleUpdateTemplate;
exports.handleDeleteTemplate = handleDeleteTemplate;
exports.handleRenderTemplate = handleRenderTemplate;
const zod_1 = require("zod");
const logger_1 = require("../../utils/logger");
const errors_1 = require("../../utils/errors");
const templates_service_1 = require("./templates.service");
// ---------------------------------------------------------------------------
// Schemas de validação Zod
// ---------------------------------------------------------------------------
const listQuerySchema = zod_1.z.object({
    channel: zod_1.z.enum(['whatsapp', 'email']).optional(),
    category: zod_1.z.string().optional(),
});
const createTemplateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Nome do template é obrigatório'),
    channel: zod_1.z.enum(['whatsapp', 'email'], {
        errorMap: () => ({ message: 'Canal inválido. Use: whatsapp ou email' }),
    }),
    subject: zod_1.z.string().optional(),
    content: zod_1.z.string().min(1, 'Conteúdo do template é obrigatório'),
    category: zod_1.z.string().optional(),
});
const updateTemplateSchema = createTemplateSchema.partial();
const renderTemplateSchema = zod_1.z.object({
    leadId: zod_1.z.string().min(1, 'leadId é obrigatório'),
});
// ---------------------------------------------------------------------------
// Helper para extrair param como string
// ---------------------------------------------------------------------------
function param(req, name) {
    return String(req.params[name]);
}
// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------
async function handleListTemplates(req, res, next) {
    logger_1.logger.info('[templates.controller.handleListTemplates] INÍCIO', {
        userId: req.userId,
        query: req.query,
    });
    try {
        const query = listQuerySchema.parse(req.query);
        logger_1.logger.debug('[templates.controller.handleListTemplates] Query validada', { query });
        const templates = await (0, templates_service_1.listTemplates)(query);
        logger_1.logger.info('[templates.controller.handleListTemplates] FIM - Sucesso', {
            total: templates.length,
        });
        res.json({ success: true, data: templates });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            logger_1.logger.warn('[templates.controller.handleListTemplates] Erro de validação', {
                errors: error.errors,
            });
            return next(new errors_1.AppError(400, error.errors[0].message, 'VALIDATION_ERROR'));
        }
        next(error);
    }
}
async function handleGetTemplate(req, res, next) {
    const id = param(req, 'id');
    logger_1.logger.info('[templates.controller.handleGetTemplate] INÍCIO', { id, userId: req.userId });
    try {
        const template = await (0, templates_service_1.getTemplate)(id);
        logger_1.logger.info('[templates.controller.handleGetTemplate] FIM - Sucesso', { id });
        res.json({ success: true, data: template });
    }
    catch (error) {
        next(error);
    }
}
async function handleCreateTemplate(req, res, next) {
    logger_1.logger.info('[templates.controller.handleCreateTemplate] INÍCIO', {
        userId: req.userId,
        body: req.body,
    });
    try {
        const data = createTemplateSchema.parse(req.body);
        logger_1.logger.debug('[templates.controller.handleCreateTemplate] Dados validados', {
            name: data.name,
            channel: data.channel,
        });
        const template = await (0, templates_service_1.createTemplate)(data);
        logger_1.logger.info('[templates.controller.handleCreateTemplate] FIM - Sucesso');
        res.status(201).json({ success: true, data: template });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            logger_1.logger.warn('[templates.controller.handleCreateTemplate] Erro de validação', {
                errors: error.errors,
            });
            return next(new errors_1.AppError(400, error.errors[0].message, 'VALIDATION_ERROR'));
        }
        next(error);
    }
}
async function handleUpdateTemplate(req, res, next) {
    const id = param(req, 'id');
    logger_1.logger.info('[templates.controller.handleUpdateTemplate] INÍCIO', {
        id,
        userId: req.userId,
        body: req.body,
    });
    try {
        const data = updateTemplateSchema.parse(req.body);
        logger_1.logger.debug('[templates.controller.handleUpdateTemplate] Dados validados', {
            id,
            campos: Object.keys(data),
        });
        const template = await (0, templates_service_1.updateTemplate)(id, data);
        logger_1.logger.info('[templates.controller.handleUpdateTemplate] FIM - Sucesso', { id });
        res.json({ success: true, data: template });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            logger_1.logger.warn('[templates.controller.handleUpdateTemplate] Erro de validação', {
                errors: error.errors,
            });
            return next(new errors_1.AppError(400, error.errors[0].message, 'VALIDATION_ERROR'));
        }
        next(error);
    }
}
async function handleDeleteTemplate(req, res, next) {
    const id = param(req, 'id');
    logger_1.logger.info('[templates.controller.handleDeleteTemplate] INÍCIO', { id, userId: req.userId });
    try {
        await (0, templates_service_1.deleteTemplate)(id);
        logger_1.logger.info('[templates.controller.handleDeleteTemplate] FIM - Template deletado', { id });
        res.json({ success: true, message: 'Template removido com sucesso' });
    }
    catch (error) {
        next(error);
    }
}
async function handleRenderTemplate(req, res, next) {
    const id = param(req, 'id');
    logger_1.logger.info('[templates.controller.handleRenderTemplate] INÍCIO', {
        templateId: id,
        userId: req.userId,
        body: req.body,
    });
    try {
        const { leadId } = renderTemplateSchema.parse(req.body);
        logger_1.logger.debug('[templates.controller.handleRenderTemplate] Dados validados', {
            templateId: id,
            leadId,
        });
        const rendered = await (0, templates_service_1.renderTemplate)(id, leadId);
        logger_1.logger.info('[templates.controller.handleRenderTemplate] FIM - Sucesso', {
            templateId: id,
            leadId,
        });
        res.json({ success: true, data: rendered });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            logger_1.logger.warn('[templates.controller.handleRenderTemplate] Erro de validação', {
                errors: error.errors,
            });
            return next(new errors_1.AppError(400, error.errors[0].message, 'VALIDATION_ERROR'));
        }
        next(error);
    }
}
//# sourceMappingURL=templates.controller.js.map