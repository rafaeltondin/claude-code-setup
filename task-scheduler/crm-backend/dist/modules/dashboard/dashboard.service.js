"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStats = getStats;
exports.invalidateDashboardCache = invalidateDashboardCache;
const database_1 = require("../../config/database");
const redis_1 = require("../../config/redis");
const logger_1 = require("../../utils/logger");
// ---------------------------------------------------------------------------
// Constantes de cache
// ---------------------------------------------------------------------------
const STATS_CACHE_KEY = 'dashboard:stats';
const CACHE_TTL = 120; // 2 minutos
// ---------------------------------------------------------------------------
// Helpers de data
// ---------------------------------------------------------------------------
function inicioMes() {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
}
function fimMes() {
    const d = new Date();
    d.setMonth(d.getMonth() + 1, 1);
    d.setHours(0, 0, 0, 0);
    return d;
}
// ---------------------------------------------------------------------------
// getStats
// ---------------------------------------------------------------------------
async function getStats() {
    logger_1.logger.info('[dashboard.service.getStats] INÍCIO');
    let cached = null;
    try {
        cached = await redis_1.redis.get(STATS_CACHE_KEY);
    }
    catch (redisErr) {
        logger_1.logger.warn('[dashboard.service.getStats] Redis indisponível — ignorando cache', {
            error: redisErr.message,
        });
    }
    if (cached) {
        logger_1.logger.info('[dashboard.service.getStats] Cache HIT');
        return JSON.parse(cached);
    }
    const mesInicio = inicioMes();
    const mesFim = fimMes();
    const [incomeAgg, expenseAgg, totalTasks, pendingTasks, totalNotes] = await Promise.all([
        database_1.prisma.transaction.aggregate({
            _sum: { amount: true },
            where: {
                date: { gte: mesInicio, lt: mesFim },
                category: { type: 'income' },
            },
        }),
        database_1.prisma.transaction.aggregate({
            _sum: { amount: true },
            where: {
                date: { gte: mesInicio, lt: mesFim },
                category: { type: 'expense' },
            },
        }),
        database_1.prisma.personalTask.count(),
        database_1.prisma.personalTask.count({ where: { status: 'pending' } }),
        database_1.prisma.note.count(),
    ]);
    const totalIncome = incomeAgg._sum.amount ?? 0;
    const totalExpense = expenseAgg._sum.amount ?? 0;
    const stats = {
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
        await redis_1.redis.setex(STATS_CACHE_KEY, CACHE_TTL, JSON.stringify(stats));
    }
    catch (redisErr) {
        logger_1.logger.warn('[dashboard.service.getStats] Falha ao salvar cache', {
            error: redisErr.message,
        });
    }
    logger_1.logger.info('[dashboard.service.getStats] FIM', { stats });
    return stats;
}
// ---------------------------------------------------------------------------
// invalidateDashboardCache
// ---------------------------------------------------------------------------
async function invalidateDashboardCache() {
    logger_1.logger.info('[dashboard.service.invalidateDashboardCache] Invalidando cache...');
    await redis_1.redis.del(STATS_CACHE_KEY);
    logger_1.logger.info('[dashboard.service.invalidateDashboardCache] Cache invalidado');
}
//# sourceMappingURL=dashboard.service.js.map