import { Queue, Worker, QueueEvents } from 'bullmq';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Opções de conexão compartilhadas
// ---------------------------------------------------------------------------

const connection = redis.ioredis as any;

// ---------------------------------------------------------------------------
// Exportar lista de workers registrados (preenchida por initQueues)
// ---------------------------------------------------------------------------

let _workers: Worker[] = [];

export function getWorkers(): Worker[] {
  return _workers;
}

export function registerWorker(worker: Worker): void {
  _workers.push(worker);
}

// ---------------------------------------------------------------------------
// Registro de event listeners (QueueEvents)
// ---------------------------------------------------------------------------

function registerQueueEvents(queueName: string): QueueEvents {
  const events = new QueueEvents(queueName, { connection });

  events.on('completed', ({ jobId, returnvalue }) => {
    logger.info(`[Queue:${queueName}] Job concluído`, {
      jobId,
      returnvalue: returnvalue ?? null,
    });
  });

  events.on('failed', ({ jobId, failedReason }) => {
    logger.error(`[Queue:${queueName}] Job falhou`, {
      jobId,
      failedReason,
    });
  });

  events.on('stalled', ({ jobId }) => {
    logger.warn(`[Queue:${queueName}] Job travado (stalled)`, { jobId });
  });

  events.on('error', (error) => {
    logger.error(`[Queue:${queueName}] Erro no QueueEvents`, {
      errorMessage: (error as Error).message,
    });
  });

  logger.debug(`[Queue] Event listeners registrados para fila: ${queueName}`);

  return events;
}

// ---------------------------------------------------------------------------
// Inicialização das filas
// ---------------------------------------------------------------------------

export function initQueues(): void {
  logger.info('[initQueues] Inicializando filas BullMQ...');

  registerQueueEvents('cleanup');

  logger.info('[initQueues] Filas inicializadas com sucesso', {
    filas: ['cleanup'],
  });
}

/**
 * Graceful shutdown: fecha todos os workers.
 */
export async function closeQueues(): Promise<void> {
  logger.info('[closeQueues] Encerrando workers...');

  await Promise.all(_workers.map((w) => w.close()));

  logger.info('[closeQueues] Workers encerrados');
}
