"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTemplates = listTemplates;
exports.getTemplate = getTemplate;
exports.createTemplate = createTemplate;
exports.updateTemplate = updateTemplate;
exports.deleteTemplate = deleteTemplate;
exports.renderTemplate = renderTemplate;
const database_1 = require("../../config/database");
const errors_1 = require("../../utils/errors");
const logger_1 = require("../../utils/logger");
const template_variables_1 = require("../../utils/template-variables");
// ---------------------------------------------------------------------------
// listTemplates
// ---------------------------------------------------------------------------
async function listTemplates(params) {
    logger_1.logger.info('[templates.service.listTemplates] INÍCIO', {
        channel: params.channel,
        category: params.category,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where = {};
    if (params.channel) {
        where.channel = params.channel;
        logger_1.logger.debug('[templates.service.listTemplates] Filtro channel aplicado', {
            channel: params.channel,
        });
    }
    if (params.category) {
        where.category = params.category;
        logger_1.logger.debug('[templates.service.listTemplates] Filtro category aplicado', {
            category: params.category,
        });
    }
    const templates = await database_1.prisma.template.findMany({
        where,
        orderBy: { createdAt: 'desc' },
    });
    logger_1.logger.info('[templates.service.listTemplates] FIM', {
        total: templates.length,
    });
    return templates;
}
// ---------------------------------------------------------------------------
// getTemplate
// ---------------------------------------------------------------------------
async function getTemplate(id) {
    logger_1.logger.info('[templates.service.getTemplate] INÍCIO', { id });
    const template = await database_1.prisma.template.findUnique({ where: { id } });
    if (!template) {
        logger_1.logger.warn('[templates.service.getTemplate] Template não encontrado', { id });
        throw new errors_1.AppError(404, 'Template não encontrado', 'TEMPLATE_NOT_FOUND');
    }
    logger_1.logger.info('[templates.service.getTemplate] FIM', { id, name: template.name });
    return template;
}
// ---------------------------------------------------------------------------
// createTemplate
// ---------------------------------------------------------------------------
async function createTemplate(data) {
    logger_1.logger.info('[templates.service.createTemplate] INÍCIO', {
        name: data.name,
        channel: data.channel,
        category: data.category,
    });
    const template = await database_1.prisma.template.create({
        data: {
            name: data.name,
            channel: data.channel,
            subject: data.subject,
            content: data.content,
            category: data.category,
        },
    });
    logger_1.logger.info('[templates.service.createTemplate] FIM - Template criado', {
        id: template.id,
        name: template.name,
    });
    return template;
}
// ---------------------------------------------------------------------------
// updateTemplate
// ---------------------------------------------------------------------------
async function updateTemplate(id, data) {
    logger_1.logger.info('[templates.service.updateTemplate] INÍCIO', {
        id,
        campos: Object.keys(data),
    });
    const existing = await database_1.prisma.template.findUnique({ where: { id } });
    if (!existing) {
        logger_1.logger.warn('[templates.service.updateTemplate] Template não encontrado', { id });
        throw new errors_1.AppError(404, 'Template não encontrado', 'TEMPLATE_NOT_FOUND');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData = {};
    if (data.name !== undefined)
        updateData.name = data.name;
    if (data.channel !== undefined)
        updateData.channel = data.channel;
    if (data.subject !== undefined)
        updateData.subject = data.subject;
    if (data.content !== undefined)
        updateData.content = data.content;
    if (data.category !== undefined)
        updateData.category = data.category;
    const template = await database_1.prisma.template.update({
        where: { id },
        data: updateData,
    });
    logger_1.logger.info('[templates.service.updateTemplate] FIM - Template atualizado', {
        id,
        name: template.name,
    });
    return template;
}
// ---------------------------------------------------------------------------
// deleteTemplate
// ---------------------------------------------------------------------------
async function deleteTemplate(id) {
    logger_1.logger.info('[templates.service.deleteTemplate] INÍCIO', { id });
    const existing = await database_1.prisma.template.findUnique({ where: { id } });
    if (!existing) {
        logger_1.logger.warn('[templates.service.deleteTemplate] Template não encontrado', { id });
        throw new errors_1.AppError(404, 'Template não encontrado', 'TEMPLATE_NOT_FOUND');
    }
    await database_1.prisma.template.delete({ where: { id } });
    logger_1.logger.info('[templates.service.deleteTemplate] FIM - Template deletado', {
        id,
        name: existing.name,
    });
}
// ---------------------------------------------------------------------------
// renderTemplate
// ---------------------------------------------------------------------------
/**
 * Substitui as variáveis do template com os dados reais do lead.
 * Variáveis suportadas: {{name}}, {{company}}, {{position}}, {{email}}, {{phone}}
 */
async function renderTemplate(templateId, leadId) {
    logger_1.logger.info('[templates.service.renderTemplate] INÍCIO', { templateId, leadId });
    // Buscar template
    const template = await database_1.prisma.template.findUnique({ where: { id: templateId } });
    if (!template) {
        logger_1.logger.warn('[templates.service.renderTemplate] Template não encontrado', { templateId });
        throw new errors_1.AppError(404, 'Template não encontrado', 'TEMPLATE_NOT_FOUND');
    }
    // Buscar lead
    const lead = await database_1.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
        logger_1.logger.warn('[templates.service.renderTemplate] Lead não encontrado', { leadId });
        throw new errors_1.AppError(404, 'Lead não encontrado', 'LEAD_NOT_FOUND');
    }
    logger_1.logger.debug('[templates.service.renderTemplate] Template e lead encontrados', {
        templateId,
        templateName: template.name,
        leadId,
        leadName: lead.name,
    });
    // Realizar substituicoes usando utilitário unificado
    logger_1.logger.debug('[templates.service.renderTemplate] Substituindo variáveis via utilitário unificado...');
    const contentRendered = await (0, template_variables_1.substituirVariaveis)(template.content, lead);
    logger_1.logger.debug('[templates.service.renderTemplate] Variáveis substituídas no content');
    // Realizar substituicoes no subject (se existir)
    let subjectRendered;
    if (template.subject) {
        subjectRendered = await (0, template_variables_1.substituirVariaveis)(template.subject, lead);
        logger_1.logger.debug('[templates.service.renderTemplate] Variáveis substituídas no subject');
    }
    logger_1.logger.info('[templates.service.renderTemplate] FIM - Template renderizado', {
        templateId,
        leadId,
        contentLength: contentRendered.length,
    });
    return {
        subject: subjectRendered,
        content: contentRendered,
    };
}
//# sourceMappingURL=templates.service.js.map