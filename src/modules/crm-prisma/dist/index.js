"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = require("./app");
const env_1 = require("./config/env");
const database_1 = require("./config/database");
const redis_1 = require("./config/redis");
const queue_1 = require("./jobs/queue");
const cleanup_job_1 = require("./jobs/cleanup.job");
const logger_1 = require("./utils/logger");
async function bootstrap() {
    try {
        await (0, database_1.connectDatabase)();
        // Inicializar filas BullMQ e event listeners
        (0, queue_1.initQueues)();
        // Configurar job periódico de cleanup (a cada 24h)
        await (0, cleanup_job_1.setupCleanupSchedule)();
        const server = app_1.app.listen(env_1.env.PORT, () => {
            logger_1.logger.info('[bootstrap] Servidor iniciado', {
                porta: env_1.env.PORT,
                env: process.env.NODE_ENV ?? 'development',
                timestamp: new Date().toISOString(),
            });
        });
        // -------------------------------------------------------------------------
        // Graceful Shutdown
        // -------------------------------------------------------------------------
        async function gracefulShutdown(signal) {
            logger_1.logger.info(`[gracefulShutdown] Sinal recebido: ${signal}. Iniciando encerramento gracioso...`);
            // Timeout forçado de 15s para evitar travamento indefinido
            const forceExit = setTimeout(() => {
                logger_1.logger.error('[gracefulShutdown] Timeout de 15s atingido. Forçando saída.');
                process.exit(1);
            }, 15_000);
            forceExit.unref();
            // 1. Parar de aceitar novas conexões HTTP
            logger_1.logger.info('[gracefulShutdown] Fechando servidor HTTP...');
            await new Promise((resolve, reject) => {
                server.close((err) => {
                    if (err) {
                        logger_1.logger.error('[gracefulShutdown] Erro ao fechar servidor HTTP', {
                            errorMessage: err.message,
                        });
                        return reject(err);
                    }
                    logger_1.logger.info('[gracefulShutdown] Servidor HTTP encerrado');
                    resolve();
                });
            });
            // 2. Fechar filas BullMQ e workers
            logger_1.logger.info('[gracefulShutdown] Fechando filas BullMQ...');
            await (0, queue_1.closeQueues)();
            await (0, cleanup_job_1.closeCleanupQueue)();
            logger_1.logger.info('[gracefulShutdown] Filas BullMQ encerradas');
            // 3. Desconectar Prisma
            logger_1.logger.info('[gracefulShutdown] Desconectando Prisma...');
            await (0, database_1.disconnectDatabase)();
            logger_1.logger.info('[gracefulShutdown] Prisma desconectado');
            // 4. Fechar conexão Redis
            logger_1.logger.info('[gracefulShutdown] Fechando conexão Redis...');
            await redis_1.redis.quit();
            logger_1.logger.info('[gracefulShutdown] Redis desconectado');
            logger_1.logger.info('[gracefulShutdown] Encerramento gracioso concluído. Saindo.');
            process.exit(0);
        }
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    }
    catch (error) {
        logger_1.logger.error('[bootstrap] Falha ao iniciar servidor', { error });
        process.exit(1);
    }
}
bootstrap();
//# sourceMappingURL=index.js.map