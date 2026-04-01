"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSendWhatsApp = handleSendWhatsApp;
exports.handleSendEmail = handleSendEmail;
exports.handleScheduleMessage = handleScheduleMessage;
exports.handleGetMessagesByLead = handleGetMessagesByLead;
const zod_1 = require("zod");
const logger_1 = require("../../utils/logger");
const errors_1 = require("../../utils/errors");
const messages_service_1 = require("./messages.service");
// ---------------------------------------------------------------------------
// Schemas de validação Zod
// ---------------------------------------------------------------------------
const sendWhatsAppSchema = zod_1.z.object({
    leadId: zod_1.z.string().min(1, 'leadId é obrigatório'),
    content: zod_1.z.string().min(1, 'Conteúdo da mensagem é obrigatório'),
});
const sendEmailSchema = zod_1.z.object({
    leadId: zod_1.z.string().min(1, 'leadId é obrigatório'),
    subject: zod_1.z.string().min(1, 'Assunto é obrigatório'),
    content: zod_1.z.string().min(1, 'Conteúdo da mensagem é obrigatório'),
    html: zod_1.z.string().optional(),
});
const paginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().optional(),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional(),
});
const scheduleMessageSchema = zod_1.z.object({
    leadId: zod_1.z.string().min(1, 'leadId é obrigatório'),
    content: zod_1.z.string().min(1, 'Conteúdo da mensagem é obrigatório'),
    channel: zod_1.z.enum(['whatsapp', 'email'], {
        errorMap: () => ({ message: 'channel deve ser "whatsapp" ou "email". Outros canais não são suportados.' }),
    }),
    scheduledFor: zod_1.z.string()
        .datetime({ message: 'scheduledFor deve ser uma data ISO 8601 válida' })
        .refine((val) => new Date(val) > new Date(), {
        message: 'scheduledFor deve ser uma data futura',
    }),
    subject: zod_1.z.string().optional(),
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
async function handleSendWhatsApp(req, res, next) {
    logger_1.logger.info('[messages.controller.handleSendWhatsApp] INÍCIO', {
        userId: req.userId,
        body: {
            leadId: req.body.leadId,
            contentPreview: req.body.content?.substring(0, 80),
        },
    });
    try {
        const { leadId, content } = sendWhatsAppSchema.parse(req.body);
        logger_1.logger.debug('[messages.controller.handleSendWhatsApp] Dados validados', {
            leadId,
            contentLength: content.length,
        });
        const message = await (0, messages_service_1.sendWhatsApp)(leadId, content);
        logger_1.logger.info('[messages.controller.handleSendWhatsApp] FIM - Sucesso', { leadId });
        res.status(201).json({ success: true, data: message });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            logger_1.logger.warn('[messages.controller.handleSendWhatsApp] Erro de validação', {
                errors: error.errors,
            });
            return next(new errors_1.AppError(400, error.errors[0].message, 'VALIDATION_ERROR'));
        }
        next(error);
    }
}
async function handleSendEmail(req, res, next) {
    logger_1.logger.info('[messages.controller.handleSendEmail] INÍCIO', {
        userId: req.userId,
        body: {
            leadId: req.body.leadId,
            subject: req.body.subject,
            hasHtml: !!req.body.html,
        },
    });
    try {
        const { leadId, subject, content, html } = sendEmailSchema.parse(req.body);
        logger_1.logger.debug('[messages.controller.handleSendEmail] Dados validados', {
            leadId,
            subject,
            hasHtml: !!html,
        });
        const message = await (0, messages_service_1.sendEmail)(leadId, subject, content, html);
        logger_1.logger.info('[messages.controller.handleSendEmail] FIM - Sucesso', {
            leadId,
            subject,
        });
        res.status(201).json({ success: true, data: message });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            logger_1.logger.warn('[messages.controller.handleSendEmail] Erro de validação', {
                errors: error.errors,
            });
            return next(new errors_1.AppError(400, error.errors[0].message, 'VALIDATION_ERROR'));
        }
        next(error);
    }
}
async function handleScheduleMessage(req, res, next) {
    logger_1.logger.info('[messages.controller.handleScheduleMessage] INÍCIO', {
        userId: req.userId,
        body: {
            leadId: req.body.leadId,
            channel: req.body.channel,
            scheduledFor: req.body.scheduledFor,
            hasSubject: !!req.body.subject,
            contentPreview: req.body.content?.substring(0, 80),
        },
    });
    try {
        const { leadId, content, channel, scheduledFor, subject } = scheduleMessageSchema.parse(req.body);
        logger_1.logger.debug('[messages.controller.handleScheduleMessage] Dados validados', {
            leadId,
            channel,
            scheduledFor,
        });
        const message = await (0, messages_service_1.scheduleMessage)(leadId, content, channel, new Date(scheduledFor), subject);
        logger_1.logger.info('[messages.controller.handleScheduleMessage] FIM - Sucesso', {
            leadId,
            channel,
            scheduledFor,
        });
        res.status(201).json({ success: true, data: message });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            logger_1.logger.warn('[messages.controller.handleScheduleMessage] Erro de validação', {
                errors: error.errors,
            });
            return next(new errors_1.AppError(400, error.errors[0].message, 'VALIDATION_ERROR'));
        }
        next(error);
    }
}
async function handleGetMessagesByLead(req, res, next) {
    const leadId = param(req, 'leadId');
    logger_1.logger.info('[messages.controller.handleGetMessagesByLead] INÍCIO', {
        leadId,
        userId: req.userId,
        query: req.query,
    });
    try {
        const query = paginationSchema.parse(req.query);
        logger_1.logger.debug('[messages.controller.handleGetMessagesByLead] Paginação validada', {
            leadId,
            query,
        });
        const result = await (0, messages_service_1.getMessagesByLead)(leadId, query);
        logger_1.logger.info('[messages.controller.handleGetMessagesByLead] FIM - Sucesso', {
            leadId,
            total: result.pagination.total,
        });
        res.json({ success: true, ...result });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            logger_1.logger.warn('[messages.controller.handleGetMessagesByLead] Erro de validação', {
                errors: error.errors,
            });
            return next(new errors_1.AppError(400, error.errors[0].message, 'VALIDATION_ERROR'));
        }
        next(error);
    }
}
//# sourceMappingURL=messages.controller.js.map