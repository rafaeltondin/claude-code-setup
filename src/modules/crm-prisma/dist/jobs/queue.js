"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWorkers = getWorkers;
exports.registerWorker = registerWorker;
exports.initQueues = initQueues;
exports.closeQueues = closeQueues;
const bullmq_1 = require("bullmq");
const redis_1 = require("../config/redis");
const logger_1 = require("../utils/logger");
// ---------------------------------------------------------------------------
// Opções de conexão compartilhadas
// ---------------------------------------------------------------------------
const connection = redis_1.redis.ioredis;
// ---------------------------------------------------------------------------
// Exportar lista de workers registrados (preenchida por initQueues)
// ---------------------------------------------------------------------------
let _workers = [];
function getWorkers() {
    return _workers;
}
function registerWorker(worker) {
    _workers.push(worker);
}
// ---------------------------------------------------------------------------
// Registro de event listeners (QueueEvents)
// ---------------------------------------------------------------------------
function registerQueueEvents(queueName) {
    const events = new bullmq_1.QueueEvents(queueName, { connection });
    events.on('completed', ({ jobId, returnvalue }) => {
        logger_1.logger.info(`[Queue:${queueName}] Job concluído`, {
            jobId,
            returnvalue: returnvalue ?? null,
        });
    });
    events.on('failed', ({ jobId, failedReason }) => {
        logger_1.logger.error(`[Queue:${queueName}] Job falhou`, {
            jobId,
            failedReason,
        });
    });
    events.on('stalled', ({ jobId }) => {
        logger_1.logger.warn(`[Queue:${queueName}] Job travado (stalled)`, { jobId });
    });
    events.on('error', (error) => {
        logger_1.logger.error(`[Queue:${queueName}] Erro no QueueEvents`, {
            errorMessage: error.message,
        });
    });
    logger_1.logger.debug(`[Queue] Event listeners registrados para fila: ${queueName}`);
    return events;
}
// ---------------------------------------------------------------------------
// Inicialização das filas
// ---------------------------------------------------------------------------
function initQueues() {
    logger_1.logger.info('[initQueues] Inicializando filas BullMQ...');
    registerQueueEvents('cleanup');
    logger_1.logger.info('[initQueues] Filas inicializadas com sucesso', {
        filas: ['cleanup'],
    });
}
/**
 * Graceful shutdown: fecha todos os workers.
 */
async function closeQueues() {
    logger_1.logger.info('[closeQueues] Encerrando workers...');
    await Promise.all(_workers.map((w) => w.close()));
    logger_1.logger.info('[closeQueues] Workers encerrados');
}
//# sourceMappingURL=queue.js.map