import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import path from 'path';
import { errorHandler } from './utils/errors';
import { logger } from './utils/logger';
import { env } from './config/env';
import { prisma } from './config/database';
import { redis } from './config/redis';
import { authRoutes } from './modules/auth/auth.routes';
import { authMiddleware } from './modules/auth/auth.middleware';
import { settingsRoutes } from './modules/settings/settings.routes';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes';
import { eventsRouter } from './modules/events/events.controller';
import { calendarRoutes } from './modules/calendar/calendar.routes';
import { personalTasksRoutes } from './modules/personal-tasks/personal-tasks.routes';
import { financeRoutes } from './modules/finance/finance.routes';
import { notesRoutes } from './modules/notes/notes.routes';

export const app = express();

// ---------------------------------------------------------------------------
// CORS restrito a origens configuradas
// ---------------------------------------------------------------------------

const allowedOrigins = env.ALLOWED_ORIGINS
  ? env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5000'];

logger.info('[app] CORS configurado', { allowedOrigins });

app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression({ level: 6, threshold: 1024 }));

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

// Limitador global: 200 req/min por IP em qualquer rota /api/
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisicoes. Aguarde 1 minuto.', code: 'RATE_LIMITED' },
  handler: (req: Request, res: Response) => {
    logger.warn('[app] rate limit global atingido', { ip: req.ip, url: req.url });
    res.status(429).json({ error: 'Muitas requisicoes. Aguarde 1 minuto.', code: 'RATE_LIMITED' });
  },
});

// Limitador de autenticacao: 10 tentativas a cada 15 min por IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Aguarde 15 minutos.', code: 'AUTH_RATE_LIMITED' },
  handler: (req: Request, res: Response) => {
    logger.warn('[app] rate limit de auth atingido', { ip: req.ip });
    res.status(429).json({ error: 'Muitas tentativas. Aguarde 15 minutos.', code: 'AUTH_RATE_LIMITED' });
  },
});

app.use('/api/', globalLimiter);

// ---------------------------------------------------------------------------
// Middleware de logging de requisicoes
app.use((req, _res, next) => {
  logger.info('[app] requisicao recebida', {
    method: req.method,
    url: req.url,
    ip: req.ip,
  });
  next();
});

// Servir frontend em producao (estaticos antes das rotas API para performance)
app.use(express.static(path.join(__dirname, '../public')));

// Health check real — verifica Prisma e Redis
app.get('/api/health', async (_req, res) => {
  const timestamp = new Date().toISOString();
  const uptimeSeconds = process.uptime();
  const memoryMB = {
    rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
    heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
  };

  const checks: Record<string, { status: 'ok' | 'fail'; latencyMs?: number; error?: string }> = {};

  // Verifica banco de dados (Prisma)
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = { status: 'ok', latencyMs: Date.now() - dbStart };
    logger.debug('[health] Banco de dados OK', { latencyMs: checks.db.latencyMs });
  } catch (err) {
    checks.db = {
      status: 'fail',
      latencyMs: Date.now() - dbStart,
      error: (err as Error).message,
    };
    logger.error('[health] Banco de dados FALHOU', { error: (err as Error).message });
  }

  // Verifica Redis
  const redisStart = Date.now();
  try {
    const pong = await redis.ping();
    if (pong !== 'PONG') throw new Error(`Resposta inesperada do Redis: ${pong}`);
    checks.redis = { status: 'ok', latencyMs: Date.now() - redisStart };
    logger.debug('[health] Redis OK', { latencyMs: checks.redis.latencyMs });
  } catch (err) {
    checks.redis = {
      status: 'fail',
      latencyMs: Date.now() - redisStart,
      error: (err as Error).message,
    };
    logger.error('[health] Redis FALHOU', { error: (err as Error).message });
  }

  const allHealthy = Object.values(checks).every((c) => c.status === 'ok');
  const httpStatus = allHealthy ? 200 : 503;

  logger.info('[health] Health check concluído', {
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
app.get('/api', (_req, res) => {
  res.json({ name: 'CRM Prospecção IA', version: '1.0.0' });
});

// ---------------------------------------------------------------------------
// Rotas publicas
// ---------------------------------------------------------------------------

// SSE — Server-Sent Events para notificações real-time do CRM (sem auth: browsers
// abrem EventSource sem cabeçalho Authorization; autenticar via query param se necessário)
app.use('/api/events', eventsRouter);

// Autenticacao (register e login com rate limit dedicado; logout e me sao protegidos internamente)
app.use('/api/auth', authLimiter, authRoutes);

// Calendar disponibilidade (publico — consumido pelo frontend da landing page)
app.use('/api/calendar', calendarRoutes);

// ---------------------------------------------------------------------------
// Rotas protegidas (requerem JWT valido)
// ---------------------------------------------------------------------------

// Configuracoes do sistema
app.use('/api/settings', authMiddleware, settingsRoutes);

// Dashboard com KPIs e resumo financeiro
app.use('/api/dashboard', authMiddleware, dashboardRoutes);

// Tarefas pessoais — CRUD com filtros e stats
app.use('/api/personal-tasks', authMiddleware, personalTasksRoutes);

// Finanças pessoais — transações, categorias, budgets, metas, investimentos
app.use('/api/finance', authMiddleware, financeRoutes);

// Notas — com suporte a pins, arquivamento e categorias
app.use('/api/notes', authMiddleware, notesRoutes);

// ---------------------------------------------------------------------------
// Error handler — DEVE ficar apos todas as rotas /api mas ANTES do SPA fallback
// para capturar erros das rotas API sem ser interceptado pelo wildcard
// ---------------------------------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------------------------------
// SPA fallback — DEVE ficar por ultimo, apos todas as rotas /api e o errorHandler
// ---------------------------------------------------------------------------
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});
