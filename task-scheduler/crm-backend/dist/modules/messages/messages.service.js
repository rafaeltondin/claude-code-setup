"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWhatsApp = sendWhatsApp;
exports.sendEmail = sendEmail;
exports.getMessagesByLead = getMessagesByLead;
exports.scheduleMessage = scheduleMessage;
exports.processScheduledMessages = processScheduledMessages;
const database_1 = require("../../config/database");
const errors_1 = require("../../utils/errors");
const logger_1 = require("../../utils/logger");
const whatsapp_service_1 = require("../../services/whatsapp/whatsapp.service");
const email_service_1 = require("../../services/email/email.service");
const events_controller_1 = require("../events/events.controller");
const queue_1 = require("../../jobs/queue");
const dashboard_service_1 = require("../dashboard/dashboard.service");
// ---------------------------------------------------------------------------
// sendWhatsApp
// ---------------------------------------------------------------------------
async function sendWhatsApp(leadId, content) {
    const requestId = `swp_${Date.now()}`;
    logger_1.logger.info('[messages.service.sendWhatsApp] INÍCIO', {
        requestId,
        leadId,
        contentPreview: content.substring(0, 80),
    });
    // Buscar lead para obter o telefone
    logger_1.logger.debug('[messages.service.sendWhatsApp] Buscando lead...', { requestId, leadId });
    const lead = await database_1.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
        logger_1.logger.warn('[messages.service.sendWhatsApp] Lead não encontrado', { requestId, leadId });
        throw new errors_1.AppError(404, 'Lead não encontrado', 'LEAD_NOT_FOUND');
    }
    if (!lead.phone) {
        logger_1.logger.warn('[messages.service.sendWhatsApp] Lead sem número de telefone', {
            requestId,
            leadId,
            leadName: lead.name,
        });
        throw new errors_1.AppError(400, 'Lead não possui número de telefone', 'LEAD_NO_PHONE');
    }
    logger_1.logger.debug('[messages.service.sendWhatsApp] Lead encontrado', {
        requestId,
        leadId,
        leadName: lead.name,
        phone: lead.phone,
    });
    // Criar registro da mensagem com status pending
    logger_1.logger.info('[messages.service.sendWhatsApp] Criando registro de mensagem no banco...', {
        requestId,
        leadId,
    });
    const message = await database_1.prisma.message.create({
        data: {
            leadId,
            channel: 'whatsapp',
            direction: 'outbound',
            content,
            status: 'pending',
        },
    });
    logger_1.logger.info('[messages.service.sendWhatsApp] Mensagem criada com status pending', {
        requestId,
        messageId: message.id,
        leadId,
    });
    // Enviar via WhatsApp service
    logger_1.logger.info('[messages.service.sendWhatsApp] Enviando via WhatsAppService...', {
        requestId,
        phone: lead.phone,
    });
    try {
        const whatsappService = (0, whatsapp_service_1.getWhatsAppService)();
        const response = await whatsappService.sendText(lead.phone, content);
        logger_1.logger.info('[messages.service.sendWhatsApp] Mensagem enviada com sucesso', {
            requestId,
            messageId: message.id,
            externalId: response.key?.id,
            status: response.status,
        });
        // Atualizar status para sent e salvar externalId
        const messageAtualizada = await database_1.prisma.message.update({
            where: { id: message.id },
            data: {
                status: 'sent',
                externalId: response.key?.id,
                sentAt: new Date(),
                metadata: JSON.stringify({
                    whatsappStatus: response.status,
                    key: response.key,
                }),
            },
        });
        logger_1.logger.debug('[messages.service.sendWhatsApp] Status atualizado para sent', {
            requestId,
            messageId: message.id,
        });
        // Notificar clientes SSE sobre nova mensagem enviada
        (0, events_controller_1.emitSSE)('new_message', {
            messageId: messageAtualizada.id,
            leadId,
            channel: 'whatsapp',
            direction: 'outbound',
            status: 'sent',
            timestamp: new Date().toISOString(),
        });
        logger_1.logger.debug('[messages.service.sendWhatsApp] Evento SSE new_message emitido', {
            requestId,
            messageId: message.id,
        });
        // Bug 1 Fix: Atualizar lead.status para 'contacted' se estava 'new'
        if (lead.status === 'new') {
            logger_1.logger.info('[messages.service.sendWhatsApp] Atualizando lead.status para contacted...', {
                requestId,
                leadId,
                statusAnterior: lead.status,
            });
            await database_1.prisma.lead.update({
                where: { id: leadId },
                data: { status: 'contacted' },
            });
            logger_1.logger.info('[messages.service.sendWhatsApp] lead.status atualizado para contacted', {
                requestId,
                leadId,
            });
        }
        // Criar activity de mensagem enviada
        logger_1.logger.debug('[messages.service.sendWhatsApp] Criando activity whatsapp_sent...', {
            requestId,
            leadId,
        });
        await database_1.prisma.activity.create({
            data: {
                leadId,
                type: 'whatsapp_sent',
                details: JSON.stringify({
                    messageId: message.id,
                    externalId: response.key?.id,
                    preview: content.substring(0, 200),
                }),
            },
        });
        // Bug 3 Fix: Invalidar cache do dashboard apos envio bem-sucedido
        try {
            await (0, dashboard_service_1.invalidateDashboardCache)();
            logger_1.logger.debug('[messages.service.sendWhatsApp] Cache do dashboard invalidado', {
                requestId,
            });
        }
        catch (cacheErr) {
            logger_1.logger.warn('[messages.service.sendWhatsApp] Falha ao invalidar cache do dashboard', {
                requestId,
                error: cacheErr.message,
            });
        }
        logger_1.logger.info('[messages.service.sendWhatsApp] FIM - Sucesso', {
            requestId,
            messageId: message.id,
            leadId,
        });
        return messageAtualizada;
    }
    catch (error) {
        const err = error;
        logger_1.logger.error('[messages.service.sendWhatsApp] Falha ao enviar mensagem', {
            requestId,
            messageId: message.id,
            leadId,
            errorType: err.constructor.name,
            errorMessage: err.message,
        });
        // Atualizar status para failed
        await database_1.prisma.message.update({
            where: { id: message.id },
            data: {
                status: 'failed',
                error: err.message,
            },
        });
        throw error;
    }
}
// ---------------------------------------------------------------------------
// sendEmail
// ---------------------------------------------------------------------------
async function sendEmail(leadId, subject, content, html) {
    const requestId = `sem_${Date.now()}`;
    logger_1.logger.info('[messages.service.sendEmail] INÍCIO', {
        requestId,
        leadId,
        subject,
        hasHtml: !!html,
    });
    // Buscar lead
    logger_1.logger.debug('[messages.service.sendEmail] Buscando lead...', { requestId, leadId });
    const lead = await database_1.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
        logger_1.logger.warn('[messages.service.sendEmail] Lead não encontrado', { requestId, leadId });
        throw new errors_1.AppError(404, 'Lead não encontrado', 'LEAD_NOT_FOUND');
    }
    if (!lead.email) {
        logger_1.logger.warn('[messages.service.sendEmail] Lead sem e-mail', {
            requestId,
            leadId,
            leadName: lead.name,
        });
        throw new errors_1.AppError(400, 'Lead não possui endereço de e-mail', 'LEAD_NO_EMAIL');
    }
    logger_1.logger.debug('[messages.service.sendEmail] Lead encontrado', {
        requestId,
        leadId,
        leadEmail: lead.email,
    });
    // Criar registro da mensagem com status pending
    logger_1.logger.info('[messages.service.sendEmail] Criando registro de mensagem no banco...', {
        requestId,
        leadId,
    });
    const message = await database_1.prisma.message.create({
        data: {
            leadId,
            channel: 'email',
            direction: 'outbound',
            content,
            subject,
            htmlContent: html,
            status: 'pending',
        },
    });
    logger_1.logger.info('[messages.service.sendEmail] Mensagem criada com status pending', {
        requestId,
        messageId: message.id,
    });
    // Enviar via EmailService
    logger_1.logger.info('[messages.service.sendEmail] Enviando via EmailService...', {
        requestId,
        to: lead.email,
        subject,
    });
    try {
        const emailService = (0, email_service_1.getEmailService)();
        const response = await emailService.sendEmail({
            to: lead.email,
            subject,
            text: content,
            html,
        });
        logger_1.logger.info('[messages.service.sendEmail] E-mail enviado com sucesso', {
            requestId,
            messageId: message.id,
            emailMessageId: response.messageId,
            accepted: response.accepted,
            rejected: response.rejected,
        });
        // Atualizar status para sent
        const messageAtualizada = await database_1.prisma.message.update({
            where: { id: message.id },
            data: {
                status: response.rejected.length === 0 ? 'sent' : 'failed',
                externalId: response.messageId,
                sentAt: new Date(),
                metadata: JSON.stringify({
                    messageId: response.messageId,
                    response: response.response,
                    accepted: response.accepted,
                    rejected: response.rejected,
                }),
            },
        });
        logger_1.logger.debug('[messages.service.sendEmail] Status atualizado', {
            requestId,
            messageId: message.id,
            status: messageAtualizada.status,
        });
        // Notificar clientes SSE sobre novo e-mail enviado
        (0, events_controller_1.emitSSE)('new_message', {
            messageId: messageAtualizada.id,
            leadId,
            channel: 'email',
            direction: 'outbound',
            status: messageAtualizada.status,
            subject,
            timestamp: new Date().toISOString(),
        });
        logger_1.logger.debug('[messages.service.sendEmail] Evento SSE new_message emitido', {
            requestId,
            messageId: message.id,
        });
        // Bug 1 Fix: Atualizar lead.status para 'contacted' se estava 'new'
        if (lead.status === 'new') {
            logger_1.logger.info('[messages.service.sendEmail] Atualizando lead.status para contacted...', {
                requestId,
                leadId,
                statusAnterior: lead.status,
            });
            await database_1.prisma.lead.update({
                where: { id: leadId },
                data: { status: 'contacted' },
            });
            logger_1.logger.info('[messages.service.sendEmail] lead.status atualizado para contacted', {
                requestId,
                leadId,
            });
        }
        // Criar activity de email enviado
        logger_1.logger.debug('[messages.service.sendEmail] Criando activity email_sent...', {
            requestId,
            leadId,
        });
        await database_1.prisma.activity.create({
            data: {
                leadId,
                type: 'email_sent',
                details: JSON.stringify({
                    messageId: message.id,
                    emailMessageId: response.messageId,
                    subject,
                    preview: content.substring(0, 200),
                }),
            },
        });
        // Bug 3 Fix: Invalidar cache do dashboard apos envio bem-sucedido
        try {
            await (0, dashboard_service_1.invalidateDashboardCache)();
            logger_1.logger.debug('[messages.service.sendEmail] Cache do dashboard invalidado', {
                requestId,
            });
        }
        catch (cacheErr) {
            logger_1.logger.warn('[messages.service.sendEmail] Falha ao invalidar cache do dashboard', {
                requestId,
                error: cacheErr.message,
            });
        }
        logger_1.logger.info('[messages.service.sendEmail] FIM - Sucesso', {
            requestId,
            messageId: message.id,
            leadId,
        });
        return messageAtualizada;
    }
    catch (error) {
        const err = error;
        logger_1.logger.error('[messages.service.sendEmail] Falha ao enviar e-mail', {
            requestId,
            messageId: message.id,
            leadId,
            errorType: err.constructor.name,
            errorMessage: err.message,
        });
        // Atualizar status para failed
        await database_1.prisma.message.update({
            where: { id: message.id },
            data: {
                status: 'failed',
                error: err.message,
            },
        });
        throw error;
    }
}
// ---------------------------------------------------------------------------
// getMessagesByLead
// ---------------------------------------------------------------------------
async function getMessagesByLead(leadId, params) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;
    logger_1.logger.info('[messages.service.getMessagesByLead] INÍCIO', { leadId, page, limit });
    // Verificar se o lead existe
    const lead = await database_1.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
        logger_1.logger.warn('[messages.service.getMessagesByLead] Lead não encontrado', { leadId });
        throw new errors_1.AppError(404, 'Lead não encontrado', 'LEAD_NOT_FOUND');
    }
    const total = await database_1.prisma.message.count({ where: { leadId } });
    logger_1.logger.debug('[messages.service.getMessagesByLead] Total de mensagens', { leadId, total });
    const data = await database_1.prisma.message.findMany({
        where: { leadId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
    });
    const totalPages = Math.ceil(total / limit);
    logger_1.logger.info('[messages.service.getMessagesByLead] FIM', {
        leadId,
        total,
        retornados: data.length,
        page,
        totalPages,
    });
    return { data, pagination: { page, limit, total, totalPages } };
}
// ---------------------------------------------------------------------------
// scheduleMessage
// ---------------------------------------------------------------------------
async function scheduleMessage(leadId, content, channel, scheduledFor, subject) {
    const requestId = `sched_${Date.now()}`;
    logger_1.logger.info('[messages.service.scheduleMessage] INÍCIO', {
        requestId,
        leadId,
        channel,
        scheduledFor: scheduledFor.toISOString(),
        hasSubject: !!subject,
        contentPreview: content.substring(0, 80),
    });
    // Validar canal suportado
    if (!['whatsapp', 'email'].includes(channel)) {
        logger_1.logger.warn('[messages.service.scheduleMessage] Canal inválido', { requestId, channel });
        throw new errors_1.AppError(400, 'Canal inválido. Use "whatsapp" ou "email"', 'INVALID_CHANNEL');
    }
    // Validar que scheduledFor é no futuro
    if (scheduledFor <= new Date()) {
        logger_1.logger.warn('[messages.service.scheduleMessage] Data de agendamento no passado', {
            requestId,
            scheduledFor: scheduledFor.toISOString(),
        });
        throw new errors_1.AppError(400, 'scheduledFor deve ser uma data futura', 'INVALID_SCHEDULE_DATE');
    }
    // Buscar lead
    logger_1.logger.debug('[messages.service.scheduleMessage] Buscando lead...', { requestId, leadId });
    const lead = await database_1.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
        logger_1.logger.warn('[messages.service.scheduleMessage] Lead não encontrado', { requestId, leadId });
        throw new errors_1.AppError(404, 'Lead não encontrado', 'LEAD_NOT_FOUND');
    }
    // Validar canal vs dados disponíveis do lead
    if (channel === 'whatsapp' && !lead.phone) {
        logger_1.logger.warn('[messages.service.scheduleMessage] Lead sem telefone para WhatsApp', {
            requestId,
            leadId,
        });
        throw new errors_1.AppError(400, 'Lead não possui número de telefone', 'LEAD_NO_PHONE');
    }
    if (channel === 'email' && !lead.email) {
        logger_1.logger.warn('[messages.service.scheduleMessage] Lead sem email', { requestId, leadId });
        throw new errors_1.AppError(400, 'Lead não possui endereço de e-mail', 'LEAD_NO_EMAIL');
    }
    logger_1.logger.debug('[messages.service.scheduleMessage] Lead encontrado', {
        requestId,
        leadId,
        leadName: lead.name,
    });
    // Criar Message com status='scheduled' e scheduledFor preenchido
    logger_1.logger.info('[messages.service.scheduleMessage] Criando mensagem agendada no banco...', {
        requestId,
        leadId,
        channel,
    });
    const message = await database_1.prisma.message.create({
        data: {
            leadId,
            channel,
            direction: 'outbound',
            content,
            subject: subject ?? null,
            status: 'scheduled',
            scheduledFor,
        },
    });
    logger_1.logger.info('[messages.service.scheduleMessage] Mensagem agendada criada', {
        requestId,
        messageId: message.id,
        scheduledFor: scheduledFor.toISOString(),
        channel,
    });
    // Registrar Activity de mensagem agendada
    logger_1.logger.debug('[messages.service.scheduleMessage] Criando activity message_scheduled...', {
        requestId,
        leadId,
    });
    await database_1.prisma.activity.create({
        data: {
            leadId,
            type: 'message_scheduled',
            details: JSON.stringify({
                messageId: message.id,
                channel,
                scheduledFor: scheduledFor.toISOString(),
                preview: content.substring(0, 200),
                subject: subject ?? null,
            }),
        },
    });
    logger_1.logger.info('[messages.service.scheduleMessage] FIM - Sucesso', {
        requestId,
        messageId: message.id,
        leadId,
        scheduledFor: scheduledFor.toISOString(),
    });
    return message;
}
// ---------------------------------------------------------------------------
// processScheduledMessages
// ---------------------------------------------------------------------------
/**
 * Busca todas as mensagens com status='scheduled' e scheduledFor <= agora,
 * e enfileira cada uma no job adequado (send-whatsapp ou send-email).
 * Deve ser chamado periodicamente (ex: a cada 1 minuto).
 */
async function processScheduledMessages() {
    const requestId = `psm_${Date.now()}`;
    const agora = new Date();
    logger_1.logger.info('[messages.service.processScheduledMessages] INÍCIO', {
        requestId,
        agora: agora.toISOString(),
    });
    // Buscar mensagens agendadas com scheduledFor <= agora
    logger_1.logger.debug('[messages.service.processScheduledMessages] Buscando mensagens agendadas vencidas...', {
        requestId,
    });
    const mensagensAgendadas = await database_1.prisma.message.findMany({
        where: {
            status: 'scheduled',
            scheduledFor: { lte: agora },
        },
        include: {
            lead: {
                select: { id: true, name: true, phone: true, email: true },
            },
        },
        orderBy: { scheduledFor: 'asc' },
    });
    logger_1.logger.info('[messages.service.processScheduledMessages] Mensagens agendadas encontradas', {
        requestId,
        total: mensagensAgendadas.length,
    });
    let enfileiradas = 0;
    let erros = 0;
    for (const mensagem of mensagensAgendadas) {
        const msgCtx = { requestId, messageId: mensagem.id, channel: mensagem.channel, leadId: mensagem.leadId };
        logger_1.logger.debug('[messages.service.processScheduledMessages] Processando mensagem agendada...', msgCtx);
        try {
            // BUG 1 FIX: Usar updateMany com where: { id, status: 'scheduled' } para evitar race condition.
            // Se 2 processos rodam simultaneamente, apenas o primeiro atualiza (count > 0) e enfileira.
            const claimResult = await database_1.prisma.message.updateMany({
                where: { id: mensagem.id, status: 'scheduled' },
                data: { status: 'pending' },
            });
            if (claimResult.count === 0) {
                // Outro processo já processou esta mensagem — pular
                logger_1.logger.debug('[messages.service.processScheduledMessages] Mensagem já processada por outro processo — ignorando', msgCtx);
                continue;
            }
            if (mensagem.channel === 'whatsapp') {
                if (!mensagem.lead.phone) {
                    logger_1.logger.warn('[messages.service.processScheduledMessages] Lead sem telefone — marcando como failed', msgCtx);
                    await database_1.prisma.message.update({
                        where: { id: mensagem.id },
                        data: { status: 'failed', error: 'Lead sem número de telefone no momento do envio' },
                    });
                    erros++;
                    continue;
                }
                await queue_1.sendWhatsAppQueue.add(`whatsapp-scheduled-${mensagem.id}`, {
                    messageId: mensagem.id,
                    leadId: mensagem.leadId,
                    phone: mensagem.lead.phone,
                    content: mensagem.content,
                }, { jobId: `whatsapp-sched-${mensagem.id}` });
                logger_1.logger.info('[messages.service.processScheduledMessages] Job WhatsApp enfileirado', {
                    ...msgCtx,
                    phone: mensagem.lead.phone,
                });
            }
            else if (mensagem.channel === 'email') {
                if (!mensagem.lead.email) {
                    logger_1.logger.warn('[messages.service.processScheduledMessages] Lead sem email — marcando como failed', msgCtx);
                    await database_1.prisma.message.update({
                        where: { id: mensagem.id },
                        data: { status: 'failed', error: 'Lead sem endereço de email no momento do envio' },
                    });
                    erros++;
                    continue;
                }
                await queue_1.sendEmailQueue.add(`email-scheduled-${mensagem.id}`, {
                    messageId: mensagem.id,
                    leadId: mensagem.leadId,
                    to: mensagem.lead.email,
                    subject: mensagem.subject ?? `Mensagem para ${mensagem.lead.name}`,
                    content: mensagem.content,
                    // BUG 3 FIX: Incluir htmlContent no payload de email agendado
                    html: mensagem.htmlContent ?? undefined,
                }, { jobId: `email-sched-${mensagem.id}` });
                logger_1.logger.info('[messages.service.processScheduledMessages] Job Email enfileirado', {
                    ...msgCtx,
                    to: mensagem.lead.email,
                });
            }
            else {
                logger_1.logger.warn('[messages.service.processScheduledMessages] Canal desconhecido — ignorando', msgCtx);
                erros++;
                continue;
            }
            enfileiradas++;
        }
        catch (error) {
            const err = error;
            // Distinguir erros de conexão Redis de outros erros para facilitar diagnóstico
            const isRedisError = err.message.includes('ECONNREFUSED') ||
                err.message.includes('Redis') ||
                err.message.includes('ECONN');
            if (isRedisError) {
                logger_1.logger.error('[messages.service.processScheduledMessages] [REDIS] Erro de conexão ao enfileirar mensagem', {
                    ...msgCtx,
                    errorType: err.constructor.name,
                    errorMessage: err.message,
                });
            }
            else {
                logger_1.logger.error('[messages.service.processScheduledMessages] Erro ao enfileirar mensagem', {
                    ...msgCtx,
                    errorType: err.constructor.name,
                    errorMessage: err.message,
                });
            }
            erros++;
        }
    }
    logger_1.logger.info('[messages.service.processScheduledMessages] FIM', {
        requestId,
        enfileiradas,
        erros,
        total: mensagensAgendadas.length,
    });
    return { enfileiradas, erros };
}
//# sourceMappingURL=messages.service.js.map