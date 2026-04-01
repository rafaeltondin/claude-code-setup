import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { logger } from '../../utils/logger';

// ---------------------------------------------------------------------------
// Tipos de retorno
// ---------------------------------------------------------------------------

export interface DashboardStats {
  financeSummary: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
  };
  totalTasks: number;
  pendingTasks: number;
  totalNotes: number;
}

// ---------------------------------------------------------------------------
// Constantes de cache
// ---------------------------------------------------------------------------

const STATS_CACHE_KEY = 'dashboard:stats';
const CACHE_TTL = 120; // 2 minutos

// ---------------------------------------------------------------------------
// Helpers de data
// ---------------------------------------------------------------------------

function inicioMes(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function fimMes(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ---------------------------------------------------------------------------
// getStats
// ---------------------------------------------------------------------------

export async function getStats(): Promise<DashboardStats> {
  logger.info('[dashboard.service.getStats] INÍCIO');

  let cached: string | null = null;
  try {
    cached = await redis.get(STATS_CACHE_KEY);
  } catch (redisErr) {
    logger.warn('[dashboard.service.getStats] Redis indisponível — ignorando cache', {
      error: (redisErr as Error).message,
    });
  }

  if (cached) {
    logger.info('[dashboard.service.getStats] Cache HIT');
    return JSON.parse(cached) as DashboardStats;
  }

  const mesInicio = inicioMes();
  const mesFim = fimMes();

  const [incomeAgg, expenseAgg, totalTasks, pendingTasks, totalNotes] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        date: { gte: mesInicio, lt: mesFim },
        category: { type: 'income' },
      },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        date: { gte: mesInicio, lt: mesFim },
        category: { type: 'expense' },
      },
    }),
    prisma.personalTask.count(),
    prisma.personalTask.count({ where: { status: 'pending' } }),
    prisma.note.count(),
  ]);

  const totalIncome = incomeAgg._sum.amount ?? 0;
  const totalExpense = expenseAgg._sum.amount ?? 0;

  const stats: DashboardStats = {
    financeSummary: {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    },
    totalTasks,
    pendingTasks,
    totalNotes,
  };

  try {
    await redis.setex(STATS_CACHE_KEY, CACHE_TTL, JSON.stringify(stats));
  } catch (redisErr) {
    logger.warn('[dashboard.service.getStats] Falha ao salvar cache', {
      error: (redisErr as Error).message,
    });
  }

  logger.info('[dashboard.service.getStats] FIM', { stats });

  return stats;
}

// ---------------------------------------------------------------------------
// invalidateDashboardCache
// ---------------------------------------------------------------------------

export async function invalidateDashboardCache(): Promise<void> {
  logger.info('[dashboard.service.invalidateDashboardCache] Invalidando cache...');
  await redis.del(STATS_CACHE_KEY);
  logger.info('[dashboard.service.invalidateDashboardCache] Cache invalidado');
}
