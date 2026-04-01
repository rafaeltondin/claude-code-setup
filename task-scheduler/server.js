/**
 * SERVER MODULE - API REST e WebSocket para o Dashboard
 *
 * Fornece endpoints para gerenciamento de tarefas e
 * atualizações em tempo real via WebSocket.
 */

const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const storage = require('./storage');
const scheduler = require('./scheduler');
const executor = require('./executor');
const notifier = require('./notifier');
const telegramBot = require('./telegram-bot');
const credentialVault = require('./credential-vault');
const chromeProfileScanner = require('./chrome-profile-scanner');

const kb = require('../knowledge-base/knowledge-search');
const multer = require('multer');
const pdfParse = require('pdf-parse');

// Multer config for PDF uploads (max 20MB, memory storage)
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Apenas arquivos PDF sao permitidos'), false);
  }
});

const app = express();
const PORT = process.env.PORT || 3847;

// ============ MEMORY DASHBOARD CONFIG ============
const SESSIONS_DIR = path.join(__dirname, '..', 'conversation-memory', 'sessions');
const ACTIVE_SESSION_FILE = path.join(__dirname, '..', 'conversation-memory', 'active-session.json');

const memoryLogger = {
  info: (msg, data = null) => {
    const timestamp = new Date().toISOString();
    console.log(`[MemoryDashboard][${timestamp}] INFO: ${msg}`, data ? JSON.stringify(data) : '');
  },
  error: (msg, error = null) => {
    const timestamp = new Date().toISOString();
    console.error(`[MemoryDashboard][${timestamp}] ERROR: ${msg}`, error?.message || error || '');
  }
};

// ============ MEMORY HELPER FUNCTIONS ============
function ensureSessionsDir() {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    memoryLogger.info('Sessions directory created', { path: SESSIONS_DIR });
  }
}

function readAllSessions() {
  try {
    ensureSessionsDir();
    const files = fs.readdirSync(SESSIONS_DIR)
      .filter(f => f.endsWith('.json') && f.startsWith('session_'));
    const sessions = [];
    for (const file of files) {
      try {
        const filePath = path.join(SESSIONS_DIR, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        sessions.push(data);
      } catch (e) {
        memoryLogger.error(`Error reading session file ${file}`, e);
      }
    }
    return sessions;
  } catch (error) {
    memoryLogger.error('Error reading sessions directory', error);
    return [];
  }
}

function getActiveSessionId() {
  try {
    if (!fs.existsSync(ACTIVE_SESSION_FILE)) return null;
    const data = JSON.parse(fs.readFileSync(ACTIVE_SESSION_FILE, 'utf-8'));
    return data.activeSessionId || null;
  } catch (error) {
    memoryLogger.error('Error reading active session file', error);
    return null;
  }
}

function readSession(sessionId) {
  try {
    const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    memoryLogger.error(`Error reading session ${sessionId}`, error);
    return null;
  }
}

function writeSession(session) {
  try {
    ensureSessionsDir();
    const filePath = path.join(SESSIONS_DIR, `${session.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2));
    memoryLogger.info('Session saved', { id: session.id });
    return true;
  } catch (error) {
    memoryLogger.error('Error writing session', error);
    return false;
  }
}

function setActiveSession(sessionId) {
  try {
    const data = { activeSessionId: sessionId, updatedAt: new Date().toISOString() };
    fs.writeFileSync(ACTIVE_SESSION_FILE, JSON.stringify(data, null, 2));
    memoryLogger.info('Active session set', { id: sessionId });
    return true;
  } catch (error) {
    memoryLogger.error('Error setting active session', error);
    return false;
  }
}

function deleteSessionFile(sessionId) {
  try {
    const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      memoryLogger.info('Session deleted', { id: sessionId });
      return true;
    }
    return false;
  } catch (error) {
    memoryLogger.error(`Error deleting session ${sessionId}`, error);
    return false;
  }
}

// Middleware
app.use(express.json());

// Assets com hash (JS/CSS) podem ser cacheados — index.html nunca
app.use((req, res, next) => {
  if (req.path === '/' || req.path.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`[Server][${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

// ============ CRM PROSPECCAO IA — INTEGRAÇÃO DIRETA ============

// Rate limiter para rotas CRM (express-rate-limit é opcional neste projeto)
let crmLimiter = null;
try {
  const rateLimit = require('express-rate-limit');
  crmLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas requisições CRM. Aguarde 1 minuto.', code: 'CRM_RATE_LIMITED' },
  });
  console.log('[CRM] Rate limiter ativado para /api/crm/*');
} catch (_) {
  console.log('[CRM] express-rate-limit não disponível — rate limiting desativado para rotas CRM');
}

// Configura env vars do CRM antes de importar módulos
const CRM_DIR = path.resolve(__dirname, 'crm-backend');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(CRM_DIR, '.env'), override: false });
// DATABASE_URL: usar .env se definido, senao forcar caminho local absoluto
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:' + path.resolve(CRM_DIR, 'data', 'crm.db').replace(/\\/g, '/');
}

// Injetar credenciais Google do vault no process.env (para Calendar API)
try {
  const vaultEnv = credentialVault.getEnvVars();
  const googleKeys = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN'];
  for (const key of googleKeys) {
    if (vaultEnv[key] && !process.env[key]) {
      process.env[key] = vaultEnv[key];
    }
  }
  console.log('[CRM] Credenciais Google injetadas do vault');
} catch (err) {
  console.log('[CRM] Vault indisponivel para credenciais Google:', err.message);
}

let crmReady = false;

// Importa módulos CRM (compilados em dist/)
try {
  const crmDb = require(path.join(CRM_DIR, 'dist', 'config', 'database'));
  const { authRoutes } = require(path.join(CRM_DIR, 'dist', 'modules', 'auth', 'auth.routes'));
  const { authMiddleware } = require(path.join(CRM_DIR, 'dist', 'modules', 'auth', 'auth.middleware'));
  const { settingsRoutes } = require(path.join(CRM_DIR, 'dist', 'modules', 'settings', 'settings.routes'));
  const { dashboardRoutes } = require(path.join(CRM_DIR, 'dist', 'modules', 'dashboard', 'dashboard.routes'));

  let eventsRouter;
  try {
    const evMod = require(path.join(CRM_DIR, 'dist', 'modules', 'events', 'events.controller'));
    eventsRouter = evMod.eventsRouter;
  } catch (_) {
    console.log('[CRM] Events SSE nao disponivel (dependencia opcional)');
  }

  let calendarRoutes;
  try {
    const calMod = require(path.join(CRM_DIR, 'dist', 'modules', 'calendar', 'calendar.routes'));
    calendarRoutes = calMod.calendarRoutes;
  } catch (e) {
    console.log('[CRM] Calendar nao disponivel:', e.message.split('\n')[0]);
  }

  // Health
  app.get('/api/crm/health', (_req, res) => {
    res.json({ status: crmReady ? 'ok' : 'initializing', timestamp: new Date().toISOString() });
  });

  app.get('/api/crm', (_req, res) => {
    res.json({ name: 'Claude Code Ecosystem', version: '2.0.0', integrated: true });
  });

  // Rotas públicas
  app.use('/api/crm/auth', authRoutes);
  if (eventsRouter) {
    app.use('/api/crm/events', eventsRouter);
  }
  if (calendarRoutes) {
    app.use('/api/crm/calendar', calendarRoutes);
  }

  // Rotas protegidas
  const crmMiddlewares = crmLimiter ? [authMiddleware, crmLimiter] : [authMiddleware];
  app.use('/api/crm/settings', ...crmMiddlewares, settingsRoutes);
  app.use('/api/crm/dashboard', ...crmMiddlewares, dashboardRoutes);

  // Módulos Orbity (personal-tasks, finance, notes)
  try {
    const { personalTasksRoutes } = require(path.join(CRM_DIR, 'dist', 'modules', 'personal-tasks', 'personal-tasks.routes'));
    app.use('/api/crm/personal-tasks', ...crmMiddlewares, personalTasksRoutes);
  } catch (_) {
    console.log('[CRM] Personal Tasks nao disponivel');
  }

  try {
    const { financeRoutes } = require(path.join(CRM_DIR, 'dist', 'modules', 'finance', 'finance.routes'));
    app.use('/api/crm/finance', ...crmMiddlewares, financeRoutes);
  } catch (_) {
    console.log('[CRM] Finance nao disponivel');
  }

  try {
    const { notesRoutes } = require(path.join(CRM_DIR, 'dist', 'modules', 'notes', 'notes.routes'));
    app.use('/api/crm/notes', ...crmMiddlewares, notesRoutes);
  } catch (_) {
    console.log('[CRM] Notes nao disponivel');
  }

  // ─── EVOLUTION API — Proxy routes ─────────────────────────────────────────
  // Rotas diretas para a Evolution API, úteis para agentes e ferramentas.
  // Todas protegidas com authMiddleware do CRM.
  // ────────────────────────────────────────────────────────────────────────────

  const evolutionProxy = express.Router();

  // Helper: obter config da Evolution API
  async function getEvolutionConfig() {
    try {
      const settingsMod = require(path.join(CRM_DIR, 'dist', 'modules', 'settings', 'settings.service'));
      const url = await settingsMod.getSetting('evolution_api_url');
      const apiKey = await settingsMod.getSetting('evolution_api_key');
      const instance = await settingsMod.getSetting('evolution_instance');
      if (!url || !apiKey || !instance) return null;
      return { url: url.replace(/\/$/, ''), apiKey, instance };
    } catch { return null; }
  }

  // Helper: fazer request para Evolution API
  async function evolutionRequest(method, path, apiKey, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
    };
    if (body && method !== 'GET') opts.body = JSON.stringify(body);
    const resp = await fetch(path, opts);
    const text = await resp.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: resp.status, ok: resp.ok, data };
  }

  // POST /api/evolution/send-text — Enviar mensagem de texto
  evolutionProxy.post('/send-text', async (req, res) => {
    try {
      const config = await getEvolutionConfig();
      if (!config) return res.status(503).json({ error: 'Evolution API nao configurada' });
      const { number, text } = req.body;
      if (!number || !text) return res.status(400).json({ error: 'number e text sao obrigatorios' });
      const result = await evolutionRequest('POST', `${config.url}/message/sendText/${config.instance}`, config.apiKey, { number, text });
      res.status(result.status).json(result.data);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/evolution/send-media — Enviar mídia (imagem, vídeo, áudio, documento)
  evolutionProxy.post('/send-media', async (req, res) => {
    try {
      const config = await getEvolutionConfig();
      if (!config) return res.status(503).json({ error: 'Evolution API nao configurada' });
      const { number, mediatype, media, caption, fileName, mimetype } = req.body;
      if (!number || !mediatype || !media) return res.status(400).json({ error: 'number, mediatype e media sao obrigatorios' });
      const payload = { number, mediatype, media, caption, fileName, mimetype };
      const result = await evolutionRequest('POST', `${config.url}/message/sendMedia/${config.instance}`, config.apiKey, payload);
      res.status(result.status).json(result.data);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/evolution/check-numbers — Verificar se números têm WhatsApp
  evolutionProxy.post('/check-numbers', async (req, res) => {
    try {
      const config = await getEvolutionConfig();
      if (!config) return res.status(503).json({ error: 'Evolution API nao configurada' });
      const { numbers } = req.body;
      if (!numbers || !Array.isArray(numbers)) return res.status(400).json({ error: 'numbers (array) e obrigatorio' });
      const result = await evolutionRequest('POST', `${config.url}/chat/whatsappNumbers/${config.instance}`, config.apiKey, { numbers });
      res.status(result.status).json(result.data);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // GET /api/evolution/connection — Estado da conexão da instância
  evolutionProxy.get('/connection', async (req, res) => {
    try {
      const config = await getEvolutionConfig();
      if (!config) return res.status(503).json({ error: 'Evolution API nao configurada' });
      const result = await evolutionRequest('GET', `${config.url}/instance/connectionState/${config.instance}`, config.apiKey);
      res.status(result.status).json(result.data);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/evolution/messages — Buscar mensagens de um chat (POST com where)
  // Body: { where: { key: { remoteJid: "NUM@s.whatsapp.net" } }, limit?: number, page?: number }
  // Atalho: se enviar { remoteJid: "..." } sem where, monta automaticamente
  evolutionProxy.post('/messages', async (req, res) => {
    try {
      const config = await getEvolutionConfig();
      if (!config) return res.status(503).json({ error: 'Evolution API nao configurada' });
      let body = req.body;
      // Atalho: aceitar { remoteJid, limit, page } e montar where
      if (body.remoteJid && !body.where) {
        const { remoteJid, limit, page, ...rest } = body;
        body = { where: { key: { remoteJid } }, limit: limit || 20, page: page || 1, ...rest };
      }
      const result = await evolutionRequest('POST', `${config.url}/chat/findMessages/${config.instance}`, config.apiKey, body);
      res.status(result.status).json(result.data);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // GET /api/evolution/instances — Listar instâncias disponíveis
  evolutionProxy.get('/instances', async (req, res) => {
    try {
      const config = await getEvolutionConfig();
      if (!config) return res.status(503).json({ error: 'Evolution API nao configurada' });
      const result = await evolutionRequest('GET', `${config.url}/instance/fetchInstances`, config.apiKey);
      res.status(result.status).json(result.data);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // GET /api/evolution/profile/:number — Buscar perfil de um número
  evolutionProxy.get('/profile/:number', async (req, res) => {
    try {
      const config = await getEvolutionConfig();
      if (!config) return res.status(503).json({ error: 'Evolution API nao configurada' });
      const number = req.params.number;
      const result = await evolutionRequest('POST', `${config.url}/chat/fetchProfilePictureUrl/${config.instance}`, config.apiKey, { number });
      res.status(result.status).json(result.data);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.use('/api/evolution', authMiddleware, evolutionProxy);
  console.log('[Evolution] Rotas proxy montadas em /api/evolution/*');

  // Error handler do CRM — converte AppError em JSON (deve ficar após todas as rotas /api/crm/*)
  // Usa '/api/crm/' (com barra final) para garantir captura de erros de sub-rotas.
  // O handler precisa de 4 parâmetros (err, req, res, next) para ser reconhecido pelo Express.
  const { errorHandler: crmErrorHandler } = require(path.join(CRM_DIR, 'dist', 'utils', 'errors'));
  app.use('/api/crm/', crmErrorHandler);

  // Conectar banco de dados CRM
  crmDb.connectDatabase()
    .then(async () => {
      crmReady = true;
      console.log('[CRM] Integrado com sucesso — rotas montadas em /api/crm/*');

      // Inicializar workers BullMQ (campaign-step, send-whatsapp, send-email)
      try {
        const queueMod = require(path.join(CRM_DIR, 'dist', 'jobs', 'queue'));
        queueMod.initQueues();
        require(path.join(CRM_DIR, 'dist', 'jobs', 'campaign-step.job'));
        require(path.join(CRM_DIR, 'dist', 'jobs', 'send-whatsapp.job'));
        require(path.join(CRM_DIR, 'dist', 'jobs', 'send-email.job'));
        console.log('[CRM] Workers BullMQ inicializados (campaign-step, send-whatsapp, send-email)');
      } catch (workerErr) {
        console.error('[CRM] Falha ao inicializar workers BullMQ:', workerErr.message);
      }

      // Inicializar servicos (Email, WhatsApp, SSH tunnel) apos banco conectado
      try {
        const settingsMod = require(path.join(CRM_DIR, 'dist', 'modules', 'settings', 'settings.service'));
        const emailMod = require(path.join(CRM_DIR, 'dist', 'services', 'email', 'email.service'));
        const whatsappMod = require(path.join(CRM_DIR, 'dist', 'services', 'whatsapp', 'whatsapp.service'));
        const sshTunnelMod = require(path.join(CRM_DIR, 'dist', 'config', 'ssh-tunnel'));

        // Inicializar SSH tunnel SMTP (ativo quando smtp_host='localhost')
        try {
          await sshTunnelMod.setupSmtpTunnel();
        } catch (tunnelErr) {
          console.warn('[CRM] SSH tunnel SMTP nao disponivel:', tunnelErr.message);
        }

        // Inicializar SSH tunnel IMAP (ativo quando imap_host='localhost')
        try {
          await sshTunnelMod.setupImapTunnel();
        } catch (tunnelErr) {
          console.warn('[CRM] SSH tunnel IMAP nao disponivel:', tunnelErr.message);
        }

        // Inicializar EmailService com credenciais do banco
        const smtpHost = await settingsMod.getSetting('smtp_host');
        const smtpPort = await settingsMod.getSetting('smtp_port');
        const smtpUser = await settingsMod.getSetting('smtp_user');
        const smtpPass = await settingsMod.getSetting('smtp_pass');
        const smtpSecure = await settingsMod.getSetting('smtp_secure');
        const smtpFromName = await settingsMod.getSetting('smtp_from_name');
        const smtpFromEmail = await settingsMod.getSetting('smtp_from_email');

        if (smtpHost && smtpPort && smtpUser && smtpPass) {
          emailMod.initEmailService({
            host: smtpHost,
            port: parseInt(smtpPort, 10),
            secure: smtpSecure === 'true',
            user: smtpUser,
            pass: smtpPass,
            fromName: smtpFromName || undefined,
            fromEmail: smtpFromEmail || undefined,
          });
          console.log('[CRM] EmailService inicializado — SMTP:', smtpHost + ':' + smtpPort);
        } else {
          console.warn('[CRM] EmailService NAO inicializado — configure SMTP em /api/crm/settings');
        }

        // Inicializar WhatsAppService com credenciais do banco
        const evolutionUrl = await settingsMod.getSetting('evolution_api_url');
        const evolutionKey = await settingsMod.getSetting('evolution_api_key');
        const evolutionInstance = await settingsMod.getSetting('evolution_instance');

        if (evolutionUrl && evolutionKey && evolutionInstance) {
          whatsappMod.initWhatsAppService({
            url: evolutionUrl,
            apiKey: evolutionKey,
            instance: evolutionInstance,
          });
          console.log('[CRM] WhatsAppService inicializado — instancia:', evolutionInstance);
        } else {
          console.warn('[CRM] WhatsAppService NAO inicializado — configure Evolution em /api/crm/settings');
        }

        // Inicializar EmailReader (IMAP) para recebimento de emails
        try {
          const imapHost = await settingsMod.getSetting('imap_host');
          const imapPort = await settingsMod.getSetting('imap_port');
          const imapUser = await settingsMod.getSetting('imap_user');
          const imapPass = await settingsMod.getSetting('imap_pass');

          if (imapHost && imapUser && imapPass) {
            const emailReaderMod = require(path.join(CRM_DIR, 'dist', 'services', 'email', 'email.reader'));
            const port = parseInt(imapPort || '993', 10);
            const secure = true;

            // Se via tunnel local, aguardar até o tunnel estar pronto (max 15s)
            const isLocalTunnel = imapHost === 'localhost' || imapHost === '127.0.0.1';
            if (isLocalTunnel) {
              const net = require('net');
              let tunnelReady = false;
              for (let attempt = 0; attempt < 5; attempt++) {
                tunnelReady = await new Promise((resolve) => {
                  const conn = net.createConnection({ host: '127.0.0.1', port, timeout: 3000 });
                  conn.on('connect', () => { conn.end(); resolve(true); });
                  conn.on('timeout', () => { conn.destroy(); resolve(false); });
                  conn.on('error', () => { resolve(false); });
                });
                if (tunnelReady) break;
                console.log('[CRM] Aguardando tunnel IMAP... tentativa ' + (attempt + 1) + '/5');
                await new Promise(r => setTimeout(r, 3000));
              }
              if (!tunnelReady) {
                console.warn('[CRM] Tunnel IMAP nao ficou pronto em 15s — inbox polling tentara reconectar');
              }
            }

            const reader = emailReaderMod.initEmailReader({
              host: imapHost,
              port: port,
              secure: secure,
              user: imapUser,
              pass: imapPass,
              mailbox: 'INBOX',
            });

            await reader.connect();
            console.log('[CRM] EmailReader IMAP conectado —', imapUser, 'via', imapHost + ':' + port);

            // Ativar polling de inbox via BullMQ (a cada 5 minutos)
            try {
              const checkInboxMod = require(path.join(CRM_DIR, 'dist', 'jobs', 'check-inbox.job'));
              await checkInboxMod.setupInboxPolling();
              console.log('[CRM] Inbox polling ativado (a cada 5 minutos)');
            } catch (pollErr) {
              console.warn('[CRM] Inbox polling nao ativado:', pollErr.message);
            }
          } else {
            console.warn('[CRM] EmailReader NAO inicializado — configure IMAP em /api/crm/settings');
          }
        } catch (imapErr) {
          console.warn('[CRM] EmailReader IMAP falhou (nao-critico):', imapErr.message);
        }

      } catch (initErr) {
        console.error('[CRM] Erro ao inicializar servicos:', initErr.message);
      }
    })
    .catch(err => {
      console.error('[CRM] Falha ao conectar banco:', err.message);
    });

} catch (err) {
  console.error('[CRM] Falha ao integrar CRM backend:', err.message);
  // Fallback: retorna erro em qualquer rota CRM
  app.use('/api/crm', (_req, res) => {
    res.status(503).json({ error: 'CRM backend nao disponivel', details: err.message });
  });
}

// ============ API ROUTES ============

// Status do scheduler
app.get('/api/status', (req, res) => {
  try {
    const status = scheduler.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ TASKS ============

// Listar todas as tarefas
app.get('/api/tasks', (req, res) => {
  try {
    const tasks = storage.getTasks();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obter uma tarefa
app.get('/api/tasks/:id', (req, res) => {
  try {
    const task = storage.getTask(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Auto-categorização de tarefas por palavras-chave
function autoCategorizaTask(name = '', prompt = '', description = '') {
  const texto = `${name} ${prompt} ${description}`.toLowerCase();

  const regras = [
    { categoria: 'Ads',       keywords: ['anuncio', 'anúncio', 'ads', 'meta ads', 'facebook ads', 'instagram ads', 'campanha', 'criativos', 'criativo', 'bid', 'cpm', 'cpc', 'roas', 'conjunto de anuncios', 'adset', 'pixel', 'remarketing'] },
    { categoria: 'SEO',       keywords: ['seo', 'search console', 'palavra-chave', 'palavras-chave', 'ranking', 'organico', 'orgânico', 'backlink', 'indexar', 'sitemap', 'meta description', 'title tag', 'serp'] },
    { categoria: 'Marketing', keywords: ['marketing', 'brand', 'marca', 'identidade visual', 'estrategia de marca', 'posicionamento', 'funil', 'lead', 'email marketing', 'newsletter', 'automacao de marketing', 'crm', 'jornada'] },
    { categoria: 'Conteúdo',  keywords: ['conteudo', 'conteúdo', 'blog', 'post', 'artigo', 'redacao', 'redação', 'copy', 'copywriting', 'texto', 'roteiro', 'legenda', 'caption', 'pauta'] },
    { categoria: 'Design',    keywords: ['design', 'figma', 'layout', 'ui ', 'ux ', 'wireframe', 'prototipo', 'protótipo', 'visual', 'logo', 'banner', 'thumbnail', 'identidade visual', 'paleta', 'tipografia'] },
    { categoria: 'DevOps',    keywords: ['docker', 'deploy', 'servidor', 'server', 'ssh', 'ci/cd', 'pipeline', 'nginx', 'litespeed', 'kubernetes', 'container', 'infra', 'easypanel', 'cyberpanel', 'vps', 'cloud'] },
    { categoria: 'Shopify',   keywords: ['shopify', 'loja', 'produto', 'ecommerce', 'e-commerce', 'liquid', 'theme', 'tema', 'checkout', 'pedido', 'estoque', 'klaviyo', 'metafield'] },
    { categoria: 'Código',    keywords: ['codigo', 'código', 'code', 'bug', 'fix', 'refactor', 'api', 'funcao', 'função', 'script', 'node', 'python', 'javascript', 'react', 'implementar', 'desenvolver', 'programar', 'backend', 'frontend', 'database', 'sql', 'endpoint'] },
  ];

  for (const { categoria, keywords } of regras) {
    if (keywords.some(kw => texto.includes(kw))) {
      return categoria;
    }
  }

  return 'Geral';
}

// Criar tarefa
app.post('/api/tasks', async (req, res) => {
  try {
    const task = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'scheduled',
      enabled: true,
      priority: 2,
      successCount: 0,
      failCount: 0,
      ...req.body,
      scheduledAt: req.body.scheduledAt || new Date().toISOString()
    };

    // Always claude_prompt
    task.type = 'claude_prompt';

    // Auto-categorização se não informada
    if (!task.category) {
      task.category = autoCategorizaTask(task.name, task.prompt, task.description);
    }

    // Validações
    if (!task.name) {
      return res.status(400).json({ error: 'Nome da tarefa é obrigatório' });
    }

    const created = storage.addTask(task);

    // Configurar cron se necessário
    if (task.recurring && task.cronExpression) {
      scheduler.setupCronJob(task);
    }

    // Notificar clientes WebSocket
    broadcastUpdate('task:created', created);

    // Se runImmediately, executar a tarefa em background (fire-and-forget)
    if (req.body.runImmediately) {
      // Atualizar status para running antes de retornar
      storage.updateTask(created.id, { status: 'running' });
      created.status = 'running';

      // Executar em background - não bloquear HTTP response
      scheduler.runNow(created.id).catch(execError => {
        console.error(`[Server][${new Date().toISOString()}] ERROR: Execução imediata falhou`, {
          taskId: created.id,
          error: execError.message
        });
      });

      return res.status(201).json(created);
    }

    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Atualizar tarefa
app.put('/api/tasks/:id', (req, res) => {
  try {
    const existing = storage.getTask(req.params.id);
    // Auto-categorizar se a tarefa ainda não tem categoria
    if (!req.body.category && existing && !existing.category) {
      req.body.category = autoCategorizaTask(
        req.body.name || existing.name,
        req.body.prompt || existing.prompt,
        req.body.description || existing.description
      );
    }
    const updated = storage.updateTask(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }

    // Atualizar cron job se necessário
    scheduler.updateCronJob(updated);

    broadcastUpdate('task:updated', updated);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sync de tarefas do Claude Code terminal → Kanban (upsert por claudeTaskId)
app.post('/api/tasks/claude-sync', (req, res) => {
  try {
    const { claudeTaskId, name, description, status = 'pending' } = req.body;

    if (!claudeTaskId) {
      return res.status(400).json({ error: 'claudeTaskId é obrigatório' });
    }

    // Mapeamento de status Claude → Kanban
    const statusMap = {
      pending:     'scheduled',
      in_progress: 'running',
      completed:   'completed',
      deleted:     'cancelled'
    };
    const kanbanStatus = statusMap[status] || 'scheduled';

    // Buscar task existente pelo claudeTaskId
    const existing = storage.getTasks().find(t => t.claudeTaskId === claudeTaskId);

    if (existing) {
      // Atualizar task existente (name opcional na atualização)
      const updates = { status: kanbanStatus, updatedAt: new Date().toISOString() };
      if (name) updates.name = name;
      if (description) updates.description = description;
      const updated = storage.updateTask(existing.id, updates);
      broadcastUpdate('task:updated', updated);
      return res.json(updated);
    }

    // Criar nova task — name é obrigatório apenas na criação
    if (!name) {
      return res.status(400).json({ error: 'name é obrigatório para criar nova task' });
    }

    // Criar nova task
    const task = {
      id: uuidv4(),
      claudeTaskId,
      name,
      description: description || '',
      status: kanbanStatus,
      type: 'claude_code',
      source: 'claude-code',
      enabled: true,
      priority: 2,
      successCount: 0,
      failCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      scheduledAt: new Date().toISOString()
    };

    // Auto-categorização
    task.category = autoCategorizaTask(task.name, '', task.description);

    const created = storage.addTask(task);
    broadcastUpdate('task:created', created);
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Deletar tarefa
app.delete('/api/tasks/:id', (req, res) => {
  try {
    const deleted = storage.deleteTask(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }

    scheduler.removeCronJob(req.params.id);

    broadcastUpdate('task:deleted', { id: req.params.id });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Executar tarefa agora
app.post('/api/tasks/:id/run', async (req, res) => {
  try {
    const taskId = req.params.id;
    const task = storage.getTask(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Tarefa nao encontrada' });
    }

    // Atualizar status para running
    storage.updateTask(taskId, { status: 'running' });

    // Fire and forget - executar em background
    scheduler.runNow(taskId).catch(err => {
      console.error(`[Server] Run task error: ${err.message}`);
    });

    res.json({ success: true, message: 'Tarefa iniciada', taskId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pausar tarefa
app.post('/api/tasks/:id/pause', (req, res) => {
  try {
    scheduler.pauseTask(req.params.id);
    const task = storage.getTask(req.params.id);
    broadcastUpdate('task:updated', task);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Resumir tarefa
app.post('/api/tasks/:id/resume', (req, res) => {
  try {
    scheduler.resumeTask(req.params.id);
    const task = storage.getTask(req.params.id);
    broadcastUpdate('task:updated', task);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ PURGE / CLEANUP ============

// Apagar todas as execuções
app.delete('/api/executions', (req, res) => {
  try {
    storage.purgeExecutions();
    broadcastUpdate('executions:purged', {});
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Apagar todas as tarefas (exceto running)
app.delete('/api/tasks', (req, res) => {
  try {
    const removed = storage.purgeTasks();
    broadcastUpdate('tasks:purged', { removed });
    res.json({ success: true, removed });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ EXECUTIONS ============

// Listar execuções (com filtro opcional por taskId)
app.get('/api/executions', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const taskId = req.query.taskId;

    if (taskId) {
      const executions = storage.getTaskExecutions(taskId, limit);
      return res.json(executions);
    }

    const executions = storage.getExecutions(limit);
    res.json(executions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Execuções de uma tarefa
app.get('/api/tasks/:id/executions', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const executions = storage.getTaskExecutions(req.params.id, limit);
    res.json(executions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Estatísticas de execuções
app.get('/api/executions/stats', (req, res) => {
  try {
    const stats = storage.getExecutionStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Execuções em andamento (para o terminal em tempo real)
app.get('/api/executions/running', (req, res) => {
  try {
    const running = executor.getRunningTasks();
    res.json(running);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancelar execução
app.post('/api/executions/:id/cancel', (req, res) => {
  try {
    const cancelled = executor.cancelExecution(req.params.id);
    if (!cancelled) {
      return res.status(404).json({ error: 'Execução não encontrada ou já finalizada' });
    }

    broadcastUpdate('execution:cancelled', { id: req.params.id });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Resume a Claude session with a follow-up message
app.post('/api/executions/:id/resume', async (req, res) => {
  try {
    const { message } = req.body;
    const executionId = req.params.id;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const execution = storage.getExecution(executionId);
    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    if (!execution.claudeSessionId) {
      return res.status(400).json({ error: 'Execution has no Claude session ID (not a claude_prompt execution)' });
    }

    // Check if already running
    const running = executor.getRunningTasks();
    if (running.some(r => r.executionId === executionId)) {
      return res.status(409).json({ error: 'Execution is already running' });
    }

    // Get working directory from original task
    const task = storage.getTask(execution.taskId);
    const workingDirectory = task?.workingDirectory || process.cwd();

    // Fire and forget - return immediately
    res.json({ success: true, message: 'Resume started' });

    // Start resume in background
    executor.resumeClaudeSession(executionId, message.trim(), workingDirectory)
      .catch(error => {
        console.error(`[Server][${new Date().toISOString()}] ERROR: Resume failed`, {
          executionId,
          error: error.message
        });
      });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ CONFIG ============

// Obter configuração
app.get('/api/config', (req, res) => {
  try {
    const config = storage.getConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Atualizar configuração
app.put('/api/config', (req, res) => {
  try {
    const config = storage.updateConfig(req.body);

    broadcastUpdate('config:updated', config);

    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ NOTIFICATIONS ============

// Obter configuração de notificações
app.get('/api/notifications/config', (req, res) => {
  try {
    const config = storage.getConfig();
    res.json(config.notifications || {
      enabled: false,
      onSuccess: false,
      onFailure: true,
      webhook: null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Atualizar configuração de notificações
app.put('/api/notifications/config', (req, res) => {
  try {
    const currentConfig = storage.getConfig();
    const newNotifConfig = {
      ...currentConfig.notifications,
      ...req.body
    };

    const updatedConfig = storage.updateConfig({
      notifications: newNotifConfig
    });

    console.log(`[Server][${new Date().toISOString()}] INFO: Configuração de notificações atualizada`, {
      enabled: newNotifConfig.enabled,
      onSuccess: newNotifConfig.onSuccess,
      onFailure: newNotifConfig.onFailure,
      webhook: newNotifConfig.webhook ? 'configurado' : 'não configurado'
    });

    broadcastUpdate('notifications:updated', updatedConfig.notifications);

    res.json(updatedConfig.notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enviar notificação de teste
app.post('/api/notifications/test', async (req, res) => {
  try {
    const { webhook } = req.body;

    if (!webhook) {
      return res.status(400).json({ error: 'Webhook URL é obrigatória' });
    }

    console.log(`[Server][${new Date().toISOString()}] INFO: Testando notificação`, {
      webhook
    });

    const result = await notifier.sendTestNotification(webhook);

    if (result.success) {
      res.json({
        success: true,
        message: 'Notificação de teste enviada com sucesso',
        status: result.status,
        response: result.response
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ SCHEDULER CONTROL ============

// Iniciar scheduler
app.post('/api/scheduler/start', (req, res) => {
  try {
    scheduler.start();
    broadcastUpdate('scheduler:started', {});
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Parar scheduler
app.post('/api/scheduler/stop', (req, res) => {
  try {
    scheduler.stop();
    broadcastUpdate('scheduler:stopped', {});
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ UTILITIES ============

// Exportar dados
app.get('/api/export', (req, res) => {
  try {
    const data = storage.exportData();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=task-scheduler-backup.json');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Importar dados
app.post('/api/import', (req, res) => {
  try {
    storage.importData(req.body);
    scheduler.stop();
    scheduler.start();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ MEMORY API ROUTES ============

// List all sessions
app.get('/api/memory/sessions', (req, res) => {
  try {
    const sessions = readAllSessions();
    const activeSessionId = getActiveSessionId();
    const sessionList = sessions.map(s => ({
      id: s.id, createdAt: s.createdAt, updatedAt: s.updatedAt, status: s.status,
      objective: s.context?.objective || null, currentPhase: s.context?.currentPhase || null,
      tasksCount: s.tasks?.length || 0,
      completedTasks: s.tasks?.filter(t => t.status === 'completed').length || 0,
      tasks: (s.tasks || []).map(t => ({ content: t.content || t.description || '', status: t.status || 'pending' })),
      artifactsCount: s.artifacts?.length || 0,
      checkpointsCount: s.checkpoints?.length || 0,
      isActive: s.id === activeSessionId
    }));
    sessionList.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    res.json({ success: true, data: sessionList });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch sessions' });
  }
});

// Get active session
app.get('/api/memory/sessions/active', (req, res) => {
  try {
    const activeSessionId = getActiveSessionId();
    if (!activeSessionId) return res.json({ success: true, data: null });
    const session = readSession(activeSessionId);
    if (!session) return res.status(404).json({ success: false, error: 'Active session file not found' });
    res.json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch active session' });
  }
});

// Get session by ID
app.get('/api/memory/sessions/:id', (req, res) => {
  try {
    const session = readSession(req.params.id);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    res.json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch session' });
  }
});

// Create new session
app.post('/api/memory/sessions', (req, res) => {
  try {
    const { objective, forceActive } = req.body;
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const sessionId = `session_${timestamp}_${random}`;
    const newSession = {
      id: sessionId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      status: 'active',
      context: { objective: objective || null, currentPhase: null, workingDirectory: null, projectType: null, technologies: [] },
      tasks: [],
      actionHistory: [{ timestamp: new Date().toISOString(), type: 'session_created', data: { objective } }],
      artifacts: [], decisions: [], errorsAndSolutions: [], checkpoints: [],
      metadata: { totalInteractions: 0, lastCommand: null, lastKBQuery: null, agentsUsed: [] }
    };
    writeSession(newSession);
    if (forceActive) setActiveSession(sessionId);
    broadcastUpdate('memory:session_created', newSession);
    res.status(201).json({ success: true, data: newSession });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create session' });
  }
});

// Set session objective
app.put('/api/memory/sessions/:id/objective', (req, res) => {
  try {
    const session = readSession(req.params.id);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    session.context.objective = req.body.objective;
    session.updatedAt = new Date().toISOString();
    session.actionHistory.push({ timestamp: new Date().toISOString(), type: 'objective_set', data: { objective: req.body.objective } });
    writeSession(session);
    broadcastUpdate('memory:session_updated', session);
    res.json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to set objective' });
  }
});

// Set session phase
app.put('/api/memory/sessions/:id/phase', (req, res) => {
  try {
    const session = readSession(req.params.id);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    const previousPhase = session.context.currentPhase;
    session.context.currentPhase = req.body.phase;
    session.updatedAt = new Date().toISOString();
    session.actionHistory.push({ timestamp: new Date().toISOString(), type: 'phase_changed', data: { from: previousPhase, to: req.body.phase } });
    writeSession(session);
    broadcastUpdate('memory:session_updated', session);
    res.json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to set phase' });
  }
});

// Sync tasks to session (bulk replace)
app.put('/api/memory/sessions/:id/tasks', (req, res) => {
  try {
    const session = readSession(req.params.id);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    const { tasks } = req.body;
    if (!Array.isArray(tasks)) return res.status(400).json({ success: false, error: 'tasks must be an array' });
    // Sync: update existing tasks by content match, add new ones
    for (const t of tasks) {
      const existing = session.tasks.find(st => st.content === t.content);
      if (existing) {
        existing.status = t.status || existing.status;
        if (t.status === 'completed' && !existing.completedAt) existing.completedAt = new Date().toISOString();
      } else {
        session.tasks.push({
          id: `T${String(session.tasks.length + 1).padStart(3, '0')}`,
          content: t.content || t.description || '',
          status: t.status || 'pending',
          activeForm: t.activeForm || t.content || '',
          createdAt: new Date().toISOString(),
          completedAt: t.status === 'completed' ? new Date().toISOString() : null,
          notes: []
        });
      }
    }
    session.updatedAt = new Date().toISOString();
    writeSession(session);
    broadcastUpdate('memory:tasks_synced', { sessionId: req.params.id, tasksCount: session.tasks.length });
    res.json({ success: true, data: session.tasks });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to sync tasks' });
  }
});

// ---- Active session task endpoints (for hooks, no session ID needed) ----

// Add task to active session
app.post('/api/memory/active/tasks', (req, res) => {
  try {
    const activeSessionId = getActiveSessionId();
    if (!activeSessionId) return res.status(404).json({ success: false, error: 'No active session' });
    const session = readSession(activeSessionId);
    if (!session) return res.status(404).json({ success: false, error: 'Active session file not found' });
    const { content, status, activeForm } = req.body;
    if (!content) return res.status(400).json({ success: false, error: 'content is required' });
    // Avoid duplicates by content match
    const existing = session.tasks.find(t => t.content === content);
    if (existing) {
      if (status) existing.status = status;
      if (status === 'completed' && !existing.completedAt) existing.completedAt = new Date().toISOString();
      session.updatedAt = new Date().toISOString();
      writeSession(session);
      broadcastUpdate('memory:task_updated', { sessionId: activeSessionId, task: existing });
      return res.json({ success: true, data: existing, action: 'updated' });
    }
    const task = {
      id: `T${String(session.tasks.length + 1).padStart(3, '0')}`,
      content, status: status || 'pending',
      activeForm: activeForm || content,
      createdAt: new Date().toISOString(),
      completedAt: status === 'completed' ? new Date().toISOString() : null,
      notes: []
    };
    session.tasks.push(task);
    session.updatedAt = new Date().toISOString();
    writeSession(session);
    broadcastUpdate('memory:task_added', { sessionId: activeSessionId, task });
    res.status(201).json({ success: true, data: task, action: 'created' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to add task to active session' });
  }
});

// Sync/update task in active session (by Claude Code task ID or content match)
app.put('/api/memory/active/tasks/sync', (req, res) => {
  try {
    const activeSessionId = getActiveSessionId();
    if (!activeSessionId) return res.status(404).json({ success: false, error: 'No active session' });
    const session = readSession(activeSessionId);
    if (!session) return res.status(404).json({ success: false, error: 'Active session file not found' });
    const { claudeTaskId, status, content } = req.body;
    // Try to find task by Claude task ID stored in metadata, or by content, or by position
    let task = null;
    if (claudeTaskId) {
      // Try by metadata claudeTaskId
      task = session.tasks.find(t => t.claudeTaskId === claudeTaskId);
      // Try by position (Claude taskIds are "1", "2", etc.)
      if (!task) {
        const idx = parseInt(claudeTaskId) - 1;
        if (idx >= 0 && idx < session.tasks.length) task = session.tasks[idx];
      }
    }
    if (!task && content) {
      task = session.tasks.find(t => t.content === content);
    }
    if (!task) {
      // If we have content, create the task
      if (content) {
        task = {
          id: `T${String(session.tasks.length + 1).padStart(3, '0')}`,
          content, status: status || 'pending',
          activeForm: content,
          claudeTaskId: claudeTaskId || null,
          createdAt: new Date().toISOString(),
          completedAt: status === 'completed' ? new Date().toISOString() : null,
          notes: []
        };
        session.tasks.push(task);
      } else {
        return res.status(404).json({ success: false, error: 'Task not found and no content to create' });
      }
    } else {
      if (status) {
        task.status = status;
        if (status === 'completed' && !task.completedAt) task.completedAt = new Date().toISOString();
      }
      if (content && !task.content) task.content = content;
      if (claudeTaskId) task.claudeTaskId = claudeTaskId;
    }
    session.updatedAt = new Date().toISOString();
    writeSession(session);
    broadcastUpdate('memory:task_updated', { sessionId: activeSessionId, task });
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to sync task' });
  }
});

// Add single task to session
app.post('/api/memory/sessions/:id/tasks', (req, res) => {
  try {
    const session = readSession(req.params.id);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    const { content, status } = req.body;
    if (!content) return res.status(400).json({ success: false, error: 'content is required' });
    const task = {
      id: `T${String(session.tasks.length + 1).padStart(3, '0')}`,
      content, status: status || 'pending',
      activeForm: req.body.activeForm || content,
      createdAt: new Date().toISOString(),
      completedAt: status === 'completed' ? new Date().toISOString() : null,
      notes: []
    };
    session.tasks.push(task);
    session.updatedAt = new Date().toISOString();
    writeSession(session);
    broadcastUpdate('memory:task_added', { sessionId: req.params.id, task });
    res.status(201).json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to add task' });
  }
});

// Update task status in session
app.patch('/api/memory/sessions/:id/tasks/:taskId', (req, res) => {
  try {
    const session = readSession(req.params.id);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    const task = session.tasks.find(t => t.id === req.params.taskId);
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
    if (req.body.status) {
      task.status = req.body.status;
      if (req.body.status === 'completed' && !task.completedAt) task.completedAt = new Date().toISOString();
    }
    if (req.body.content) task.content = req.body.content;
    session.updatedAt = new Date().toISOString();
    writeSession(session);
    broadcastUpdate('memory:task_updated', { sessionId: req.params.id, task });
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update task' });
  }
});

// Create checkpoint
app.post('/api/memory/sessions/:id/checkpoint', (req, res) => {
  try {
    const session = readSession(req.params.id);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    const checkpoint = {
      id: `CP${String(session.checkpoints.length + 1).padStart(3, '0')}`,
      name: req.body.name || `Checkpoint ${session.checkpoints.length + 1}`,
      timestamp: new Date().toISOString(),
      state: {
        context: { ...session.context },
        tasksSnapshot: session.tasks.map(t => ({ ...t })),
        artifactsCount: session.artifacts.length,
        decisionsCount: session.decisions.length
      }
    };
    session.checkpoints.push(checkpoint);
    session.updatedAt = new Date().toISOString();
    writeSession(session);
    broadcastUpdate('memory:checkpoint_created', { sessionId: req.params.id, checkpoint });
    res.status(201).json({ success: true, data: checkpoint });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create checkpoint' });
  }
});

// Finalize session
app.post('/api/memory/sessions/:id/finalize', (req, res) => {
  try {
    const session = readSession(req.params.id);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    session.status = 'completed';
    session.updatedAt = new Date().toISOString();
    session.actionHistory.push({ timestamp: new Date().toISOString(), type: 'session_finalized', data: { summary: req.body.summary } });
    const checkpoint = {
      id: `CP${String(session.checkpoints.length + 1).padStart(3, '0')}`,
      name: 'Final', timestamp: new Date().toISOString(),
      state: { context: { ...session.context }, tasksSnapshot: session.tasks.map(t => ({ ...t })), artifactsCount: session.artifacts.length, decisionsCount: session.decisions.length }
    };
    session.checkpoints.push(checkpoint);
    writeSession(session);
    const activeSessionId = getActiveSessionId();
    if (activeSessionId === req.params.id && fs.existsSync(ACTIVE_SESSION_FILE)) {
      fs.unlinkSync(ACTIVE_SESSION_FILE);
    }
    broadcastUpdate('memory:session_finalized', session);
    res.json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to finalize session' });
  }
});

// Delete session
app.delete('/api/memory/sessions/:id', (req, res) => {
  try {
    const session = readSession(req.params.id);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    const activeSessionId = getActiveSessionId();
    if (activeSessionId === req.params.id) {
      return res.status(400).json({ success: false, error: 'Cannot delete active session. Finalize it first.' });
    }
    deleteSessionFile(req.params.id);
    broadcastUpdate('memory:session_deleted', { id: req.params.id });
    res.json({ success: true, message: 'Session deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete session' });
  }
});

// Purge all sessions (force=true to include active session)
app.delete('/api/memory/sessions', (req, res) => {
  try {
    const sessions = readAllSessions();
    const activeSessionId = getActiveSessionId();
    const force = req.query.force === 'true';
    let removed = 0;

    for (const session of sessions) {
      if (force || session.id !== activeSessionId) {
        deleteSessionFile(session.id);
        removed++;
      }
    }

    // Se force, limpar referência de sessão ativa
    if (force && fs.existsSync(ACTIVE_SESSION_FILE)) {
      try { fs.unlinkSync(ACTIVE_SESSION_FILE); } catch (e) { /* ignore */ }
    }

    memoryLogger.info('Sessions purged', { removed, force, total: sessions.length });
    broadcastUpdate('memory:sessions_purged', { removed });
    res.json({ success: true, removed });
  } catch (error) {
    memoryLogger.error('Failed to purge sessions', error);
    res.status(500).json({ success: false, error: 'Failed to purge sessions' });
  }
});

// ============ MEMORY ENHANCEMENTS - Tags, Favorites, Notes, Search ============

// Add/remove tags on a session
app.put('/api/memory/sessions/:id/tags', (req, res) => {
  try {
    const session = readSession(req.params.id);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    const { tags } = req.body;
    if (!Array.isArray(tags)) return res.status(400).json({ success: false, error: 'tags must be an array' });
    session.tags = tags;
    session.updatedAt = new Date().toISOString();
    writeSession(session);
    broadcastUpdate('memory:session_updated', session);
    res.json({ success: true, data: { tags: session.tags } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update tags' });
  }
});

// Toggle favorite on a session
app.put('/api/memory/sessions/:id/favorite', (req, res) => {
  try {
    const session = readSession(req.params.id);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    session.favorite = !session.favorite;
    session.updatedAt = new Date().toISOString();
    writeSession(session);
    broadcastUpdate('memory:session_updated', session);
    res.json({ success: true, data: { favorite: session.favorite } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to toggle favorite' });
  }
});

// Add/update notes on a session
app.put('/api/memory/sessions/:id/notes', (req, res) => {
  try {
    const session = readSession(req.params.id);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    const { notes } = req.body;
    session.notes = notes || '';
    session.updatedAt = new Date().toISOString();
    writeSession(session);
    broadcastUpdate('memory:session_updated', session);
    res.json({ success: true, data: { notes: session.notes } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update notes' });
  }
});

// Semantic search across all sessions
app.get('/api/memory/search', (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
    const query = q.toLowerCase();
    const sessions = readAllSessions();
    const results = [];

    sessions.forEach(session => {
      let matches = [];
      // Search in objective
      if (session.context?.objective && session.context.objective.toLowerCase().includes(query)) {
        matches.push({ field: 'objective', text: session.context.objective });
      }
      // Search in tasks
      (session.tasks || []).forEach(t => {
        if ((t.content || '').toLowerCase().includes(query)) {
          matches.push({ field: 'task', text: t.content });
        }
      });
      // Search in decisions
      (session.decisions || []).forEach(d => {
        if ((d.decision || '').toLowerCase().includes(query) || (d.rationale || '').toLowerCase().includes(query)) {
          matches.push({ field: 'decision', text: d.decision });
        }
      });
      // Search in action history
      (session.actionHistory || []).forEach(a => {
        const desc = JSON.stringify(a.data || {}).toLowerCase();
        if (desc.includes(query)) {
          matches.push({ field: 'action', text: `${a.type}: ${desc.substring(0, 100)}` });
        }
      });
      // Search in notes
      if (session.notes && session.notes.toLowerCase().includes(query)) {
        matches.push({ field: 'notes', text: session.notes });
      }

      if (matches.length > 0) {
        results.push({
          sessionId: session.id,
          objective: session.context?.objective || 'Sem objetivo',
          status: session.status,
          updatedAt: session.updatedAt,
          matches: matches.slice(0, 5),
          matchCount: matches.length
        });
      }
    });

    results.sort((a, b) => b.matchCount - a.matchCount);
    res.json({ success: true, results, total: results.length });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to search sessions' });
  }
});

// Memory stats
app.get('/api/memory/stats', (req, res) => {
  try {
    const sessions = readAllSessions();
    const activeSessionId = getActiveSessionId();
    const totalSessions = sessions.length;
    const activeSessions = sessions.filter(s => s.status === 'active').length;
    const completedSessions = sessions.filter(s => s.status === 'completed').length;
    let totalInteractions = 0, totalTasks = 0, completedTasks = 0, totalArtifacts = 0, totalCheckpoints = 0;
    const agentsUsed = new Set();
    sessions.forEach(s => {
      totalInteractions += s.metadata?.totalInteractions || 0;
      totalTasks += s.tasks?.length || 0;
      completedTasks += s.tasks?.filter(t => t.status === 'completed').length || 0;
      totalArtifacts += s.artifacts?.length || 0;
      totalCheckpoints += s.checkpoints?.length || 0;
      (s.metadata?.agentsUsed || []).forEach(agent => agentsUsed.add(agent));
    });
    const now = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });
    const sessionsOverTime = last7Days.map(date => ({
      date, count: sessions.filter(s => s.createdAt.startsWith(date)).length
    }));
    res.json({
      success: true,
      data: { totalSessions, activeSessions, completedSessions, totalInteractions, totalTasks, completedTasks, totalArtifacts, totalCheckpoints, agentsUsed: Array.from(agentsUsed), hasActiveSession: activeSessionId !== null, activeSessionId, sessionsOverTime }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
});

// ============ KB USAGE METADATA ============
const KB_METADATA_FILE = path.join(__dirname, 'data', 'kb-metadata.json');

function readKBMetadata() {
  try {
    if (!fs.existsSync(KB_METADATA_FILE)) {
      const dir = path.dirname(KB_METADATA_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(KB_METADATA_FILE, '{}');
      return {};
    }
    return JSON.parse(fs.readFileSync(KB_METADATA_FILE, 'utf-8'));
  } catch { return {}; }
}

function writeKBMetadata(data) {
  try {
    const dir = path.dirname(KB_METADATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(KB_METADATA_FILE, JSON.stringify(data, null, 2));
  } catch (e) { console.error('Error writing KB metadata:', e.message); }
}

// ============ KNOWLEDGE BASE API ============

const kbLogger = {
  info: (msg, data = null) => {
    const timestamp = new Date().toISOString();
    console.log(`[KnowledgeBaseAPI][${timestamp}] INFO: ${msg}`, data ? JSON.stringify(data) : '');
  },
  error: (msg, error = null) => {
    const timestamp = new Date().toISOString();
    console.error(`[KnowledgeBaseAPI][${timestamp}] ERROR: ${msg}`, error?.message || error || '');
  }
};

// List all KB documents
app.get('/api/kb/documents', (req, res) => {
  try {
    kbLogger.info('Listing all KB documents');
    const topics = kb.listTopics();
    res.json({ success: true, documents: topics, total: topics.length });
  } catch (error) {
    kbLogger.error('Error listing documents', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search KB documents
app.get('/api/kb/search', (req, res) => {
  try {
    const { q, category, maxResults } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
    }
    kbLogger.info('Searching KB', { query: q, category });
    const results = kb.search(q, {
      maxResults: parseInt(maxResults) || 10,
      category: category || null,
      includeContent: true,
      snippetSize: 300
    });

    // Track consultations
    const meta = readKBMetadata();
    results.forEach(r => {
      const key = r.filename || r.file || r.title;
      if (key) {
        if (!meta[key]) meta[key] = { consultations: 0, lastConsulted: null, priority: false };
        meta[key].consultations++;
        meta[key].lastConsulted = new Date().toISOString();
      }
    });
    writeKBMetadata(meta);

    res.json({ success: true, results, total: results.length });
  } catch (error) {
    kbLogger.error('Error searching KB', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get KB stats
app.get('/api/kb/stats', (req, res) => {
  try {
    const stats = kb.getStats();
    res.json({ success: true, ...stats });
  } catch (error) {
    kbLogger.error('Error getting KB stats', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get a single document by filename
app.get('/api/kb/documents/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    kbLogger.info('Loading document', { filename });
    const filePath = path.join(kb.KNOWLEDGE_BASE_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const doc = kb.loadDocument(filePath);

    res.json({
      success: true,
      document: {
        filename: filename,
        title: doc ? doc.title : filename,
        metadata: doc ? doc.metadata : {},
        content: rawContent,
        sections: doc ? doc.sections : [],
        lastModified: fs.statSync(filePath).mtime
      }
    });
  } catch (error) {
    kbLogger.error('Error loading document', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a new document
app.post('/api/kb/documents', (req, res) => {
  try {
    const { filename, content } = req.body;
    if (!filename || !content) {
      return res.status(400).json({ success: false, error: 'filename and content are required' });
    }

    const safeName = filename.endsWith('.md') ? filename : `${filename}.md`;
    const filePath = path.join(kb.KNOWLEDGE_BASE_DIR, safeName);

    if (fs.existsSync(filePath)) {
      return res.status(409).json({ success: false, error: 'Document already exists' });
    }

    kbLogger.info('Creating document', { filename: safeName });
    fs.writeFileSync(filePath, content, 'utf-8');
    kb.invalidateCache();

    broadcastUpdate('kb:created', { filename: safeName });
    res.status(201).json({ success: true, filename: safeName });
  } catch (error) {
    kbLogger.error('Error creating document', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Upload PDF and generate KB documentation
app.post('/api/kb/upload-pdf', pdfUpload.single('pdf'), async (req, res) => {
  const startTime = Date.now();
  const requestId = `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  console.log(`[Server][${new Date().toISOString()}] [KB-PDF] [${requestId}] Upload iniciado`);

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Nenhum arquivo PDF enviado' });
    }

    const originalName = req.file.originalname || 'documento.pdf';
    const fileSize = req.file.size;
    const category = req.body.category || 'Documentacao';
    const customTitle = req.body.title || '';

    console.log(`[Server][${new Date().toISOString()}] [KB-PDF] [${requestId}] Processando: ${originalName} (${(fileSize / 1024).toFixed(1)}KB)`);

    // Extract text from PDF
    let pdfData;
    try {
      pdfData = await pdfParse(req.file.buffer);
    } catch (parseError) {
      console.error(`[Server][${new Date().toISOString()}] [KB-PDF] [${requestId}] Erro ao parsear PDF:`, parseError.message);
      return res.status(422).json({ success: false, error: 'Erro ao extrair texto do PDF. O arquivo pode estar corrompido ou protegido.' });
    }

    const extractedText = (pdfData.text || '').trim();
    const numPages = pdfData.numpages || 0;
    const pdfInfo = pdfData.info || {};

    if (!extractedText || extractedText.length < 50) {
      return res.status(422).json({
        success: false,
        error: 'O PDF nao contem texto extraivel suficiente. Pode ser um PDF escaneado (imagem).'
      });
    }

    console.log(`[Server][${new Date().toISOString()}] [KB-PDF] [${requestId}] Extraido: ${extractedText.length} caracteres, ${numPages} paginas`);

    // Generate document title
    const docTitle = customTitle
      || pdfInfo.Title
      || originalName.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');

    // Generate filename
    const safeFilename = docTitle
      .toUpperCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 80);
    const filename = `${safeFilename}.md`;

    // Check if already exists
    const filePath = path.join(kb.KNOWLEDGE_BASE_DIR, filename);
    if (fs.existsSync(filePath)) {
      return res.status(409).json({ success: false, error: `Documento "${filename}" ja existe na Knowledge Base` });
    }

    // Extract tags from content (top words by frequency)
    const wordFreq = {};
    const stopWords = new Set(['de','do','da','dos','das','em','no','na','nos','nas','um','uma','para','com','por','que','se','ou','ao','os','as','e','a','o','the','and','of','to','in','is','for','on','it','with','as','at','be','an']);
    extractedText.toLowerCase().replace(/[^a-z0-9\u00C0-\u024F\s]/g, ' ').split(/\s+/).forEach(w => {
      if (w.length >= 4 && !stopWords.has(w)) wordFreq[w] = (wordFreq[w] || 0) + 1;
    });
    const topTags = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    // Structure the content into sections
    const lines = extractedText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // Try to detect natural sections (lines that look like headings)
    const sections = [];
    let currentSection = { title: 'Conteudo Principal', lines: [] };

    for (const line of lines) {
      // Detect heading-like lines (short, possibly numbered, capitalized)
      const isHeading = (
        line.length < 100
        && line.length > 3
        && (
          /^\d+[\.\)]\s/.test(line)
          || /^[A-Z][A-Z\s]{3,}$/.test(line)
          || /^(capitulo|secao|parte|modulo|topico)\s/i.test(line)
          || /^(CAPITULO|SECAO|PARTE|MODULO|TOPICO)\s/i.test(line)
          || (line === line.toUpperCase() && line.length > 5 && line.length < 80)
        )
      );

      if (isHeading && currentSection.lines.length > 0) {
        sections.push({ ...currentSection });
        currentSection = { title: line, lines: [] };
      } else {
        currentSection.lines.push(line);
      }
    }
    if (currentSection.lines.length > 0) sections.push(currentSection);

    // Build the KB markdown document
    const today = new Date().toISOString().split('T')[0];
    let markdown = `---
title: "${docTitle.replace(/"/g, '\\"')}"
category: "${category}"
tags:
${topTags.map(t => `  - ${t}`).join('\n')}
  - pdf
  - documento importado
topic: "${docTitle}"
priority: medium
version: "1.0.0"
last_updated: "${today}"
source: "PDF Import"
source_file: "${originalName.replace(/"/g, '\\"')}"
source_pages: ${numPages}
---

# ${docTitle}

> **Documento importado automaticamente de PDF**
> Arquivo fonte: \`${originalName}\` | Paginas: ${numPages} | Importado em: ${today}

---

## Indice

${sections.map((s, i) => `${i + 1}. [${s.title}](#${s.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-')})`).join('\n')}

---

`;

    // Add each section
    for (const section of sections) {
      markdown += `## ${section.title}\n\n`;
      // Group lines into paragraphs (split on long gaps or topic changes)
      let paragraph = [];
      for (const line of section.lines) {
        if (line.length === 0) {
          if (paragraph.length > 0) {
            markdown += paragraph.join(' ') + '\n\n';
            paragraph = [];
          }
        } else {
          paragraph.push(line);
        }
      }
      if (paragraph.length > 0) {
        markdown += paragraph.join(' ') + '\n\n';
      }
      markdown += '---\n\n';
    }

    // Add metadata footer
    markdown += `## Metadados do Documento Original

| Campo | Valor |
|-------|-------|
| Arquivo | \`${originalName}\` |
| Paginas | ${numPages} |
| Caracteres extraidos | ${extractedText.length.toLocaleString()} |
| Autor (PDF) | ${pdfInfo.Author || 'Nao informado'} |
| Criador (PDF) | ${pdfInfo.Creator || 'Nao informado'} |
| Data de criacao (PDF) | ${pdfInfo.CreationDate || 'Nao informada'} |
| Importado em | ${new Date().toISOString()} |
`;

    const duration = Date.now() - startTime;
    console.log(`[Server][${new Date().toISOString()}] [KB-PDF] [${requestId}] Documento gerado: ${filename} (${markdown.length} chars) em ${duration}ms`);

    res.json({
      success: true,
      data: {
        filename,
        content: markdown,
        title: docTitle,
        category,
        tags: topTags,
        pages: numPages,
        extractedChars: extractedText.length,
        sections: sections.map(s => s.title),
        duration
      }
    });
  } catch (error) {
    console.error(`[Server][${new Date().toISOString()}] [KB-PDF] [${requestId}] ERRO:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update an existing document
app.put('/api/kb/documents/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ success: false, error: 'content is required' });
    }

    const filePath = path.join(kb.KNOWLEDGE_BASE_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    kbLogger.info('Updating document', { filename });
    fs.writeFileSync(filePath, content, 'utf-8');
    kb.invalidateCache();

    broadcastUpdate('kb:updated', { filename });
    res.json({ success: true, filename });
  } catch (error) {
    kbLogger.error('Error updating document', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a document
app.delete('/api/kb/documents/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(kb.KNOWLEDGE_BASE_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    kbLogger.info('Deleting document', { filename });
    fs.unlinkSync(filePath);
    kb.invalidateCache();

    broadcastUpdate('kb:deleted', { filename });
    res.json({ success: true, filename });
  } catch (error) {
    kbLogger.error('Error deleting document', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get KB document metadata (consultations, priority)
app.get('/api/kb/metadata', (req, res) => {
  try {
    const meta = readKBMetadata();
    res.json({ success: true, metadata: meta });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Toggle priority for a KB document
app.put('/api/kb/metadata/:filename/priority', (req, res) => {
  try {
    const meta = readKBMetadata();
    const key = req.params.filename;
    if (!meta[key]) meta[key] = { consultations: 0, lastConsulted: null, priority: false };
    meta[key].priority = !meta[key].priority;
    writeKBMetadata(meta);
    res.json({ success: true, priority: meta[key].priority });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ CHROME PROFILES ============

app.get('/api/chrome/profiles', (req, res) => {
  const startTime = Date.now();
  console.log(`[Server][${new Date().toISOString()}] [GET /api/chrome/profiles] Scanning Chrome profiles`);

  try {
    const result = chromeProfileScanner.scanChromeProfiles();

    if (!result.success) {
      console.error(`[Server] Erro ao escanear perfis Chrome: ${result.error}`);
      return res.status(500).json({ success: false, error: result.error });
    }

    console.log(`[Server] ${result.totalProfiles} perfis encontrados (${result.profilesWithGoogle} com Google) em ${result.scanDuration}ms`);

    res.json({
      success: true,
      data: {
        totalProfiles: result.totalProfiles,
        profilesWithGoogle: result.profilesWithGoogle,
        userDataDir: result.userDataDir,
        profiles: result.profiles,
        scanDuration: result.scanDuration
      },
      duration: Date.now() - startTime
    });
  } catch (error) {
    console.error(`[Server] Erro inesperado ao escanear perfis: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Salvar/ler perfil Chrome preferido na config
app.get('/api/chrome/selected-profile', (req, res) => {
  try {
    const configPath = path.join(__dirname, 'data', 'chrome-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      res.json({ success: true, data: config });
    } else {
      res.json({ success: true, data: { selectedProfile: null } });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/chrome/selected-profile', (req, res) => {
  try {
    const { selectedProfile, profileName, googleEmail } = req.body;
    const configPath = path.join(__dirname, 'data', 'chrome-config.json');
    const config = { selectedProfile, profileName, googleEmail, updatedAt: new Date().toISOString() };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    console.log(`[Server] Perfil Chrome selecionado: ${selectedProfile} (${googleEmail || profileName})`);
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ INTEGRATIONS ============

app.get('/api/integrations/status', async (req, res) => {
  const startTime = Date.now();
  console.log(`[Server][${new Date().toISOString()}] [GET /api/integrations/status] Checking integrations`);

  try {
    const result = {
      devToolsMcp: { installed: false, details: {} },
      desktopCommander: { installed: false, details: {} },
      sequentialThinking: { installed: false, details: {} },
      playwright: { installed: false, details: {} },
      memory: { installed: false, details: {} },
      context7: { installed: false, details: {} },
      fetch: { installed: false, details: {} }
    };

    // Check all MCPs in all possible config locations
    try {
      const homeDir = process.env.USERPROFILE || process.env.HOME;

      // 1. Check ~/.claude.json (claude mcp add saves here per-project)
      const claudeJsonPath = path.join(homeDir, '.claude.json');
      if (fs.existsSync(claudeJsonPath)) {
        try {
          const claudeJson = JSON.parse(fs.readFileSync(claudeJsonPath, 'utf-8'));
          const projects = claudeJson.projects || {};
          for (const [projectPath, projectConfig] of Object.entries(projects)) {
            const mcpServers = projectConfig.mcpServers || {};

            if (!result.devToolsMcp.installed && mcpServers['chrome-devtools']) {
              result.devToolsMcp.installed = true;
              result.devToolsMcp.details.config = mcpServers['chrome-devtools'];
              result.devToolsMcp.details.source = `.claude.json (${projectPath})`;
            }

            if (!result.desktopCommander.installed && mcpServers['desktop-commander']) {
              result.desktopCommander.installed = true;
              result.desktopCommander.details.config = mcpServers['desktop-commander'];
              result.desktopCommander.details.source = `.claude.json (${projectPath})`;
            }

            if (!result.sequentialThinking.installed && mcpServers['sequential-thinking']) {
              result.sequentialThinking.installed = true;
              result.sequentialThinking.details.config = mcpServers['sequential-thinking'];
              result.sequentialThinking.details.source = `.claude.json (${projectPath})`;
            }

            if (!result.playwright.installed && mcpServers['playwright']) {
              result.playwright.installed = true;
              result.playwright.details.config = mcpServers['playwright'];
              result.playwright.details.source = `.claude.json (${projectPath})`;
            }

            if (!result.memory.installed && mcpServers['memory']) {
              result.memory.installed = true;
              result.memory.details.config = mcpServers['memory'];
              result.memory.details.source = `.claude.json (${projectPath})`;
            }

            if (!result.context7.installed && mcpServers['context7']) {
              result.context7.installed = true;
              result.context7.details.config = mcpServers['context7'];
              result.context7.details.source = `.claude.json (${projectPath})`;
            }

            if (!result.fetch.installed && mcpServers['fetch']) {
              result.fetch.installed = true;
              result.fetch.details.config = mcpServers['fetch'];
              result.fetch.details.source = `.claude.json (${projectPath})`;
            }
          }
        } catch (e) { /* ignore parse errors */ }
      }

      // 2. Check ~/.claude/config/mcp.json
      const mcpConfigPath = path.join(homeDir, '.claude', 'config', 'mcp.json');
      if (fs.existsSync(mcpConfigPath)) {
        try {
          const mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf-8'));
          const mcpServers = mcpConfig.mcpServers || {};

          if (!result.devToolsMcp.installed && mcpServers['chrome-devtools']) {
            result.devToolsMcp.installed = true;
            result.devToolsMcp.details.config = mcpServers['chrome-devtools'];
            result.devToolsMcp.details.source = 'config/mcp.json';
          }

          if (!result.desktopCommander.installed && mcpServers['desktop-commander']) {
            result.desktopCommander.installed = true;
            result.desktopCommander.details.config = mcpServers['desktop-commander'];
            result.desktopCommander.details.source = 'config/mcp.json';
          }

          if (!result.sequentialThinking.installed && mcpServers['sequential-thinking']) {
            result.sequentialThinking.installed = true;
            result.sequentialThinking.details.config = mcpServers['sequential-thinking'];
            result.sequentialThinking.details.source = 'config/mcp.json';
          }

          if (!result.playwright.installed && mcpServers['playwright']) {
            result.playwright.installed = true;
            result.playwright.details.config = mcpServers['playwright'];
            result.playwright.details.source = 'config/mcp.json';
          }

          if (!result.memory.installed && mcpServers['memory']) {
            result.memory.installed = true;
            result.memory.details.config = mcpServers['memory'];
            result.memory.details.source = 'config/mcp.json';
          }

          if (!result.context7.installed && mcpServers['context7']) {
            result.context7.installed = true;
            result.context7.details.config = mcpServers['context7'];
            result.context7.details.source = 'config/mcp.json';
          }

          if (!result.fetch.installed && mcpServers['fetch']) {
            result.fetch.installed = true;
            result.fetch.details.config = mcpServers['fetch'];
            result.fetch.details.source = 'config/mcp.json';
          }
        } catch (e) { /* ignore parse errors */ }
      }

      // 3. Check ~/.claude/settings.json
      const settingsPath = path.join(homeDir, '.claude', 'settings.json');
      if (fs.existsSync(settingsPath)) {
        try {
          const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
          const mcpServers = settings.mcpServers || {};

          if (!result.devToolsMcp.installed && mcpServers['chrome-devtools']) {
            result.devToolsMcp.installed = true;
            result.devToolsMcp.details.config = mcpServers['chrome-devtools'];
            result.devToolsMcp.details.source = 'settings.json';
          }

          if (!result.desktopCommander.installed && mcpServers['desktop-commander']) {
            result.desktopCommander.installed = true;
            result.desktopCommander.details.config = mcpServers['desktop-commander'];
            result.desktopCommander.details.source = 'settings.json';
          }

          if (!result.sequentialThinking.installed && mcpServers['sequential-thinking']) {
            result.sequentialThinking.installed = true;
            result.sequentialThinking.details.config = mcpServers['sequential-thinking'];
            result.sequentialThinking.details.source = 'settings.json';
          }

          if (!result.playwright.installed && mcpServers['playwright']) {
            result.playwright.installed = true;
            result.playwright.details.config = mcpServers['playwright'];
            result.playwright.details.source = 'settings.json';
          }

          if (!result.memory.installed && mcpServers['memory']) {
            result.memory.installed = true;
            result.memory.details.config = mcpServers['memory'];
            result.memory.details.source = 'settings.json';
          }

          if (!result.context7.installed && mcpServers['context7']) {
            result.context7.installed = true;
            result.context7.details.config = mcpServers['context7'];
            result.context7.details.source = 'settings.json';
          }

          if (!result.fetch.installed && mcpServers['fetch']) {
            result.fetch.installed = true;
            result.fetch.details.config = mcpServers['fetch'];
            result.fetch.details.source = 'settings.json';
          }
        } catch (e) { /* ignore parse errors */ }
      }

      // 4. Check ~/.claude/settings.local.json
      const settingsLocalPath = path.join(homeDir, '.claude', 'settings.local.json');
      if (fs.existsSync(settingsLocalPath)) {
        try {
          const settingsLocal = JSON.parse(fs.readFileSync(settingsLocalPath, 'utf-8'));
          const mcpServers = settingsLocal.mcpServers || {};

          if (!result.devToolsMcp.installed && mcpServers['chrome-devtools']) {
            result.devToolsMcp.installed = true;
            result.devToolsMcp.details.config = mcpServers['chrome-devtools'];
            result.devToolsMcp.details.source = 'settings.local.json';
          }

          if (!result.desktopCommander.installed && mcpServers['desktop-commander']) {
            result.desktopCommander.installed = true;
            result.desktopCommander.details.config = mcpServers['desktop-commander'];
            result.desktopCommander.details.source = 'settings.local.json';
          }

          if (!result.sequentialThinking.installed && mcpServers['sequential-thinking']) {
            result.sequentialThinking.installed = true;
            result.sequentialThinking.details.config = mcpServers['sequential-thinking'];
            result.sequentialThinking.details.source = 'settings.local.json';
          }

          if (!result.playwright.installed && mcpServers['playwright']) {
            result.playwright.installed = true;
            result.playwright.details.config = mcpServers['playwright'];
            result.playwright.details.source = 'settings.local.json';
          }

          if (!result.memory.installed && mcpServers['memory']) {
            result.memory.installed = true;
            result.memory.details.config = mcpServers['memory'];
            result.memory.details.source = 'settings.local.json';
          }

          if (!result.context7.installed && mcpServers['context7']) {
            result.context7.installed = true;
            result.context7.details.config = mcpServers['context7'];
            result.context7.details.source = 'settings.local.json';
          }

          if (!result.fetch.installed && mcpServers['fetch']) {
            result.fetch.installed = true;
            result.fetch.details.config = mcpServers['fetch'];
            result.fetch.details.source = 'settings.local.json';
          }
        } catch (e) { /* ignore parse errors */ }
      }

      // 5. Fallback: run `claude mcp list` to detect all MCPs (async - never block event loop)
      const allDetected = result.devToolsMcp.installed && result.desktopCommander.installed && result.sequentialThinking.installed && result.playwright.installed && result.memory.installed && result.context7.installed && result.fetch.installed;
      if (!allDetected) {
        try {
          const { exec } = require('child_process');
          const util = require('util');
          const execAsync = util.promisify(exec);
          const { stdout: mcpList } = await execAsync('claude mcp list 2>&1', { encoding: 'utf-8', timeout: 15000 });

          // Check chrome-devtools
          if (!result.devToolsMcp.installed && mcpList.includes('chrome-devtools')) {
            result.devToolsMcp.installed = true;
            result.devToolsMcp.details.source = 'claude mcp list';
          }

          // Check desktop-commander
          if (!result.desktopCommander.installed && mcpList.includes('desktop-commander')) {
            result.desktopCommander.installed = true;
            result.desktopCommander.details.source = 'claude mcp list';
          }

          // Check sequential-thinking
          if (!result.sequentialThinking.installed && mcpList.includes('sequential-thinking')) {
            result.sequentialThinking.installed = true;
            result.sequentialThinking.details.source = 'claude mcp list';
          }

          // Check playwright
          if (!result.playwright.installed && mcpList.includes('playwright')) {
            result.playwright.installed = true;
            result.playwright.details.source = 'claude mcp list';
          }

          // Check memory
          if (!result.memory.installed && mcpList.includes('memory')) {
            result.memory.installed = true;
            result.memory.details.source = 'claude mcp list';
          }

          // Check context7
          if (!result.context7.installed && mcpList.includes('context7')) {
            result.context7.installed = true;
            result.context7.details.source = 'claude mcp list';
          }

          // Check fetch
          if (!result.fetch.installed && mcpList.includes('fetch')) {
            result.fetch.installed = true;
            result.fetch.details.source = 'claude mcp list';
          }
        } catch (e) { /* claude CLI not available */ }
      }

      // Check if Chrome debug port is open
      const net = require('net');
      await new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(2000);
        socket.on('connect', () => {
          result.devToolsMcp.details.debugPortOpen = true;
          result.devToolsMcp.details.debugPort = 9222;
          socket.destroy();
          resolve();
        });
        socket.on('timeout', () => { socket.destroy(); resolve(); });
        socket.on('error', () => { socket.destroy(); resolve(); });
        socket.connect(9222, '127.0.0.1');
      });
    } catch (e) {
      result.devToolsMcp.details.error = e.message;
    }

    console.log(`[Server][${new Date().toISOString()}] [GET /api/integrations/status] Done in ${Date.now() - startTime}ms`);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error(`[Server][${new Date().toISOString()}] [GET /api/integrations/status] ERROR:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Detailed test for a specific MCP
app.post('/api/integrations/:type/test', async (req, res) => {
  const type = req.params.type;
  const startTime = Date.now();
  console.log(`[Server][${new Date().toISOString()}] [POST /api/integrations/${type}/test] Testing MCP`);

  try {
    const toolsMap = {
      'devtools-mcp': ['navigate_page', 'take_screenshot', 'take_snapshot', 'click', 'fill', 'fill_form', 'list_console_messages', 'list_network_requests', 'performance_start_trace', 'performance_stop_trace', 'evaluate_script'],
      'desktop-commander': ['execute_command', 'read_file', 'write_file', 'search_files', 'edit_file', 'execute_python', 'execute_nodejs', 'list_processes', 'kill_process'],
      'sequential-thinking': ['sequential_thinking'],
      'playwright': ['browser_navigate', 'browser_screenshot', 'browser_click', 'browser_fill', 'browser_select', 'browser_hover', 'browser_evaluate', 'browser_wait', 'browser_tab_list', 'browser_tab_new', 'browser_tab_close'],
      'memory': ['create_entities', 'create_relations', 'add_observations', 'delete_entities', 'delete_observations', 'delete_relations', 'read_graph', 'search_nodes', 'open_nodes'],
      'context7': ['resolve-library-id', 'get-library-docs'],
      'fetch': ['fetch']
    };

    const tools = toolsMap[type] || [];
    const latency = Date.now() - startTime;

    // Check config files for this MCP
    const homeDir = process.env.USERPROFILE || process.env.HOME;
    let source = 'unknown';
    let installed = false;

    const mcpNames = {
      'devtools-mcp': 'chrome-devtools',
      'desktop-commander': 'desktop-commander',
      'sequential-thinking': 'sequential-thinking'
    };
    const mcpName = mcpNames[type];

    const configPaths = [
      { path: path.join(homeDir, '.claude.json'), name: '.claude.json' },
      { path: path.join(homeDir, '.claude', 'config', 'mcp.json'), name: 'config/mcp.json' },
      { path: path.join(homeDir, '.claude', 'settings.json'), name: 'settings.json' },
      { path: path.join(homeDir, '.claude', 'settings.local.json'), name: 'settings.local.json' }
    ];

    for (const cfg of configPaths) {
      if (fs.existsSync(cfg.path)) {
        try {
          const data = JSON.parse(fs.readFileSync(cfg.path, 'utf-8'));
          const servers = data.mcpServers || {};
          // Also check inside projects
          if (data.projects) {
            for (const proj of Object.values(data.projects)) {
              if (proj.mcpServers?.[mcpName]) {
                installed = true;
                source = cfg.name;
                break;
              }
            }
          }
          if (!installed && servers[mcpName]) {
            installed = true;
            source = cfg.name;
          }
        } catch (e) { /* skip */ }
      }
      if (installed) break;
    }

    res.json({
      success: true,
      data: {
        type,
        installed,
        source,
        tools,
        toolsCount: tools.length,
        latency: Date.now() - startTime,
        checkedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ ORCHESTRATOR ============

app.post('/api/orchestrate', async (req, res) => {
  const { instruction, sessionId } = req.body || {};

  if (!instruction) {
    return res.status(400).json({ error: 'instruction e obrigatorio' });
  }

  console.log(`[Orchestrator][route] INICIO - "${instruction.slice(0, 80)}..."`);

  // Configurar SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no'
  });

  const sendEvent = (data) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      if (typeof res.flush === 'function') res.flush();
    }
  };

  try {
    const { Orchestrator } = require('./orchestrator');
    const agentsConfig = require('./agents-config');
    const { executeTool } = require('./chat-tools');

    let apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      try {
        const envVars = credentialVault.getEnvVars ? credentialVault.getEnvVars() : {};
        apiKey = envVars['OPENROUTER_API_KEY'];
      } catch (e) {
        console.warn('[Orchestrator][route] Erro ao obter key do vault:', e.message);
      }
    }

    const orchestrator = new Orchestrator({
      apiKey,
      model: process.env.OPENROUTER_DEFAULT_MODEL || 'anthropic/claude-sonnet-4-6',
      agentsConfig,
      executeTool: async (name, toolArgs) => executeTool(name, toolArgs, credentialVault),
      credentialVault,
      sendEvent
    });

    const report = await orchestrator.run(instruction);

    // Enviar evento final com o relatorio completo
    sendEvent({ type: 'orchestration_done', report });

    // Se ha sessionId de chat, salvar o relatorio como mensagem
    if (sessionId) {
      try {
        const chatSession = loadChatSession(sessionId);
        if (chatSession) {
          chatSession.messages = chatSession.messages || [];
          chatSession.messages.push({
            role: 'assistant',
            content: report,
            createdAt: new Date().toISOString(),
            isOrchestration: true
          });
          chatSession.updatedAt = new Date().toISOString();
          saveChatSession(chatSession);
          console.log(`[Orchestrator][route] Relatorio salvo na sessao de chat ${sessionId}`);
        }
      } catch (e) {
        console.error('[Orchestrator][route] Erro ao salvar na sessao de chat:', e.message);
      }
    }

    console.log('[Orchestrator][route] FIM - Sucesso');

  } catch (err) {
    console.error('[Orchestrator][route] ERRO:', err.message);
    sendEvent({ type: 'error', error: err.message });
  } finally {
    if (!res.writableEnded) res.end();
  }
});

// ============ AI FEATURES — Auto-tagger, Chain Planner, Multi-Debate, Smart Reports, Agent Planner ============

// --- Auto-tagger ---
const { AutoTagger } = require('./auto-tagger');
const autoTagger = new AutoTagger({ credentialVault });

app.post('/api/ai/auto-tag', async (req, res) => {
  try {
    const { message, context } = req.body || {};
    if (!message) return res.status(400).json({ error: 'message e obrigatorio' });
    const result = await autoTagger.analyze(message, context || {});
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/ai/auto-tag/batch', async (req, res) => {
  try {
    const { messages } = req.body || {};
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'messages (array) obrigatorio' });
    const results = await autoTagger.analyzeBatch(messages);
    res.json(results);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Agent Planner (visual plans) ---
const { Orchestrator } = require('./orchestrator');

app.get('/api/ai/plans', (_req, res) => {
  try {
    res.json(Orchestrator.listPlans());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/ai/plans/:id', (req, res) => {
  try {
    const plan = Orchestrator.getPlan(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plano nao encontrado' });
    res.json(plan);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Chain-of-Tools Planner ---
const { ChainPlanner } = require('./chain-planner');
const { executeTool: executeToolForChain } = require('./chat-tools');
const chainPlanner = new ChainPlanner({
  credentialVault,
  executeTool: async (name, args) => executeToolForChain(name, args, credentialVault)
});

app.post('/api/ai/chain/plan', async (req, res) => {
  try {
    const { task } = req.body || {};
    if (!task) return res.status(400).json({ error: 'task e obrigatorio' });
    const plan = await chainPlanner.plan(task);
    res.json(plan);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/ai/chain/:id/execute', async (req, res) => {
  try {
    const result = await chainPlanner.execute(req.params.id);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/ai/chains', (_req, res) => {
  try { res.json(chainPlanner.getChains()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Multi-Agente com Debate ---
const { MultiDebate, PERSPECTIVES } = require('./multi-debate');
const multiDebate = new MultiDebate({ credentialVault });

app.post('/api/ai/debate', async (req, res) => {
  try {
    const { topic, perspectives, context } = req.body || {};
    if (!topic) return res.status(400).json({ error: 'topic e obrigatorio' });
    const result = await multiDebate.debate(topic, perspectives, context);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/ai/debates', (_req, res) => {
  try { res.json(multiDebate.getDebates()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/ai/debate/perspectives', (_req, res) => {
  res.json(MultiDebate.getPerspectives());
});

// --- Smart Reports (Cron Jobs Inteligentes) ---
const { SmartReports } = require('./smart-reports');
const { executeTool: executeToolForReports } = require('./chat-tools');
const smartReports = new SmartReports({
  credentialVault,
  notifier,
  toolExecutor: async (name, args) => executeToolForReports(name, args, credentialVault)
});

app.get('/api/ai/reports', (_req, res) => {
  try { res.json(smartReports.getReports()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/ai/reports/status', (_req, res) => {
  try { res.json(smartReports.getCronStatus()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/ai/reports/generate', async (req, res) => {
  try {
    const { type } = req.body || {};
    let report;
    if (type === 'weekly') report = await smartReports.generateWeekly();
    else report = await smartReports.generateDaily();
    res.json(report);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/ai/reports/config', (req, res) => {
  try {
    const updated = smartReports.updateConfig(req.body);
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Custom Scheduled Reports ---
app.get('/api/ai/reports/schedules', (_req, res) => {
  try { res.json(smartReports.getSchedules()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/ai/reports/schedules', (req, res) => {
  try {
    const { title, instruction, cronExpression, delivery } = req.body || {};
    if (!instruction) return res.status(400).json({ error: 'instruction e obrigatorio' });
    if (!cronExpression) return res.status(400).json({ error: 'cronExpression e obrigatorio' });
    const schedule = smartReports.createSchedule({ title, instruction, cronExpression, delivery });
    res.status(201).json(schedule);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/ai/reports/schedules/:id', (req, res) => {
  try {
    const schedule = smartReports.updateSchedule(req.params.id, req.body);
    if (!schedule) return res.status(404).json({ error: 'Schedule nao encontrado' });
    res.json(schedule);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/ai/reports/schedules/:id', (req, res) => {
  try {
    const ok = smartReports.removeSchedule(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Schedule nao encontrado' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/ai/reports/schedules/:id/run', async (req, res) => {
  try {
    const report = await smartReports.executeSchedule(req.params.id);
    if (!report) return res.status(404).json({ error: 'Schedule nao encontrado' });
    res.json(report);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/ai/reports/:id', (req, res) => {
  try {
    const report = smartReports.getReport(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report nao encontrado' });
    res.json(report);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Iniciar Smart Reports crons
try { smartReports.startAll(); } catch (e) { console.warn('[SmartReports] Erro ao iniciar crons:', e.message); }

console.log('[AI Features] Rotas montadas: /api/ai/auto-tag, /api/ai/plans, /api/ai/chain, /api/ai/debate, /api/ai/reports');

// ============ WEBSOCKET ============

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`[Server][${new Date().toISOString()}] WebSocket: Cliente conectado (${clients.size} total)`);

  // Enviar status inicial
  ws.send(JSON.stringify({
    type: 'connected',
    data: scheduler.getStatus()
  }));

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[Server][${new Date().toISOString()}] WebSocket: Cliente desconectado (${clients.size} total)`);
  });

  ws.on('error', (error) => {
    console.error(`[Server][${new Date().toISOString()}] WebSocket error:`, error.message);
    clients.delete(ws);
    try { ws.terminate(); } catch (_) {}
  });
});

function broadcastUpdate(type, data) {
  const message = JSON.stringify({ type, data, timestamp: new Date().toISOString() });

  clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      try {
        client.send(message);
      } catch (error) {
        console.error(`[Server][${new Date().toISOString()}] Broadcast send failed:`, error.message);
        clients.delete(client);
        try { client.terminate(); } catch (_) {}
      }
    } else {
      // Clean up non-open connections
      clients.delete(client);
    }
  });
}

// ============ PIPELINES API (Phase 5) ============
const PIPELINES_FILE = path.join(__dirname, 'data', 'pipelines.json');

function readPipelines() {
  try {
    if (!fs.existsSync(PIPELINES_FILE)) {
      const dir = path.dirname(PIPELINES_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(PIPELINES_FILE, '[]');
      return [];
    }
    return JSON.parse(fs.readFileSync(PIPELINES_FILE, 'utf-8'));
  } catch { return []; }
}

function writePipelines(data) {
  try {
    const dir = path.dirname(PIPELINES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(PIPELINES_FILE, JSON.stringify(data, null, 2));
  } catch (e) { console.error('Error writing pipelines:', e.message); }
}

// List all pipelines
app.get('/api/pipelines', (req, res) => {
  try {
    const pipelines = readPipelines();
    res.json({ success: true, data: pipelines });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single pipeline
app.get('/api/pipelines/:id', (req, res) => {
  try {
    const pipelines = readPipelines();
    const pipeline = pipelines.find(p => p.id === req.params.id);
    if (!pipeline) return res.status(404).json({ success: false, error: 'Pipeline not found' });
    res.json({ success: true, data: pipeline });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create pipeline
app.post('/api/pipelines', (req, res) => {
  try {
    const { name, description, steps } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'name is required' });
    const pipelines = readPipelines();
    const pipeline = {
      id: uuidv4(),
      name,
      description: description || '',
      steps: (steps || []).map((s, i) => ({
        id: `step-${i + 1}`,
        taskId: s.taskId || null,
        taskName: s.taskName || `Step ${i + 1}`,
        prompt: s.prompt || '',
        dependsOn: s.dependsOn || [],
        status: 'pending',
        executionId: null
      })),
      status: 'idle',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastRunAt: null,
      runCount: 0
    };
    pipelines.push(pipeline);
    writePipelines(pipelines);
    broadcastUpdate('pipeline:created', pipeline);
    res.status(201).json({ success: true, data: pipeline });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update pipeline
app.put('/api/pipelines/:id', (req, res) => {
  try {
    const pipelines = readPipelines();
    const idx = pipelines.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Pipeline not found' });
    pipelines[idx] = { ...pipelines[idx], ...req.body, id: req.params.id, updatedAt: new Date().toISOString() };
    writePipelines(pipelines);
    broadcastUpdate('pipeline:updated', pipelines[idx]);
    res.json({ success: true, data: pipelines[idx] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete pipeline
app.delete('/api/pipelines/:id', (req, res) => {
  try {
    let pipelines = readPipelines();
    const idx = pipelines.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Pipeline not found' });
    pipelines.splice(idx, 1);
    writePipelines(pipelines);
    broadcastUpdate('pipeline:deleted', { id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Run a pipeline (execute steps sequentially)
app.post('/api/pipelines/:id/run', async (req, res) => {
  try {
    const pipelines = readPipelines();
    const idx = pipelines.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Pipeline not found' });
    const pipeline = pipelines[idx];
    pipeline.status = 'running';
    pipeline.lastRunAt = new Date().toISOString();
    pipeline.runCount++;
    pipeline.steps.forEach(s => { s.status = 'pending'; s.executionId = null; });
    writePipelines(pipelines);
    broadcastUpdate('pipeline:running', pipeline);
    res.json({ success: true, data: pipeline, message: 'Pipeline started' });

    // Execute steps in background
    (async () => {
      for (const step of pipeline.steps) {
        // Check dependencies
        const deps = step.dependsOn || [];
        const allDepsDone = deps.every(depId => {
          const depStep = pipeline.steps.find(s => s.id === depId);
          return depStep && depStep.status === 'completed';
        });
        if (!allDepsDone && deps.length > 0) {
          step.status = 'skipped';
          continue;
        }

        step.status = 'running';
        writePipelines(pipelines);
        broadcastUpdate('pipeline:step_running', { pipelineId: pipeline.id, stepId: step.id });

        try {
          if (step.taskId) {
            const result = await scheduler.runNow(step.taskId);
            step.executionId = result?.id || null;
            step.status = 'completed';
          } else {
            step.status = 'completed';
          }
        } catch (err) {
          step.status = 'failed';
          step.error = err.message;
          pipeline.status = 'failed';
          writePipelines(pipelines);
          broadcastUpdate('pipeline:failed', { pipelineId: pipeline.id, stepId: step.id, error: err.message });
          return;
        }
        writePipelines(pipelines);
        broadcastUpdate('pipeline:step_completed', { pipelineId: pipeline.id, stepId: step.id });
      }
      pipeline.status = 'completed';
      writePipelines(pipelines);
      broadcastUpdate('pipeline:completed', pipeline);
    })().catch(err => {
      pipeline.status = 'failed';
      writePipelines(pipelines);
      broadcastUpdate('pipeline:failed', { pipelineId: pipeline.id, error: err.message });
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cost analytics endpoint
app.get('/api/analytics/cost', (req, res) => {
  try {
    const allExecs = storage.getExecutions(1000);
    const { period } = req.query; // daily, weekly, monthly
    const now = new Date();

    // Total cost
    let totalCost = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    const costByDay = {};
    const costByTask = {};

    allExecs.forEach(exec => {
      const cost = parseFloat(exec.costUsd) || 0;
      totalCost += cost;
      totalInputTokens += exec.inputTokens || 0;
      totalOutputTokens += exec.outputTokens || 0;

      const day = (exec.startedAt || exec.createdAt || '').split('T')[0];
      if (day) {
        if (!costByDay[day]) costByDay[day] = { cost: 0, executions: 0 };
        costByDay[day].cost += cost;
        costByDay[day].executions++;
      }

      const taskName = exec.taskName || exec.taskId || 'unknown';
      if (!costByTask[taskName]) costByTask[taskName] = { cost: 0, executions: 0 };
      costByTask[taskName].cost += cost;
      costByTask[taskName].executions++;
    });

    // Last 30 days
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (29 - i));
      return d.toISOString().split('T')[0];
    });

    const dailyCosts = days.map(day => ({
      date: day,
      cost: costByDay[day]?.cost || 0,
      executions: costByDay[day]?.executions || 0
    }));

    const topTasks = Object.entries(costByTask)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        totalCost: totalCost.toFixed(4),
        totalInputTokens,
        totalOutputTokens,
        totalExecutions: allExecs.length,
        dailyCosts,
        topTasks,
        avgCostPerExecution: allExecs.length > 0 ? (totalCost / allExecs.length).toFixed(4) : '0'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ PROMPT TEMPLATES API ============
const PROMPT_TEMPLATES_FILE = path.join(__dirname, 'data', 'prompt-templates.json');

function readPromptTemplates() {
  try {
    if (!fs.existsSync(PROMPT_TEMPLATES_FILE)) {
      fs.writeFileSync(PROMPT_TEMPLATES_FILE, '[]');
      return [];
    }
    return JSON.parse(fs.readFileSync(PROMPT_TEMPLATES_FILE, 'utf-8'));
  } catch (error) {
    console.error('Error reading prompt templates:', error.message);
    return [];
  }
}

function writePromptTemplates(templates) {
  try {
    const dir = path.dirname(PROMPT_TEMPLATES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(PROMPT_TEMPLATES_FILE, JSON.stringify(templates, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing prompt templates:', error.message);
    return false;
  }
}

// List all prompt templates
app.get('/api/prompt-templates', (req, res) => {
  const templates = readPromptTemplates();
  const category = req.query.category;
  if (category) {
    return res.json(templates.filter(t => t.category === category));
  }
  res.json(templates);
});

// Gallery templates (community pre-seeded templates) — deve ficar ANTES de /:id
app.get('/api/prompt-templates/gallery', (req, res) => {
  const gallery = [
    {
      id: 'gallery-security-audit', name: 'Security Audit', category: 'DevOps', icon: '🔒',
      description: 'Comprehensive security audit following OWASP Top 10',
      promptText: 'Perform a comprehensive security audit on this project following OWASP Top 10 guidelines. Check for: 1) Injection vulnerabilities (SQL, XSS, Command) 2) Broken authentication 3) Sensitive data exposure 4) XML External Entities 5) Broken access control 6) Security misconfiguration 7) Cross-Site Scripting 8) Insecure deserialization 9) Using components with known vulnerabilities 10) Insufficient logging. Provide severity ratings and remediation steps for each finding.',
      variables: [], isGallery: true
    },
    {
      id: 'gallery-api-docs', name: 'API Documentation Generator', category: 'Documentation', icon: '📖',
      description: 'Generate comprehensive API documentation with OpenAPI spec',
      promptText: 'Analyze all API endpoints in this project and generate comprehensive documentation including: 1) OpenAPI/Swagger specification 2) Request/response examples for each endpoint 3) Authentication requirements 4) Error codes and handling 5) Rate limiting details. Output as a well-structured markdown document.',
      variables: [], isGallery: true
    },
    {
      id: 'gallery-code-review', name: 'Deep Code Review', category: 'Quality', icon: '🔍',
      description: 'In-depth code review with actionable feedback',
      promptText: 'Perform a thorough code review of this project focusing on: 1) Code quality and readability 2) Design patterns and architecture 3) Error handling completeness 4) Performance bottlenecks 5) Test coverage gaps 6) Security concerns 7) Naming conventions 8) DRY violations. Rate each area 1-10 and provide specific, actionable improvement suggestions with code examples.',
      variables: [], isGallery: true
    },
    {
      id: 'gallery-test-gen', name: 'Test Suite Generator', category: 'Testing', icon: '🧪',
      description: 'Generate comprehensive test suite with edge cases',
      promptText: 'Generate a comprehensive test suite for this project: 1) Unit tests for all public functions 2) Integration tests for API endpoints 3) Edge case tests 4) Error handling tests 5) Mock external dependencies. Target 80%+ coverage. Use the testing framework already in the project or recommend the best one.',
      variables: [], isGallery: true
    },
    {
      id: 'gallery-perf-audit', name: 'Performance Audit', category: 'DevOps', icon: '⚡',
      description: 'Full performance analysis with optimization recommendations',
      promptText: 'Conduct a thorough performance audit: 1) Identify algorithmic bottlenecks (O(n) analysis) 2) Memory leak detection 3) Database query optimization 4) Caching opportunities 5) Bundle size analysis (if frontend) 6) Network request optimization 7) Lazy loading opportunities. Provide before/after estimates for each optimization.',
      variables: [], isGallery: true
    }
  ];
  res.json({ success: true, data: gallery });
});

// Get single prompt template
app.get('/api/prompt-templates/:id', (req, res) => {
  const templates = readPromptTemplates();
  const template = templates.find(t => t.id === req.params.id);
  if (!template) return res.status(404).json({ error: 'Template not found' });
  res.json(template);
});

// Create prompt template
app.post('/api/prompt-templates', (req, res) => {
  const { name, category, description, variables, icon, model, tags } = req.body;
  // Aceita tanto "promptText" (legado) quanto "content" (frontend atual)
  const promptText = req.body.promptText || req.body.content;
  if (!name || !promptText) {
    return res.status(400).json({ error: 'name and promptText (or content) are required' });
  }
  const templates = readPromptTemplates();
  const newTemplate = {
    id: uuidv4(),
    name,
    category: category || 'Geral',
    description: description || '',
    promptText,
    variables: variables || [],
    tags: tags || [],
    model: model || '',
    icon: icon || '📝',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  templates.push(newTemplate);
  writePromptTemplates(templates);
  broadcastUpdate('prompt-template:created', newTemplate);
  res.status(201).json(newTemplate);
});

// Update prompt template (with versioning)
app.put('/api/prompt-templates/:id', (req, res) => {
  const templates = readPromptTemplates();
  const idx = templates.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Template not found' });
  // Save previous version before updating
  const prev = templates[idx];
  if (!prev.versions) prev.versions = [];
  prev.versions.push({
    version: prev.versions.length + 1,
    promptText: prev.promptText,
    variables: prev.variables,
    savedAt: prev.updatedAt || prev.createdAt
  });
  const updated = { ...prev, ...req.body, id: req.params.id, versions: prev.versions, updatedAt: new Date().toISOString() };
  templates[idx] = updated;
  writePromptTemplates(templates);
  broadcastUpdate('prompt-template:updated', updated);
  res.json(updated);
});

// Delete prompt template
app.delete('/api/prompt-templates/:id', (req, res) => {
  let templates = readPromptTemplates();
  const idx = templates.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Template not found' });
  const deleted = templates.splice(idx, 1)[0];
  writePromptTemplates(templates);
  broadcastUpdate('prompt-template:deleted', deleted);
  res.json({ success: true, deleted });
});

// Get prompt template versions
app.get('/api/prompt-templates/:id/versions', (req, res) => {
  const templates = readPromptTemplates();
  const template = templates.find(t => t.id === req.params.id);
  if (!template) return res.status(404).json({ error: 'Template not found' });
  const versions = template.versions || [];
  // Add current version
  const allVersions = [...versions, {
    version: versions.length + 1,
    promptText: template.promptText,
    variables: template.variables,
    savedAt: template.updatedAt,
    current: true
  }];
  res.json(allVersions);
});

// Restore a specific version of a prompt template
app.post('/api/prompt-templates/:id/versions/:versionNum/restore', (req, res) => {
  const templates = readPromptTemplates();
  const idx = templates.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Template not found' });
  const template = templates[idx];
  const vNum = parseInt(req.params.versionNum);
  const version = (template.versions || []).find(v => v.version === vNum);
  if (!version) return res.status(404).json({ error: 'Version not found' });
  // Save current as a new version entry
  if (!template.versions) template.versions = [];
  template.versions.push({
    version: template.versions.length + 1,
    promptText: template.promptText,
    variables: template.variables,
    savedAt: template.updatedAt
  });
  // Restore the old version
  template.promptText = version.promptText;
  template.variables = version.variables;
  template.updatedAt = new Date().toISOString();
  templates[idx] = template;
  writePromptTemplates(templates);
  broadcastUpdate('prompt-template:updated', template);
  res.json(template);
});

// Seed default templates from ebook
app.post('/api/prompt-templates/seed', (req, res) => {
  const existing = readPromptTemplates();
  if (existing.length > 0 && !req.query.force) {
    return res.json({ message: 'Templates already exist. Use ?force=true to re-seed.', count: existing.length });
  }
  const defaults = getDefaultPromptTemplates();
  writePromptTemplates(req.query.force ? [...existing, ...defaults] : defaults);
  broadcastUpdate('prompt-template:seeded', { count: defaults.length });
  res.json({ message: `Seeded ${defaults.length} templates`, count: defaults.length });
});

// ============ VARIABLE PROFILES API ============
const VARIABLE_PROFILES_FILE = path.join(__dirname, 'data', 'variable-profiles.json');

function readVariableProfiles() {
  try {
    if (!fs.existsSync(VARIABLE_PROFILES_FILE)) {
      const defaultData = { profiles: [], lastUsed: {}, variableStats: {} };
      fs.writeFileSync(VARIABLE_PROFILES_FILE, JSON.stringify(defaultData, null, 2));
      return defaultData;
    }
    return JSON.parse(fs.readFileSync(VARIABLE_PROFILES_FILE, 'utf-8'));
  } catch (error) {
    console.error('Error reading variable profiles:', error.message);
    return { profiles: [], lastUsed: {}, variableStats: {} };
  }
}

function writeVariableProfiles(data) {
  try {
    const dir = path.dirname(VARIABLE_PROFILES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(VARIABLE_PROFILES_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing variable profiles:', error.message);
    return false;
  }
}

// GET /api/variable-profiles - Get all profiles, lastUsed, variableStats
app.get('/api/variable-profiles', (req, res) => {
  const data = readVariableProfiles();
  res.json(data);
});

// POST /api/variable-profiles - Create a new named profile
app.post('/api/variable-profiles', (req, res) => {
  const { name, values } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const data = readVariableProfiles();
  const profile = {
    id: uuidv4(),
    name,
    values: values || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  data.profiles.push(profile);
  writeVariableProfiles(data);
  res.status(201).json(profile);
});

// PUT /api/variable-profiles/last-used - Update lastUsed values
// IMPORTANT: This route must be defined BEFORE the /:id route
app.put('/api/variable-profiles/last-used', (req, res) => {
  const { values } = req.body;
  if (!values) return res.status(400).json({ error: 'values is required' });
  const data = readVariableProfiles();
  data.lastUsed = { ...data.lastUsed, ...values };
  writeVariableProfiles(data);
  res.json(data.lastUsed);
});

// POST /api/variable-profiles/track-usage - Increment usage counters
app.post('/api/variable-profiles/track-usage', (req, res) => {
  const { variables } = req.body;
  if (!variables || !Array.isArray(variables)) return res.status(400).json({ error: 'variables array is required' });
  const data = readVariableProfiles();
  const now = new Date().toISOString();
  variables.forEach(varName => {
    if (!data.variableStats[varName]) {
      data.variableStats[varName] = { usageCount: 0, lastUsedAt: now };
    }
    data.variableStats[varName].usageCount++;
    data.variableStats[varName].lastUsedAt = now;
  });
  writeVariableProfiles(data);
  res.json(data.variableStats);
});

// PUT /api/variable-profiles/:id - Update existing profile
app.put('/api/variable-profiles/:id', (req, res) => {
  const data = readVariableProfiles();
  const idx = data.profiles.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Profile not found' });
  const { name, values } = req.body;
  if (name) data.profiles[idx].name = name;
  if (values) data.profiles[idx].values = values;
  data.profiles[idx].updatedAt = new Date().toISOString();
  writeVariableProfiles(data);
  res.json(data.profiles[idx]);
});

// DELETE /api/variable-profiles/:id
app.delete('/api/variable-profiles/:id', (req, res) => {
  const data = readVariableProfiles();
  const idx = data.profiles.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Profile not found' });
  const removed = data.profiles.splice(idx, 1)[0];
  writeVariableProfiles(data);
  res.json({ message: 'Deleted', profile: removed });
});

function getDefaultPromptTemplates() {
  return [
    {
      id: uuidv4(), name: 'Analise Estrategica de Produto', category: 'Marketing', icon: '🎯',
      description: 'Analise detalhada de produto/servico com publico-alvo, diferenciais e beneficios',
      promptText: '$EMPRESA= [{{EMPRESA}}]; $PRODUTO_SERVICO= [{{PRODUTO_SERVICO}}]; $INFO_ADICIONAIS= [{{INFO_ADICIONAIS}}]; Preciso fazer uma analise detalhada sobre o produto/servico [$PRODUTO_SERVICO], oferecido pela empresa [$EMPRESA]. Utilize algumas informacoes adicionais sobre o produto/servico oferecido pela empresa $EMPRESA para melhorar sua resposta: $INFO_ADICIONAIS. A partir de sua analise, escreva para mim em forma de lista, utilizando subtitulos, os seguintes itens: Descricao do Produto/Servico, Problema Resolvido, Beneficio Principal, Diferenciacao, Publico-Alvo.',
      variables: [
        { name: 'EMPRESA', label: 'Nome da Empresa', placeholder: 'Ex: Minha Empresa Ltda', required: true },
        { name: 'PRODUTO_SERVICO', label: 'Produto ou Servico', placeholder: 'Ex: Consultoria de Marketing Digital', required: true },
        { name: 'INFO_ADICIONAIS', label: 'Informacoes Adicionais', placeholder: 'Detalhes extras sobre o produto...', required: false }
      ],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    },
    {
      id: uuidv4(), name: 'Briefing para Imagem de Anuncio', category: 'Marketing', icon: '🖼️',
      description: 'Cria briefing para designer produzir imagem de alta conversao para Facebook Ads',
      promptText: 'Atue como um criador de briefing para um designer que vai produzir uma imagem para utilizar em anuncios no Facebook Ads. A imagem tem como objetivo venda do seguinte produto: \'{{PRODUTO}}\'. A imagem devera ter um titulo (com no maximo 7 palavras) atraente e altamente chamativo para o publico-alvo do produto. A imagem devera ter uma alta taxa de conversao e tambem uma alta taxa de cliques em relacao as impressoes da imagem nos anuncios. A imagem deve estar de acordo com as politicas de anuncios do Facebook Ads e Google Ads. Utilize tambem algumas informacoes sobre o produto para melhorar sua resposta: \'{{INFO_PRODUTO}}\'.',
      variables: [
        { name: 'PRODUTO', label: 'Produto', placeholder: 'Ex: Tenis Nike Air Max', required: true },
        { name: 'INFO_PRODUTO', label: 'Informacoes do Produto', placeholder: 'Detalhes, precos, diferenciais...', required: false }
      ],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    },
    {
      id: uuidv4(), name: 'Briefing para Video de Anuncio', category: 'Marketing', icon: '🎬',
      description: 'Cria briefing para video de alta conversao com takes e narracoes',
      promptText: 'Atue como um criador de briefing para um designer que ira produzir um video com o objetivo de venda para o seguinte produto: \'{{PRODUTO}}\'. A ferramenta a ser utilizada sera o Adobe Premiere. O briefing devera ser dividido em takes. Cada take deve possuir sua duracao em segundos. O inicio do video deve ser impactante e prender a atencao do publico. O primeiro titulo tambem deve ser impactante e prender a atencao do publico. Utilize uma sequencia de takes focada na conversao (venda). O video deve estar em conformidade com as politicas de anuncios do Facebook Ads e Google Ads. Em cada take, inclua uma narracao que seja adequada e compativel em termos de duracao com cada take. Utilize algumas informacoes do produto para melhorar a sua resposta: \'{{INFO_PRODUTO}}\'.',
      variables: [
        { name: 'PRODUTO', label: 'Produto', placeholder: 'Ex: Curso de Marketing Digital', required: true },
        { name: 'INFO_PRODUTO', label: 'Informacoes do Produto', placeholder: 'Detalhes do produto...', required: false }
      ],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    },
    {
      id: uuidv4(), name: 'Descricao de Produto SEO', category: 'SEO', icon: '🔍',
      description: 'Descricao de produto otimizada para SEO com titulo e meta-descricao',
      promptText: 'Crie uma descricao de produto engajante e otimizada para SEO, focada em conversoes. Sua escrita deve parecer humana, dinamica e indetectavel por algoritmos de I.A. As tecnicas de SEO devem ser utilizadas para posicionar esta pagina de produto em primeiro lugar nos resultados de pesquisa do Google e na rede de Google Shopping organico. A descricao deve conter elementos de persuasao eficazes para motivar e influenciar o leitor a fazer uma compra. Alem disso, forneca um titulo e uma meta-descricao para o produto que seja atraente e tambem otimizado para SEO. O titulo deve conter no maximo 60 caracteres. A meta-descricao deve conter no maximo 125 caracteres. Cada paragrafo deve conter no maximo 5 linhas. Utilize ao longo do texto palavras-chave que sejam relevantes para o posicionamento organico. Utilize as seguintes informacoes do produto para formular a descricao e o titulo: [{{INFO_PRODUTO}}]',
      variables: [
        { name: 'INFO_PRODUTO', label: 'Informacoes do Produto', placeholder: 'Nome, caracteristicas, preco, diferenciais...', required: true }
      ],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    },
    {
      id: uuidv4(), name: 'Descricao de Colecao SEO', category: 'SEO', icon: '📦',
      description: 'Descricao para pagina de colecao/categoria otimizada para SEO',
      promptText: 'Crie uma descricao para uma pagina de colecao de produtos (categoria de produtos) que seja engajante e otimizada para SEO, focada em conversoes. A sua escrita deve parecer humana, dinamica e indetectavel por algoritmos de IA. As tecnicas de SEO devem ser utilizadas para posicionar esta pagina em primeiro lugar nos resultados de pesquisa do Google. A descricao deve conter elementos de persuasao eficazes para motivar e influenciar o leitor a fazer uma compra. Alem disso, forneca uma meta-descricao para a pagina que seja atraente e tambem otimizada para SEO. A meta-descricao deve conter, no maximo, 125 caracteres. Utilize, ao longo do texto, palavras-chave que sejam relevantes para o posicionamento organico. Utilize alguns produtos que estao incluidos na pagina da colecao para gerar a sua resposta: \'{{INFO_COLECAO}}\'.',
      variables: [
        { name: 'INFO_COLECAO', label: 'Informacoes da Colecao', placeholder: 'Nome da colecao, produtos incluidos, tema...', required: true }
      ],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    },
    {
      id: uuidv4(), name: 'Conteudo para Blog SEO', category: 'SEO', icon: '📝',
      description: 'Post de blog completo otimizado para SEO com subtitulos H2/H3/H4',
      promptText: 'Eu quero que voce atue como um redator de conteudo especializado em SEO para um blog que tem como objetivo posicionar um conteudo especifico em primeiro lugar nos resultados de pesquisa do Google o mais rapido possivel. A palavra-chave principal e [{{PALAVRA_CHAVE}}]. No post, voce deve fornecer informacoes detalhadas, exemplos, dicas praticas, dados estatisticos e referencias a fontes confiaveis. O conteudo deve ser otimizado para mecanismos de pesquisa, utilizando variacoes da palavra-chave e palavras-chave relacionadas para rankear em diversas consultas. Estruture o post com introducao, desenvolvimento e conclusao (resumo), utilizando subtitulos H2, H3 e H4 de maneira apropriada. Escreva de forma humana, envolvente e nao identificavel por detectores de IA. Sugira tambem um titulo otimizado para o post. Cada paragrafo do texto deve ter no maximo 5 linhas. A introducao deve ter de 45 a 50 palavras. O conteudo deve ter no minimo 500 palavras. O texto deve ter pelo menos 5 subtitulos H2. Cada subtitulo H2 deve ter pelo menos 3 subtitulos H3.',
      variables: [
        { name: 'PALAVRA_CHAVE', label: 'Palavra-chave Principal', placeholder: 'Ex: marketing digital para iniciantes', required: true }
      ],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    },
    {
      id: uuidv4(), name: 'Blog SEO com Autoridade', category: 'SEO', icon: '🏆',
      description: 'Conteudo para blog com links internos para atribuir autoridade a pagina de servico',
      promptText: '$SERVICO: [{{SERVICO}}] $PALAVRA-CHAVE: [{{PALAVRA_CHAVE}}] $URL_SERVICO: [{{URL_SERVICO}}] INFORMACOES SOBRE O $SERVICO: [{{INFO_SERVICO}}] Eu quero que voce atue como um redator de conteudo especializado em SEO para um blog que tem como objetivo posicionar um conteudo especifico em primeiro lugar nos resultados de pesquisa do Google. O foco principal e criar um conteudo com foco na palavra-chave: $PALAVRA-CHAVE. Crie links internos para a pagina do servico: $URL_SERVICO (a fim de atribuir autoridade da palavra-chave do conteudo a essa URL do servico). O conteudo deve ser otimizado para mecanismos de pesquisa. Estruture o post utilizando subtitulos H2, H3 e H4. Escreva de forma humana, envolvente. Sugira tambem um titulo otimizado. O conteudo deve ter no minimo 500 palavras. O texto deve ter pelo menos 5 subtitulos H2. Cada subtitulo H2 deve ter pelo menos 3 subtitulos H3.',
      variables: [
        { name: 'SERVICO', label: 'Nome do Servico', placeholder: 'Ex: Consultoria SEO', required: true },
        { name: 'PALAVRA_CHAVE', label: 'Palavra-chave', placeholder: 'Ex: consultoria seo profissional', required: true },
        { name: 'URL_SERVICO', label: 'URL do Servico', placeholder: 'https://meusite.com/servico', required: true },
        { name: 'INFO_SERVICO', label: 'Informacoes do Servico', placeholder: 'Detalhes sobre o servico oferecido...', required: false }
      ],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    },
    {
      id: uuidv4(), name: 'Segmentacao Facebook Ads', category: 'Ads', icon: '🎯',
      description: 'Encontra interesses e comportamentos para segmentacao no Facebook Ads',
      promptText: 'Atua como um analista de publico-alvo para o produto: \'{{PRODUTO}}\'. O produto sera anunciado no Facebook Ads. Utilize interesses e comportamentos disponiveis no gerenciador de anuncios do Facebook Ads para sua resposta. Crie uma lista de possiveis interesses e comportamentos para a venda do produto. Utilize algumas informacoes do produto para melhorar a sua resposta: \'{{INFO_PRODUTO}}\'.',
      variables: [
        { name: 'PRODUTO', label: 'Produto', placeholder: 'Ex: Curso de Culinaria Online', required: true },
        { name: 'INFO_PRODUTO', label: 'Informacoes do Produto', placeholder: 'Publico, preco, diferenciais...', required: false }
      ],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    },
    {
      id: uuidv4(), name: 'Copy para Facebook Ads', category: 'Ads', icon: '✍️',
      description: 'Gera 5 titulos e 5 textos principais para anuncio no Facebook Ads',
      promptText: '$PRODUTO= ({{PRODUTO}}); Atue como um gerador de anuncios para o Facebook Ads. Crie 5 ideias de titulos diferentes. Crie 5 ideias de texto principal diferentes. O titulo deve possuir no maximo 30 caracteres contando com os espacos entre as letras. O texto principal deve possuir no maximo 100 caracteres contando com os espacos entre as letras. O anuncio tem objetivo a venda do seguinte produto: $PRODUTO. Utilize informacoes adicionais sobre o produto para melhorar sua resposta: [{{INFO_PRODUTO}}]. Os titulos e as descricoes nao podem ser repetitivos.',
      variables: [
        { name: 'PRODUTO', label: 'Produto', placeholder: 'Nome do produto', required: true },
        { name: 'INFO_PRODUTO', label: 'Informacoes do Produto', placeholder: 'Detalhes extras...', required: false }
      ],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    },
    {
      id: uuidv4(), name: 'Palavras-chave Google Ads', category: 'Ads', icon: '🔑',
      description: 'Gera lista de palavras-chave para rede de pesquisa do Google Ads',
      promptText: 'Quero que voce atue como um gerador de palavras-chave com objetivo de venda na rede de pesquisa do Google Ads, o produto a ser vendido e: \'{{PRODUTO}}\'. Escreva as palavras-chave em forma de lista. Na lista utilize tambem variacoes da palavra-chave. Nao utilize o nome do produto nas palavras-chave. Utilize algumas informacoes do produto para melhorar a quantidade de palavras-chave na lista: \'{{INFO_PRODUTO}}\'',
      variables: [
        { name: 'PRODUTO', label: 'Produto', placeholder: 'Nome do produto', required: true },
        { name: 'INFO_PRODUTO', label: 'Informacoes do Produto', placeholder: 'Detalhes, categoria, publico-alvo...', required: false }
      ],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    },
    {
      id: uuidv4(), name: 'Anuncio Pesquisa Google Ads', category: 'Ads', icon: '📢',
      description: 'Gera 15 titulos e 4 descricoes para rede de pesquisa do Google Ads',
      promptText: '$PRODUTO= ({{PRODUTO}}); Atue como um gerador de anuncios para a rede de pesquisa do Google Ads. Crie 15 ideias de titulos diferentes. Crie 4 ideias de descricao diferentes. O titulo deve possuir no maximo 30 caracteres contando com os espacos. A descricao deve possuir no maximo 90 caracteres contando com os espacos. O anuncio tem objetivo a venda do seguinte produto: $PRODUTO. Utilize informacoes adicionais sobre o produto para melhorar sua resposta: [{{INFO_PRODUTO}}]. Os titulos e as descricoes nao podem ser repetitivos.',
      variables: [
        { name: 'PRODUTO', label: 'Produto', placeholder: 'Nome do produto', required: true },
        { name: 'INFO_PRODUTO', label: 'Informacoes do Produto', placeholder: 'Detalhes extras...', required: false }
      ],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    },
    {
      id: uuidv4(), name: 'Anuncio Display Google Ads', category: 'Ads', icon: '🖥️',
      description: 'Gera titulos e descricoes para rede de display do Google Ads',
      promptText: '$PRODUTO= ({{PRODUTO}}); Atue como um gerador de anuncios para a rede de display do Google Ads. Crie 15 ideias de titulos diferentes. Crie 5 ideias de descricao diferentes. O titulo deve possuir no maximo 30 caracteres. A descricao deve possuir no maximo 90 caracteres. O anuncio tem objetivo a venda do seguinte produto: $PRODUTO. Utilize informacoes adicionais sobre o produto para melhorar sua resposta: [{{INFO_PRODUTO}}]. Os titulos e as descricoes nao podem ser repetitivos.',
      variables: [
        { name: 'PRODUTO', label: 'Produto', placeholder: 'Nome do produto', required: true },
        { name: 'INFO_PRODUTO', label: 'Informacoes do Produto', placeholder: 'Detalhes extras...', required: false }
      ],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    },
    {
      id: uuidv4(), name: 'Anuncio YouTube Google Ads', category: 'Ads', icon: '▶️',
      description: 'Gera titulos, titulos longos e descricoes para YouTube no Google Ads',
      promptText: '$PRODUTO= ({{PRODUTO}}); Atue como um gerador de anuncios para a rede de youtube do Google Ads. Crie 5 ideias de titulos diferentes. Crie 5 ideias de descricao diferentes. Crie 5 ideias de titulo longo diferentes. O titulo deve possuir no maximo 15 caracteres. O titulo longo deve possuir no maximo 90 caracteres. A descricao deve possuir no maximo 70 caracteres. O anuncio tem objetivo a venda do seguinte produto: $PRODUTO. Utilize informacoes adicionais sobre o produto para melhorar sua resposta: [{{INFO_PRODUTO}}]. Os titulos e as descricoes nao podem ser repetitivos.',
      variables: [
        { name: 'PRODUTO', label: 'Produto', placeholder: 'Nome do produto', required: true },
        { name: 'INFO_PRODUTO', label: 'Informacoes do Produto', placeholder: 'Detalhes extras...', required: false }
      ],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    },
    {
      id: uuidv4(), name: 'Anuncio PMax Google Ads', category: 'Ads', icon: '🚀',
      description: 'Gera titulos, titulos longos e descricoes para campanhas PMax do Google Ads',
      promptText: '$PRODUTO= ({{PRODUTO}}); Atue como um gerador de anuncios para a rede PMax do Google Ads. Crie 5 ideias de titulos diferentes. Crie 5 ideias de descricao diferentes. Crie 5 ideias de titulo longo diferentes. O titulo deve possuir no maximo 30 caracteres. O titulo longo deve possuir no maximo 90 caracteres. A descricao deve possuir no maximo 60 caracteres. O anuncio tem objetivo a venda do seguinte produto: $PRODUTO. Utilize informacoes adicionais sobre o produto para melhorar sua resposta: [{{INFO_PRODUTO}}]. Os titulos e as descricoes nao podem ser repetitivos.',
      variables: [
        { name: 'PRODUTO', label: 'Produto', placeholder: 'Nome do produto', required: true },
        { name: 'INFO_PRODUTO', label: 'Informacoes do Produto', placeholder: 'Detalhes extras...', required: false }
      ],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    },
    {
      id: uuidv4(), name: 'Gerador de Prompt', category: 'Produtividade', icon: '🤖',
      description: 'Gera um prompt de comando otimizado a partir de um titulo',
      promptText: 'Quero que voce atue como gerador de prompts. Primeiramente, vou lhe dar um titulo assim: "Atue como um {{TITULO}}". Entao voce me dara um prompt detalhado e autoexplicativo e apropriado para o titulo. O prompt deve ser completo e profissional. De-me apenas o prompt gerado.',
      variables: [
        { name: 'TITULO', label: 'Titulo/Funcao', placeholder: 'Ex: Auxiliar de Pronuncia em Ingles', required: true }
      ],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    },
    {
      id: uuidv4(), name: 'Melhorador de Prompt', category: 'Produtividade', icon: '✨',
      description: 'Melhora e otimiza um prompt de comando existente',
      promptText: 'Atue como um programador de prompt de comando especialista em CHAT GPT. Sua funcao e melhorar e otimizar o prompt de comando que vou te informar. Voce deve incluir tecnicas para obter melhores informacoes a partir do prompt de comando. Voce deve incluir mais informacoes relevantes e uteis para aprimorar o prompt sobre o assunto do mesmo. Segue o prompt de comando a ser melhorado: [{{PROMPT_ORIGINAL}}]',
      variables: [
        { name: 'PROMPT_ORIGINAL', label: 'Prompt Original', placeholder: 'Cole aqui o prompt que deseja melhorar...', required: true }
      ],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    },
    {
      id: uuidv4(), name: 'Pesquisa Academica', category: 'Produtividade', icon: '🎓',
      description: 'Pesquisa fundamentada em estudos publicados com referencias',
      promptText: 'Atue como um pesquisador. Utilize na sua resposta somente referencias a estudos publicados. Sempre que for fazer uma referencia, utilize o nome do autor, titulo do artigo e data de publicacao do artigo. O assunto que quero saber e: [{{ASSUNTO}}]',
      variables: [
        { name: 'ASSUNTO', label: 'Assunto da Pesquisa', placeholder: 'Ex: Impacto das redes sociais na saude mental', required: true }
      ],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    },
    {
      id: uuidv4(), name: 'Gerador de Relatorio', category: 'Produtividade', icon: '📊',
      description: 'Gera relatorio detalhado a partir de dados de planilha CSV',
      promptText: 'Analise os seguintes dados e gere um relatorio detalhado: [{{DADOS_CSV}}]',
      variables: [
        { name: 'DADOS_CSV', label: 'Dados CSV', placeholder: 'Cole aqui os dados da planilha em formato CSV...', required: true }
      ],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    },
    {
      id: uuidv4(), name: 'Gerador de Planilha', category: 'Produtividade', icon: '📋',
      description: 'Gera codigo CSV para importar no Google Planilhas',
      promptText: 'Crie o codigo CSV de uma planilha que sera importada no Google Planilhas, com a seguinte funcao: [{{FUNCAO_PLANILHA}}]',
      variables: [
        { name: 'FUNCAO_PLANILHA', label: 'Funcao da Planilha', placeholder: 'Ex: Controle de estoque com colunas de produto, quantidade e valor', required: true }
      ],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    },
    {
      id: uuidv4(), name: 'Gerador de Contrato', category: 'Produtividade', icon: '📄',
      description: 'Gera contrato completo com todas as clausulas relevantes',
      promptText: 'Como especialista em contratos, meu objetivo e escrever um contrato abrangente, incluindo todas as clausulas relevantes para o seguinte objetivo: [{{OBJETIVO_CONTRATO}}]',
      variables: [
        { name: 'OBJETIVO_CONTRATO', label: 'Objetivo do Contrato', placeholder: 'Ex: Prestacao de servicos de desenvolvimento web', required: true }
      ],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    },
    {
      id: uuidv4(), name: 'Apresentacao de Slides', category: 'Produtividade', icon: '📽️',
      description: 'Gera apresentacao em codigo LaTeX para converter em slides',
      promptText: 'Crie uma apresentacao em codigo latex sobre o seguinte tema: [{{TEMA}}]. A apresentacao deve ser profissional, com slides bem estruturados, incluindo titulo, topicos, sub-topicos e conclusao.',
      variables: [
        { name: 'TEMA', label: 'Tema da Apresentacao', placeholder: 'Ex: Inteligencia Artificial na Educacao', required: true }
      ],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    },
    {
      id: uuidv4(), name: 'Anuncio Discovery Google Ads', category: 'Ads', icon: '💡',
      description: 'Gera titulos e descricoes para rede Discovery do Google Ads',
      promptText: '$PRODUTO= ({{PRODUTO}}); Atue como um gerador de anuncios para a rede de discovery do Google Ads. Crie 5 ideias de titulos diferentes. Crie 5 ideias de descricao diferentes. O titulo deve possuir no maximo 40 caracteres. A descricao deve possuir no maximo 90 caracteres. O anuncio tem objetivo a venda do seguinte produto: $PRODUTO. Utilize informacoes adicionais sobre o produto para melhorar sua resposta: [{{INFO_PRODUTO}}]. Os titulos e as descricoes nao podem ser repetitivos.',
      variables: [
        { name: 'PRODUTO', label: 'Produto', placeholder: 'Nome do produto', required: true },
        { name: 'INFO_PRODUTO', label: 'Informacoes do Produto', placeholder: 'Detalhes extras...', required: false }
      ],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    }
  ];
}

// ============ TELEGRAM BOT API ============

// GET /api/telegram/status
app.get('/api/telegram/status', (req, res) => {
  try {
    const status = telegramBot.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/telegram/settings — formato para frontend vanilla (app.js)
app.get('/api/telegram/settings', (req, res) => {
  try {
    const config = telegramBot.getTelegramConfig();
    const status = telegramBot.getStatus();
    res.json({
      data: {
        botToken: config.botToken || '',
        botUsername: config.botName || 'cenorinha_bot',
        chatId: config.chatId || (config.authorizedUsers?.[0] ? String(config.authorizedUsers[0]) : ''),
        enabled: config.enabled || false,
        isRunning: status.isRunning,
        notifications: config.notifications || {},
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/telegram/settings — alias para salvar config (frontend vanilla)
app.post('/api/telegram/settings', (req, res) => {
  try {
    const raw = req.body;
    const updates = {};
    if (raw.botToken) updates.botToken = raw.botToken;
    if (raw.chatId) {
      updates.chatId = raw.chatId;
      const numId = Number(raw.chatId);
      if (!isNaN(numId)) {
        const currentConfig = telegramBot.getTelegramConfig();
        const users = currentConfig.authorizedUsers || [];
        if (!users.includes(numId)) {
          updates.authorizedUsers = [...users, numId];
        }
      }
    }
    if (raw.enabled !== undefined) updates.enabled = raw.enabled;
    if (raw.notifications) updates.notifications = raw.notifications;

    const updated = telegramBot.updateTelegramConfig(updates);

    // Se token alterado e bot ativo, reiniciar
    if (updates.botToken && telegramBot.getStatus().isRunning) {
      telegramBot.stop();
      setTimeout(() => telegramBot.start(updates.botToken), 2000);
    }
    // Se token novo e bot nao esta rodando e enabled, iniciar
    if (updates.botToken && !telegramBot.getStatus().isRunning && updates.enabled !== false) {
      telegramBot.start(updates.botToken);
    }

    res.json({ data: updated, message: 'Configuração salva' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/telegram/config
app.get('/api/telegram/config', (req, res) => {
  try {
    const config = telegramBot.getTelegramConfig();
    // Converter formato backend -> frontend
    const safeConfig = {};

    // Token mascarado
    if (config.botToken) {
      safeConfig.token = config.botToken.substring(0, 10) + '...' + config.botToken.slice(-4);
    } else {
      safeConfig.token = '';
    }

    // ChatId - campo direto ou primeiro authorizedUser
    safeConfig.chatId = config.chatId || (config.authorizedUsers?.[0] ? String(config.authorizedUsers[0]) : '');

    // Events array - converter de notifications ou usar campo events direto
    if (config.events) {
      safeConfig.events = config.events;
    } else {
      const events = [];
      if (config.notifications?.onTaskSuccess !== false) events.push('execution:completed');
      if (config.notifications?.onTaskFailure !== false) events.push('execution:failed');
      if (config.notifications?.onSchedulerEvent) events.push('task:created');
      safeConfig.events = events;
    }

    safeConfig.enabled = config.enabled || false;
    safeConfig.botName = config.botName || '';

    res.json(safeConfig);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/telegram/config
app.put('/api/telegram/config', (req, res) => {
  try {
    const raw = req.body;
    const updates = {};

    // Remapear 'token' -> 'botToken' (frontend envia 'token')
    if (raw.token) {
      updates.botToken = raw.token;
    }
    if (raw.botToken) {
      updates.botToken = raw.botToken;
    }

    // Salvar chatId e adicionar aos authorizedUsers
    if (raw.chatId) {
      updates.chatId = raw.chatId;
      const numId = Number(raw.chatId);
      if (!isNaN(numId)) {
        const currentConfig = telegramBot.getTelegramConfig();
        const users = currentConfig.authorizedUsers || [];
        if (!users.includes(numId)) {
          updates.authorizedUsers = [...users, numId];
        }
      }
    }

    // Salvar events
    if (raw.events) {
      updates.events = raw.events;
    }

    updates.enabled = true;

    const updated = telegramBot.updateTelegramConfig(updates);

    console.log(`[Server][${new Date().toISOString()}] INFO: Telegram config atualizada`);

    // Se o token foi alterado e bot esta ativo, reiniciar
    if (updates.botToken && telegramBot.getStatus().isRunning) {
      telegramBot.stop();
      setTimeout(() => telegramBot.start(updates.botToken), 2000);
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/telegram/start
app.post('/api/telegram/start', (req, res) => {
  try {
    const { token } = req.body || {};
    if (token) {
      telegramBot.updateTelegramConfig({ botToken: token, enabled: true });
    }
    const result = telegramBot.start(token);
    if (result) {
      res.json({ success: true, message: 'Telegram Bot iniciado' });
    } else {
      res.status(400).json({ success: false, message: 'Falha ao iniciar - verifique o token' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/telegram/stop
app.post('/api/telegram/stop', (req, res) => {
  try {
    telegramBot.stop();
    res.json({ success: true, message: 'Telegram Bot parado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/telegram/send - Enviar mensagem para usuarios autorizados
app.post('/api/telegram/send', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Mensagem obrigatoria' });
    }
    await telegramBot.sendNotification(message);
    res.json({ success: true, message: 'Mensagem enviada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ AI INTENT ANALYSIS API ============

// POST /api/ai/analyze-intent — Analisa conversas de um lead e detecta intencoes
app.post('/api/ai/analyze-intent', async (req, res) => {
  try {
    const { messages, notes, intents } = req.body;
    // intents = [{ name, description, keywords, tag }]
    if (!intents || !intents.length) {
      return res.status(400).json({ error: 'intents array required' });
    }

    const allText = [
      ...(messages || []).map(m => (m.content || '').toLowerCase()),
      (notes || '').toLowerCase(),
    ].join(' ');

    const results = [];
    for (const intent of intents) {
      const kws = (intent.keywords || '').toLowerCase().split('|').map(k => k.trim()).filter(Boolean);
      let score = 0;
      let matchedKeywords = [];

      for (const kw of kws) {
        // Contar ocorrencias para scoring
        const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const count = (allText.match(regex) || []).length;
        if (count > 0) {
          score += count;
          matchedKeywords.push(kw);
        }
      }

      // Score normalizado: % de keywords que deram match
      const confidence = kws.length ? (matchedKeywords.length / kws.length) : 0;

      results.push({
        tag: intent.tag,
        name: intent.name,
        matched: matchedKeywords.length > 0,
        confidence: Math.round(confidence * 100),
        score,
        matchedKeywords,
      });
    }

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ CREDENTIAL VAULT API ============

// POST /api/credentials/import-kb - MUST be before /:id routes
app.post('/api/credentials/import-kb', (req, res) => {
  try {
    const kbDir = path.join(__dirname, '..', 'knowledge-base');
    const result = credentialVault.importFromKB(kbDir);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/credentials - List all (no values)
app.get('/api/credentials', (req, res) => {
  try {
    const credentials = credentialVault.getAll();
    res.json(credentials);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/credentials/:id - Detail (masked value)
app.get('/api/credentials/:id', (req, res) => {
  try {
    const cred = credentialVault.getById(req.params.id);
    if (!cred) return res.status(404).json({ error: 'Credential not found' });
    res.json(cred);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/credentials - Create
app.post('/api/credentials', (req, res) => {
  try {
    const { name, value, category, description, source } = req.body;
    if (!name || !value) {
      return res.status(400).json({ error: 'Name and value are required' });
    }
    const cred = credentialVault.create({ name, value, category, description, source });
    broadcastUpdate('credential:created', { id: cred.id, name: cred.name });
    res.status(201).json(cred);
  } catch (error) {
    res.status(error.message.includes('already exists') ? 409 : 500).json({ error: error.message });
  }
});

// PUT /api/credentials/:id - Update
app.put('/api/credentials/:id', (req, res) => {
  try {
    const cred = credentialVault.update(req.params.id, req.body);
    if (!cred) return res.status(404).json({ error: 'Credential not found' });
    broadcastUpdate('credential:updated', { id: cred.id, name: cred.name });
    res.json(cred);
  } catch (error) {
    res.status(error.message.includes('already exists') ? 409 : 500).json({ error: error.message });
  }
});

// DELETE /api/credentials/:id - Delete
app.delete('/api/credentials/:id', (req, res) => {
  try {
    const success = credentialVault.remove(req.params.id);
    if (!success) return res.status(404).json({ error: 'Credential not found' });
    broadcastUpdate('credential:deleted', { id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/credentials/:id/reveal - Reveal value temporarily
app.post('/api/credentials/:id/reveal', (req, res) => {
  try {
    const result = credentialVault.reveal(req.params.id);
    if (!result) return res.status(404).json({ error: 'Credential not found' });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/credentials/:name/usage - Credential usage audit
app.get('/api/credentials/:name/usage', (req, res) => {
  try {
    const usage = credentialVault.getUsageLog(req.params.name);
    if (!usage) return res.status(404).json({ error: 'Credential not found' });
    res.json(usage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ CHAT IA — Claude Code CLI ============
// Usa o CLI do claude como subprocess com --output-format stream-json
// Sessões são persistidas em data/chat/<sessionId>.json

// Extrai itens de ação/tarefas do texto de resposta do Claude
function extractTasksFromText(text) {
  if (!text || text.length < 10) return [];
  const tasks = new Set();
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Markdown checklist: - [ ] Task ou - [x] Task
    const checklistMatch = trimmed.match(/^[-*]\s+\[[ xX]\]\s+(.+)/);
    if (checklistMatch) {
      tasks.add(checklistMatch[1].trim());
      continue;
    }

    // Lista numerada: 1. Task ou 1) Task
    const numberedMatch = trimmed.match(/^\d+[.)]\s+(.+)/);
    if (numberedMatch && numberedMatch[1].length > 5 && numberedMatch[1].length < 120) {
      tasks.add(numberedMatch[1].trim());
      continue;
    }

    // Linhas com TODO: ou TASK:
    const todoMatch = trimmed.match(/^(?:TODO|TASK|TAREFA|A[CÇ][AÃ]O|ACTION)[:\s]+(.+)/i);
    if (todoMatch) {
      tasks.add(todoMatch[1].trim());
    }
  }

  // Máximo 10 tarefas por conversa para evitar spam
  return Array.from(tasks).slice(0, 10);
}

const CHAT_DIR = path.join(__dirname, 'data', 'chat');

if (!fs.existsSync(CHAT_DIR)) fs.mkdirSync(CHAT_DIR, { recursive: true });

function chatSessionFile(sessionId) {
  return path.join(CHAT_DIR, `${sessionId}.json`);
}

function loadChatSession(sessionId) {
  const f = chatSessionFile(sessionId);
  if (!fs.existsSync(f)) return null;
  try { return JSON.parse(fs.readFileSync(f, 'utf-8')); } catch { return null; }
}

function saveChatSession(session) {
  fs.writeFileSync(chatSessionFile(session.id), JSON.stringify(session, null, 2));
}

function listChatSessions() {
  if (!fs.existsSync(CHAT_DIR)) return [];
  return fs.readdirSync(CHAT_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(CHAT_DIR, f), 'utf-8')); } catch { return null; }
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

// GET /api/chat/sessions — listar todas as sessões
app.get('/api/chat/sessions', (_req, res) => {
  const sessions = listChatSessions().map(s => ({
    id: s.id,
    title: s.title,
    claudeSessionId: s.claudeSessionId,
    messageCount: (s.messages || []).length,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));
  res.json(sessions);
});

// POST /api/chat/sessions — criar nova sessão
app.post('/api/chat/sessions', (req, res) => {
  const { title } = req.body;
  const session = {
    id: uuidv4(),
    title: title || 'Nova Conversa',
    claudeSessionId: null,
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Criar sessão de memória vinculada ao chat
  try {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const memorySessionId = `session_${timestamp}_${random}`;
    const memorySession = {
      id: memorySessionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      context: {
        objective: `Chat IA: ${session.title}`,
        currentPhase: 'chat',
        workingDirectory: null,
        projectType: 'chat',
        technologies: ['Claude Code CLI']
      },
      tasks: [],
      actionHistory: [{ timestamp: new Date().toISOString(), type: 'session_created', data: { source: 'chat', chatSessionId: session.id } }],
      artifacts: [], decisions: [], errorsAndSolutions: [], checkpoints: [],
      metadata: { totalInteractions: 0, lastCommand: null, lastKBQuery: null, agentsUsed: [], chatSessionId: session.id }
    };
    writeSession(memorySession);
    setActiveSession(memorySessionId);
    session.memorySessionId = memorySessionId;
    broadcastUpdate('memory:session_created', memorySession);
    console.log('[Chat] Sessão de memória criada:', memorySessionId);
  } catch (memErr) {
    console.error('[Chat] Erro ao criar sessão de memória:', memErr.message);
    // Não bloquear criação do chat em caso de erro de memória
  }

  saveChatSession(session);
  res.json(session);
});

// GET /api/chat/sessions/:id — detalhes da sessão com mensagens
app.get('/api/chat/sessions/:id', (req, res) => {
  const session = loadChatSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
  res.json(session);
});

// DELETE /api/chat/sessions/:id — deletar sessão
app.delete('/api/chat/sessions/:id', (req, res) => {
  const f = chatSessionFile(req.params.id);
  if (!fs.existsSync(f)) return res.status(404).json({ error: 'Sessão não encontrada' });
  fs.unlinkSync(f);
  res.json({ success: true });
});

// PUT /api/chat/sessions/:id/title — renomear sessão
app.put('/api/chat/sessions/:id/title', (req, res) => {
  const session = loadChatSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
  session.title = req.body.title || session.title;
  session.updatedAt = new Date().toISOString();
  saveChatSession(session);
  res.json(session);
});

// POST /api/chat/sessions/:id/send — enviar mensagem e stremar resposta via OpenRouter
// Usa SSE: Content-Type: text/event-stream
// Eventos: { type: "text", text: "..." } | { type: "log", log: {...} } | { type: "done" } | { type: "error", error: "..." }
// Suporta tool calling via JSON embutido no texto do modelo
app.post('/api/chat/sessions/:id/send', async (req, res) => {
  // Rate limiting: 5 req/min por session, 30 req/min por IP
  const { checkRateLimit } = require('./tool-utils');
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  const sessionLimit = checkRateLimit(`session:${req.params.id}`, 5, 60000);
  const ipLimit = checkRateLimit(`ip:${clientIP}`, 30, 60000);

  if (!sessionLimit.allowed) {
    return res.status(429).json({
      error: 'Rate limit excedido para esta sessao',
      retryAfter: sessionLimit.retryAfter,
      limit: '5 req/min por sessao'
    });
  }
  if (!ipLimit.allowed) {
    return res.status(429).json({
      error: 'Rate limit excedido para este IP',
      retryAfter: ipLimit.retryAfter,
      limit: '30 req/min por IP'
    });
  }

  const session = loadChatSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Sessao nao encontrada' });

  const { content, model } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: 'Mensagem vazia' });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const sendEvent = (data) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      if (typeof res.flush === 'function') res.flush();
    }
  };

  const userMessage = { role: 'user', content: content.trim(), createdAt: new Date().toISOString() };
  session.messages.push(userMessage);

  const openrouterClient = require('./openrouter-client');
  const selectedModel = model || process.env.OPENROUTER_DEFAULT_MODEL || openrouterClient.DEFAULT_MODEL;
  let clientDisconnected = false;
  const abortController = new AbortController();

  // Quando o cliente desconecta (navega para outra aba), NÃO abortamos a execução.
  // O processamento continua em background e o resultado é salvo na sessão.
  // Ao voltar para a conversa, o usuário verá a resposta completa.
  res.on('close', () => {
    if (!res.writableEnded) {
      clientDisconnected = true;
      console.log('[Chat] Cliente desconectou — execução continua em background para sessão:', session.id);
    }
  });

  console.log('[Chat] Chamando OpenRouter API | model:', selectedModel, '| mensagens:', session.messages.length);

  try {
    const { TOOLS_DEF, executeTool } = require('./chat-tools');
    const credentialVault = require('./credential-vault');
    const toolUtils = require('./tool-utils');

    // TOOLS_DEF ja esta no formato OpenAI function calling
    const openaiTools = TOOLS_DEF;

    // System prompt base — enriquecido com todas as ferramentas disponíveis
    const BASE_SYSTEM_PROMPT = `Você é um assistente de automação inteligente integrado ao sistema CRM + Task Scheduler da Riwer Labs. Você tem acesso a 21 ferramentas poderosas que permitem executar tarefas reais no sistema, na internet e nos arquivos do usuário.

## COMO USAR FERRAMENTAS
Responda com JSON em qualquer parte do texto para chamar uma ferramenta:
{"tool_call": {"name": "NOME_DA_FERRAMENTA", "args": {"param": "valor"}}}

Você pode encadear múltiplas ferramentas — use o resultado de uma para alimentar a próxima.
SEMPRE gere uma resposta textual após usar ferramentas, explicando o que foi feito.

---

## 🔐 CREDENCIAIS E APIs

### 1. get_credential(name)
Obtém segredos do vault criptografado. Use SEMPRE antes de chamar APIs externas.
**Credenciais disponíveis:** FB_ACCESS_TOKEN, FB_APP_ID, FB_APP_SECRET, FB_AD_ACCOUNT_ID, SHOPIFY_ACCESS_TOKEN, PINHA_SHOPIFY_ACCESS_TOKEN, PINHA_SHOP_NAME, EVOLUTION_API_KEY, EVOLUTION_INSTANCE_TOKEN, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, SULETIQUETAS_WC_CONSUMER_KEY, SULETIQUETAS_WC_CONSUMER_SECRET, SULETIQUETAS_WC_STORE_URL, SERVER_IP, VNC_PASSWORD, ACTIVECAMPAIGN_API_KEY, ACTIVECAMPAIGN_API_URL, GLM_API_KEY, GLM_API_URL.
**Exemplo:** {"tool_call": {"name": "get_credential", "args": {"name": "FB_ACCESS_TOKEN"}}}

### 2. fetch_api(url, method?, headers?, body?)
Chamadas HTTP a APIs externas: Meta Ads, Shopify, WhatsApp/Evolution, Google, WooCommerce, etc.
Use get_credential PRIMEIRO para obter tokens de autenticação.
**Exemplo — Meta Ads:** {"tool_call": {"name": "fetch_api", "args": {"url": "https://graph.facebook.com/v19.0/act_ID/campaigns?access_token=TOKEN", "method": "GET"}}}
**Exemplo — POST com JSON:** {"tool_call": {"name": "fetch_api", "args": {"url": "https://api.exemplo.com/endpoint", "method": "POST", "headers": {"Authorization": "Bearer TOKEN", "Content-Type": "application/json"}, "body": "{\"campo\": \"valor\"}"}}}

### 3. call_crm(endpoint, method?, body?, query?)
Chamadas ao CRM local autenticadas automaticamente.
**Endpoints principais:**
- GET /leads — lista leads (query: search=nome, status=active, limit=50)
- POST /leads — cria lead
- GET /leads/:id — detalhe do lead
- POST /leads/:id/notes — adiciona nota
- POST /messages/whatsapp — envia WhatsApp (body: {leadId, content})
- POST /messages/email — envia email
- GET /campaigns — lista campanhas
- GET /personal-tasks — tarefas pessoais
- GET /finance/summary — resumo financeiro do mês (query: month=3&year=2026)
- GET /finance/transactions — transações financeiras
- GET /notes — notas pessoais
- GET /calendar/events — eventos do calendário
- GET /settings — configurações do sistema
**Exemplo:** {"tool_call": {"name": "call_crm", "args": {"endpoint": "/leads", "query": "status=active&limit=20"}}}

---

## 🗂️ CRM — GUIA COMPLETO: TAREFAS, FINANÇAS, NOTAS E CALENDÁRIO

> ⚠️ ATENÇÃO: Os endpoints abaixo são sub-rotas. NUNCA chame /finance, /notes ou /personal-tasks sem um sub-endpoint — isso retorna 404. Use sempre o caminho completo conforme documentado.

---

### 📋 TAREFAS PESSOAIS (/personal-tasks)

**Listar todas as tarefas:**
{"tool_call": {"name": "call_crm", "args": {"endpoint": "/personal-tasks", "query": "status=pending&limit=50"}}}

**Filtros disponíveis (query string):**
- status: pending | in_progress | completed | cancelled
- priority: low | medium | high | urgent
- search: texto livre no título
- tag: filtrar por tag específica
- page, limit: paginação

**Estatísticas gerais (contagem por status e prioridade):**
{"tool_call": {"name": "call_crm", "args": {"endpoint": "/personal-tasks/stats"}}}

**Criar tarefa:**
{"tool_call": {"name": "call_crm", "args": {"endpoint": "/personal-tasks", "method": "POST", "body": {"title": "Título da tarefa", "description": "Descrição opcional", "priority": "high", "dueDate": "2026-03-15T23:59:59Z", "tags": ["tag1", "tag2"]}}}}

**Atualizar status rapidamente:**
{"tool_call": {"name": "call_crm", "args": {"endpoint": "/personal-tasks/ID_DA_TASK/status", "method": "PUT", "body": {"status": "completed"}}}}

**Atualizar campos completos:**
{"tool_call": {"name": "call_crm", "args": {"endpoint": "/personal-tasks/ID_DA_TASK", "method": "PUT", "body": {"title": "Novo título", "priority": "urgent"}}}}

**Perguntas comuns e como responder:**
- "Quais tarefas estão pendentes?" → /personal-tasks?status=pending
- "Tarefas urgentes?" → /personal-tasks?priority=urgent&status=pending
- "Quantas tarefas tenho?" → /personal-tasks/stats
- "Tarefas para esta semana?" → /personal-tasks?status=pending (filtrar dueDate no resultado)

---

### 💰 FINANÇAS (/finance/...)

> CRÍTICO: /finance SOZINHO retorna 404. Sempre use sub-rotas: /finance/summary, /finance/transactions, etc.

**Resumo financeiro do mês atual (receitas, despesas, saldo):**
{"tool_call": {"name": "call_crm", "args": {"endpoint": "/finance/summary"}}}

**Resumo de um mês específico:**
{"tool_call": {"name": "call_crm", "args": {"endpoint": "/finance/summary", "query": "month=3&year=2026"}}}

**Balanço mensal histórico:**
{"tool_call": {"name": "call_crm", "args": {"endpoint": "/finance/balance/monthly"}}}

**Listar transações — todas:**
{"tool_call": {"name": "call_crm", "args": {"endpoint": "/finance/transactions", "query": "month=3&year=2026"}}}

**Listar contas NÃO PAGAS (a pagar) do mês:**
{"tool_call": {"name": "call_crm", "args": {"endpoint": "/finance/transactions", "query": "paid=false&month=3&year=2026"}}}

**Listar contas JÁ PAGAS do mês:**
{"tool_call": {"name": "call_crm", "args": {"endpoint": "/finance/transactions", "query": "paid=true&month=3&year=2026"}}}

**Filtros de transações disponíveis (query string):**
- paid: true | false — filtra por status de pagamento
- month: 1-12 — mês
- year: ex. 2026
- categoryId: ID da categoria
- isRecurring: true | false — recorrentes
- dateFrom / dateTo: intervalo de datas (ISO)
- search: busca por descrição
- page, limit: paginação

**Criar transação (despesa ou receita):**
{"tool_call": {"name": "call_crm", "args": {"endpoint": "/finance/transactions", "method": "POST", "body": {"description": "Conta de luz", "amount": 250.00, "date": "2026-03-05", "categoryId": "ID_OPCIONAL", "paid": false, "isRecurring": false}}}}

**Marcar transação como paga:**
{"tool_call": {"name": "call_crm", "args": {"endpoint": "/finance/transactions/ID_DA_TRANSACAO", "method": "PUT", "body": {"paid": true}}}}

**Listar categorias financeiras:**
{"tool_call": {"name": "call_crm", "args": {"endpoint": "/finance/categories"}}}

**Criar categoria:**
{"tool_call": {"name": "call_crm", "args": {"endpoint": "/finance/categories", "method": "POST", "body": {"name": "Alimentação", "type": "expense"}}}}

**Orçamentos (budgets) do mês:**
{"tool_call": {"name": "call_crm", "args": {"endpoint": "/finance/budgets", "query": "month=3&year=2026"}}}

**Metas financeiras:**
{"tool_call": {"name": "call_crm", "args": {"endpoint": "/finance/goals"}}}

**Investimentos:**
{"tool_call": {"name": "call_crm", "args": {"endpoint": "/finance/investments"}}}

**Perguntas comuns e como responder:**
- "Quanto falta pagar este mês?" → /finance/transactions?paid=false&month=MÊS&year=ANO (somar campo amount)
- "Quanto já paguei?" → /finance/transactions?paid=true&month=MÊS&year=ANO
- "Qual meu saldo do mês?" → /finance/summary?month=MÊS&year=ANO (campo saldo/balance)
- "Quais são minhas despesas?" → /finance/transactions?month=MÊS&year=ANO + filtrar por categorias de tipo expense
- "Resumo financeiro" → /finance/summary (retorna totalReceitas, totalDespesas, saldo)
- "Metas financeiras" → /finance/goals
- "Investimentos" → /finance/investments

---

### 📝 NOTAS (/notes/...)

**Listar todas as notas:**
{"tool_call": {"name": "call_crm", "args": {"endpoint": "/notes"}}}

**Filtros disponíveis:**
- search: busca no título e conteúdo
- categoryId: filtrar por categoria
- pinned: true | false
- archived: true | false
- page, limit: paginação

**Buscar nota específica:**
{"tool_call": {"name": "call_crm", "args": {"endpoint": "/notes", "query": "search=termo+de+busca"}}}

**Criar nota:**
{"tool_call": {"name": "call_crm", "args": {"endpoint": "/notes", "method": "POST", "body": {"title": "Título da nota", "content": "Conteúdo em markdown", "categoryId": "ID_OPCIONAL"}}}}

**Fixar/desafixar nota (toggle pin):**
{"tool_call": {"name": "call_crm", "args": {"endpoint": "/notes/ID_DA_NOTA/pin", "method": "PUT"}}}

**Arquivar/desarquivar nota (toggle archive):**
{"tool_call": {"name": "call_crm", "args": {"endpoint": "/notes/ID_DA_NOTA/archive", "method": "PUT"}}}

**Categorias de notas:**
{"tool_call": {"name": "call_crm", "args": {"endpoint": "/notes/categories"}}}

**Criar categoria de nota:**
{"tool_call": {"name": "call_crm", "args": {"endpoint": "/notes/categories", "method": "POST", "body": {"name": "Ideias"}}}}

---

### 📅 CALENDÁRIO (/calendar/...)

> Nota: /calendar/availability é público. Os demais endpoints também são acessíveis.

**Listar eventos do mês atual:**
{"tool_call": {"name": "call_crm", "args": {"endpoint": "/calendar/events"}}}

**Listar eventos de mês/ano específico:**
{"tool_call": {"name": "call_crm", "args": {"endpoint": "/calendar/events", "query": "month=3&year=2026"}}}

**Listar eventos por intervalo de datas:**
{"tool_call": {"name": "call_crm", "args": {"endpoint": "/calendar/events", "query": "timeMin=2026-03-01T00:00:00.000Z&timeMax=2026-03-31T23:59:59.000Z"}}}

**Criar evento:**
{"tool_call": {"name": "call_crm", "args": {"endpoint": "/calendar/events", "method": "POST", "body": {"title": "Reunião com cliente", "start": "2026-03-10T10:00:00.000Z", "end": "2026-03-10T11:00:00.000Z", "description": "Detalhes da reunião", "location": "Google Meet", "isAllDay": false}}}}

**Deletar evento:**
{"tool_call": {"name": "call_crm", "args": {"endpoint": "/calendar/events/ID_DO_EVENTO", "method": "DELETE"}}}

**Verificar datas bloqueadas do mês (disponibilidade):**
{"tool_call": {"name": "call_crm", "args": {"endpoint": "/calendar/availability", "query": "month=2026-03"}}}

**Perguntas comuns e como responder:**
- "O que tenho para hoje/semana/mês?" → /calendar/events?month=MÊS&year=ANO (filtrar por data)
- "Tenho compromissos em [data]?" → /calendar/events com timeMin/timeMax do dia
- "Criar lembrete/evento" → POST /calendar/events com title, start, end obrigatórios

---

### 4. search_kb(query)
Busca na Knowledge Base local com documentações completas de APIs.
**Use quando:** precisar saber endpoints, parâmetros, autenticação de qualquer API (Meta Ads, Shopify, Evolution, Google, WooCommerce, ActiveCampaign, GLM, etc.)
**Exemplo:** {"tool_call": {"name": "search_kb", "args": {"query": "Meta Ads criar campanha de conversão"}}}

---

## 📁 ARQUIVOS E SISTEMA

### 5. read_file(path, encoding?, maxBytes?)
Lê arquivo local. Aceita caminho absoluto (C:/...) ou URL file:// (file:///C:/...).
**Exemplo:** {"tool_call": {"name": "read_file", "args": {"path": "~/Desktop/proposta.html", "maxBytes": 10000}}}

### 6. write_file(path, content, encoding?, append?)
Cria ou sobrescreve arquivo. append:true adiciona ao final. Cria pastas automaticamente.
**Exemplo:** {"tool_call": {"name": "write_file", "args": {"path": "~/Downloads/relatorio.txt", "content": "Conteúdo aqui"}}}

### 7. list_directory(path, recursive?, filter?)
Lista arquivos com tamanho e data. filter filtra por extensão (".js", ".html").
**Exemplo:** {"tool_call": {"name": "list_directory", "args": {"path": "~/Desktop", "filter": ".html"}}}

### 8. delete_file(path, force?)
Deleta arquivo ou pasta. force:true remove pasta com conteúdo (IRREVERSÍVEL — confirme com usuário antes).
**Exemplo:** {"tool_call": {"name": "delete_file", "args": {"path": "~/Downloads/temp.txt"}}}

### 9. move_file(source, destination, overwrite?)
Move ou renomeia arquivo/pasta.
**Exemplo:** {"tool_call": {"name": "move_file", "args": {"source": "~/Desktop/rascunho.html", "destination": "~/Desktop/final.html", "overwrite": true}}}

### 10. file_info(path)
Metadados completos: tipo, tamanho, extensão, datas de criação/modificação, readonly.
**Exemplo:** {"tool_call": {"name": "file_info", "args": {"path": "~/Desktop/site.zip"}}}

### 11. diff_files(fileA, fileB, context?)
Compara dois arquivos linha a linha (estilo git diff).
**Exemplo:** {"tool_call": {"name": "diff_files", "args": {"fileA": "C:/antes.js", "fileB": "C:/depois.js", "context": 5}}}

---

## 💻 TERMINAL E DESENVOLVIMENTO

### 12. run_command(command, cwd?, timeout?, shell?)
**A ferramenta mais poderosa para desenvolvimento.** Executa qualquer comando no terminal.
shell: auto (detecta SO), bash, powershell, cmd. timeout: segundos (máx. 300).
**⚠️ Windows:** Use caminhos C:/... NUNCA use ~. Para cmd use shell:"cmd".
**Exemplos práticos:**
- Instalar dependências: {"tool_call": {"name": "run_command", "args": {"command": "npm install", "cwd": "~/Desktop/meu-projeto"}}}
- Executar Python: {"tool_call": {"name": "run_command", "args": {"command": "python script.py", "cwd": "~/Desktop"}}}
- Docker: {"tool_call": {"name": "run_command", "args": {"command": "docker ps", "shell": "powershell"}}}
- Compilar: {"tool_call": {"name": "run_command", "args": {"command": "npm run build", "cwd": "~/Desktop/projeto", "timeout": 120}}}

### 13. execute_node(code)
Executa código Node.js inline. Captura stdout E stderr.
**Use para:** scripts rápidos, cálculos, processamento de dados, operações HTTP com lógica complexa.
**Tem acesso a:** fs, path, http, https, crypto, child_process, os.
**URL do CRM:** http://localhost:${process.env.PORT || 8000}/api/crm (token: local-dev-token)
**Exemplo:**
{"tool_call": {"name": "execute_node", "args": {"code": "const fs = require('fs');\nconst files = fs.readdirSync('~/Desktop');\nconsole.log(files.join('\\n'));"}}}

### 14. git(action, args?, cwd?)
Operações Git completas.
actions: status, log, diff, add, commit, push, pull, branch, checkout, clone, stash, reset, init, remote, tag, fetch, merge, rebase, show.
**Exemplos:**
- Ver histórico: {"tool_call": {"name": "git", "args": {"action": "log", "args": "--oneline -10", "cwd": "~/Desktop/projeto"}}}
- Commit: {"tool_call": {"name": "git", "args": {"action": "commit", "args": "-m \"feat: nova funcionalidade\"", "cwd": "~/Desktop/projeto"}}}

### 15. search_in_files(pattern, path, recursive?, fileFilter?, caseSensitive?, maxResults?)
Busca texto/regex dentro de arquivos (grep). Ignora node_modules e .git.
**Exemplo — achar todos os TODOs:** {"tool_call": {"name": "search_in_files", "args": {"pattern": "TODO|FIXME", "path": "~/Desktop/projeto", "fileFilter": ".js"}}}

### 16. find_files(path, pattern, recursive?, maxResults?)
Encontra arquivos por nome/glob. Ignora node_modules e .git.
**Exemplos:**
- {"tool_call": {"name": "find_files", "args": {"path": "~", "pattern": "*.html"}}}
- {"tool_call": {"name": "find_files", "args": {"path": "~/Desktop", "pattern": "package.json"}}}

### 17. process_manager(action, pid?, port?, name?)
Gerencia processos do sistema.
- list: lista processos node/python/java ativos
- kill: mata processo pelo PID ({"pid": 1234})
- port_info: qual processo está na porta ({"port": 3000})
- find_by_name: encontra PIDs pelo nome ({"name": "node"})
**⚠️ NUNCA mate processos sem confirmar com o usuário.**

### 18. open_url(url)
Abre URL ou arquivo no navegador/programa padrão do sistema.
**Exemplo:** {"tool_call": {"name": "open_url", "args": {"url": "http://localhost:8000"}}}

---

## 🌐 WEB E ANÁLISE

### 19. scrape_website(url, includeText?, maxTextLength?)
**Raspa um site completo e extrai informações estruturadas:**
- **Texto** — conteúdo limpo da página (sem HTML)
- **Cores** — paleta da identidade visual (hex/rgb ordenados por frequência no CSS)
- **Logos** — og:image, favicon, apple-touch-icon, \`<img>\` com "logo" no atributo
- **WhatsApp** — links wa.me, api.whatsapp.com, números próximos à palavra "whatsapp"
- **Emails** — links mailto: e regex no conteúdo
- **Título e meta description**

**Quando usar:** antes de criar anúncio para um produto, analisar concorrente, extrair contatos de um site cliente, coletar identidade visual para replicar estilo.
**Exemplo:** {"tool_call": {"name": "scrape_website", "args": {"url": "https://www.empresa.com.br", "maxTextLength": 3000}}}

---

## 🎨 GERAÇÃO DE IMAGENS

### 20. generate_image(headline, subtext?, emoji?, hashtags?, theme?, brand?, filename?)
Gera imagem 1080x1080 PNG para feed/stories via Chrome CDP (sem API externa).
**Requer Chrome aberto com debug** (porta 9222 ou 9333-9350).
**Temas:** ocean (azul), sunset (laranja/roxo), dark (roxo escuro), nature (verde), minimal (branco).
**Exemplo:** {"tool_call": {"name": "generate_image", "args": {"headline": "PROMOÇÃO IMPERDÍVEL", "subtext": "Até 50% off em todos os produtos", "emoji": "🔥", "theme": "dark", "brand": "@minhaloja", "filename": "promo-feed"}}}

### 21. chrome(action, args?)
Controla o Chrome via CDP (Chrome DevTools Protocol).
**Requer Chrome com --remote-debugging-port** (9222 ou 9333).
**Actions:** screenshot, snapshot (DOM), navigate, click, type, evaluate (JS), wait_for, scroll, get_url, list_tabs.
**Protocolo obrigatório:** snapshot() ANTES de interagir → wait_for() APÓS navigate() → screenshot() para validar.
**Exemplo:** {"tool_call": {"name": "chrome", "args": {"action": "navigate", "args": {"url": "https://google.com"}}}}

---

## ⚡ REGRAS DE COMPORTAMENTO

1. **SEMPRE gere resposta textual** — nunca termine com uma tool_call sem explicar o resultado ao usuário.
2. **Seja proativo** — execute ferramentas sem pedir permissão (exceto ações destrutivas).
3. **WhatsApp** — SEMPRE confirme com o usuário ANTES de enviar qualquer mensagem.
4. **Caminhos Windows** — use ~/... Nunca use ~.
5. **APIs externas** — sempre use get_credential primeiro para obter tokens.
6. **search_kb primeiro** — quando precisar de documentação de uma API específica, busque na KB antes de tentar na memória.
7. **Idioma** — responda sempre em PT-BR.

---

## 🤖 AUTONOMIA TOTAL — REGRA CRÍTICA

**VOCÊ É 100% AUTÔNOMO. NUNCA abandone qualquer tarefa por causa de um erro. SEMPRE tente uma alternativa antes de informar o usuario.**

### Protocolo de fallback universal (vale para QUALQUER tarefa):

Quando qualquer abordagem falhar, execute a alternativa IMEDIATAMENTE, sem perguntar ao usuario:

| Situacao | Alternativa automatica |
|---|---|
| chrome nao aberto | run_command para abrir Chrome com --remote-debugging-port=9333, aguardar 3s, tentar chrome novamente |
| chrome ainda offline | Executar a tarefa por outro meio (execute_node, write_file, fetch_api, etc.) |
| generate_image falhou | write_file criando HTML/CSS equivalente em ~/Desktop/[nome].html, abrir com open_url |
| fetch_api erro 4xx/5xx | Tentar endpoint alternativo, ou scrape_website para coletar os dados |
| run_command falhou | Tentar com shell diferente: powershell vs cmd vs bash |
| read_file nao encontrado | find_files para localizar o arquivo correto antes de desistir |
| execute_node erro de modulo | Reescrever o script sem a dependencia ausente (usar modulos nativos do Node.js) |
| execute_node erro de logica | Corrigir o script e tentar novamente |
| call_crm falhou | fetch_api direto para http://localhost:8000/api/crm/... com Authorization: Bearer local-dev-token |
| API externa retornou erro | Verificar credenciais com get_credential, ajustar parametros, tentar novamente |
| arquivo/pasta nao existe | Criar com write_file ou run_command antes de prosseguir |
| dependencia npm ausente | run_command para instalar o pacote, depois tentar novamente |

### Regras de ouro (aplicam a QUALQUER tarefa):
- **NUNCA** diga "nao foi possivel" sem antes ter tentado TODAS as alternativas viaveis
- **NUNCA** peca ao usuario para abrir Chrome, instalar algo, criar pasta ou fazer qualquer acao manual sem antes ter tentado fazer isso automaticamente
- **NUNCA** abandone no meio — se o Plano A falhou, execute o Plano B automaticamente
- **SEMPRE** entregue algum resultado concreto: arquivo criado, dado retornado, codigo escrito, relatorio gerado
- **SE** todas as alternativas falharem: explique o que tentou, o que deu errado e o que o usuario precisa fazer para resolver

---

---

## 📸 INSTAGRAM (instagrapi)

### 22. instagram(action, ...args)
Interage com Instagram via servico Python local (porta 8001). Requer conta conectada em Configuracoes > Instagram.

**Verificar status primeiro:**
{"tool_call": {"name": "instagram", "args": {"action": "status"}}}

**Actions e argumentos:**
- status — verifica autenticacao
- feed — feed da conta (amount?)
- user — perfil de usuario (username, posts?)
- my_posts — seus posts (amount?)
- hashtag — posts de hashtag (tag, amount?)
- followers — seguidores (username, amount?)
- following — quem segue (username, amount?)
- like — curtir post (media_id ou URL)
- unlike — descurtir (media_id)
- comment — comentar (media_id, text)
- follow — seguir (username)
- unfollow — deixar de seguir (username)
- dm — mensagem direta (username, text)
- dm_inbox — caixa de DMs (amount?)
- post_photo — publicar foto (image_path, caption?)
- post_reel — publicar reel (video_path, caption?, thumbnail_path?)
- story — publicar story (image_path)
- search_users — buscar usuarios (query)

**Exemplos:**
{"tool_call": {"name": "instagram", "args": {"action": "user", "username": "fiberoficial", "posts": 6}}}
{"tool_call": {"name": "instagram", "args": {"action": "hashtag", "tag": "crossfit", "amount": 9}}}
{"tool_call": {"name": "instagram", "args": {"action": "dm", "username": "fulano", "text": "Oi, vi seu post sobre treino!"}}}
{"tool_call": {"name": "instagram", "args": {"action": "post_photo", "image_path": "~/Desktop/foto.jpg", "caption": "Nova colecao disponivel! #fiber"}}}

**IMPORTANTE:** Se o servico retornar erro de conexao, diga ao usuario para iniciar em Configuracoes > Instagram.

---

## 📦 OPERAÇÕES EM MASSA
Para processar muitos registros (leads em lote, exportar dados, verificar múltiplos itens):
Use **execute_node** com script completo que faz paginação e retorna resumo.
NÃO use call_crm em loop — os resultados ficam truncados.`;

    // Ler custom system prompt salvo pelo usuário (se houver)
    const chatAIConfig = storage.getConfig().chatAI || {};
    const customPrompt = chatAIConfig.customSystemPrompt || '';
    const CHAT_SYSTEM_PROMPT = customPrompt
      ? `${BASE_SYSTEM_PROMPT}\n\n---\n\n## INSTRUÇÕES ADICIONAIS DO USUÁRIO\n${customPrompt}`
      : BASE_SYSTEM_PROMPT;

    // Context Summarization Dinamico: em vez de cortar em MAX_HISTORY fixo,
    // sumarizar mensagens antigas via LLM e manter ultimas 10 intactas.
    const RECENT_KEEP = 10;
    const SUMMARIZE_THRESHOLD = 20;
    const allMsgs = session.messages.filter(m => m.role === 'user' || m.role === 'assistant');
    let historySlice;
    let contextSummary = null;

    if (allMsgs.length <= SUMMARIZE_THRESHOLD) {
      historySlice = allMsgs;
    } else {
      const anchor = allMsgs[0];
      const recent = allMsgs.slice(-RECENT_KEEP);
      const oldMsgs = allMsgs.slice(1, allMsgs.length - RECENT_KEEP);

      // Verificar se ja temos sumario cacheado para esta sessao
      const summaryKey = `summary_${session.id}_${oldMsgs.length}`;
      if (!session._contextSummaryCache || session._contextSummaryCacheKey !== summaryKey) {
        try {
          // Sumarizar mensagens antigas via LLM (modelo rapido/barato)
          const summaryMessages = [
            { role: 'system', content: 'Resuma a conversa abaixo em 1 paragrafo conciso (max 500 palavras), preservando: decisoes tomadas, resultados de ferramentas, dados importantes, e pendencias. Responda APENAS com o resumo, sem preambulo.' },
            { role: 'user', content: oldMsgs.map(m => `[${m.role}]: ${(m.content || '').substring(0, 500)}`).join('\n') }
          ];
          const summaryResult = await openrouterClient.complete(summaryMessages, {
            model: 'google/gemini-2.0-flash-001',
            maxTokens: 800,
            temperature: 0.3,
            fallbackModels: ['z-ai/glm-4.7-flash']
          });
          contextSummary = summaryResult.text;
          session._contextSummaryCache = contextSummary;
          session._contextSummaryCacheKey = summaryKey;
          console.log('[Chat] Context summarization: sumarizou', oldMsgs.length, 'mensagens antigas');
        } catch (sumErr) {
          console.error('[Chat] Erro ao sumarizar contexto:', sumErr.message);
          // Fallback: usar ancora + recentes sem sumario
        }
      } else {
        contextSummary = session._contextSummaryCache;
      }

      historySlice = recent[0] === anchor ? recent : [anchor, ...recent];
    }

    // Construir historico de mensagens com prompt caching no system prompt
    const systemContent = contextSummary
      ? CHAT_SYSTEM_PROMPT + `\n\n---\n\n## RESUMO DA CONVERSA ANTERIOR\n${contextSummary}`
      : CHAT_SYSTEM_PROMPT;

    const messages = [
      {
        role: 'system',
        content: [
          {
            type: 'text',
            text: systemContent,
            cache_control: { type: 'ephemeral' }
          }
        ]
      }
    ];
    for (const msg of historySlice) {
      messages.push({ role: msg.role, content: msg.content || '' });
    }

    let assistantText = '';
    const assistantLogs = [];
    let iteration = 0;

    /**
     * Extrai tool calls completas do texto usando varredura de chaves balanceadas.
     * Resolve dois bugs do regex anterior:
     *   1. Regex falhava com args com objetos aninhados (> 1 nível)
     *   2. Não detectava tool call parcial no fim da stream
     * Retorna { calls: [{name, args}], hasPartial: bool }
     */
    function extractToolCalls(text) {
      const calls = [];
      let i = 0;
      let hasPartial = false;

      while (i < text.length) {
        const idx = text.indexOf('{"tool_call"', i);
        if (idx === -1) break;

        // Verificar se há uma abertura de objeto mas sem fechamento completo
        let depth = 0;
        let j = idx;
        let inString = false;
        let escape = false;
        let complete = false;

        while (j < text.length) {
          const c = text[j];
          if (escape) { escape = false; j++; continue; }
          if (c === '\\' && inString) { escape = true; j++; continue; }
          if (c === '"') { inString = !inString; j++; continue; }
          if (inString) { j++; continue; }
          if (c === '{') depth++;
          else if (c === '}') {
            depth--;
            if (depth === 0) {
              const candidate = text.slice(idx, j + 1);
              try {
                const parsed = JSON.parse(candidate);
                if (parsed.tool_call && parsed.tool_call.name) {
                  calls.push(parsed.tool_call);
                }
              } catch (_) { /* JSON inválido, ignorar */ }
              complete = true;
              i = j + 1;
              break;
            }
          }
          j++;
        }

        // Se chegou ao fim sem fechar — tool call parcial no fim da stream
        if (!complete) {
          hasPartial = true;
          break;
        }
      }

      return { calls, hasPartial };
    }

    // Loop de tool calling
    while (true) {
      let currentText = '';
      // Texto já enviado ao cliente nesta iteração
      let sentText = '';

      const streamResult = await openrouterClient.streamCompletion(messages, {
        model: selectedModel,
        maxTokens: 16000,
        temperature: 0.7,
        tools: openaiTools,
        signal: abortController.signal,
        onChunk: (chunk) => {
          currentText += chunk;
          // Stremar em tempo real — parar quando detectar início de tool_call (fallback legado)
          if (!currentText.includes('{"tool_call')) {
            sentText += chunk;
            assistantText += chunk;
            sendEvent({ type: 'text', text: chunk });
          }
        }
      });

      // Capturar tool_calls nativos do function calling
      const nativeToolCalls = streamResult.toolCalls || [];


      // ═══ PRIORIDADE 1: Tool calls nativos (function calling) ═══
      // ═══ PRIORIDADE 2: Fallback legado {"tool_call":...} no texto ═══
      let allToolCalls = [];

      if (nativeToolCalls.length > 0) {
        // Function calling nativo — muito mais confiavel
        console.log(`[Chat] ${nativeToolCalls.length} tool call(s) nativo(s) detectado(s)`);
        allToolCalls = nativeToolCalls.map(tc => ({ name: tc.name, args: tc.args, id: tc.id }));
      } else {
        // Fallback: parsear tool calls do texto (formato legado)
        const { calls: toolCallsFound, hasPartial } = extractToolCalls(currentText);

        if (hasPartial && toolCallsFound.length === 0) {
          const partialIdx = currentText.lastIndexOf('{"tool_call');
          const cleanText = partialIdx > 0 ? currentText.slice(0, partialIdx).trimEnd() : '';
          sendEvent({ type: 'reset' });
          assistantText = cleanText;
          sentText = cleanText;
          if (cleanText) sendEvent({ type: 'text', text: cleanText });
          messages.push({ role: 'assistant', content: currentText });
          messages.push({ role: 'user', content: 'Sua resposta foi cortada no meio de uma tool call. Emita a tool call completa agora.' });
          console.log('[Chat] Tool call parcial detectada — solicitando retry');
          continue;
        }

        if (toolCallsFound.length > 0) {
          console.log(`[Chat] ${toolCallsFound.length} tool call(s) legado(s) detectado(s) no texto`);
          allToolCalls = toolCallsFound.map(tc => ({ name: tc.name, args: tc.args || {} }));
        }
      }

      if (allToolCalls.length > 0) {
        // Se algo foi enviado ao cliente antes do tool_call, limpar com evento reset
        if (sentText) {
          sendEvent({ type: 'reset' });
          assistantText = '';
          sentText = '';
        }

        const toolResults = [];

        // ═══ Execucao com cache, timeout e circuit breaker ═══
        // Detectar tools independentes para execucao paralela
        const executeOneTool = async ({ name, args }) => {
          if (!name) return null;

          // Progress report
          const progress = toolUtils.createProgressReporter(name, sendEvent);
          progress(`Executando ${name}...`);

          sendEvent({ type: 'log', log: { type: 'tool_use', name, input: JSON.stringify(args) } });
          assistantLogs.push({ type: 'tool_use', name, input: JSON.stringify(args), output: '' });

          // Verificar cache primeiro
          const cached = toolUtils.getCached(name, args);
          if (cached) {
            progress(`${name}: resultado do cache`);
            return { name, result: cached, fromCache: true };
          }

          let toolResult;
          try {
            // Envolver com timeout + circuit breaker
            toolResult = await toolUtils.withTimeout(
              toolUtils.withCircuitBreaker(name, () => executeTool(name, args, credentialVault)),
              60000,
              name
            );
          } catch (toolErr) {
            toolResult = `Erro ao executar ferramenta: ${toolErr.message}`;
          }

          const resultStr = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult);

          // Salvar no cache
          toolUtils.setCached(name, args, resultStr);
          progress(`${name}: concluido`);

          return { name, result: resultStr, fromCache: false };
        };

        // Execucao paralela de tools independentes
        let results;
        if (allToolCalls.length > 1) {
          console.log(`[Chat] Executando ${allToolCalls.length} tools em PARALELO`);
          results = await Promise.all(allToolCalls.map(executeOneTool));
        } else {
          results = [await executeOneTool(allToolCalls[0])];
        }

        // Processar resultados
        for (const res of results) {
          if (!res) continue;
          const resultLimit = (res.name === 'call_crm' || res.name === 'execute_node') ? 12000 : 6000;
          const truncatedResult = res.result.substring(0, resultLimit);

          console.log('[Chat] Tool result:', res.name, truncatedResult.substring(0, 150), res.fromCache ? '(CACHE)' : '');
          sendEvent({ type: 'log', log: { type: 'tool_result', name: res.name, output: truncatedResult } });

          if (assistantLogs.length > 0) {
            assistantLogs[assistantLogs.length - 1].output = truncatedResult;
          }

          toolResults.push(`[RESULTADO: ${res.name}]${res.fromCache ? ' (cache)' : ''}\n${truncatedResult}`);
        }

        // Adicionar ao historico: resposta do modelo + resultados das ferramentas
        // Para function calling nativo, montar a mensagem assistant com tool_calls
        if (nativeToolCalls.length > 0) {
          const assistantMsg = { role: 'assistant', content: currentText || null };
          assistantMsg.tool_calls = nativeToolCalls.map((tc, i) => ({
            id: tc.id || `call_${i}`,
            type: 'function',
            function: { name: tc.name, arguments: JSON.stringify(tc.args) }
          }));
          messages.push(assistantMsg);

          // Adicionar tool results como mensagens role=tool (formato OpenAI)
          for (let i = 0; i < results.length; i++) {
            if (!results[i]) continue;
            const resultLimit = (results[i].name === 'call_crm' || results[i].name === 'execute_node') ? 12000 : 6000;
            messages.push({
              role: 'tool',
              tool_call_id: nativeToolCalls[i]?.id || `call_${i}`,
              content: results[i].result.substring(0, resultLimit)
            });
          }
        } else {
          // Formato legado: assistant text + user message com resultados
          messages.push({ role: 'assistant', content: currentText });

          const allFailed = toolResults.every(r => r.includes('Erro') || r.includes('encontrado') || r.includes('disponivel'));
          const finalInstruction = allFailed
            ? `\n\n⚠️ INSTRUCAO OBRIGATORIA: Todas as ferramentas falharam. Voce DEVE responder ao usuario agora em PT-BR explicando o que aconteceu.\nNAO tente usar mais ferramentas. Responda SOMENTE com texto.`
            : `\n\nUsando os resultados acima, responda ao usuario em PT-BR de forma completa e clara.`;

          messages.push({
            role: 'user',
            content: toolResults.join('\n\n---\n\n') + finalInstruction
          });
        }

        // ═══ Self-Correcting: se TODAS as tools falharam, tentar corrigir 1x ═══
        const allFailed = results.every(r => r && r.result && r.result.startsWith('Erro'));
        if (allFailed && iteration < 2) {
          console.log('[Chat] Self-Correcting: todas as tools falharam, pedindo correcao ao modelo');
          iteration++;
          continue;
        }

      } else {
        // Sem tool call — resposta final ja foi streamada em tempo real
        if (!assistantText && currentText) {
          const markerIdx = currentText.indexOf('{"tool_call');
          const recoveredText = markerIdx > 0
            ? currentText.slice(0, markerIdx).trimEnd()
            : currentText.trimEnd();
          if (recoveredText) {
            assistantText = recoveredText;
            sendEvent({ type: 'reset' });
            sendEvent({ type: 'text', text: recoveredText });
          } else {
            const fallback = '[Resposta nao processada: o modelo gerou uma ferramenta invalida. Tente reformular o pedido.]';
            assistantText = fallback;
            sendEvent({ type: 'text', text: fallback });
          }
        }
        break;
      }

      iteration++;
      // Limite de iteracoes para evitar loops infinitos
      if (iteration >= 10) {
        console.log('[Chat] Limite de 10 iteracoes de tool calling atingido');
        break;
      }
    }

    // Garantia de resposta: se o modelo usou ferramentas mas não gerou texto algum,
    // fazer uma chamada final forçando resposta textual.
    if (!assistantText.trim() && assistantLogs.length > 0) {
      console.log('[Chat] assistantText vazio após tool calls — forçando resposta final');
      try {
        const failedTools = assistantLogs.map(l => l.name).join(', ');
        messages.push({
          role: 'user',
          content: `Você tentou usar as ferramentas: ${failedTools}, mas não respondeu ao usuário. ` +
            `OBRIGATÓRIO: gere agora uma resposta em PT-BR explicando o que aconteceu e o que o usuário deve fazer. ` +
            `Responda APENAS com texto, sem tool_calls.`
        });
        let forcedText = '';
        await openrouterClient.streamCompletion(messages, {
          model: selectedModel,
          maxTokens: 1000,
          temperature: 0.5,
          signal: abortController.signal,
          onChunk: (chunk) => {
            if (!chunk.includes('{"tool_call')) {
              forcedText += chunk;
              sendEvent({ type: 'text', text: chunk });
            }
          }
        });
        if (forcedText.trim()) {
          assistantText = forcedText;
        } else {
          // Último recurso: mensagem estática
          const fallback = `⚠️ Não foi possível completar a tarefa. As ferramentas utilizadas (${failedTools}) retornaram erros. Verifique os logs acima e tente novamente ou reformule o pedido.`;
          assistantText = fallback;
          sendEvent({ type: 'text', text: fallback });
        }
      } catch (fallbackErr) {
        const fallback = '⚠️ Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.';
        assistantText = fallback;
        sendEvent({ type: 'text', text: fallback });
      }
    }

    // Salvar sessão
    session.updatedAt = new Date().toISOString();
    session.messages.push({
      role: 'assistant',
      content: assistantText,
      logs: assistantLogs,
      createdAt: new Date().toISOString(),
    });

    // Auto-gerar título na primeira troca
    if (session.messages.length === 2 && session.title === 'Nova Conversa') {
      session.title = content.trim().substring(0, 50) + (content.trim().length > 50 ? '...' : '');
    }

    saveChatSession(session);

    // Atualizar sessão de memória
    if (session.memorySessionId) {
      try {
        const memSession = readSession(session.memorySessionId);
        if (memSession) {
          memSession.context.objective = `Chat IA: ${session.title}`;
          memSession.context.currentPhase = 'in_progress';
          memSession.metadata.totalInteractions = (memSession.metadata.totalInteractions || 0) + 1;
          memSession.updatedAt = new Date().toISOString();
          memSession.actionHistory.push({
            timestamp: new Date().toISOString(),
            type: 'chat_exchange',
            data: { userMessage: content.substring(0, 100), model: selectedModel }
          });
          writeSession(memSession);
          broadcastUpdate('memory:session_updated', memSession);
          console.log('[Chat] Sessão de memória atualizada:', session.memorySessionId);
        }
      } catch (memErr) {
        console.error('[Chat] Erro ao atualizar sessão de memória:', memErr.message);
      }
    }

    // Extrair tarefas do texto do assistente
    try {
      const extractedTasks = extractTasksFromText(assistantText);
      for (const taskName of extractedTasks) {
        const taskPayload = {
          name: taskName.substring(0, 100),
          description: `Extraído da conversa: "${session.title}"`,
          prompt: taskName,
          type: 'claude_prompt',
          category: 'chat',
          status: 'scheduled',
          enabled: true,
          priority: 2,
          scheduledAt: new Date().toISOString(),
          metadata: { source: 'chat', chatSessionId: session.id }
        };
        const createdTask = storage.addTask({ ...taskPayload, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), successCount: 0, failCount: 0 });
        broadcastUpdate('task:created', createdTask);
        console.log('[Chat] Tarefa criada a partir do chat:', taskName.substring(0, 50));
      }
    } catch (taskErr) {
      console.error('[Chat] Erro ao extrair tarefas:', taskErr.message);
    }

    sendEvent({ type: 'done', sessionId: session.id, claudeSessionId: session.id });
    res.end();
    console.log('[Chat] Concluído. Model:', selectedModel, '| Iterações:', iteration);

  } catch (err) {
    console.error('[Chat] Erro:', err.message);
    if (!clientDisconnected) {
      sendEvent({ type: 'error', error: err.message });
      res.end();
    }
  }
});

// ============ CHAT IA CONFIG ============

// GET /api/chat/config — lê configurações do chat IA (API key mascarada)
app.get('/api/chat/config', (req, res) => {
  try {
    const config = storage.getConfig();
    const chatAI = config.chatAI || {};
    const apiKey = chatAI.openrouterApiKey || process.env.OPENROUTER_API_KEY || '';
    res.json({
      openrouterApiKeySet: !!apiKey,
      openrouterApiKeyMasked: apiKey ? `sk-or-...${apiKey.slice(-8)}` : '',
      openrouterDefaultModel: chatAI.openrouterDefaultModel || process.env.OPENROUTER_DEFAULT_MODEL || 'z-ai/glm-4.7-flash',
      chatTemperature: chatAI.chatTemperature ?? 0.7,
      chatMaxTokens: chatAI.chatMaxTokens ?? 4096,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/chat/config — salva configurações do chat IA
app.put('/api/chat/config', (req, res) => {
  try {
    const { openrouterApiKey, openrouterDefaultModel, chatTemperature, chatMaxTokens } = req.body;
    const config = storage.getConfig();
    const current = config.chatAI || {};

    const updated = {
      ...current,
      ...(openrouterDefaultModel !== undefined && { openrouterDefaultModel }),
      ...(chatTemperature !== undefined && { chatTemperature: Number(chatTemperature) }),
      ...(chatMaxTokens !== undefined && { chatMaxTokens: Number(chatMaxTokens) }),
    };

    // Só salva a API key se foi enviada com valor real (não é placeholder mascarado)
    if (openrouterApiKey && openrouterApiKey.trim() && !openrouterApiKey.includes('...')) {
      updated.openrouterApiKey = openrouterApiKey.trim();
      process.env.OPENROUTER_API_KEY = openrouterApiKey.trim();
    }

    // Atualizar env vars em runtime para refletir imediatamente
    if (openrouterDefaultModel) process.env.OPENROUTER_DEFAULT_MODEL = openrouterDefaultModel;

    storage.updateConfig({ chatAI: updated });

    const apiKey = updated.openrouterApiKey || process.env.OPENROUTER_API_KEY || '';
    res.json({
      openrouterApiKeySet: !!apiKey,
      openrouterApiKeyMasked: apiKey ? `sk-or-...${apiKey.slice(-8)}` : '',
      openrouterDefaultModel: updated.openrouterDefaultModel || 'z-ai/glm-4.7-flash',
      chatTemperature: updated.chatTemperature ?? 0.7,
      chatMaxTokens: updated.chatMaxTokens ?? 4096,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/chat/system-prompt — retorna o system prompt customizado (ou vazio se usando o padrão)
app.get('/api/chat/system-prompt', (req, res) => {
  try {
    const config = storage.getConfig();
    const chatAI = config.chatAI || {};
    res.json({
      customSystemPrompt: chatAI.customSystemPrompt || '',
      isCustomized: !!chatAI.customSystemPrompt,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/chat/system-prompt — salva o system prompt customizado
app.put('/api/chat/system-prompt', (req, res) => {
  try {
    const { customSystemPrompt } = req.body;
    const config = storage.getConfig();
    const current = config.chatAI || {};
    storage.updateConfig({ chatAI: { ...current, customSystemPrompt: customSystemPrompt || '' } });
    res.json({
      customSystemPrompt: customSystemPrompt || '',
      isCustomized: !!customSystemPrompt,
      message: customSystemPrompt ? 'System prompt personalizado salvo.' : 'System prompt restaurado ao padrão.',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/chat/config/test — testa a conexão com o OpenRouter
app.post('/api/chat/config/test', async (req, res) => {
  try {
    const { model } = req.body;
    const openrouterClient = require('./openrouter-client');
    const result = await openrouterClient.complete(
      [{ role: 'user', content: 'Reply with exactly: OK' }],
      { model: model || openrouterClient.DEFAULT_MODEL, maxTokens: 10, temperature: 0, fallbackModels: [] }
    );
    res.json({ ok: true, model: result.model, response: result.text.substring(0, 50) });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

// ============ INSTAGRAM API ============

const INSTAGRAM_PORT = process.env.INSTAGRAM_PORT || 8001;
const INSTAGRAM_SERVICE_DIR = path.join(__dirname, 'instagram-service');

// Proxy helper para o servico Python
function proxyInstagram(req, res, targetPath, method, body) {
  const opts = {
    hostname: '127.0.0.1',
    port: INSTAGRAM_PORT,
    path: targetPath,
    method: method || req.method,
    headers: { 'Content-Type': 'application/json' },
  };
  const bodyStr = body ? JSON.stringify(body) : JSON.stringify(req.body || {});
  if (['POST', 'PUT', 'PATCH'].includes(opts.method)) {
    opts.headers['Content-Length'] = Buffer.byteLength(bodyStr);
  }
  const proxyReq = http.request(opts, proxyRes => {
    let data = '';
    proxyRes.on('data', c => data += c);
    proxyRes.on('end', () => {
      try { res.status(proxyRes.statusCode).json(JSON.parse(data)); }
      catch (_) { res.status(proxyRes.statusCode).send(data); }
    });
  });
  proxyReq.on('error', () => res.status(503).json({ ok: false, error: 'Servico Instagram nao disponivel. Verifique se o Python esta instalado e o servico iniciado.' }));
  if (['POST', 'PUT', 'PATCH'].includes(opts.method)) proxyReq.write(bodyStr);
  proxyReq.end();
}

// GET /api/instagram/status — status de autenticacao
app.get('/api/instagram/status', (req, res) => proxyInstagram(req, res, '/status', 'GET'));

// POST /api/instagram/login — autenticar conta
app.post('/api/instagram/login', (req, res) => proxyInstagram(req, res, '/login', 'POST'));

// POST /api/instagram/logout — desconectar conta
app.post('/api/instagram/logout', (req, res) => proxyInstagram(req, res, '/logout', 'POST'));

// GET /api/instagram/service-status — verifica se o servico Python esta rodando
app.get('/api/instagram/service-status', (req, res) => {
  const opts = { hostname: '127.0.0.1', port: INSTAGRAM_PORT, path: '/health', method: 'GET', timeout: 3000 };
  const checkReq = http.request(opts, checkRes => {
    let data = '';
    checkRes.on('data', c => data += c);
    checkRes.on('end', () => {
      try { res.json({ running: true, ...JSON.parse(data) }); }
      catch (_) { res.json({ running: true }); }
    });
  });
  checkReq.on('error', () => res.json({ running: false }));
  checkReq.on('timeout', () => { checkReq.destroy(); res.json({ running: false }); });
  checkReq.end();
});

// POST /api/instagram/start-service — inicia o servico Python manualmente
app.post('/api/instagram/start-service', (req, res) => {
  try {
    startInstagramService();
    setTimeout(() => {
      const opts = { hostname: '127.0.0.1', port: INSTAGRAM_PORT, path: '/health', method: 'GET', timeout: 5000 };
      const checkReq = http.request(opts, checkRes => {
        let data = '';
        checkRes.on('data', c => data += c);
        checkRes.on('end', () => res.json({ ok: true, message: 'Servico Instagram iniciado com sucesso' }));
      });
      checkReq.on('error', () => res.json({ ok: false, message: 'Servico em inicializacao — aguarde alguns segundos e recarregue' }));
      checkReq.end();
    }, 4000);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ============ INSTAGRAM API ALIASES (CRM prefix) ============
// O frontend chama /api/crm/instagram/* mas as rotas estão em /api/instagram/*
// Essas rotas de alias evitam erros 404

// GET /api/crm/instagram/status
app.get('/api/crm/instagram/status', (req, res) => proxyInstagram(req, res, '/status', 'GET'));

// GET /api/crm/instagram/service-status
app.get('/api/crm/instagram/service-status', (req, res) => {
  const opts = { hostname: '127.0.0.1', port: INSTAGRAM_PORT, path: '/health', method: 'GET', timeout: 3000 };
  const checkReq = http.request(opts, checkRes => {
    let data = '';
    checkRes.on('data', c => data += c);
    checkRes.on('end', () => {
      try { res.json({ running: true, ...JSON.parse(data) }); }
      catch (_) { res.json({ running: true }); }
    });
  });
  checkReq.on('error', () => res.json({ running: false }));
  checkReq.on('timeout', () => { checkReq.destroy(); res.json({ running: false }); });
  checkReq.end();
});

// POST /api/crm/instagram/start-service
app.post('/api/crm/instagram/start-service', (req, res) => {
  try {
    startInstagramService();
    setTimeout(() => {
      const opts = { hostname: '127.0.0.1', port: INSTAGRAM_PORT, path: '/health', method: 'GET', timeout: 5000 };
      const checkReq = http.request(opts, checkRes => {
        let data = '';
        checkRes.on('data', c => data += c);
        checkRes.on('end', () => res.json({ ok: true, message: 'Servico Instagram iniciado com sucesso' }));
      });
      checkReq.on('error', () => res.json({ ok: false, message: 'Servico em inicializacao — aguarde alguns segundos e recarregue' }));
      checkReq.end();
    }, 4000);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/crm/instagram/login
app.post('/api/crm/instagram/login', (req, res) => proxyInstagram(req, res, '/login', 'POST'));

// POST /api/crm/instagram/login-cookies — login via cookies exportados
app.post('/api/crm/instagram/login-cookies', (req, res) => proxyInstagram(req, res, '/login-cookies', 'POST'));

// POST /api/crm/instagram/logout
app.post('/api/crm/instagram/logout', (req, res) => proxyInstagram(req, res, '/logout', 'POST'));

// GET /api/crm/instagram/challenge/status — verifica challenge pendente
app.get('/api/crm/instagram/challenge/status', (req, res) => proxyInstagram(req, res, '/challenge/status', 'GET'));

// POST /api/crm/instagram/challenge/await — aguarda aprovação via notificação
app.post('/api/crm/instagram/challenge/await', (req, res) => proxyInstagram(req, res, '/challenge/await', 'POST'));

// POST /api/crm/instagram/challenge/approve — confirma aprovação manual
app.post('/api/crm/instagram/challenge/approve', (req, res) => proxyInstagram(req, res, '/challenge/approve', 'POST'));

// ============ SPA FALLBACK (React Router) ============
// Deve ficar DEPOIS de todas as rotas /api/*
app.get('*', (req, res) => {
  // Não interceptar requests de API ou assets com extensão
  if (req.path.startsWith('/api/') || req.path.includes('.')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Exportar para uso em outros módulos
global.broadcastUpdate = broadcastUpdate;

// ============ INSTAGRAM SERVICE AUTO-START ============

let instagramServiceProcess = null;

function startInstagramService() {
  if (instagramServiceProcess && !instagramServiceProcess.killed) return;

  const appPy = path.join(INSTAGRAM_SERVICE_DIR, 'app.py');
  if (!fs.existsSync(appPy)) {
    console.log('[Instagram] app.py nao encontrado — servico nao iniciado');
    return;
  }

  // Detectar Python disponivel
  const pythonCmds = process.platform === 'win32'
    ? ['python', 'python3', 'py']
    : ['python3', 'python'];

  let pythonCmd = null;
  for (const cmd of pythonCmds) {
    try {
      require('child_process').execSync(`${cmd} --version`, { timeout: 3000, stdio: 'ignore' });
      pythonCmd = cmd;
      break;
    } catch (_) {}
  }

  if (!pythonCmd) {
    console.log('[Instagram] Python nao encontrado — servico nao iniciado. Instale Python 3.9+ para usar a integracao Instagram.');
    return;
  }

  const { spawn } = require('child_process');
  const env = { ...process.env, INSTAGRAM_PORT: String(INSTAGRAM_PORT), PYTHONUNBUFFERED: '1' };

  instagramServiceProcess = spawn(pythonCmd, [appPy], {
    cwd: INSTAGRAM_SERVICE_DIR,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });

  instagramServiceProcess.stdout.on('data', d => console.log(`[Instagram] ${d.toString().trim()}`));
  instagramServiceProcess.stderr.on('data', d => {
    const msg = d.toString().trim();
    if (msg && !msg.includes('WARNING') && !msg.includes('running on')) {
      console.error(`[Instagram] ${msg}`);
    }
  });
  instagramServiceProcess.on('exit', (code) => {
    console.log(`[Instagram] Servico encerrado (code: ${code})`);
    instagramServiceProcess = null;
  });
  instagramServiceProcess.on('error', e => {
    console.error(`[Instagram] Erro ao iniciar servico: ${e.message}`);
    instagramServiceProcess = null;
  });

  console.log(`[Instagram] Servico iniciado (PID: ${instagramServiceProcess.pid}) na porta ${INSTAGRAM_PORT}`);
}

// ============ SINGLETON LOCKFILE ============

const { exec: execCmd } = require('child_process');
const LOCK_FILE = path.join(__dirname, 'data', 'server.pid');

/**
 * Verifica se o processo com o PID dado esta vivo
 */
function isProcessAlive(pid) {
  try {
    process.kill(pid, 0); // Sinal 0 = apenas verifica se existe
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Adquire o lockfile. Retorna true se conseguiu, false se outra instancia esta rodando.
 */
function acquireLock() {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const existingPid = parseInt(fs.readFileSync(LOCK_FILE, 'utf8').trim(), 10);
      if (existingPid && isProcessAlive(existingPid)) {
        return false; // Outra instancia esta viva
      }
      // PID morto - lockfile orfao, pode sobrescrever
      console.log(`[Server] Lockfile orfao encontrado (PID ${existingPid} morto). Assumindo controle.`);
    }
    fs.writeFileSync(LOCK_FILE, String(process.pid), 'utf8');
    return true;
  } catch (e) {
    console.error(`[Server] Erro ao adquirir lockfile: ${e.message}`);
    return true; // Em caso de erro, tenta iniciar mesmo assim
  }
}

/**
 * Remove o lockfile
 */
function releaseLock() {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const storedPid = parseInt(fs.readFileSync(LOCK_FILE, 'utf8').trim(), 10);
      if (storedPid === process.pid) {
        fs.unlinkSync(LOCK_FILE);
      }
    }
  } catch (e) {
    // Ignorar erros ao remover lock
  }
}

/**
 * Mata processos Claude CLI orfaos no Windows (zumbis de execucoes anteriores)
 */
function cleanupZombieProcesses() {
  if (process.platform !== 'win32') return Promise.resolve();

  return new Promise((resolve) => {
    // Encontrar processos claude CLI que nao pertencem a esta sessao
    execCmd('wmic process where "name=\'claude.exe\'" get processid,creationdate /format:csv', (err, stdout) => {
      if (err || !stdout) return resolve();

      const lines = stdout.trim().split('\n').filter(l => l.includes(','));
      let killed = 0;

      for (const line of lines) {
        const parts = line.trim().split(',');
        if (parts.length < 3) continue;
        const creationDate = parts[1];
        const pid = parseInt(parts[2], 10);
        if (!pid || isNaN(pid)) continue;

        // Parsear data de criacao do WMIC (formato: YYYYMMDDHHMMss.ffffff+ZZZ)
        try {
          const year = parseInt(creationDate.substring(0, 4), 10);
          const month = parseInt(creationDate.substring(4, 6), 10) - 1;
          const day = parseInt(creationDate.substring(6, 8), 10);
          const hour = parseInt(creationDate.substring(8, 10), 10);
          const min = parseInt(creationDate.substring(10, 12), 10);
          const processDate = new Date(year, month, day, hour, min);
          const ageMs = Date.now() - processDate.getTime();

          // Matar processos claude CLI com mais de 2 horas (zumbis certeza)
          if (ageMs > 2 * 60 * 60 * 1000) {
            execCmd(`taskkill /pid ${pid} /T /F`, () => {});
            console.log(`[Server] Zombie claude CLI morto (PID: ${pid}, idade: ${Math.round(ageMs / 3600000)}h)`);
            killed++;
          }
        } catch (e) {
          // Ignorar erros de parse
        }
      }

      if (killed > 0) {
        console.log(`[Server] ${killed} processo(s) zumbi(s) eliminado(s)`);
      }
      resolve();
    });
  });
}

// ============ START SERVER ============

if (require.main === module) {
  // Restaurar configurações do chatAI ao iniciar (API key e modelo)
  try {
    const savedConfig = storage.getConfig();
    const chatAI = savedConfig.chatAI || {};
    if (chatAI.openrouterApiKey && !process.env.OPENROUTER_API_KEY) {
      process.env.OPENROUTER_API_KEY = chatAI.openrouterApiKey;
      console.log('[Server] OPENROUTER_API_KEY restaurada do config salvo');
    }
    if (chatAI.openrouterDefaultModel && !process.env.OPENROUTER_DEFAULT_MODEL) {
      process.env.OPENROUTER_DEFAULT_MODEL = chatAI.openrouterDefaultModel;
      console.log('[Server] Modelo padrão restaurado:', chatAI.openrouterDefaultModel);
    }
  } catch (e) {
    console.warn('[Server] Não foi possível restaurar config chatAI:', e.message);
  }

  // Verificar singleton - impedir duas instancias
  if (!acquireLock()) {
    const existingPid = parseInt(fs.readFileSync(LOCK_FILE, 'utf8').trim(), 10);
    console.error(`[Server] ERRO: Outra instancia ja esta rodando (PID: ${existingPid}).`);
    console.error(`[Server] Use stop-all.bat para parar a instancia existente, ou delete o lockfile:`);
    console.error(`[Server]   ${LOCK_FILE}`);
    process.exit(1);
  }

  server.listen(PORT, async () => {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║       CLAUDE CODE ECOSYSTEM - Unified Dashboard Server        ║');
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log(`║  Dashboard:  http://localhost:${PORT}                             ║`);
    console.log(`║  Tasks API:  http://localhost:${PORT}/api                         ║`);
    console.log(`║  Memory API: http://localhost:${PORT}/api/memory                  ║`);
    console.log(`║  KB API:     http://localhost:${PORT}/api/kb                      ║`);
    console.log(`║  Prompts:    http://localhost:${PORT}/api/prompt-templates        ║`);
    console.log(`║  WebSocket:  ws://localhost:${PORT}/ws                            ║`);
    console.log(`║  Vault API:  http://localhost:${PORT}/api/credentials             ║`);
    console.log(`║  Telegram:   /api/telegram/*                                    ║`);
    console.log(`║  PID:        ${String(process.pid).padEnd(49)}║`);
    console.log('╚════════════════════════════════════════════════════════════════╝');

    // Cleanup: matar processos claude CLI zumbis de execucoes anteriores
    await cleanupZombieProcesses();

    // Cleanup: resetar tarefas e execucoes stuck como 'running' sem processo ativo
    const stuckTasks = storage.getTasks().filter(t => t.status === 'running');
    if (stuckTasks.length > 0) {
      stuckTasks.forEach(t => {
        storage.updateTask(t.id, { status: 'failed', lastError: 'Servidor reiniciado durante execução' });
        console.log(`[Server] Tarefa stuck resetada: ${t.id} (${t.name})`);
      });
    }

    // Cleanup: resetar execucoes stuck como 'running' (orfas de processo)
    const stuckExecs = storage.getExecutions(10000).filter(e => e.status === 'running' || e.status === 'resuming');
    if (stuckExecs.length > 0) {
      stuckExecs.forEach(e => {
        storage.updateExecution(e.id, {
          status: 'failed',
          finishedAt: new Date().toISOString(),
          error: 'Servidor reiniciado durante execução'
        });
        console.log(`[Server] Execucao stuck resetada: ${e.id} (task: ${e.taskName})`);
      });
    }

    // Iniciar Instagram Service (Python/instagrapi)
    startInstagramService();

    // Iniciar scheduler
    scheduler.start();

    // Iniciar Telegram Bot (se configurado)
    const tgConfig = storage.getConfig().telegram || {};
    if (tgConfig.enabled && tgConfig.botToken) {
      console.log('[Server] Iniciando Telegram Bot...');
      telegramBot.start(tgConfig.botToken);
    } else {
      console.log('[Server] Telegram Bot: nao configurado (use PUT /api/telegram/config ou POST /api/telegram/start com token)');
    }
  });

  // Graceful shutdown - funcao centralizada
  function gracefulShutdown(signal) {
    console.log(`\n[Server] Recebido ${signal}. Encerrando servidor...`);

    // 0. Parar Instagram Service Python
    if (instagramServiceProcess && !instagramServiceProcess.killed) {
      try { instagramServiceProcess.kill(); } catch (e) {}
    }

    // 1. Parar Telegram Bot (stop polling)
    try { telegramBot.stop(); } catch (e) {}

    // 2. Parar scheduler
    try { scheduler.stop(); } catch (e) {}

    // 3. Matar todos os processos filhos claude CLI em execucao
    const running = executor.getRunningTasks();
    if (running && running.size > 0) {
      console.log(`[Server] Matando ${running.size} execucao(oes) em andamento...`);
      for (const [execId, task] of running) {
        try {
          if (task.watchdog) clearTimeout(task.watchdog);
          if (task.process && task.process.pid) {
            if (process.platform === 'win32') {
              execCmd(`taskkill /pid ${task.process.pid} /T /F`, () => {});
            } else {
              task.process.kill('SIGTERM');
            }
            console.log(`[Server] Execucao ${execId} encerrada (PID: ${task.process.pid})`);
          }
        } catch (e) {}
      }
    }

    // 4. Fechar servidor HTTP
    server.close(() => {
      console.log('[Server] Servidor HTTP encerrado');
    });

    // 5. Remover lockfile
    releaseLock();
    console.log('[Server] Lockfile removido. Servidor encerrado.');

    // Forcar saida apos 5s se algo travar
    setTimeout(() => {
      console.log('[Server] Forcando saida apos timeout de shutdown');
      process.exit(1);
    }, 5000).unref();

    process.exit(0);
  }

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  // Windows: capturar evento de fechar janela do console
  if (process.platform === 'win32') {
    process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));
  }

  // Cleanup lockfile em caso de crash inesperado
  process.on('exit', () => releaseLock());
  process.on('uncaughtException', (err) => {
    console.error('[Server] Uncaught exception:', err);
    releaseLock();
    process.exit(1);
  });
}

module.exports = { app, server, broadcastUpdate };
