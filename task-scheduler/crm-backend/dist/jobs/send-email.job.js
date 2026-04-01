"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmailWorker = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../config/redis");
const database_1 = require("../config/database");
const logger_1 = require("../utils/logger");
const email_service_1 = require("../services/email/email.service");
const queue_1 = require("./queue");
// ---------------------------------------------------------------------------
// Processador do job
// ---------------------------------------------------------------------------
async function processarEnvioEmail(job) {
    const { messageId, leadId, to, subject, content, html } = job.data;
    const logCtx = { jobId: job.id, messageId, leadId, to, subject };
    logger_1.logger.info('[send-email.job] INÍCIO', logCtx);
    // 1. Buscar a mensagem no banco
    logger_1.logger.debug('[send-email.job] Buscando Message no banco...', logCtx);
    const mensagem = await database_1.prisma.message.findUnique({
        where: { id: messageId },
    });
    if (!mensagem) {
        logger_1.logger.error('[send-email.job] Message não encontrada', logCtx);
        throw new Error(`Message ${messageId} não encontrada no banco`);
    }
    logger_1.logger.debug('[send-email.job] Message encontrada', {
        ...logCtx,
        statusAtual: mensagem.status,
    });
    // Bug 10 Fix: Idempotencia — se a mensagem ja foi enviada em execucao anterior, nao reenviar
    if (mensagem.status === 'sent' ||
        mensagem.status === 'delivered' ||
        mensagem.status === 'read') {
        logger_1.logger.warn('[send-email.job] Mensagem ja enviada — ignorando retry', {
            ...logCtx,
            status: mensagem.status,
            sentAt: mensagem.sentAt?.toISOString() ?? null,
        });
        return { sentAt: mensagem.sentAt?.toISOString() ?? new Date().toISOString() };
    }
    // 2. Atualizar status para 'queued'
    await database_1.prisma.message.update({
        where: { id: messageId },
        data: { status: 'queued' },
    });
    logger_1.logger.debug('[send-email.job] Status atualizado para queued', logCtx);
    // 3. Enviar via Email
    logger_1.logger.info('[send-email.job] Enviando email...', {
        ...logCtx,
        to,
        subject,
        hasHtml: !!html,
    });
    const resultado = await (0, email_service_1.getEmailService)().sendEmail({
        to,
        subject,
        text: content,
        html,
    });
    logger_1.logger.info('[send-email.job] Email enviado com sucesso', {
        ...logCtx,
        externalMessageId: resultado.messageId,
        accepted: resultado.accepted,
        rejected: resultado.rejected,
    });
    // 4. Atualizar mensagem: sent + externalId
    const sentAt = new Date();
    await database_1.prisma.message.update({
        where: { id: messageId },
        data: {
            status: 'sent',
            sentAt,
            externalId: resultado.messageId ?? null,
        },
    });
    logger_1.logger.debug('[send-email.job] Message atualizada para sent', {
        ...logCtx,
        sentAt: sentAt.toISOString(),
        externalMessageId: resultado.messageId,
    });
    // 5. Criar Activity de email_sent
    await database_1.prisma.activity.create({
        data: {
            leadId,
            type: 'email_sent',
            details: JSON.stringify({
                messageId,
                to,
                subject,
                externalId: resultado.messageId ?? null,
                sentAt: sentAt.toISOString(),
                accepted: resultado.accepted,
                rejected: resultado.rejected,
            }),
        },
    });
    logger_1.logger.info('[send-email.job] Activity criada', { ...logCtx, type: 'email_sent' });
    logger_1.logger.info('[send-email.job] FIM - Sucesso', logCtx);
    return { sentAt: sentAt.toISOString() };
}
// ---------------------------------------------------------------------------
// Tratamento de erro para atualizar status no banco
// ---------------------------------------------------------------------------
async function tratarErroPersistente(job, error) {
    const { messageId } = job.data;
    logger_1.logger.error('[send-email.job] Erro persistente — atualizando status para failed', {
        jobId: job.id,
        messageId,
        errorMessage: error.message,
        tentativas: job.attemptsMade,
    });
    try {
        await database_1.prisma.message.update({
            where: { id: messageId },
            data: {
                status: 'failed',
                error: error.message,
            },
        });
    }
    catch (dbError) {
        logger_1.logger.error('[send-email.job] Falha ao atualizar status de erro no banco', {
            messageId,
            dbError: dbError.message,
        });
    }
}
// ---------------------------------------------------------------------------
// Instanciar Worker
// ---------------------------------------------------------------------------
const sendEmailWorker = new bullmq_1.Worker('send-email', processarEnvioEmail, {
    connection: redis_1.redis.ioredis,
    concurrency: 3, // Emails podem ser enviados com maior paralelismo
});
exports.sendEmailWorker = sendEmailWorker;
// Listener de falha final (após todas as tentativas)
sendEmailWorker.on('failed', async (job, error) => {
    if (!job)
        return;
    const esgotouTentativas = job.attemptsMade >= (job.opts.attempts ?? 3);
    logger_1.logger.error('[send-email.job] Job falhou', {
        jobId: job.id,
        messageId: job.data.messageId,
        tentativas: job.attemptsMade,
        maxTentativas: job.opts.attempts,
        esgotouTentativas,
        errorMessage: error.message,
        errorStack: error.stack,
    });
    if (esgotouTentativas) {
        await tratarErroPersistente(job, error);
    }
});
sendEmailWorker.on('error', (error) => {
    logger_1.logger.error('[send-email.job] Erro no Worker', {
        errorMessage: error.message,
        errorStack: error.stack,
    });
});
sendEmailWorker.on('active', (job) => {
    logger_1.logger.info('[send-email.job] Job iniciado', {
        jobId: job.id,
        messageId: job.data.messageId,
        tentativa: job.attemptsMade + 1,
    });
});
// Registrar worker para graceful shutdown
(0, queue_1.registerWorker)(sendEmailWorker);
logger_1.logger.info('[send-email.job] Worker registrado', { fila: 'send-email', concurrency: 3 });
//# sourceMappingURL=send-email.job.js.map