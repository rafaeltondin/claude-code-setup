import 'dotenv/config';
import { app } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { redis } from './config/redis';
import { closeQueues, initQueues } from './jobs/queue';
import { setupCleanupSchedule, closeCleanupQueue } from './jobs/cleanup.job';
import { logger } from './utils/logger';

async function bootstrap() {
  try {
    await connectDatabase();

    // Inicializar filas BullMQ e event listeners
    initQueues();

    // Configurar job periódico de cleanup (a cada 24h)
    await setupCleanupSchedule();

    const server = app.listen(env.PORT, () => {
      logger.info('[bootstrap] Servidor iniciado', {
        porta: env.PORT,
        env: process.env.NODE_ENV ?? 'development',
        timestamp: new Date().toISOString(),
      });
    });

    // -------------------------------------------------------------------------
    // Graceful Shutdown
    // -------------------------------------------------------------------------

    async function gracefulShutdown(signal: string): Promise<void> {
      logger.info(`[gracefulShutdown] Sinal recebido: ${signal}. Iniciando encerramento gracioso...`);

      // Timeout forçado de 15s para evitar travamento indefinido
      const forceExit = setTimeout(() => {
        logger.error('[gracefulShutdown] Timeout de 15s atingido. Forçando saída.');
        process.exit(1);
      }, 15_000);
      forceExit.unref();

      // 1. Parar de aceitar novas conexões HTTP
      logger.info('[gracefulShutdown] Fechando servidor HTTP...');
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) {
            logger.error('[gracefulShutdown] Erro ao fechar servidor HTTP', {
              errorMessage: err.message,
            });
            return reject(err);
          }
          logger.info('[gracefulShutdown] Servidor HTTP encerrado');
          resolve();
        });
      });

      // 2. Fechar filas BullMQ e workers
      logger.info('[gracefulShutdown] Fechando filas BullMQ...');
      await closeQueues();
      await closeCleanupQueue();
      logger.info('[gracefulShutdown] Filas BullMQ encerradas');

      // 3. Desconectar Prisma
      logger.info('[gracefulShutdown] Desconectando Prisma...');
      await disconnectDatabase();
      logger.info('[gracefulShutdown] Prisma desconectado');

      // 4. Fechar conexão Redis
      logger.info('[gracefulShutdown] Fechando conexão Redis...');
      await redis.quit();
      logger.info('[gracefulShutdown] Redis desconectado');

      logger.info('[gracefulShutdown] Encerramento gracioso concluído. Saindo.');
      process.exit(0);
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('[bootstrap] Falha ao iniciar servidor', { error });
    process.exit(1);
  }
}

bootstrap();
