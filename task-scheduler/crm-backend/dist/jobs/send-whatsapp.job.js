"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWhatsAppWorker = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../config/redis");
const database_1 = require("../config/database");
const logger_1 = require("../utils/logger");
const whatsapp_service_1 = require("../services/whatsapp/whatsapp.service");
const queue_1 = require("./queue");
// ---------------------------------------------------------------------------
// Normalização e validação de telefone
// ---------------------------------------------------------------------------
/**
 * Normaliza número de telefone para formato internacional brasileiro.
 * Remove formatação, adiciona código de país 55 se ausente.
 * Retorna o número limpo ou null se inválido.
 */
function normalizePhone(raw) {
    // Remover tudo que não é dígito
    let digits = raw.replace(/\D/g, '');
    // Se começa com +55 (já veio no raw), o replace removeu o +
    // Se tem 12-13 dígitos e começa com 55, já está ok
    if (digits.length >= 12 && digits.startsWith('55')) {
        // 55 + DDD(2) + número(8-9) = 12-13 dígitos — formato correto
        return digits;
    }
    // Se tem 10-11 dígitos, falta o código de país
    if (digits.length === 10 || digits.length === 11) {
        digits = '55' + digits;
        return digits;
    }
    // Se tem 8-9 dígitos, falta DDD e código de país — inválido para campanha
    if (digits.length < 10) {
        return null;
    }
    // Qualquer outro caso (>13 dígitos) — provavelmente inválido
    if (digits.length > 13) {
        return null;
    }
    return digits;
}
/**
 * Verifica se o número (já normalizado, com 55+DDD+número) é um telefone fixo.
 * Números fixos brasileiros têm 8 dígitos após o DDD (total 12 com 55+DDD).
 * Celulares têm 9 dígitos e começam com 9 após o DDD (total 13 com 55+DDD).
 */
function isLandline(normalized) {
    // Formato: 55 + DD + NNNNNNNN(N)
    // 12 dígitos = fixo (8 dígitos no número local)
    // 13 dígitos = celular (9 dígitos no número local, começa com 9)
    if (normalized.length === 12) {
        return true; // 8 dígitos = fixo
    }
    if (normalized.length === 13) {
        // Celular começa com 9 após o DDD
        const localNumber = normalized.substring(4); // Remove 55+DD
        return !localNumber.startsWith('9');
    }
    return false;
}
// ---------------------------------------------------------------------------
// Processador do job
// ---------------------------------------------------------------------------
async function processarEnvioWhatsApp(job) {
    const { messageId, leadId, phone, content } = job.data;
    const logCtx = { jobId: job.id, messageId, leadId, phone };
    logger_1.logger.info('[send-whatsapp.job] INÍCIO', logCtx);
    // 1. Verificar idempotência — buscar a mensagem no banco
    const mensagem = await database_1.prisma.message.findUnique({
        where: { id: messageId },
    });
    if (!mensagem) {
        logger_1.logger.warn('[send-whatsapp.job] Mensagem nao encontrada — ignorando', logCtx);
        return { sentAt: null };
    }
    // Idempotência: se a mensagem já foi enviada em uma execução anterior, não reenviar
    if (mensagem.status === 'sent' ||
        mensagem.status === 'delivered' ||
        mensagem.status === 'read') {
        logger_1.logger.warn('[send-whatsapp.job] Mensagem ja enviada — ignorando retry', {
            ...logCtx,
            status: mensagem.status,
        });
        return { sentAt: mensagem.sentAt?.toISOString() ?? null };
    }
    // 2. Normalizar e validar telefone
    const phoneNormalized = normalizePhone(phone);
    if (!phoneNormalized) {
        const erro = `Número inválido: "${phone}" — não foi possível normalizar`;
        logger_1.logger.warn('[send-whatsapp.job] ' + erro, logCtx);
        await database_1.prisma.message.update({
            where: { id: messageId },
            data: { status: 'failed', error: erro },
        });
        return { sentAt: null };
    }
    if (isLandline(phoneNormalized)) {
        const erro = `Número fixo detectado: "${phone}" → ${phoneNormalized} — WhatsApp não disponível`;
        logger_1.logger.warn('[send-whatsapp.job] ' + erro, logCtx);
        await database_1.prisma.message.update({
            where: { id: messageId },
            data: { status: 'failed', error: erro },
        });
        return { sentAt: null };
    }
    logger_1.logger.info('[send-whatsapp.job] Telefone normalizado', {
        ...logCtx,
        original: phone,
        normalizado: phoneNormalized,
    });
    // 3. Atualizar status para 'queued'
    await database_1.prisma.message.update({
        where: { id: messageId },
        data: { status: 'queued' },
    });
    // 4. Enviar via WhatsApp (com número normalizado)
    logger_1.logger.info('[send-whatsapp.job] Enviando mensagem WhatsApp...', {
        ...logCtx,
        phone: phoneNormalized,
        contentPreview: content.substring(0, 50),
    });
    const resultado = await (0, whatsapp_service_1.getWhatsAppService)().sendText(phoneNormalized, content);
    logger_1.logger.info('[send-whatsapp.job] Mensagem enviada com sucesso', {
        ...logCtx,
        externalId: resultado.key?.id,
        status: resultado.status,
    });
    // 4. Atualizar mensagem: sent + externalId
    const sentAt = new Date();
    await database_1.prisma.message.update({
        where: { id: messageId },
        data: {
            status: 'sent',
            sentAt,
            externalId: resultado.key?.id ?? null,
        },
    });
    logger_1.logger.debug('[send-whatsapp.job] Message atualizada para sent', {
        ...logCtx,
        sentAt: sentAt.toISOString(),
    });
    // 5. Criar Activity de whatsapp_sent
    await database_1.prisma.activity.create({
        data: {
            leadId,
            type: 'whatsapp_sent',
            details: JSON.stringify({
                messageId,
                phone,
                externalId: resultado.key?.id ?? null,
                sentAt: sentAt.toISOString(),
                contentPreview: content.substring(0, 100),
            }),
        },
    });
    logger_1.logger.info('[send-whatsapp.job] Activity criada', { ...logCtx, type: 'whatsapp_sent' });
    logger_1.logger.info('[send-whatsapp.job] FIM - Sucesso', logCtx);
    return { sentAt: sentAt.toISOString() };
}
// ---------------------------------------------------------------------------
// Tratamento de erro para atualizar status no banco
// ---------------------------------------------------------------------------
async function tratarErroPersistente(job, error) {
    const { messageId } = job.data;
    logger_1.logger.error('[send-whatsapp.job] Erro persistente — atualizando status para failed', {
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
        logger_1.logger.error('[send-whatsapp.job] Falha ao atualizar status de erro no banco', {
            messageId,
            dbError: dbError.message,
        });
    }
}
// ---------------------------------------------------------------------------
// Instanciar Worker
// ---------------------------------------------------------------------------
const sendWhatsAppWorker = new bullmq_1.Worker('send-whatsapp', processarEnvioWhatsApp, {
    connection: redis_1.redis.ioredis,
    concurrency: 1, // Respeitar rate limiting do WhatsApp
});
exports.sendWhatsAppWorker = sendWhatsAppWorker;
// Listener de falha final (após todas as tentativas)
sendWhatsAppWorker.on('failed', async (job, error) => {
    if (!job)
        return;
    const esgotouTentativas = job.attemptsMade >= (job.opts.attempts ?? 3);
    // Detectar erro "exists: false" — número não tem WhatsApp, não adianta retry
    const isNumberNotFound = error.message.includes('"exists":false') ||
        error.message.includes('exists":false');
    if (isNumberNotFound) {
        logger_1.logger.warn('[send-whatsapp.job] Número não existe no WhatsApp — marcando como failed sem retry', {
            jobId: job.id,
            messageId: job.data.messageId,
            phone: job.data.phone,
        });
        // Forçar falha permanente — mover para failed imediatamente
        await tratarErroPersistente(job, new Error(`Número ${job.data.phone} não possui WhatsApp (exists: false)`));
        // Remover job da fila para não tentar novamente
        try {
            await job.moveToFailed(error, job.id ?? '0', true);
        }
        catch { /* já falhou */ }
        return;
    }
    logger_1.logger.error('[send-whatsapp.job] Job falhou', {
        jobId: job.id,
        messageId: job.data.messageId,
        tentativas: job.attemptsMade,
        maxTentativas: job.opts.attempts,
        esgotouTentativas,
        errorMessage: error.message,
    });
    if (esgotouTentativas) {
        await tratarErroPersistente(job, error);
    }
});
sendWhatsAppWorker.on('error', (error) => {
    logger_1.logger.error('[send-whatsapp.job] Erro no Worker', {
        errorMessage: error.message,
        errorStack: error.stack,
    });
});
sendWhatsAppWorker.on('active', (job) => {
    logger_1.logger.info('[send-whatsapp.job] Job iniciado', {
        jobId: job.id,
        messageId: job.data.messageId,
        tentativa: job.attemptsMade + 1,
    });
});
// Registrar worker para graceful shutdown
(0, queue_1.registerWorker)(sendWhatsAppWorker);
logger_1.logger.info('[send-whatsapp.job] Worker registrado', { fila: 'send-whatsapp', concurrency: 1 });
//# sourceMappingURL=send-whatsapp.job.js.map