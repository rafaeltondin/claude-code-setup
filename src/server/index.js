/**
 * CLAUDE ECOSYSTEM v2 — Servidor Unificado
 *
 * Porta única (3847) servindo:
 *   - API REST (módulos auto-discovered)
 *   - WebSocket (tempo real)
 *   - Frontend React (static)
 *   - Ferramentas CLI (101+)
 *
 * Para adicionar funcionalidade:
 *   - Novo módulo API → criar pasta em src/modules/<nome>/routes.js
 *   - Nova ferramenta → criar arquivo em src/tools/modules/<nome>.js
 */

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');

// Middleware
const cors = require('./middleware/cors');
const requestLogger = require('./middleware/request-logger');
const cacheControl = require('./middleware/cache-control');
const errorHandler = require('./middleware/error-handler');

// Server components
const websocket = require('./websocket');
const { loadModules } = require('./module-loader');
const { createLogger } = require('../shared/utils/logger');

const log = createLogger('Server');
const PORT = process.env.PORT || 3847;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const PID_FILE = path.join(DATA_DIR, 'server.pid');
const SHUTDOWN_LOCK = path.join(DATA_DIR, 'shutdown.lock');
const SHUTDOWN_STATE_FILE = path.join(DATA_DIR, 'shutdown-state.json');
let isShuttingDown = false;

// ─── Express App ────────────────────────────────────────────────
const app = express();

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Middleware chain
app.use(cors);
app.use(requestLogger);
app.use(cacheControl);

// Static frontend
if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR));
}

// ─── Status endpoint (sempre disponível) ────────────────────────
app.get('/api/status', (req, res) => {
  res.json({
    name: 'Claude Ecosystem',
    version: '2.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    wsClients: websocket.getClientsCount(),
    pid: process.pid,
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
  });
});

// ─── Boot ───────────────────────────────────────────────────────
async function boot() {
  // Garantir pasta data
  const dataDir = path.join(__dirname, '..', '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  // Carregar módulos automaticamente
  const { loaded, errors } = await loadModules(app);

  // SPA fallback — qualquer rota não-API serve o index.html
  const indexHtml = path.join(PUBLIC_DIR, 'index.html');
  if (fs.existsSync(indexHtml)) {
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Rota não encontrada' });
      }
      res.sendFile(indexHtml);
    });
  } else {
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Rota não encontrada' });
      }
      res.status(200).send('<h1>Claude Ecosystem v2</h1><p>Frontend não compilado. Execute: npm run build:frontend</p>');
    });
  }

  // Error handler (deve ser o último)
  app.use(errorHandler);

  // HTTP Server + WebSocket
  const server = http.createServer(app);
  websocket.init(server);

  server.listen(PORT, () => {
    // PID lockfile
    fs.writeFileSync(PID_FILE, String(process.pid));

    log.info(`Servidor iniciado na porta ${PORT}`);
    log.info(`${loaded.length} módulos ativos: ${loaded.map(m => m.name).join(', ')}`);
    if (errors.length > 0) {
      log.warn(`${errors.length} módulos com erro: ${errors.map(e => e.name).join(', ')}`);
    }
    log.info(`Dashboard: http://localhost:${PORT}`);
  });

  // ─── Recuperação de tarefas interrompidas no startup ────────
  try {
    if (fs.existsSync(SHUTDOWN_STATE_FILE)) {
      const state = JSON.parse(fs.readFileSync(SHUTDOWN_STATE_FILE, 'utf8'));
      if (state.interruptedTasks && state.interruptedTasks.length > 0) {
        log.info(`Recuperando ${state.interruptedTasks.length} tarefas interrompidas do shutdown anterior`);
        // Re-enfileirar via storage se disponível
        try {
          const storage = require('../services/storage');
          for (const task of state.interruptedTasks) {
            const existing = storage.getTask(task.id);
            if (existing && existing.status === 'running') {
              storage.updateTask(task.id, { status: 'pending', retryCount: (existing.retryCount || 0) + 1 });
              log.info(`Tarefa ${task.id} re-enfileirada (was: running → pending)`);
            }
          }
        } catch (_) {
          log.warn('Storage não disponível para recuperação de tarefas');
        }
      }
      // Limpar estado de shutdown anterior
      fs.unlinkSync(SHUTDOWN_STATE_FILE);
    }
  } catch (err) {
    log.warn('Erro ao recuperar estado de shutdown', { error: err.message });
  }

  // Limpar shutdown.lock residual de crash anterior
  try { if (fs.existsSync(SHUTDOWN_LOCK)) fs.unlinkSync(SHUTDOWN_LOCK); } catch (_) {}

  // ─── Graceful Shutdown ──────────────────────────────────────
  function shutdown(signal) {
    if (isShuttingDown) return; // Evitar shutdown duplo
    isShuttingDown = true;

    log.info(`${signal} recebido — iniciando graceful shutdown...`);

    // 1. Criar shutdown.lock para que o watchdog não reinicie durante shutdown
    try { fs.writeFileSync(SHUTDOWN_LOCK, JSON.stringify({ signal, pid: process.pid, at: new Date().toISOString() })); } catch (_) {}

    // 2. Salvar estado de tarefas em execução
    try {
      const storage = require('../services/storage');
      const executor = require('../services/executor');
      const runningTasks = executor.getRunningTasks ? executor.getRunningTasks() : [];

      if (runningTasks.length > 0) {
        log.info(`Marcando ${runningTasks.length} tarefas como interrupted`);
        const interruptedTasks = [];
        for (const task of runningTasks) {
          try {
            storage.updateTask(task.id, { status: 'interrupted' });
            interruptedTasks.push({ id: task.id, name: task.name });
          } catch (_) {}
        }
        // Persistir estado para recuperação no próximo startup
        fs.writeFileSync(SHUTDOWN_STATE_FILE, JSON.stringify({
          signal,
          shutdownAt: new Date().toISOString(),
          interruptedTasks
        }, null, 2));
      }
    } catch (err) {
      log.warn('Erro ao salvar estado de tarefas', { error: err.message });
    }

    // 3. Parar scheduler
    try {
      const scheduler = require('../services/scheduler');
      scheduler.stop();
      log.info('Scheduler parado');
    } catch (_) {}

    // 4. Parar Telegram bot
    try {
      const telegramBot = require('../services/telegram-bot');
      telegramBot.stop();
      log.info('Telegram bot parado');
    } catch (_) {}

    // 5. Fechar WebSocket connections
    try {
      websocket.closeAll ? websocket.closeAll() : null;
      log.info('WebSocket connections fechadas');
    } catch (_) {}

    // 6. Fechar servidor HTTP
    server.close(() => {
      // Limpar PID file e shutdown lock
      try { fs.unlinkSync(PID_FILE); } catch (_) {}
      try { fs.unlinkSync(SHUTDOWN_LOCK); } catch (_) {}
      log.info('Servidor encerrado graciosamente');
      process.exit(0);
    });

    // Force kill após 15s
    setTimeout(() => {
      log.error('Shutdown forçado após timeout de 15s');
      try { fs.unlinkSync(PID_FILE); } catch (_) {}
      try { fs.unlinkSync(SHUTDOWN_LOCK); } catch (_) {}
      process.exit(1);
    }, 15000);
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Capturar erros não tratados para shutdown limpo
  process.on('uncaughtException', (err) => {
    log.error('Uncaught Exception — iniciando shutdown', { error: err.message, stack: err.stack });
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    log.error('Unhandled Rejection', { reason: String(reason) });
    // Não fazer shutdown em promise rejections — apenas logar
  });
}

boot().catch(err => {
  log.error('Falha ao iniciar servidor', { error: err.message });
  process.exit(1);
});

module.exports = app;
