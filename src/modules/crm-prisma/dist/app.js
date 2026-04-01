"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const compression_1 = __importDefault(require("compression"));
const path_1 = __importDefault(require("path"));
const errors_1 = require("./utils/errors");
const logger_1 = require("./utils/logger");
const env_1 = require("./config/env");
const database_1 = require("./config/database");
const redis_1 = require("./config/redis");
const auth_routes_1 = require("./modules/auth/auth.routes");
const auth_middleware_1 = require("./modules/auth/auth.middleware");
const settings_routes_1 = require("./modules/settings/settings.routes");
const dashboard_routes_1 = require("./modules/dashboard/dashboard.routes");
const events_controller_1 = require("./modules/events/events.controller");
const calendar_routes_1 = require("./modules/calendar/calendar.routes");
const personal_tasks_routes_1 = require("./modules/personal-tasks/personal-tasks.routes");
const finance_routes_1 = require("./modules/finance/finance.routes");
const notes_routes_1 = require("./modules/notes/notes.routes");
exports.app = (0, express_1.default)();
// ---------------------------------------------------------------------------
// CORS restrito a origens configuradas
// ---------------------------------------------------------------------------
const allowedOrigins = env_1.env.ALLOWED_ORIGINS
    ? env_1.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5000'];
logger_1.logger.info('[app] CORS configurado', { allowedOrigins });
exports.app.use((0, cors_1.default)({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
}));
exports.app.use(express_1.default.json({ limit: '10mb' }));
exports.app.use(express_1.default.urlencoded({ extended: true }));
exports.app.use((0, compression_1.default)({ level: 6, threshold: 1024 }));
// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------
// Limitador global: 200 req/min por IP em qualquer rota /api/
const globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas requisicoes. Aguarde 1 minuto.', code: 'RATE_LIMITED' },
    handler: (req, res) => {
        logger_1.logger.warn('[app] rate limit global atingido', { ip: req.ip, url: req.url });
        res.status(429).json({ error: 'Muitas requisicoes. Aguarde 1 minuto.', code: 'RATE_LIMITED' });
    },
});
// Limitador de autenticacao: 10 tentativas a cada 15 min por IP
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas tentativas. Aguarde 15 minutos.', code: 'AUTH_RATE_LIMITED' },
    handler: (req, res) => {
        logger_1.logger.warn('[app] rate limit de auth atingido', { ip: req.ip });
        res.status(429).json({ error: 'Muitas tentativas. Aguarde 15 minutos.', code: 'AUTH_RATE_LIMITED' });
    },
});
exports.app.use('/api/', globalLimiter);
// ---------------------------------------------------------------------------
// Middleware de logging de requisicoes
exports.app.use((req, _res, next) => {
    logger_1.logger.info('[app] requisicao recebida', {
        method: req.method,
        url: req.url,
        ip: req.ip,
    });
    next();
});
// Servir frontend em producao (estaticos antes das rotas API para performance)
exports.app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
// Health check real — verifica Prisma e Redis
exports.app.get('/api/health', async (_req, res) => {
    const timestamp = new Date().toISOString();
    const uptimeSeconds = process.uptime();
    const memoryMB = {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    };
    const checks = {};
    // Verifica banco de dados (Prisma)
    const dbStart = Date.now();
    try {
        await database_1.prisma.$queryRaw `SELECT 1`;
        checks.db = { status: 'ok', latencyMs: Date.now() - dbStart };
        logger_1.logger.debug('[health] Banco de dados OK', { latencyMs: checks.db.latencyMs });
    }
    catch (err) {
        checks.db = {
            status: 'fail',
            latencyMs: Date.now() - dbStart,
            error: err.message,
        };
        logger_1.logger.error('[health] Banco de dados FALHOU', { error: err.message });
    }
    // Verifica Redis
    const redisStart = Date.now();
    try {
        const pong = await redis_1.redis.ping();
        if (pong !== 'PONG')
            throw new Error(`Resposta inesperada do Redis: ${pong}`);
        checks.redis = { status: 'ok', latencyMs: Date.now() - redisStart };
        logger_1.logger.debug('[health] Redis OK', { latencyMs: checks.redis.latencyMs });
    }
    catch (err) {
        checks.redis = {
            status: 'fail',
            latencyMs: Date.now() - redisStart,
            error: err.message,
        };
        logger_1.logger.error('[health] Redis FALHOU', { error: err.message });
    }
    const allHealthy = Object.values(checks).every((c) => c.status === 'ok');
    const httpStatus = allHealthy ? 200 : 503;
    logger_1.logger.info('[health] Health check concluído', {
        status: allHealthy ? 'ok' : 'degraded',
        httpStatus,
    });
    res.status(httpStatus).json({
        status: allHealthy ? 'ok' : 'degraded',
        timestamp,
        uptime: uptimeSeconds,
        memory: memoryMB,
        checks,
    });
});
// Informacoes da API
exports.app.get('/api', (_req, res) => {
    res.json({ name: 'CRM Prospecção IA', version: '1.0.0' });
});
// ---------------------------------------------------------------------------
// Rotas publicas
// ---------------------------------------------------------------------------
// SSE — Server-Sent Events para notificações real-time do CRM (sem auth: browsers
// abrem EventSource sem cabeçalho Authorization; autenticar via query param se necessário)
exports.app.use('/api/events', events_controller_1.eventsRouter);
// Autenticacao (register e login com rate limit dedicado; logout e me sao protegidos internamente)
exports.app.use('/api/auth', authLimiter, auth_routes_1.authRoutes);
// Calendar disponibilidade (publico — consumido pelo frontend da landing page)
exports.app.use('/api/calendar', calendar_routes_1.calendarRoutes);
// ---------------------------------------------------------------------------
// Rotas protegidas (requerem JWT valido)
// ---------------------------------------------------------------------------
// Configuracoes do sistema
exports.app.use('/api/settings', auth_middleware_1.authMiddleware, settings_routes_1.settingsRoutes);
// Dashboard com KPIs e resumo financeiro
exports.app.use('/api/dashboard', auth_middleware_1.authMiddleware, dashboard_routes_1.dashboardRoutes);
// Tarefas pessoais — CRUD com filtros e stats
exports.app.use('/api/personal-tasks', auth_middleware_1.authMiddleware, personal_tasks_routes_1.personalTasksRoutes);
// Finanças pessoais — transações, categorias, budgets, metas, investimentos
exports.app.use('/api/finance', auth_middleware_1.authMiddleware, finance_routes_1.financeRoutes);
// Notas — com suporte a pins, arquivamento e categorias
exports.app.use('/api/notes', auth_middleware_1.authMiddleware, notes_routes_1.notesRoutes);
// ---------------------------------------------------------------------------
// Error handler — DEVE ficar apos todas as rotas /api mas ANTES do SPA fallback
// para capturar erros das rotas API sem ser interceptado pelo wildcard
// ---------------------------------------------------------------------------
exports.app.use(errors_1.errorHandler);
// ---------------------------------------------------------------------------
// SPA fallback — DEVE ficar por ultimo, apos todas as rotas /api e o errorHandler
// ---------------------------------------------------------------------------
exports.app.get('*', (_req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../public/index.html'));
});
//# sourceMappingURL=app.js.map