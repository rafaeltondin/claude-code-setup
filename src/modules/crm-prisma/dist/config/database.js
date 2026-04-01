"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.connectDatabase = connectDatabase;
exports.disconnectDatabase = disconnectDatabase;
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
const isProduction = process.env.NODE_ENV === 'production';
exports.prisma = new client_1.PrismaClient({
    log: isProduction
        ? [{ emit: 'event', level: 'error' }]
        : [{ emit: 'event', level: 'query' }, { emit: 'event', level: 'error' }],
});
// Slow query detector — ativo apenas fora de produção
if (!isProduction) {
    exports.prisma.$on('query', (e) => {
        if (e.duration > 500) {
            logger_1.logger.warn('[database] Slow query detectada', {
                duration: `${e.duration}ms`,
                query: e.query,
                params: e.params,
                target: e.target,
            });
        }
        else {
            logger_1.logger.debug('[database] Query executada', {
                duration: `${e.duration}ms`,
                target: e.target,
            });
        }
    });
}
exports.prisma.$on('error', (e) => {
    logger_1.logger.error('[database] Erro Prisma', { message: e.message, target: e.target });
});
async function connectDatabase() {
    logger_1.logger.info('[database] Conectando ao banco de dados...');
    await exports.prisma.$connect();
    logger_1.logger.info('[database] Aplicando PRAGMAs de otimização SQLite...');
    // PRAGMAs com SET retornam resultado no SQLite — usar $queryRawUnsafe
    await exports.prisma.$queryRawUnsafe(`PRAGMA journal_mode = WAL`);
    await exports.prisma.$queryRawUnsafe(`PRAGMA synchronous = NORMAL`);
    await exports.prisma.$queryRawUnsafe(`PRAGMA busy_timeout = 5000`);
    await exports.prisma.$queryRawUnsafe(`PRAGMA cache_size = -64000`);
    logger_1.logger.info('[database] Conectado ao banco de dados com WAL mode ativado', {
        env: process.env.NODE_ENV,
        slowQueryMonitor: process.env.NODE_ENV !== 'production',
    });
}
async function disconnectDatabase() {
    logger_1.logger.info('[database] Encerrando conexão com o banco de dados...');
    await exports.prisma.$disconnect();
    logger_1.logger.info('[database] Conexão encerrada com sucesso');
}
//# sourceMappingURL=database.js.map