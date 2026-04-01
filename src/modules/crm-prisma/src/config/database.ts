import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const isProduction = process.env.NODE_ENV === 'production';

export const prisma = new PrismaClient({
  log: isProduction
    ? [{ emit: 'event', level: 'error' }]
    : [{ emit: 'event', level: 'query' }, { emit: 'event', level: 'error' }],
});

// Slow query detector — ativo apenas fora de produção
if (!isProduction) {
  prisma.$on('query', (e) => {
    if (e.duration > 500) {
      logger.warn('[database] Slow query detectada', {
        duration: `${e.duration}ms`,
        query: e.query,
        params: e.params,
        target: e.target,
      });
    } else {
      logger.debug('[database] Query executada', {
        duration: `${e.duration}ms`,
        target: e.target,
      });
    }
  });
}

prisma.$on('error', (e) => {
  logger.error('[database] Erro Prisma', { message: e.message, target: e.target });
});

export async function connectDatabase() {
  logger.info('[database] Conectando ao banco de dados...');

  await prisma.$connect();

  logger.info('[database] Aplicando PRAGMAs de otimização SQLite...');

  // PRAGMAs com SET retornam resultado no SQLite — usar $queryRawUnsafe
  await prisma.$queryRawUnsafe(`PRAGMA journal_mode = WAL`);
  await prisma.$queryRawUnsafe(`PRAGMA synchronous = NORMAL`);
  await prisma.$queryRawUnsafe(`PRAGMA busy_timeout = 5000`);
  await prisma.$queryRawUnsafe(`PRAGMA cache_size = -64000`);

  logger.info('[database] Conectado ao banco de dados com WAL mode ativado', {
    env: process.env.NODE_ENV,
    slowQueryMonitor: process.env.NODE_ENV !== 'production',
  });
}

export async function disconnectDatabase() {
  logger.info('[database] Encerrando conexão com o banco de dados...');
  await prisma.$disconnect();
  logger.info('[database] Conexão encerrada com sucesso');
}
