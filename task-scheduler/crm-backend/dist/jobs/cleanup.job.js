"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupWorker = exports.cleanupQueue = void 0;
exports.setupCleanupSchedule = setupCleanupSchedule;
exports.closeCleanupQueue = closeCleanupQueue;
const bullmq_1 = require("bullmq");
const redis_1 = require("../config/redis");
const logger_1 = require("../utils/logger");
const queue_1 = require("./queue");
// ---------------------------------------------------------------------------
// Configurações
// ---------------------------------------------------------------------------
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 horas
// ---------------------------------------------------------------------------
// Fila de cleanup
// ---------------------------------------------------------------------------
exports.cleanupQueue = new bullmq_1.Queue('cleanup', {
    connection: redis_1.redis.ioredis,
    defaultJobOptions: {
        attempts: 2,
        backoff: {
            type: 'fixed',
            delay: 60_000,
        },
        removeOnComplete: { count: 30 },
        removeOnFail: { count: 10 },
    },
});
// ---------------------------------------------------------------------------
// Processador do job de cleanup
// ---------------------------------------------------------------------------
async function processarCleanup(job) {
    const logCtx = { jobId: job.id, triggeredBy: job.data.triggeredBy ?? 'scheduler' };
    logger_1.logger.info('[cleanup.job] INÍCIO — Cleanup periódico', logCtx);
    // Placeholder — adicionar lógica de limpeza conforme necessário
    logger_1.logger.info('[cleanup.job] FIM — Cleanup concluído', logCtx);
    return { ok: true };
}
// ---------------------------------------------------------------------------
// Instanciar Worker
// ---------------------------------------------------------------------------
const cleanupWorker = new bullmq_1.Worker('cleanup', processarCleanup, {
    connection: redis_1.redis.ioredis,
    concurrency: 1,
});
exports.cleanupWorker = cleanupWorker;
cleanupWorker.on('failed', (job, error) => {
    logger_1.logger.error('[cleanup.job] Job falhou', {
        jobId: job?.id,
        errorMessage: error.message,
    });
});
cleanupWorker.on('error', (error) => {
    logger_1.logger.error('[cleanup.job] Erro no Worker', {
        errorMessage: error.message,
    });
});
(0, queue_1.registerWorker)(cleanupWorker);
logger_1.logger.info('[cleanup.job] Worker registrado', { fila: 'cleanup', concurrency: 1 });
// ---------------------------------------------------------------------------
// Configurar execução periódica a cada 24 horas
// ---------------------------------------------------------------------------
async function setupCleanupSchedule() {
    logger_1.logger.info('[cleanup.job] Configurando execução periódica do cleanup...');
    const jobsRepetitivos = await exports.cleanupQueue.getRepeatableJobs();
    for (const jobRepetitivo of jobsRepetitivos) {
        if (jobRepetitivo.name === 'cleanup-schedule') {
            await exports.cleanupQueue.removeRepeatableByKey(jobRepetitivo.key);
        }
    }
    await exports.cleanupQueue.add('cleanup-schedule', { triggeredBy: 'scheduler' }, {
        repeat: {
            every: CLEANUP_INTERVAL_MS,
        },
    });
    logger_1.logger.info('[cleanup.job] Cleanup periódico configurado com sucesso');
}
async function closeCleanupQueue() {
    logger_1.logger.info('[cleanup.job] Fechando fila de cleanup...');
    await exports.cleanupQueue.close();
    logger_1.logger.info('[cleanup.job] Fila de cleanup fechada');
}
//# sourceMappingURL=cleanup.job.js.map