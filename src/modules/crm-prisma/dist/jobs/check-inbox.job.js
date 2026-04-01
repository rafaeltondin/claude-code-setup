"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkInboxWorker = void 0;
exports.setupInboxPolling = setupInboxPolling;
const bullmq_1 = require("bullmq");
const redis_1 = require("../config/redis");
const database_1 = require("../config/database");
const logger_1 = require("../utils/logger");
const email_reader_1 = require("../services/email/email.reader");
const messages_service_1 = require("../modules/messages/messages.service");
const queue_1 = require("./queue");
// ---------------------------------------------------------------------------
// Intervalo de polling (5 minutos)
// ---------------------------------------------------------------------------
const POLLING_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos
// ---------------------------------------------------------------------------
// Processador do job
// ---------------------------------------------------------------------------
async function processarVerificacaoCaixa(job) {
    const logCtx = { jobId: job.id, triggeredBy: job.data.triggeredBy ?? 'scheduler' };
    logger_1.logger.info('[check-inbox.job] INÍCIO — Verificando caixa de entrada', logCtx);
    const reader = (0, email_reader_1.getEmailReader)();
    // Garantir conexão IMAP antes de buscar
    logger_1.logger.debug('[check-inbox.job] Buscando novos emails via IMAP...', logCtx);
    const emails = await reader.fetchNewEmails();
    logger_1.logger.info('[check-inbox.job] Emails buscados', {
        ...logCtx,
        total: emails.length,
        comLead: emails.filter((e) => e.matchedLeadId).length,
    });
    let novos = 0;
    for (const email of emails) {
        const fromAddress = email.from?.address;
        logger_1.logger.debug('[check-inbox.job] Processando email recebido', {
            ...logCtx,
            uid: email.uid,
            from: fromAddress,
            subject: email.subject,
            matchedLeadId: email.matchedLeadId,
        });
        // Se não há lead associado, registrar mas não criar Message
        if (!email.matchedLeadId) {
            logger_1.logger.debug('[check-inbox.job] Email sem lead associado — ignorando', {
                ...logCtx,
                from: fromAddress,
                subject: email.subject,
            });
            continue;
        }
        const leadId = email.matchedLeadId;
        // Verificar se já existe Message com esse externalId para evitar duplicata
        const messageIdExterno = email.messageId;
        if (messageIdExterno) {
            const existente = await database_1.prisma.message.findFirst({
                where: {
                    leadId,
                    externalId: messageIdExterno,
                    direction: 'inbound',
                },
                select: { id: true },
            });
            if (existente) {
                logger_1.logger.debug('[check-inbox.job] Email já processado anteriormente', {
                    ...logCtx,
                    messageIdExterno,
                    leadId,
                });
                continue;
            }
        }
        // Criar Message inbound
        const mensagem = await database_1.prisma.message.create({
            data: {
                leadId,
                channel: 'email',
                direction: 'inbound',
                content: email.text ?? email.html ?? '',
                subject: email.subject ?? null,
                htmlContent: email.html ?? null,
                status: 'delivered',
                externalId: email.messageId ?? null,
                sentAt: email.date ?? new Date(),
                deliveredAt: new Date(),
                metadata: JSON.stringify({
                    uid: email.uid,
                    from: email.from,
                    to: email.to,
                    flags: email.flags,
                }),
            },
        });
        logger_1.logger.info('[check-inbox.job] Message inbound criada', {
            ...logCtx,
            messageId: mensagem.id,
            leadId,
            from: fromAddress,
        });
        // Criar Activity de email_received
        await database_1.prisma.activity.create({
            data: {
                leadId,
                type: 'email_received',
                details: JSON.stringify({
                    messageId: mensagem.id,
                    from: fromAddress,
                    subject: email.subject,
                    receivedAt: new Date().toISOString(),
                }),
            },
        });
        logger_1.logger.debug('[check-inbox.job] Activity email_received criada', {
            ...logCtx,
            leadId,
            messageId: mensagem.id,
        });
        novos++;
    }
    logger_1.logger.info('[check-inbox.job] FIM verificação de emails', {
        ...logCtx,
        processados: emails.length,
        novos,
    });
    // Processar mensagens agendadas que já venceram
    logger_1.logger.info('[check-inbox.job] Processando mensagens agendadas vencidas...', logCtx);
    const resultadoAgendadas = await (0, messages_service_1.processScheduledMessages)();
    logger_1.logger.info('[check-inbox.job] Mensagens agendadas processadas', {
        ...logCtx,
        enfileiradas: resultadoAgendadas.enfileiradas,
        erros: resultadoAgendadas.erros,
    });
    logger_1.logger.info('[check-inbox.job] FIM', {
        ...logCtx,
        processados: emails.length,
        novos,
        agendadasEnfileiradas: resultadoAgendadas.enfileiradas,
    });
    return { processados: emails.length, novos };
}
// ---------------------------------------------------------------------------
// Instanciar Worker
// ---------------------------------------------------------------------------
const checkInboxWorker = new bullmq_1.Worker('check-inbox', processarVerificacaoCaixa, {
    connection: redis_1.redis.ioredis,
    concurrency: 1, // Apenas uma verificação por vez
});
exports.checkInboxWorker = checkInboxWorker;
checkInboxWorker.on('failed', (job, error) => {
    logger_1.logger.error('[check-inbox.job] Job falhou', {
        jobId: job?.id,
        errorMessage: error.message,
        errorStack: error.stack,
    });
});
checkInboxWorker.on('error', (error) => {
    logger_1.logger.error('[check-inbox.job] Erro no Worker', {
        errorMessage: error.message,
    });
});
checkInboxWorker.on('active', (job) => {
    logger_1.logger.info('[check-inbox.job] Verificação de caixa iniciada', { jobId: job.id });
});
// Registrar worker para graceful shutdown
(0, queue_1.registerWorker)(checkInboxWorker);
logger_1.logger.info('[check-inbox.job] Worker registrado', { fila: 'check-inbox', concurrency: 1 });
// ---------------------------------------------------------------------------
// Configurar polling automático a cada 5 minutos
// ---------------------------------------------------------------------------
/**
 * Agenda um job repetitivo na checkInboxQueue para verificar a caixa de entrada
 * a cada 5 minutos. Usa BullMQ repeat para garantir persistência no Redis.
 */
async function setupInboxPolling() {
    logger_1.logger.info('[check-inbox.job] Configurando polling automático de inbox...', {
        intervalMs: POLLING_INTERVAL_MS,
        intervalMinutos: POLLING_INTERVAL_MS / 60_000,
    });
    // Remover jobs repetitivos existentes para evitar duplicatas
    const jobsRepetitivos = await queue_1.checkInboxQueue.getRepeatableJobs();
    for (const jobRepetitivo of jobsRepetitivos) {
        if (jobRepetitivo.name === 'check-inbox-polling') {
            await queue_1.checkInboxQueue.removeRepeatableByKey(jobRepetitivo.key);
            logger_1.logger.debug('[check-inbox.job] Job repetitivo antigo removido', {
                key: jobRepetitivo.key,
            });
        }
    }
    // Adicionar job repetitivo novo
    // BUG 18 (análogo): Remover jobId fixo quando usando repeat — BullMQ gerencia internamente
    await queue_1.checkInboxQueue.add('check-inbox-polling', { triggeredBy: 'scheduler' }, {
        repeat: {
            every: POLLING_INTERVAL_MS,
        },
    });
    logger_1.logger.info('[check-inbox.job] Polling configurado com sucesso', {
        intervalMs: POLLING_INTERVAL_MS,
        proximaExecucao: new Date(Date.now() + POLLING_INTERVAL_MS).toISOString(),
    });
}
//# sourceMappingURL=check-inbox.job.js.map