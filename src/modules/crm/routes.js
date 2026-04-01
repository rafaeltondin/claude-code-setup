/**
 * Módulo: CRM — Integração do CRM Prospecção IA (Prisma/TypeScript compilado)
 *
 * Carrega os módulos compilados de crm-prisma/dist/ e monta todas as rotas.
 * Se o CRM não estiver compilado, serve apenas o health check.
 */
const { Router } = require('express');
const path = require('path');
const fs = require('fs');
const { createLogger } = require('../../shared/utils/logger');

const log = createLogger('CRM');
const router = Router();
const CRM_DIR = path.join(__dirname, '..', 'crm-prisma');

// Carregar .env do CRM antes de importar módulos compilados
try {
  require('dotenv').config({ path: path.join(CRM_DIR, '.env'), override: false });
} catch (_) {}

// Health check (sempre disponível)
let crmReady = false;
router.get('/health', (req, res) => {
  res.json({ status: crmReady ? 'ok' : 'not_compiled', timestamp: new Date().toISOString() });
});

router.get('/', (req, res) => {
  res.json({ name: 'CRM Prospecção IA', version: '2.0.0', integrated: true, ready: crmReady });
});

// Carregar módulos CRM compilados
async function init() {
  const distDir = path.join(CRM_DIR, 'dist');
  if (!fs.existsSync(distDir)) {
    log.warn('CRM não compilado — execute: cd src/modules/crm-prisma && npx tsc');
    return;
  }

  try {
    // Configurar DATABASE_URL
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = 'file:' + path.resolve(CRM_DIR, 'data', 'crm.db').replace(/\\/g, '/');
    }

    // Injetar credenciais Google do vault
    try {
      const vault = require('../../shared/credential-vault');
      const env = vault.getEnvVars();
      for (const key of ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN']) {
        if (env[key] && !process.env[key]) process.env[key] = env[key];
      }
    } catch (_) {}

    // Importar módulos CRM
    const crmDb = require(path.join(distDir, 'config', 'database'));
    const { authRoutes } = require(path.join(distDir, 'modules', 'auth', 'auth.routes'));
    const { authMiddleware } = require(path.join(distDir, 'modules', 'auth', 'auth.middleware'));
    const { settingsRoutes } = require(path.join(distDir, 'modules', 'settings', 'settings.routes'));
    const { leadsRoutes } = require(path.join(distDir, 'modules', 'leads', 'leads.routes'));
    const { messagesRoutes } = require(path.join(distDir, 'modules', 'messages', 'messages.routes'));
    const { templatesRoutes } = require(path.join(distDir, 'modules', 'templates', 'templates.routes'));
    const { dashboardRoutes } = require(path.join(distDir, 'modules', 'dashboard', 'dashboard.routes'));

    const campaignsModule = require(path.join(distDir, 'modules', 'campaigns', 'campaigns.routes'));
    const campaignsRoutes = campaignsModule.default || campaignsModule.campaignsRoutes || campaignsModule;

    // Rotas públicas
    router.use('/auth', authRoutes);

    // Módulos opcionais
    const optionalModules = [
      { path: 'services/whatsapp/whatsapp.webhook', mount: '/webhooks/evolution', key: 'whatsappWebhookRouter' },
      { path: 'modules/events/events.controller', mount: '/events', key: 'eventsRouter' },
      { path: 'modules/leads/tags.routes', mount: '/tags', key: 'tagsRoutes', protected: true },
      { path: 'modules/calendar/calendar.routes', mount: '/calendar', key: 'calendarRoutes' },
      { path: 'modules/personal-tasks/personal-tasks.routes', mount: '/personal-tasks', key: 'personalTasksRoutes', protected: true },
      { path: 'modules/finance/finance.routes', mount: '/finance', key: 'financeRoutes', protected: true },
      { path: 'modules/notes/notes.routes', mount: '/notes', key: 'notesRoutes', protected: true },
    ];

    for (const mod of optionalModules) {
      try {
        const m = require(path.join(distDir, mod.path));
        const routerObj = m[mod.key] || m.default;
        if (routerObj) {
          if (mod.protected) {
            router.use(mod.mount, authMiddleware, routerObj);
          } else {
            router.use(mod.mount, routerObj);
          }
          log.info(`CRM módulo carregado: ${mod.mount}`);
        }
      } catch (_) {
        log.debug(`CRM módulo opcional não disponível: ${mod.mount}`);
      }
    }

    // Rotas protegidas principais
    router.use('/settings', authMiddleware, settingsRoutes);
    router.use('/leads', authMiddleware, leadsRoutes);
    router.use('/messages', authMiddleware, messagesRoutes);
    router.use('/templates', authMiddleware, templatesRoutes);
    router.use('/dashboard', authMiddleware, dashboardRoutes);
    router.use('/campaigns', authMiddleware, campaignsRoutes);

    // Error handler CRM
    try {
      const { errorHandler: crmErrorHandler } = require(path.join(distDir, 'utils', 'errors'));
      router.use(crmErrorHandler);
    } catch (_) {}

    // Conectar banco
    await crmDb.connectDatabase();
    crmReady = true;
    log.info('CRM integrado com sucesso');

    // Workers BullMQ (opcional — precisa de Redis)
    try {
      const queueMod = require(path.join(distDir, 'jobs', 'queue'));
      queueMod.initQueues();
      require(path.join(distDir, 'jobs', 'campaign-step.job'));
      require(path.join(distDir, 'jobs', 'send-whatsapp.job'));
      require(path.join(distDir, 'jobs', 'send-email.job'));
      log.info('Workers BullMQ inicializados');
    } catch (err) {
      log.debug('Workers BullMQ não disponíveis (Redis offline?)', { error: err.message });
    }

  } catch (err) {
    log.error('Falha ao integrar CRM', { error: err.message });
  }
}

module.exports = { prefix: '/api/crm', router, init };
