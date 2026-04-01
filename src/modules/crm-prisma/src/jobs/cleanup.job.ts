import { Worker, Job, Queue } from 'bullmq';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';
import { registerWorker } from './queue';

// ---------------------------------------------------------------------------
// Configurações
// ---------------------------------------------------------------------------

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 horas

// ---------------------------------------------------------------------------
// Tipo do job de cleanup
// ---------------------------------------------------------------------------

export interface CleanupJobData {
  triggeredBy?: string;
}

// ---------------------------------------------------------------------------
// Fila de cleanup
// ---------------------------------------------------------------------------

export const cleanupQueue = new Queue<CleanupJobData>('cleanup', {
  connection: redis.ioredis as any,
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

async function processarCleanup(job: Job<CleanupJobData>): Promise<{ ok: boolean }> {
  const logCtx = { jobId: job.id, triggeredBy: job.data.triggeredBy ?? 'scheduler' };

  logger.info('[cleanup.job] INÍCIO — Cleanup periódico', logCtx);

  // Placeholder — adicionar lógica de limpeza conforme necessário
  logger.info('[cleanup.job] FIM — Cleanup concluído', logCtx);

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Instanciar Worker
// ---------------------------------------------------------------------------

const cleanupWorker = new Worker<CleanupJobData>('cleanup', processarCleanup, {
  connection: redis.ioredis as any,
  concurrency: 1,
});

cleanupWorker.on('failed', (job, error) => {
  logger.error('[cleanup.job] Job falhou', {
    jobId: job?.id,
    errorMessage: error.message,
  });
});

cleanupWorker.on('error', (error) => {
  logger.error('[cleanup.job] Erro no Worker', {
    errorMessage: error.message,
  });
});

registerWorker(cleanupWorker);

logger.info('[cleanup.job] Worker registrado', { fila: 'cleanup', concurrency: 1 });

// ---------------------------------------------------------------------------
// Configurar execução periódica a cada 24 horas
// ---------------------------------------------------------------------------

export async function setupCleanupSchedule(): Promise<void> {
  logger.info('[cleanup.job] Configurando execução periódica do cleanup...');

  const jobsRepetitivos = await cleanupQueue.getRepeatableJobs();

  for (const jobRepetitivo of jobsRepetitivos) {
    if (jobRepetitivo.name === 'cleanup-schedule') {
      await cleanupQueue.removeRepeatableByKey(jobRepetitivo.key);
    }
  }

  await cleanupQueue.add(
    'cleanup-schedule',
    { triggeredBy: 'scheduler' },
    {
      repeat: {
        every: CLEANUP_INTERVAL_MS,
      },
    }
  );

  logger.info('[cleanup.job] Cleanup periódico configurado com sucesso');
}

export async function closeCleanupQueue(): Promise<void> {
  logger.info('[cleanup.job] Fechando fila de cleanup...');
  await cleanupQueue.close();
  logger.info('[cleanup.job] Fila de cleanup fechada');
}

export { cleanupWorker };
