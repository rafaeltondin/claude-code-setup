/**
 * TELEGRAM BOT MODULE - Interface Telegram para o Task Scheduler
 *
 * Permite controlar o scheduler, executar tarefas, consultar KB
 * e monitorar execucoes diretamente pelo Telegram.
 * Usa polling (sem necessidade de expor portas).
 */

const TelegramBot = require('node-telegram-bot-api');
const storage = require('./storage');
const scheduler = require('./scheduler');
const executor = require('./executor');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const https = require('https');
const http = require('http');

// ============ CRM CONFIG ============
const CRM_API_URL = 'http://localhost:3847/api/crm';
const CRM_AUTH_TOKEN = 'local-dev-token';

/**
 * Helper para chamadas HTTP ao CRM local (sem dependencias externas)
 * @param {string} endpoint - path relativo, ex: '/leads?status=new'
 * @param {object} options - { method, body }
 */
function crmFetch(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(CRM_API_URL + endpoint);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const reqOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${CRM_AUTH_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = lib.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(new Error('CRM request timeout')); });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

let bot = null;
let isRunning = false;
let startTime = null;
let originalBroadcastUpdate = null; // Referencia ao broadcastUpdate original (WebSocket)
let scheduledTasksRef = null; // Referencia ao modulo ScheduledTasks (injetado via setScheduledTasks)

// Reconnect com backoff exponencial
let reconnectAttempts = 0;
let reconnectTimer = null;
let lastStableConnection = null;
const RECONNECT_BASE_DELAY = 1000; // 1s
const RECONNECT_MAX_DELAY = 60000; // 60s
const STABLE_CONNECTION_THRESHOLD = 300000; // 5min

// Modo terminal: quando ativado, mensagens livres abrem terminal Claude Code local
const terminalModeChats = new Map(); // chatId -> boolean

// Tasks cujas execucoes serao notificadas inline pelo Telegram (cmdRun/cmdExecPrompt)
// Para evitar que o hook broadcastUpdate envie notificacao duplicada
// Formato: Map<taskId, timestamp> — expira apos 30 minutos
const telegramInitiatedTasks = new Map();
// Limpar entries expiradas a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [taskId, ts] of telegramInitiatedTasks) {
    if (now - ts > 30 * 60 * 1000) telegramInitiatedTasks.delete(taskId);
  }
}, 5 * 60 * 1000);

// ============ SESSION TRACKING ============
// Maps Telegram messageId -> executionId for session-based replies
const messageToExecution = new Map();
// Maps executionId -> last Telegram messageId (for tracking the latest response)
const executionToMessage = new Map();
// Maps chatId -> { executionId, messageId, timestamp } for auto-routing without reply
const chatLastExecution = new Map();
// Auto-routing window: messages sent within this period are routed to last execution
const AUTO_ROUTE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

// ============ CONVERSATIONAL SESSIONS (PERSISTIDAS) ============
// Maps chatId -> { executionId, claudeSessionId, taskId, createdAt, lastActivity, messageCount }
const chatSessions = new Map();
// Session expiration: 30 minutes of inactivity
const SESSION_EXPIRY_MS = 30 * 60 * 1000;
// Lock to prevent concurrent executions per chat
const chatProcessingLock = new Map();
// Arquivo de persistencia de sessoes
const SESSIONS_FILE = path.join(__dirname, 'data', 'chat-sessions.json');

/**
 * Salva sessoes ativas em disco para sobreviver a reinicializacoes
 */
function persistSessions() {
  try {
    const data = {};
    for (const [chatId, session] of chatSessions) {
      data[chatId] = session;
    }
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    // Silencioso - nao bloquear por falha de persistencia
  }
}

/**
 * Restaura sessoes de disco ao iniciar o bot
 */
function restoreSessions() {
  try {
    if (!fs.existsSync(SESSIONS_FILE)) return;
    const data = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
    const now = Date.now();
    let restored = 0;
    for (const [chatId, session] of Object.entries(data)) {
      // Restaurar apenas sessoes que ainda nao expiraram
      if (session.lastActivity && (now - session.lastActivity) < SESSION_EXPIRY_MS) {
        chatSessions.set(Number(chatId), session);
        restored++;
      }
    }
    if (restored > 0) {
      console.log(`[TelegramBot] Restauradas ${restored} sessoes de disco`);
    }
  } catch (e) {
    console.log(`[TelegramBot] Nao foi possivel restaurar sessoes: ${safeText(e.message, 500)}`);
  }
}

/**
 * Get or validate active session for a chat
 * Returns session object if valid, null if expired/none
 */
function getActiveSession(chatId) {
  const session = chatSessions.get(chatId);
  if (!session) return null;
  if (Date.now() - session.lastActivity > SESSION_EXPIRY_MS) {
    chatSessions.delete(chatId);
    log.info('Sessao expirada por inatividade', { chatId, executionId: shortId(session.executionId) });
    return null;
  }
  return session;
}

/**
 * Create a new conversational session for a chat
 */
function createSession(chatId, executionId, claudeSessionId, taskId, name) {
  const session = {
    executionId,
    claudeSessionId,
    taskId,
    name: name || `Sessao ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    messageCount: 1
  };
  chatSessions.set(chatId, session);
  persistSessions();
  log.info('Nova sessao conversacional criada', { chatId, name: session.name, executionId: shortId(executionId) });
  return session;
}

/**
 * Update session activity timestamp
 */
function touchSession(chatId) {
  const session = chatSessions.get(chatId);
  if (session) {
    session.lastActivity = Date.now();
    session.messageCount++;
    persistSessions();
  }
}

/**
 * End a session explicitly
 */
function endSession(chatId) {
  const session = chatSessions.get(chatId);
  chatSessions.delete(chatId);
  persistSessions();
  return session;
}

// Cleanup old entries periodically (keep last 200)
function cleanupSessionTracking() {
  if (messageToExecution.size > 200) {
    const entries = [...messageToExecution.entries()];
    const toRemove = entries.slice(0, entries.length - 200);
    for (const [key] of toRemove) {
      messageToExecution.delete(key);
    }
  }
  // Cleanup expired chatLastExecution entries
  const now = Date.now();
  for (const [chatId, entry] of chatLastExecution) {
    if (now - entry.timestamp > AUTO_ROUTE_WINDOW_MS * 2) {
      chatLastExecution.delete(chatId);
    }
  }
  // Cleanup expired conversational sessions
  let sessionsChanged = false;
  for (const [chatId, session] of chatSessions) {
    if (now - session.lastActivity > SESSION_EXPIRY_MS) {
      chatSessions.delete(chatId);
      sessionsChanged = true;
    }
  }
  if (sessionsChanged) persistSessions();
}

// Prompt Templates file path (same as server.js)
const PROMPT_TEMPLATES_FILE = path.join(__dirname, 'data', 'prompt-templates.json');

// Logger padrao do projeto
const log = {
  info: (msg, data = null) => {
    console.log(`[TelegramBot][${new Date().toISOString()}] INFO: ${msg}`, data ? JSON.stringify(data) : '');
  },
  error: (msg, error = null) => {
    console.error(`[TelegramBot][${new Date().toISOString()}] ERROR: ${msg}`, error?.message || error || '');
  },
  warn: (msg, data = null) => {
    console.warn(`[TelegramBot][${new Date().toISOString()}] WARN: ${msg}`, data ? JSON.stringify(data) : '');
  }
};

// ============ CONFIG HELPERS ============

function getTelegramConfig() {
  const config = storage.getConfig();
  return config.telegram || {
    enabled: false,
    botToken: '',
    authorizedUsers: [],
    notifications: {
      onTaskSuccess: true,
      onTaskFailure: true,
      onSchedulerEvent: true
    }
  };
}

function updateTelegramConfig(updates) {
  const config = storage.getConfig();
  const telegramConfig = { ...(config.telegram || {}), ...updates };
  storage.updateConfig({ telegram: telegramConfig });
  return telegramConfig;
}

function isAuthorized(chatId) {
  const config = getTelegramConfig();
  if (!config.authorizedUsers || config.authorizedUsers.length === 0) {
    return true; // Se nao tem usuarios configurados, permite todos (primeiro uso)
  }
  return config.authorizedUsers.includes(chatId);
}

function authorizeUser(chatId, username) {
  const config = getTelegramConfig();
  const users = config.authorizedUsers || [];
  if (!users.includes(chatId)) {
    users.push(chatId);
    updateTelegramConfig({ authorizedUsers: users });
    log.info('Usuario autorizado', { chatId, username });
  }
}

// ============ FORMAT HELPERS ============

function escapeMarkdown(text) {
  if (!text) return '';
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

function shortId(id) {
  if (!id) return 'N/A';
  return id.substring(0, 8);
}

/**
 * Trunca texto para caber no limite do Telegram (4096 chars)
 * Usa margem de seguranca para headers/footers que envolvem o texto
 */
function safeText(text, maxLen = 3800) {
  if (!text) return '(vazio)';
  const s = String(text);
  if (s.length <= maxLen) return s;
  return s.substring(0, maxLen - 15) + '\n... (truncado)';
}

function statusEmoji(status) {
  const map = {
    'scheduled': '\u{1F7E2}',   // green circle
    'running': '\u{1F7E1}',     // yellow circle
    'completed': '\u{2705}',    // check
    'success': '\u{2705}',
    'failed': '\u{274C}',       // X
    'paused': '\u{23F8}',       // pause
    'cancelled': '\u{1F6AB}'    // no entry
  };
  return map[status] || '\u{26AA}'; // white circle
}

/**
 * Envia mensagem de forma segura: tenta MarkdownV2, fallback para texto puro
 */
async function safeSend(chatId, text, options = {}) {
  try {
    return await bot.sendMessage(chatId, text, { parse_mode: 'MarkdownV2', ...options });
  } catch (error) {
    // Fallback: remover parse_mode e tentar texto puro
    try {
      log.warn('safeSend fallback sem MarkdownV2', { chatId });
      const plainText = text
        .replace(/\\\\/g, '\\')
        .replace(/\\([_*[\]()~`>#+\-=|{}.!])/g, '$1');
      const fallbackOpts = { ...options };
      delete fallbackOpts.parse_mode;
      return await bot.sendMessage(chatId, plainText, fallbackOpts);
    } catch (fallbackErr) {
      log.error('safeSend falhou completamente', { chatId, error: fallbackErr.message });
      return null;
    }
  }
}

/**
 * Interface agora e puramente conversacional (sem botoes/menus)
 */

function formatDuration(ms) {
  if (!ms || ms < 0) return '0s';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}

function formatDate(isoStr) {
  if (!isoStr) return 'N/A';
  const d = new Date(isoStr);
  return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function uptimeStr() {
  if (!startTime) return 'N/A';
  return formatDuration(Date.now() - startTime);
}

/**
 * Envia texto longo dividido em multiplas mensagens (Telegram limite: 4096 chars)
 * Tenta dividir em quebras de linha para nao cortar no meio de uma palavra
 */
async function sendLongMessage(chatId, text, options = {}) {
  const MAX_LEN = 4000; // margem de seguranca
  if (text.length <= MAX_LEN) {
    await bot.sendMessage(chatId, text, options);
    return;
  }

  // Dividir em pedacos respeitando quebras de linha
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= MAX_LEN) {
      chunks.push(remaining);
      break;
    }
    // Procurar ultima quebra de linha dentro do limite
    let splitAt = remaining.lastIndexOf('\n', MAX_LEN);
    if (splitAt < MAX_LEN * 0.3) {
      // Se a quebra de linha esta muito no inicio, cortar no limite
      splitAt = MAX_LEN;
    }
    chunks.push(remaining.substring(0, splitAt));
    remaining = remaining.substring(splitAt).trimStart();
  }

  for (let i = 0; i < chunks.length; i++) {
    const chunkOptions = i === chunks.length - 1 ? options : { ...options };
    // Remover reply_markup de mensagens intermediarias
    if (i < chunks.length - 1) {
      delete chunkOptions.reply_markup;
    }
    try {
      await bot.sendMessage(chatId, chunks[i], chunkOptions);
    } catch (parseErr) {
      // Se falhar com MarkdownV2, tentar sem formatacao
      if (chunkOptions.parse_mode) {
        log.warn('Fallback: enviando sem parse_mode', { chunk: i });
        delete chunkOptions.parse_mode;
        await bot.sendMessage(chatId, chunks[i], chunkOptions);
      } else {
        throw parseErr;
      }
    }
  }
}

// ============ PROMPT TEMPLATES HELPERS ============

function readPromptTemplates() {
  try {
    if (!fs.existsSync(PROMPT_TEMPLATES_FILE)) return [];
    return JSON.parse(fs.readFileSync(PROMPT_TEMPLATES_FILE, 'utf-8'));
  } catch (error) {
    log.error('Erro ao ler prompt templates', error);
    return [];
  }
}

function getPromptCategories(templates) {
  const cats = {};
  for (const t of templates) {
    const cat = t.category || 'Sem Categoria';
    if (!cats[cat]) cats[cat] = 0;
    cats[cat]++;
  }
  return cats;
}

// ============ COMMAND HANDLERS ============

async function cmdStart(msg) {
  const chatId = msg.chat.id;
  const username = msg.from?.username || msg.from?.first_name || 'Unknown';

  log.info('/start', { chatId, username });

  // Auto-autorizar primeiro usuario
  const config = getTelegramConfig();
  if (!config.authorizedUsers || config.authorizedUsers.length === 0) {
    authorizeUser(chatId, username);
  }

  await bot.sendMessage(chatId, `Ola, ${username}! Sou o Cenorinha, seu assistente pessoal.\n\nEnvie qualquer mensagem e eu respondo. Pode pedir qualquer coisa — analises, tarefas, pesquisas, envio de arquivos.\n\nDigite /help para ver os atalhos disponiveis.`);
}

/**
 * Menu — redireciona para help (sem botoes)
 */
async function cmdMenu(msg) {
  return cmdHelp(msg);
}

async function cmdHelp(msg) {
  const chatId = msg.chat.id;

  await bot.sendMessage(chatId, `Atalhos disponiveis:

Conversa:
  /nova — Iniciar nova conversa
  /sessao — Info da sessao atual

Tarefas pessoais:
  /mytasks — Listar pendencias
  /addtask [titulo] — Nova tarefa
  /donetask [id] — Concluir

Financeiro:
  /fin — Resumo do mes
  /income [valor] [desc] — Receita
  /expense [valor] [desc] — Despesa

CRM:
  /leads — Listar leads
  /dashboard — KPIs

Outros:
  /status — Status do sistema
  /kb [busca] — Knowledge Base
  /notes — Notas

Dica: Basta enviar sua mensagem diretamente. Nao precisa de comando.`);
}

function getQuickStatus() {
  try {
    const status = scheduler.getStatus();
    const running = status.isRunning ? '\u{1F7E2} Rodando' : '\u{1F534} Parado';
    return `\u{2699} Scheduler: ${escapeMarkdown(running)}
\u{1F4CB} Tarefas: ${status.tasks.total} \\(${status.tasks.running} rodando\\)
\u{23F1} Uptime: ${escapeMarkdown(uptimeStr())}`;
  } catch (e) {
    return '\u{26A0} Erro ao obter status';
  }
}

async function cmdStatus(msg) {
  const chatId = msg.chat.id;
  log.info('/status', { chatId });

  try {
    const status = scheduler.getStatus();
    const runningIcon = status.isRunning ? '\u{1F7E2}' : '\u{1F534}';
    const runningText = status.isRunning ? 'RODANDO' : 'PARADO';

    let text = `\u{1F4CA} *Status do Scheduler*

${runningIcon} *Estado:* ${escapeMarkdown(runningText)}
\u{23F1} *Intervalo:* ${escapeMarkdown(formatDuration(status.config.checkInterval))}
\u{1F504} *Max Concorrente:* ${status.config.maxConcurrentTasks}

\u{1F4CB} *Tarefas:*
  Total: ${status.tasks.total}
  Agendadas: ${status.tasks.scheduled}
  Pendentes: ${status.tasks.pending}
  Rodando: ${status.tasks.running}
  Cron jobs: ${status.tasks.cronJobs}

\u{1F4C8} *Execucoes \\(hoje\\):*
  Total: ${status.executions.today.total}
  Sucesso: ${status.executions.today.success}
  Falhas: ${status.executions.today.failed}
  Taxa: ${status.executions.successRate}%
  Duracao media: ${escapeMarkdown(formatDuration(status.executions.avgDuration))}`;

    if (status.runningTasks.length > 0) {
      text += `\n\n\u{1F3C3} *Em execucao agora:*`;
      status.runningTasks.forEach(t => {
        text += `\n  \\- ${escapeMarkdown(t.taskName)} \\(${escapeMarkdown(formatDuration(t.duration))}\\)`;
      });
    }
    await safeSend(chatId, text);
  } catch (error) {
    log.error('/status falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro ao obter status: ${safeText(error.message, 500)}`);
  }
}

async function cmdTasks(msg) {
  const chatId = msg.chat.id;
  log.info('/tasks', { chatId });

  try {
    const tasks = storage.getTasks();

    if (tasks.length === 0) {
      await safeSend(chatId, '\u{1F4ED} Nenhuma tarefa cadastrada\\.\n\n_Use o botao abaixo para criar uma:_');
      return;
    }

    let text = `\u{1F4CB} *Tarefas \\(${tasks.length}\\)*\n`;

    tasks.forEach((task, i) => {
      const emoji = statusEmoji(task.status);
      const id = shortId(task.id);
      const name = escapeMarkdown(task.name || 'Sem nome');
      const status = escapeMarkdown((task.status || 'unknown').toUpperCase());
      text += `\n${emoji} \`${id}\` ${name}\n   _${status}_ \\| Prio: ${task.priority || 2}`;
      if (task.recurring && task.cronExpression) {
        text += ` \\| Cron: \`${escapeMarkdown(task.cronExpression)}\``;
      }
    });

    text += `\n\n_Use_ /task \\[id\\] _para detalhes_`;

    await safeSend(chatId, text);
  } catch (error) {
    log.error('/tasks falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${safeText(error.message, 500)}`);
  }
}

async function cmdTaskDetail(msg, taskId) {
  const chatId = msg.chat.id;
  log.info('/task', { chatId, taskId });

  try {
    // Buscar por ID completo ou parcial
    let task = storage.getTask(taskId);
    if (!task) {
      const tasks = storage.getTasks();
      task = tasks.find(t => t.id.startsWith(taskId));
    }

    if (!task) {
      await bot.sendMessage(chatId, `\u{274C} Tarefa nao encontrada: \`${escapeMarkdown(taskId)}\``, { parse_mode: 'MarkdownV2' });
      return;
    }

    const executions = storage.getTaskExecutions(task.id, 3);
    const emoji = statusEmoji(task.status);

    let text = `${emoji} *Tarefa: ${escapeMarkdown(task.name || 'Sem nome')}*

\u{1F194} ID: \`${escapeMarkdown(task.id)}\`
\u{1F4E6} Tipo: ${escapeMarkdown(task.type || 'claude_prompt')}
\u{1F4CA} Status: ${escapeMarkdown((task.status || '').toUpperCase())}
\u{2699} Habilitada: ${task.enabled ? 'Sim' : 'Nao'}
\u{2B50} Prioridade: ${task.priority || 2}
\u{1F4C5} Criada: ${escapeMarkdown(formatDate(task.createdAt))}
\u{1F504} Atualizada: ${escapeMarkdown(formatDate(task.updatedAt))}
\u{23F0} Agendada: ${escapeMarkdown(formatDate(task.scheduledAt))}`;

    if (task.prompt) {
      const promptPreview = task.prompt.substring(0, 200);
      text += `\n\n\u{1F4DD} *Prompt:*\n\`\`\`\n${escapeMarkdown(promptPreview)}${task.prompt.length > 200 ? '...' : ''}\n\`\`\``;
    }

    if (task.recurring) {
      text += `\n\n\u{1F501} *Recorrente:* ${escapeMarkdown(task.cronExpression || task.recurringType || 'Sim')}`;
    }

    text += `\n\n\u{1F4C8} Sucesso: ${task.successCount || 0} \\| Falhas: ${task.failCount || 0}`;

    if (executions.length > 0) {
      text += `\n\n\u{1F4C3} *Ultimas execucoes:*`;
      executions.forEach(e => {
        text += `\n  ${statusEmoji(e.status)} ${escapeMarkdown(formatDate(e.startedAt))} \\(${escapeMarkdown(formatDuration(e.duration))}\\)`;
      });
    }

    // Acoes disponiveis em texto
    const id = shortId(task.id);
    let actions = '\n\n\u{2699} Acoes:';
    if (task.status !== 'running') actions += `\n/run ${id} — Executar`;
    if (task.status === 'paused') actions += `\n/resume ${id} — Retomar`;
    else if (task.status !== 'running') actions += `\n/pause ${id} — Pausar`;
    actions += `\n/delete ${id} — Deletar`;

    await safeSend(chatId, text + actions);
  } catch (error) {
    log.error('/task falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${safeText(error.message, 500)}`);
  }
}

async function cmdRun(msg, taskId) {
  const chatId = msg.chat.id;
  log.info('/run', { chatId, taskId });

  try {
    let task = storage.getTask(taskId);
    if (!task) {
      const tasks = storage.getTasks();
      task = tasks.find(t => t.id.startsWith(taskId));
    }

    if (!task) {
      await bot.sendMessage(chatId, `\u{274C} Tarefa nao encontrada: ${taskId}`);
      return;
    }

    // Verificar se ja esta em execucao (prevenir duplicacao)
    if (task.status === 'running') {
      await bot.sendMessage(chatId, `\u{23F3} "${task.name}" ja esta em execucao. Aguarde.`);
      return;
    }

    await bot.sendMessage(chatId, `\u{23F3} Executando *${escapeMarkdown(task.name)}*\\.\\.\\.\n_Aguarde a conclusao\\._`, { parse_mode: 'MarkdownV2' });

    // Marcar ANTES de executar para evitar duplicacao de notificacoes
    telegramInitiatedTasks.set(task.id, Date.now());
    // Marcar task como running para evitar que scheduler periodic a execute tambem
    storage.updateTask(task.id, { status: 'running' });

    const result = await scheduler.runNow(task.id);

    if (result.success) {
      // Consolidar tudo em uma unica mensagem respeitando limite do Telegram
      const sentMsg = await sendConsolidatedResult(chatId, task, result);

      // Rastrear mensagem para sessao de conversa
      if (sentMsg && result.executionId) {
        trackExecutionMessage(sentMsg.message_id, chatId, result.executionId);
      }
    } else {
      const errMsg = result.error || 'Desconhecido';
      if (/RATE_LIMIT:|you[\u2019']?ve hit your limit/i.test(errMsg)) {
        const resetMatch = errMsg.match(/resets?\s+([^\n\r·•\]]+)/i);
        const resetStr = resetMatch ? resetMatch[1].trim() : '';
        const msg = resetStr
          ? `\u{23F3} Limite atingido — ${task.name}\n\u{1F552} Reset: ${resetStr}`
          : `\u{23F3} Limite atingido — ${task.name}\nTente mais tarde.`;
        await bot.sendMessage(chatId, msg);
      } else {
        // Truncar erro para evitar "message too long"
        const cleanErr = errMsg.length > 500 ? errMsg.substring(0, 500) + '...' : errMsg;
        await bot.sendMessage(chatId, `\u{274C} ${task.name}\n\n${cleanErr}`);
      }
    }
  } catch (error) {
    log.error('/run falhou', error);
    const errClean = error.message.length > 500 ? error.message.substring(0, 500) + '...' : error.message;
    await bot.sendMessage(chatId, `\u{274C} Erro: ${errClean}`);
  }
}

/**
 * Envia resultado consolidado em uma unica mensagem (respeitando limite de 4096 chars)
 * Extrai apenas a resposta final do Claude (assistant_text) do output, ignorando tool calls
 */
async function sendConsolidatedResult(chatId, task, result) {
  const MAX_MSG_LEN = 4000; // margem de seguranca para Telegram (limite: 4096)

  // Extrair a resposta final do Claude do conversationLog se disponivel
  let claudeResponse = '';
  try {
    // Buscar a execucao para pegar o conversationLog
    const executions = storage.getExecutions(5);
    const execution = executions.find(e => e.id === result.executionId);
    if (execution && execution.conversationLog) {
      const steps = JSON.parse(execution.conversationLog);
      // Pegar todos os textos do assistant (o resultado final e o mais relevante)
      const assistantTexts = steps
        .filter(s => s.type === 'assistant_text')
        .map(s => s.text);
      // Pegar o resultado final se existir
      const resultStep = steps.find(s => s.type === 'result' && s.finalText);
      if (resultStep && resultStep.finalText) {
        claudeResponse = resultStep.finalText;
      } else if (assistantTexts.length > 0) {
        // Usar a ultima resposta do assistant
        claudeResponse = assistantTexts[assistantTexts.length - 1];
      }
    }
  } catch (e) {
    log.warn('Erro ao extrair resposta do Claude do conversationLog', { error: e.message });
  }

  // Se nao conseguiu extrair do conversationLog, usar output bruto
  if (!claudeResponse && result.output) {
    // Tentar extrair a parte da resposta do Claude do output formatado
    const respMatch = result.output.match(/Resposta do Claude:\n[─]+\n([\s\S]+?)$/);
    if (respMatch) {
      claudeResponse = respMatch[1].trim();
    } else {
      claudeResponse = result.output;
    }
  }

  // Montar header
  const header = `\u{2705} Tarefa concluida: ${task.name}\n\u{23F1} Duracao: ${formatDuration(result.duration)}\n\n`;

  // Montar footer com instrucao de interacao
  const footer = `\n\n\u{1F4AC} Responda esta mensagem para continuar a conversa com o Claude.`;

  // Calcular espaco disponivel para o conteudo
  const availableSpace = MAX_MSG_LEN - header.length - footer.length;

  // Montar mensagem completa
  let content = claudeResponse || '(Sem resposta)';
  const fullMessage = header + content + footer;

  try {
    // Se mensagem > 4000, usar chunking
    if (fullMessage.length > 4000) {
      await sendLongMessage(chatId, fullMessage);
      return null; // sendLongMessage nao retorna referencia unica
    }
    const sentMsg = await bot.sendMessage(chatId, fullMessage);
    return sentMsg;
  } catch (error) {
    log.error('Erro ao enviar resultado consolidado', error);
    try {
      // Fallback: truncar e enviar sem formatacao
      const truncated = content.length > 3500 ? content.substring(0, 3500) + '\n\n... (truncado)' : content;
      const fallbackMsg = `\u{2705} ${task.name} concluida (${formatDuration(result.duration)})\n\n${truncated}`;
      if (fallbackMsg.length > 4000) {
        await sendLongMessage(chatId, fallbackMsg);
        return null;
      }
      return await bot.sendMessage(chatId, fallbackMsg);
    } catch (fallbackErr) {
      log.error('Fallback tambem falhou', fallbackErr);
      return null;
    }
  }
}

/**
 * Rastreia associacao entre mensagem Telegram e execucao Claude
 */
function trackExecutionMessage(messageId, chatId, executionId) {
  messageToExecution.set(`${chatId}:${messageId}`, executionId);
  executionToMessage.set(executionId, { chatId, messageId });
  // Track last execution per chat for auto-routing without reply
  chatLastExecution.set(chatId, { executionId, messageId, timestamp: Date.now() });
  cleanupSessionTracking();
  log.info('Mensagem rastreada para sessao', { messageId, executionId: shortId(executionId) });
}

async function cmdPause(msg, taskId) {
  const chatId = msg.chat.id;
  log.info('/pause', { chatId, taskId });

  try {
    let task = storage.getTask(taskId);
    if (!task) {
      const tasks = storage.getTasks();
      task = tasks.find(t => t.id.startsWith(taskId));
      taskId = task?.id || taskId;
    }

    if (!task) {
      await bot.sendMessage(chatId, `\u{274C} Tarefa nao encontrada.`);
      return;
    }

    scheduler.pauseTask(taskId);
    await bot.sendMessage(chatId, `\u{23F8} Tarefa pausada com sucesso\\.`, { parse_mode: 'MarkdownV2' });
  } catch (error) {
    log.error('/pause falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${safeText(error.message, 500)}`);
  }
}

async function cmdResume(msg, taskId) {
  const chatId = msg.chat.id;
  log.info('/resume', { chatId, taskId });

  try {
    let task = storage.getTask(taskId);
    if (!task) {
      const tasks = storage.getTasks();
      task = tasks.find(t => t.id.startsWith(taskId));
      taskId = task?.id || taskId;
    }

    if (!task) {
      await bot.sendMessage(chatId, `\u{274C} Tarefa nao encontrada.`);
      return;
    }

    scheduler.resumeTask(taskId);
    await bot.sendMessage(chatId, `\u{25B6} Tarefa retomada com sucesso\\.`, { parse_mode: 'MarkdownV2' });
  } catch (error) {
    log.error('/resume falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${safeText(error.message, 500)}`);
  }
}

async function cmdDelete(msg, taskId) {
  const chatId = msg.chat.id;
  log.info('/delete', { chatId, taskId });

  try {
    let task = storage.getTask(taskId);
    if (!task) {
      const tasks = storage.getTasks();
      task = tasks.find(t => t.id.startsWith(taskId));
      taskId = task?.id || taskId;
    }

    if (!task) {
      await bot.sendMessage(chatId, `\u{274C} Tarefa nao encontrada.`);
      return;
    }

    // Pedir confirmacao em texto
    await bot.sendMessage(chatId, `\u{26A0} Tem certeza que deseja deletar "${task.name}"?\n\nEnvie /delete ${shortId(task.id)} novamente para confirmar.`);
  } catch (error) {
    log.error('/delete falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${safeText(error.message, 500)}`);
  }
}

async function cmdStats(msg) {
  const chatId = msg.chat.id;
  log.info('/stats', { chatId });

  try {
    const stats = storage.getExecutionStats();

    const text = `\u{1F4CA} *Estatisticas de Execucao*

\u{1F4C6} *Hoje:*
  Total: ${stats.today.total}
  \u{2705} Sucesso: ${stats.today.success}
  \u{274C} Falhas: ${stats.today.failed}
  \u{1F3C3} Rodando: ${stats.today.running}

\u{1F5D3} *Ultima semana:*
  Total: ${stats.week.total}
  \u{2705} Sucesso: ${stats.week.success}
  \u{274C} Falhas: ${stats.week.failed}

\u{1F4C8} *Geral:*
  Total de execucoes: ${stats.total}
  Taxa de sucesso: ${stats.successRate}%
  Duracao media: ${escapeMarkdown(formatDuration(stats.avgDuration))}`;

    await safeSend(chatId, text);
  } catch (error) {
    log.error('/stats falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${safeText(error.message, 500)}`);
  }
}

async function cmdHistory(msg, limit = 10) {
  const chatId = msg.chat.id;
  log.info('/history', { chatId, limit });

  try {
    const executions = storage.getExecutions(parseInt(limit) || 10);

    if (executions.length === 0) {
      await safeSend(chatId, '\u{1F4ED} Nenhuma execucao registrada\\.');
      return;
    }

    let text = `\u{1F4C3} *Ultimas ${executions.length} execucoes*\n`;

    executions.forEach(e => {
      const emoji = statusEmoji(e.status);
      const name = escapeMarkdown((e.taskName || shortId(e.taskId)).substring(0, 25));
      const date = escapeMarkdown(formatDate(e.startedAt));
      const dur = escapeMarkdown(formatDuration(e.duration));
      text += `\n${emoji} *${name}*\n   ${date} \\(${dur}\\)`;
      if (e.error) {
        text += `\n   _${escapeMarkdown(e.error.substring(0, 80))}_`;
      }
    });

    await safeSend(chatId, text);
  } catch (error) {
    log.error('/history falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${safeText(error.message, 500)}`);
  }
}

async function cmdKb(msg, query) {
  const chatId = msg.chat.id;
  log.info('/kb', { chatId, query });

  if (!query) {
    await safeSend(chatId, '\u{1F4DA} *Buscar na Knowledge Base*\n\nEnvie: /kb \\[termo\\]\n\nExemplo: `/kb shopify api`');
    return;
  }

  try {
    const kbPath = path.join(__dirname, '..', 'knowledge-base', 'knowledge-search.js');
    const kb = require(kbPath);

    const results = kb.search(query, { maxResults: 5, minScore: 5, includeContent: false });

    if (!results || results.length === 0) {
      await bot.sendMessage(chatId, `\u{1F50D} Nenhum resultado para: _${escapeMarkdown(query)}_`, { parse_mode: 'MarkdownV2' });
      return;
    }

    let text = `\u{1F4DA} *Resultados KB: "${escapeMarkdown(query)}"*\n`;

    results.forEach((r, i) => {
      const score = r.score || 0;
      const title = escapeMarkdown(r.title || r.filename || 'Sem titulo');
      const file = escapeMarkdown(r.filename || '');
      text += `\n${i + 1}\\. *${title}*\n   Arquivo: \`${file}\`\n   Relevancia: ${score}%`;
    });

    await safeSend(chatId, text);
  } catch (error) {
    log.error('/kb falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro na busca KB: ${safeText(error.message, 500)}`);
  }
}

async function cmdKbList(msg) {
  const chatId = msg.chat.id;
  log.info('/kblist', { chatId });

  try {
    const kbDir = path.join(__dirname, '..', 'knowledge-base');
    const files = fs.readdirSync(kbDir).filter(f => f.endsWith('.md') && f !== 'README.md');

    if (files.length === 0) {
      await safeSend(chatId, '\u{1F4ED} Nenhum documento na Knowledge Base\\.');
      return;
    }

    let text = `\u{1F4DA} *Knowledge Base \\(${files.length} docs\\)*\n`;

    files.forEach((f, i) => {
      const name = escapeMarkdown(f.replace('.md', ''));
      const fstats = fs.statSync(path.join(kbDir, f));
      const size = (fstats.size / 1024).toFixed(1);
      text += `\n${i + 1}\\. \`${name}\`\n   ${size}KB`;
    });

    await safeSend(chatId, text);
  } catch (error) {
    log.error('/kblist falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${safeText(error.message, 500)}`);
  }
}

async function cmdMemory(msg) {
  const chatId = msg.chat.id;
  log.info('/memory', { chatId });

  try {
    const activeFile = path.join(__dirname, '..', 'conversation-memory', 'active-session.json');
    if (!fs.existsSync(activeFile)) {
      await bot.sendMessage(chatId, '\u{1F4ED} Nenhuma sessao de memoria ativa\\.' , { parse_mode: 'MarkdownV2' });
      return;
    }

    const activeData = JSON.parse(fs.readFileSync(activeFile, 'utf-8'));
    const sessionId = activeData.activeSessionId;

    if (!sessionId) {
      await bot.sendMessage(chatId, '\u{1F4ED} Nenhuma sessao ativa\\.' , { parse_mode: 'MarkdownV2' });
      return;
    }

    const sessionFile = path.join(__dirname, '..', 'conversation-memory', 'sessions', `${sessionId}.json`);
    if (!fs.existsSync(sessionFile)) {
      await bot.sendMessage(chatId, `\u{26A0} Sessao ${escapeMarkdown(shortId(sessionId))} nao encontrada\\.`, { parse_mode: 'MarkdownV2' });
      return;
    }

    const session = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));

    let text = `\u{1F9E0} *Memoria \\- Sessao Ativa*

\u{1F194} ID: \`${escapeMarkdown(shortId(session.id))}\`
\u{1F4CA} Status: ${escapeMarkdown(session.status || 'active')}
\u{1F4C5} Criada: ${escapeMarkdown(formatDate(session.createdAt))}
\u{1F504} Atualizada: ${escapeMarkdown(formatDate(session.updatedAt))}`;

    if (session.objective) {
      text += `\n\n\u{1F3AF} *Objetivo:*\n${escapeMarkdown(session.objective.substring(0, 300))}`;
    }
    if (session.currentPhase) {
      text += `\n\n\u{1F4CD} *Fase:* ${escapeMarkdown(session.currentPhase)}`;
    }
    if (session.interactions) {
      text += `\n\n\u{1F4AC} Interacoes: ${session.interactions}`;
    }
    if (session.checkpoints && session.checkpoints.length > 0) {
      text += `\n\u{1F4CC} Checkpoints: ${session.checkpoints.length}`;
    }

    await safeSend(chatId, text);
  } catch (error) {
    log.error('/memory falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${safeText(error.message, 500)}`);
  }
}

async function cmdSessions(msg) {
  const chatId = msg.chat.id;
  log.info('/sessions', { chatId });

  try {
    const sessionsDir = path.join(__dirname, '..', 'conversation-memory', 'sessions');
    if (!fs.existsSync(sessionsDir)) {
      await bot.sendMessage(chatId, '\u{1F4ED} Nenhuma sessao encontrada\\.' , { parse_mode: 'MarkdownV2' });
      return;
    }

    const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.json') && f.startsWith('session_'));
    const sessions = [];

    for (const file of files.slice(-10)) { // Ultimas 10
      try {
        const data = JSON.parse(fs.readFileSync(path.join(sessionsDir, file), 'utf-8'));
        sessions.push(data);
      } catch (e) { /* skip corrupt files */ }
    }

    sessions.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

    if (sessions.length === 0) {
      await bot.sendMessage(chatId, '\u{1F4ED} Nenhuma sessao encontrada\\.' , { parse_mode: 'MarkdownV2' });
      return;
    }

    let text = `\u{1F9E0} *Sessoes de Memoria \\(${sessions.length}\\)*\n`;

    sessions.forEach((s, i) => {
      const id = escapeMarkdown(shortId(s.id));
      const status = escapeMarkdown(s.status || 'unknown');
      const date = escapeMarkdown(formatDate(s.updatedAt));
      const obj = s.objective ? escapeMarkdown(s.objective.substring(0, 60)) : 'Sem objetivo';
      text += `\n${i + 1}\\. \`${id}\` \\[${status}\\]\n   ${date}\n   _${obj}_`;
    });

    await safeSend(chatId, text);
  } catch (error) {
    log.error('/sessions falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${safeText(error.message, 500)}`);
  }
}

async function cmdScheduler(msg) {
  const chatId = msg.chat.id;
  log.info('/scheduler', { chatId });

  const status = scheduler.getStatus();

  await safeSend(chatId, `\u{2699} *Controle do Scheduler*\n\nEstado atual: ${status.isRunning ? '\u{1F7E2} RODANDO' : '\u{1F534} PARADO'}`);
}

async function cmdPing(msg) {
  const chatId = msg.chat.id;
  const sentTime = Date.now();

  const sent = await bot.sendMessage(chatId, '\u{1F3D3} Pong\\!', { parse_mode: 'MarkdownV2' });
  const latency = Date.now() - sentTime;

  await bot.editMessageText(`\u{1F3D3} Pong\\! Latencia: ${latency}ms`, {
    chat_id: chatId,
    message_id: sent.message_id,
    parse_mode: 'MarkdownV2'
  });
}

async function cmdUptime(msg) {
  const chatId = msg.chat.id;

  const text = `\u{23F1} *Uptime*

Bot: ${escapeMarkdown(uptimeStr())}
Inicio: ${escapeMarkdown(formatDate(startTime ? new Date(startTime).toISOString() : null))}
PID: ${process.pid}
Memoria: ${escapeMarkdown((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1))}MB`;

  await safeSend(chatId, text);
}

async function cmdConfig(msg) {
  const chatId = msg.chat.id;
  log.info('/config', { chatId });

  try {
    const config = storage.getConfig();
    const tgConfig = config.telegram || {};

    const text = `\u{2699} *Configuracao*

*Scheduler:*
  Habilitado: ${config.schedulerEnabled ? 'Sim' : 'Nao'}
  Intervalo: ${escapeMarkdown(formatDuration(config.checkInterval))}
  Max concorrente: ${config.maxConcurrentTasks}
  Retries: ${config.retryAttempts}

*Notificacoes:*
  Webhook: ${config.notifications?.enabled ? 'Ativo' : 'Inativo'}

*Telegram:*
  Usuarios: ${(tgConfig.authorizedUsers || []).length}
  Notif\\. sucesso: ${tgConfig.notifications?.onTaskSuccess ? 'Sim' : 'Nao'}
  Notif\\. falha: ${tgConfig.notifications?.onTaskFailure ? 'Sim' : 'Nao'}`;

    await safeSend(chatId, text);
  } catch (error) {
    log.error('/config falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${safeText(error.message, 500)}`);
  }
}

async function cmdNewTask(msg) {
  const chatId = msg.chat.id;
  log.info('/newtask', { chatId });

  const text = `\u{2795} *Criar Nova Tarefa*

Envie o prompt da tarefa no formato:

\`\`\`
/create Nome da Tarefa | Prompt completo aqui
\`\`\`

*Exemplos:*

\`/create Backup KB | Faca backup de todos os documentos da knowledge base\`

\`/create Analise Vendas | Analise os dados de vendas do Shopify e gere um relatorio\`

_Para tarefas recorrentes, adicione \\| cron: \\* \\* \\* \\* \\* no final_`;

  await safeSend(chatId, text);
}

async function cmdCreate(msg, text) {
  const chatId = msg.chat.id;
  log.info('/create', { chatId });

  if (!text) {
    await cmdNewTask(msg);
    return;
  }

  try {
    const parts = text.split('|').map(p => p.trim());
    const name = parts[0];
    const prompt = parts[1] || name;
    let cronExpression = null;

    // Verificar se tem cron
    if (parts.length > 2) {
      const cronPart = parts[2];
      if (cronPart.startsWith('cron:')) {
        cronExpression = cronPart.replace('cron:', '').trim();
      }
    }

    const task = {
      id: uuidv4(),
      name,
      type: 'claude_prompt',
      prompt,
      status: 'scheduled',
      enabled: true,
      priority: 2,
      successCount: 0,
      failCount: 0,
      scheduledAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      recurring: !!cronExpression,
      cronExpression
    };

    storage.addTask(task);

    if (cronExpression) {
      scheduler.setupCronJob(task);
    }

    await bot.sendMessage(chatId, `\u{2705} Tarefa criada!\n\nID: ${shortId(task.id)}\nNome: ${name}\n${cronExpression ? `Cron: ${cronExpression}` : 'Execucao unica'}\n\nUse /run ${shortId(task.id)} para executar.`);
  } catch (error) {
    log.error('/create falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro ao criar tarefa: ${safeText(error.message, 500)}`);
  }
}

// ============ PROMPT MANAGER COMMANDS ============

async function cmdPrompts(msg) {
  const chatId = msg.chat.id;
  log.info('/prompts', { chatId });

  try {
    const templates = readPromptTemplates();

    if (templates.length === 0) {
      await bot.sendMessage(chatId, '\u{1F4ED} Nenhum prompt cadastrado no Prompt Manager.');
      return;
    }

    const categories = getPromptCategories(templates);
    const catNames = Object.keys(categories);

    let text = `\u{1F4DD} *Prompt Manager \\(${templates.length} prompts\\)*\n\n`;
    text += `\u{1F4C2} *Categorias:*\n`;

    for (const cat of catNames) {
      text += `  \\- ${escapeMarkdown(cat)}: ${categories[cat]} prompts\n`;
    }

    text += `\n_Selecione uma categoria para ver os prompts:_`;

    // Botoes de categorias (maximo 3 por linha)let row = [];
    for (const cat of catNames) {
      if (row.length >= 2) {
        keyboard.push(row);
        row = [];
      }
    }
    if (row.length > 0) keyboard.push(row);

    await safeSend(chatId, text);
  } catch (error) {
    log.error('/prompts falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${safeText(error.message, 500)}`);
  }
}

async function cmdPromptDetail(chatId, templateId) {
  log.info('prompt detail', { chatId, templateId });

  try {
    const templates = readPromptTemplates();
    const template = templates.find(t => t.id === templateId || t.id.startsWith(templateId));

    if (!template) {
      await bot.sendMessage(chatId, `\u{274C} Prompt nao encontrado.`);
      return;
    }

    const icon = template.icon || '\u{1F4DD}';
    const vars = (template.variables || []).filter(v => v.name);

    let text = `${icon} *${escapeMarkdown(template.name)}*\n\n`;
    text += `\u{1F4C2} Categoria: ${escapeMarkdown(template.category || 'Sem Categoria')}\n`;

    if (template.description) {
      text += `\u{1F4CB} ${escapeMarkdown(template.description)}\n`;
    }

    // Mostrar preview do prompt (primeiros 300 chars)
    if (template.promptText) {
      const preview = template.promptText.substring(0, 300);
      text += `\n\u{1F4DD} *Prompt:*\n\`\`\`\n${escapeMarkdown(preview)}${template.promptText.length > 300 ? '...' : ''}\n\`\`\``;
    }

    // Mostrar variaveis
    if (vars.length > 0) {
      text += `\n\n\u{1F3AF} *Variaveis \\(${vars.length}\\):*\n`;
      for (const v of vars) {
        const req = v.required ? ' \\*' : '';
        text += `  \\- \`${escapeMarkdown(v.name)}\`${req}: ${escapeMarkdown(v.label || v.name)}\n`;
      }
    }

    text += `\n\u{1F4C5} Criado: ${escapeMarkdown(formatDate(template.createdAt))}`;

    await safeSend(chatId, text);
  } catch (error) {
    log.error('prompt detail falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${safeText(error.message, 500)}`);
  }
}

async function sendPromptList(chatId, templates, title) {
  if (templates.length === 0) {
    await bot.sendMessage(chatId, '\u{1F4ED} Nenhum prompt encontrado nesta categoria.');
    return;
  }

  let text = `\u{1F4DD} *${escapeMarkdown(title)}*\n`;

  // Limitar a 15 por pagina para nao exceder limite do Telegram
  const show = templates.slice(0, 15);

  for (let i = 0; i < show.length; i++) {
    const t = show[i];
    const icon = t.icon || '\u{1F4DD}';
    const name = escapeMarkdown((t.name || 'Sem nome').substring(0, 35));
    const cat = escapeMarkdown(t.category || '');
    text += `\n${i + 1}\\. ${icon} *${name}*\n   _${cat}_ \\| Vars: ${(t.variables || []).length}`;
  }

  if (templates.length > 15) {
    text += `\n\n_\\.\\.\\. e mais ${templates.length - 15} prompts_`;
  }

  text += `\n\n_Use_ /execprompt \\[id\\] _para executar_`;
  await safeSend(chatId, text);
}

/**
 * /execprompt <templateId> VAR1=valor VAR2=valor
 * Executa um prompt template substituindo variaveis
 */
async function cmdExecPrompt(msg, argsText) {
  const chatId = msg.chat.id;
  log.info('/execprompt', { chatId, args: argsText });

  try {
    // Parsear argumentos: primeiro token e o templateId, os demais sao VAR=valor
    const parts = argsText.split(/\s+/);
    const templateId = parts[0];
    const varArgs = parts.slice(1);

    const templates = readPromptTemplates();
    const template = templates.find(t => t.id === templateId || t.id.startsWith(templateId));

    if (!template) {
      await bot.sendMessage(chatId, `\u{274C} Prompt nao encontrado: ${templateId}\n\nUse /prompts para ver os disponiveis.`);
      return;
    }

    // Parsear variaveis (formato VAR=valor ou VAR="valor com espacos")
    const vars = {};
    let currentKey = null;
    let currentVal = '';

    for (const part of varArgs) {
      const eqIdx = part.indexOf('=');
      if (eqIdx > 0 && !currentKey) {
        currentKey = part.substring(0, eqIdx);
        currentVal = part.substring(eqIdx + 1);
        if (!currentVal.startsWith('"') || currentVal.endsWith('"')) {
          vars[currentKey] = currentVal.replace(/^"|"$/g, '');
          currentKey = null;
          currentVal = '';
        }
      } else if (currentKey) {
        currentVal += ' ' + part;
        if (part.endsWith('"')) {
          vars[currentKey] = currentVal.replace(/^"|"$/g, '');
          currentKey = null;
          currentVal = '';
        }
      }
    }

    // Substituir variaveis no prompt
    let finalPrompt = template.promptText;
    for (const [key, value] of Object.entries(vars)) {
      finalPrompt = finalPrompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    // Verificar variaveis obrigatorias nao preenchidas
    const remaining = finalPrompt.match(/\{\{(\w+)\}\}/g) || [];
    const requiredVars = (template.variables || []).filter(v => v.required);
    const missingRequired = requiredVars.filter(v => remaining.includes(`{{${v.name}}}`));

    if (missingRequired.length > 0) {
      let text = `\u{26A0} Variaveis obrigatorias faltando:\n\n`;
      for (const v of missingRequired) {
        text += `  - ${v.name}: ${v.label || v.name}${v.placeholder ? ` (Ex: ${v.placeholder})` : ''}\n`;
      }
      text += `\nUse: /execprompt ${shortId(template.id)} ${missingRequired.map(v => `${v.name}=valor`).join(' ')}`;
      await bot.sendMessage(chatId, text);
      return;
    }

    // Criar tarefa e executar
    const task = {
      id: uuidv4(),
      name: `Prompt: ${template.name}`,
      type: 'claude_prompt',
      prompt: finalPrompt,
      status: 'scheduled',
      enabled: true,
      priority: 2,
      successCount: 0,
      failCount: 0,
      scheduledAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    storage.addTask(task);
    await bot.sendMessage(chatId, `\u{23F3} Executando prompt *${escapeMarkdown(template.name)}*\\.\\.\\.\n_Aguarde a conclusao\\._`, { parse_mode: 'MarkdownV2' });

    // Marcar ANTES de executar para evitar duplicacao
    telegramInitiatedTasks.set(task.id, Date.now());

    const result = await scheduler.runNow(task.id);

    if (result.success) {
      const sentMsg = await sendConsolidatedResult(chatId, task, result);
      if (sentMsg && result.executionId) {
        trackExecutionMessage(sentMsg.message_id, chatId, result.executionId);
      }
    } else {
      await bot.sendMessage(chatId, `\u{274C} Falha: ${safeText(result.error || 'Erro desconhecido', 500)}`);
    }
  } catch (error) {
    log.error('/execprompt falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${safeText(error.message, 500)}`);
  }
}

// ============ SESSION REPLY HANDLER ============

/**
 * Processa mensagens sem comando (/) que sao respostas a mensagens de resultado
 * Se o usuario esta respondendo (reply) a uma mensagem vinculada a uma execucao,
 * usa resumeClaudeSession para continuar a conversa
 */
async function handleSessionReply(msg) {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Ignorar se e um comando
  if (text && text.startsWith('/')) return false;

  // Strategy 1: Explicit reply to a tracked message
  let executionId = null;
  let routeMethod = 'explicit_reply';
  const replyTo = msg.reply_to_message;
  if (replyTo) {
    const replyKey = `${chatId}:${replyTo.message_id}`;
    executionId = messageToExecution.get(replyKey);
  }

  // Strategy 2: Auto-route to last active execution for this chat (within time window)
  if (!executionId) {
    const lastExec = chatLastExecution.get(chatId);
    if (lastExec && (Date.now() - lastExec.timestamp) < AUTO_ROUTE_WINDOW_MS) {
      executionId = lastExec.executionId;
      routeMethod = 'auto_route';
      log.info('Auto-routing mensagem para ultima execucao ativa', {
        chatId,
        executionId: shortId(executionId),
        age: formatDuration(Date.now() - lastExec.timestamp)
      });
    }
  }

  if (!executionId) return false;

  log.info('Sessao reply detectada', {
    chatId,
    executionId: shortId(executionId),
    routeMethod,
    message: (text || '').substring(0, 50)
  });

  try {
    // Buscar execucao para validar
    const execution = storage.getExecution(executionId);
    if (!execution) {
      await bot.sendMessage(chatId, '\u{26A0} Sessao nao encontrada. A execucao pode ter sido removida.');
      return true;
    }

    if (!execution.claudeSessionId) {
      await bot.sendMessage(chatId, '\u{26A0} Esta execucao nao possui sessao Claude ativa para continuar.');
      return true;
    }

    // Verificar se ja esta rodando
    const running = executor.getRunningTasks();
    if (running.some(r => r.executionId === executionId)) {
      await bot.sendMessage(chatId, '\u{23F3} Esta sessao ja esta em execucao. Aguarde a conclusao.');
      return true;
    }

    // Enviar feedback de que esta processando
    const waitMsg = await bot.sendMessage(chatId, `\u{1F504} Continuando conversa com Claude\\.\\.\\.\n_Sessao: ${escapeMarkdown(shortId(execution.claudeSessionId))}_`, { parse_mode: 'MarkdownV2' });

    // Obter diretorio de trabalho
    const task = storage.getTask(execution.taskId);
    const workingDirectory = task?.workingDirectory || process.cwd();

    // Executar resume da sessao Claude
    const result = await executor.resumeClaudeSession(executionId, text, workingDirectory);

    // Deletar mensagem de "aguarde"
    await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {});

    if (result.success) {
      // Extrair resposta do Claude do conversationLog atualizado
      let claudeResponse = '';
      try {
        const updatedExec = storage.getExecution(executionId);
        if (updatedExec && updatedExec.conversationLog) {
          const steps = JSON.parse(updatedExec.conversationLog);
          // Pegar os textos do assistant apos o ultimo user_message
          const lastUserIdx = steps.map((s, i) => ({ s, i }))
            .filter(x => x.s.type === 'user_message')
            .pop()?.i || 0;
          const newTexts = steps.slice(lastUserIdx)
            .filter(s => s.type === 'assistant_text')
            .map(s => s.text);
          // Ou pegar o resultado final
          const resultStep = steps.slice(lastUserIdx).find(s => s.type === 'result' && s.finalText);
          claudeResponse = resultStep?.finalText || newTexts[newTexts.length - 1] || '';
        }
      } catch (e) {
        log.warn('Erro ao extrair resposta resumida', { error: e.message });
      }

      if (!claudeResponse) {
        claudeResponse = '(Sessao continuada com sucesso, mas sem resposta textual)';
      }

      // Enviar resposta consolidada
      const MAX_LEN = 4000;
      const header = `\u{1F4AC} *Resposta do Claude*\n_Sessao: ${shortId(execution.claudeSessionId)}_\n\n`;
      const footer = `\n\n\u{1F4AC} Responda esta mensagem para continuar a conversa.`;
      const available = MAX_LEN - header.length - footer.length;

      let content = claudeResponse;
      if (content.length > available) {
        content = content.substring(0, available - 20) + '\n\n... (truncado)';
      }

      // Enviar sem MarkdownV2 para evitar problemas com o conteudo do Claude
      const fullMsg = `\u{1F4AC} Resposta do Claude\nSessao: ${shortId(execution.claudeSessionId)}\n\n${content}\n\n\u{1F4AC} Responda esta mensagem para continuar a conversa.`;
      let sentMsg;
      if (fullMsg.length > 4000) {
        await sendLongMessage(chatId, fullMsg);
        sentMsg = null;
      } else {
        sentMsg = await bot.sendMessage(chatId, fullMsg);
      }

      // Rastrear nova mensagem para continuar conversa
      if (sentMsg) {
        trackExecutionMessage(sentMsg.message_id, chatId, executionId);
      }
    } else {
      await bot.sendMessage(chatId, `\u{274C} Erro ao continuar sessao: ${result.error || 'Falha desconhecida'}`);
    }

    return true;
  } catch (error) {
    log.error('Session reply falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro ao continuar conversa: ${safeText(error.message, 500)}`);
    return true;
  }
}

// ============ FREE TEXT HANDLER (CONVERSATIONAL MODE) ============

/**
 * Processa mensagem de texto livre - envia ao Claude como conversa
 * Se ha sessao ativa, continua. Se nao, cria nova sessao.
 */
async function handleFreeText(msg) {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || text.startsWith('/')) return false;
  if (!isAuthorized(chatId)) return false;

  // Verificar modo terminal — se ativo, redirecionar para Claude Code terminal local
  if (terminalModeChats.get(chatId) && scheduledTasksRef) {
    return await handleTerminalMode(msg);
  }

  // Verificar lock de processamento (evitar execucoes simultaneas no mesmo chat)
  if (chatProcessingLock.get(chatId)) {
    await bot.sendMessage(chatId, '\u{23F3} Aguarde... ainda processando sua mensagem anterior.');
    return true;
  }

  chatProcessingLock.set(chatId, true);

  try {
    // Strategy 0: Reply a mensagem de tarefa agendada — continuar via claude -p com contexto
    if (msg.reply_to_message && scheduledTasksRef) {
      const replyMsgId = msg.reply_to_message.message_id;
      const taskSession = scheduledTasksRef.getTelegramSession(replyMsgId);
      if (taskSession) {
        log.info('Reply a tarefa agendada detectado', { chatId, replyMsgId, execId: taskSession.execId });
        await bot.sendMessage(chatId, `Continuando "[${taskSession.title}]"...`);

        // Construir prompt com contexto da execucao anterior
        const contextPrompt = [
          `Contexto da tarefa anterior "${taskSession.title}":`,
          `Prompt original: ${taskSession.prompt}`,
          `Resposta anterior (resumo): ${taskSession.outputSummary}`,
          ``,
          `Nova pergunta do usuario: ${text}`
        ].join('\n');

        const result = await scheduledTasksRef.launchFromTelegram(contextPrompt, String(chatId));

        if (result.status === 'completed' && result.output) {
          const output = result.output.length > 3800
            ? result.output.slice(0, 3700) + '\n\n... (truncado)'
            : result.output;
          await bot.sendMessage(chatId, output, { reply_to_message_id: msg.message_id });
        } else if (result.status === 'failed') {
          await bot.sendMessage(chatId, `Falha: ${result.error || 'erro desconhecido'}`);
        }
        return true;
      }
    }

    // Strategy 1: Reply direto a uma mensagem de sessao antiga — retomar AQUELA sessao
    if (msg.reply_to_message) {
      const replyKey = `${chatId}:${msg.reply_to_message.message_id}`;
      const replyExecutionId = messageToExecution.get(replyKey);
      if (replyExecutionId) {
        const execution = storage.getExecution(replyExecutionId);
        if (execution && execution.claudeSessionId) {
          log.info('Reply em sessao antiga detectado', { chatId, executionId: shortId(replyExecutionId) });
          // Reativar esta sessao como sessao corrente do chat
          const restoredSession = createSession(chatId, replyExecutionId, execution.claudeSessionId, execution.taskId);
          return await continueSession(chatId, text, restoredSession);
        }
      }
    }

    // Strategy 2: Sessao ativa no chat — continuar
    const session = getActiveSession(chatId);
    if (session) {
      return await continueSession(chatId, text, session);
    }

    // Strategy 3: Nenhuma sessao — criar nova
    return await startNewSession(chatId, text);
  } catch (error) {
    log.error('handleFreeText falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${safeText(error.message, 500)}`);
    return true;
  } finally {
    chatProcessingLock.delete(chatId);
  }
}

/**
 * Inicia nova sessao conversacional - cria task temporaria e executa
 */
// Contexto injetado nas sessoes conversacionais do Telegram
const TELEGRAM_SESSION_CONTEXT = `Voce esta respondendo via Telegram como assistente pessoal do usuario. REGRAS CRITICAS:

1. FORMATO: Respostas concisas e diretas (Telegram limite 4096 chars). Sem markdown complexo (sem **, sem \`\`\`, sem headers ##). Use texto simples, emojis e quebras de linha.
2. IDIOMA: Sempre PT-BR.
3. ACESSO TOTAL: Voce tem acesso a TODAS as ferramentas do ecossistema Claude Code. Use-as livremente:

   CRM LOCAL (porta 3847) — curl -s http://localhost:3847/api/crm/<endpoint> -H "Authorization: Bearer local-dev-token"
   Endpoints principais:
   - /personal-tasks (GET/POST) — tarefas pessoais do usuario
   - /leads (GET/POST) — leads e clientes
   - /leads/:id (GET/PUT) — detalhe/atualizar lead
   - /leads/:id/notes (GET/POST) — notas do lead
   - /leads/:id/messages (GET/POST) — mensagens do lead
   - /finance/transactions (GET/POST) — transacoes financeiras
   - /finance/summary (GET) — resumo financeiro
   - /finance/categories (GET/POST) — categorias
   - /dashboard (GET) — KPIs e metricas
   - /notes (GET/POST) — notas gerais
   - /campaigns (GET/POST) — campanhas

   TOOLS CLI — node ~/.claude/task-scheduler/tools-cli.js <tool> [args]
   62 ferramentas: google_search, send_whatsapp, send_email, scrape_website, seo_check, meta_ads, dns_lookup, ssl_check, chrome, scheduler, etc.
   Lista: --list | Help: --help <tool>

   KNOWLEDGE BASE — node ~/.claude/knowledge-base/knowledge-search.js "<busca>"
   Shopify, Meta Ads, APIs, Infra, Marketing, Dev, etc.

   CREDENCIAIS — node ~/.claude/task-scheduler/tools-cli.js get_credential name=<NOME>
   vault_manage action=list para listar disponiveis.

   ENVIO DE ARQUIVOS VIA TELEGRAM — Voce pode enviar arquivos diretamente ao usuario!
   Use o endpoint UNIFICADO (recomendado) ou os especificos:

   ## ENDPOINT UNIFICADO (RECOMENDADO) — auto-detecta tipo pela extensao:
   curl -s -X POST http://localhost:3847/api/telegram/send-media -H "Content-Type: application/json" -d '{"path":"/caminho/arquivo.ext","caption":"Descricao"}'
   curl -s -X POST http://localhost:3847/api/telegram/send-media -H "Content-Type: application/json" -d '{"url":"https://exemplo.com/foto.jpg","caption":"Descricao"}'
   curl -s -X POST http://localhost:3847/api/telegram/send-media -H "Content-Type: application/json" -d '{"path":"/caminho/video.mp4","type":"video","caption":"Descricao"}'

   ## ENDPOINTS ESPECIFICOS (se quiser forcar o tipo):
   # Foto:
   curl -s -X POST http://localhost:3847/api/telegram/send-photo -H "Content-Type: application/json" -d '{"path":"/caminho/foto.png","caption":"Descricao"}'
   # Documento (PDF, CSV, ZIP, etc.):
   curl -s -X POST http://localhost:3847/api/telegram/send-document -H "Content-Type: application/json" -d '{"path":"/caminho/doc.pdf","caption":"Descricao"}'
   # Video:
   curl -s -X POST http://localhost:3847/api/telegram/send-video -H "Content-Type: application/json" -d '{"path":"/caminho/video.mp4","caption":"Descricao"}'
   # Audio:
   curl -s -X POST http://localhost:3847/api/telegram/send-audio -H "Content-Type: application/json" -d '{"path":"/caminho/audio.mp3","caption":"Descricao"}'
   # Upload binario (form-data):
   curl -s -X POST http://localhost:3847/api/telegram/send-file -F "file=@/caminho/arquivo.ext" -F "caption=Descricao"

   ## CAMPOS JSON aceitos por todos os endpoints:
   - "path": caminho local do arquivo (ex: "/c/Users/USER/.claude/temp/screenshot.png")
   - "url": URL publica do arquivo (ex: "https://exemplo.com/foto.jpg")
   - "caption": descricao do arquivo para o usuario (SEMPRE incluir!)
   - "type": forcar tipo em send-media ("photo"|"video"|"audio"|"document")
   - "chatId": opcional, envia para chat especifico (default: broadcast para usuarios autorizados)
   - "filename": nome do arquivo no Telegram (opcional)

   ## REGRAS CRITICAS sobre envio de arquivos:
   - SEMPRE envie arquivos gerados (screenshot, PDF, planilha, imagem, video) via API acima
   - Para screenshots: chrome action=screenshot url="..." output="~/.claude/temp/screenshot.png", depois envie
   - Para criar arquivos temporarios: use ~/.claude/temp/, envie, e limpe depois
   - Limite do Telegram: 50MB para documentos/videos, 10MB para fotos
   - SEMPRE inclua "caption" descritivo
   - Use caminhos ABSOLUTOS com barras normais (/) — ex: /c/Users/USER/.claude/temp/arquivo.png
   - Se o arquivo foi criado com sucesso, NAO precisa mencionar o caminho na resposta — o sistema auto-detecta e envia

4. MAPEAMENTO DE INTENCOES:
   - "minhas tarefas" / "to-do" / "pendencias" → GET /api/crm/personal-tasks
   - "leads" / "clientes" / "prospects" → GET /api/crm/leads
   - "financeiro" / "saldo" / "quanto ganhei" → GET /api/crm/finance/summary
   - "notas" → GET /api/crm/notes
   - "dashboard" / "metricas" → GET /api/crm/dashboard
   - "buscar no google" / "pesquisar" → tools-cli google_search query="..."
   - "enviar whatsapp" → tools-cli send_whatsapp to=NUMERO message="..."
   - "verificar site" / "seo" → tools-cli seo_check url="..."

PEDIDO DO USUARIO:
`;

// Diretorio de trabalho para sessoes Telegram (onde esta o CLAUDE.md principal)
const TELEGRAM_WORKING_DIR = path.join(__dirname, '..');

async function startNewSession(chatId, text) {
  const waitMsg = await bot.sendMessage(chatId, '\u{1F4AD} Processando...');

  try {
    // Criar task temporaria para a conversa
    const taskId = uuidv4();
    const task = {
      id: taskId,
      name: `Chat ${new Date().toLocaleTimeString('pt-BR')}`,
      type: 'claude_prompt',
      prompt: TELEGRAM_SESSION_CONTEXT + text,
      status: 'scheduled',
      enabled: true,
      priority: 1,
      successCount: 0,
      failCount: 0,
      scheduledAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      recurring: false,
      source: 'telegram_chat',
      telegramChatId: chatId,
      workingDirectory: TELEGRAM_WORKING_DIR
    };

    storage.addTask(task);
    telegramInitiatedTasks.set(taskId, Date.now());

    // Executar
    const result = await scheduler.runNow(taskId);

    // Deletar mensagem de espera
    await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {});

    if (result.success) {
      // Extrair resposta do Claude
      const claudeResponse = extractClaudeResponse(result);

      // Buscar claudeSessionId da execucao
      let claudeSessionId = null;
      try {
        const execution = storage.getExecution(result.executionId);
        claudeSessionId = execution?.claudeSessionId;
      } catch (e) { /* ignore */ }

      // Criar sessao conversacional
      const newSession = createSession(chatId, result.executionId, claudeSessionId, taskId);

      // Rastrear para o sistema de reply legado tambem
      const sentMsg = await sendChatResponse(chatId, claudeResponse, result.duration, newSession.name);

      if (sentMsg && result.executionId) {
        trackExecutionMessage(sentMsg.message_id, chatId, result.executionId);
      }
    } else {
      const errMsg = result.error || 'Erro desconhecido';
      if (/RATE_LIMIT:|you[\u2019']?ve hit your limit/i.test(errMsg)) {
        await bot.sendMessage(chatId, '\u{23F3} Limite de uso atingido. Tente novamente mais tarde.');
      } else {
        await bot.sendMessage(chatId, `\u{274C} ${errMsg}`);
      }
    }

    return true;
  } catch (error) {
    await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {});
    throw error;
  }
}

/**
 * Continua sessao existente via resume
 */
async function continueSession(chatId, text, session) {
  const waitMsg = await bot.sendMessage(chatId, '\u{1F504} Pensando...');

  try {
    // Validar que a execucao e sessao ainda existem
    const execution = storage.getExecution(session.executionId);
    if (!execution || !execution.claudeSessionId) {
      // Sessao invalida - iniciar nova
      endSession(chatId);
      await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {});
      return await startNewSession(chatId, text);
    }

    // Verificar se ja esta rodando
    const running = executor.getRunningTasks();
    if (running.some(r => r.executionId === session.executionId)) {
      await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {});
      await bot.sendMessage(chatId, '\u{23F3} Ainda processando a mensagem anterior. Aguarde.');
      return true;
    }

    // Obter diretorio de trabalho
    const task = storage.getTask(session.taskId);
    const workingDirectory = task?.workingDirectory || process.cwd();

    // Resume da sessao
    const result = await executor.resumeClaudeSession(session.executionId, text, workingDirectory);

    await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {});

    if (result.success) {
      touchSession(chatId);

      // Extrair resposta
      let claudeResponse = '';
      try {
        const updatedExec = storage.getExecution(session.executionId);
        if (updatedExec && updatedExec.conversationLog) {
          const steps = JSON.parse(updatedExec.conversationLog);
          const lastUserIdx = steps.map((s, i) => ({ s, i }))
            .filter(x => x.s.type === 'user_message')
            .pop()?.i || 0;
          const newTexts = steps.slice(lastUserIdx)
            .filter(s => s.type === 'assistant_text')
            .map(s => s.text);
          const resultStep = steps.slice(lastUserIdx).find(s => s.type === 'result' && s.finalText);
          claudeResponse = resultStep?.finalText || newTexts[newTexts.length - 1] || '';
        }
      } catch (e) {
        log.warn('Erro ao extrair resposta resumida', { error: e.message });
      }

      if (!claudeResponse) {
        claudeResponse = '(Sessao continuada, sem resposta textual)';
      }

      const sentMsg = await sendChatResponse(chatId, claudeResponse, null, session.name);

      if (sentMsg) {
        trackExecutionMessage(sentMsg.message_id, chatId, session.executionId);
      }
    } else {
      // Se falhou, pode ser sessao corrompida - limpar
      endSession(chatId);
      await bot.sendMessage(chatId, `\u{274C} Erro na sessao: ${safeText(result.error || 'Falha desconhecida', 400)}\n\nSessao encerrada. Envie uma nova mensagem para iniciar outra.`);
    }

    return true;
  } catch (error) {
    await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {});
    // Se a sessao deu erro, limpar e tentar criar nova automaticamente
    endSession(chatId);
    log.warn('Resume falhou, iniciando nova sessao automaticamente', {
      chatId,
      error: error.message,
      oldExecutionId: shortId(session.executionId)
    });
    // Fallback: iniciar nova sessao ao inves de mostrar erro
    try {
      return await startNewSession(chatId, text);
    } catch (newSessionError) {
      // Se a nova sessao tambem falhar, ai sim reportar erro
      throw newSessionError;
    }
  }
}

/**
 * Extrai a resposta final do Claude de um resultado de execucao
 */
function extractClaudeResponse(result) {
  let claudeResponse = '';
  try {
    const executions = storage.getExecutions(5);
    const execution = executions.find(e => e.id === result.executionId);
    if (execution && execution.conversationLog) {
      const steps = JSON.parse(execution.conversationLog);
      const assistantTexts = steps
        .filter(s => s.type === 'assistant_text')
        .map(s => s.text);
      const resultStep = steps.find(s => s.type === 'result' && s.finalText);
      if (resultStep && resultStep.finalText) {
        claudeResponse = resultStep.finalText;
      } else if (assistantTexts.length > 0) {
        claudeResponse = assistantTexts[assistantTexts.length - 1];
      }
    }
  } catch (e) {
    log.warn('Erro ao extrair resposta do Claude', { error: e.message });
  }

  if (!claudeResponse && result.output) {
    const respMatch = result.output.match(/Resposta do Claude:\n[─]+\n([\s\S]+?)$/);
    claudeResponse = respMatch ? respMatch[1].trim() : result.output;
  }

  return claudeResponse || '(Sem resposta)';
}

/**
 * Envia resposta do Claude no modo conversacional (sem formatacao pesada)
 */
async function sendChatResponse(chatId, content, duration, sessionName) {
  const MAX_LEN = 4000;

  // Detectar e enviar arquivos mencionados na resposta do Claude
  await detectAndSendFiles(chatId, content);

  let header = '';
  if (sessionName) {
    header += `\u{1F4AC} ${sessionName}`;
    if (duration) header += ` | \u{23F1} ${formatDuration(duration)}`;
    header += '\n\n';
  } else if (duration) {
    header = `\u{23F1} ${formatDuration(duration)}\n\n`;
  }

  const available = MAX_LEN - header.length;
  if (content.length > available) {
    content = content.substring(0, available - 20) + '\n\n... (truncado)';
  }

  const fullMessage = header + content;

  try {
    // Tentar enviar com mensagem longa se necessario
    if (fullMessage.length > 4000) {
      await sendLongMessage(chatId, fullMessage);
      return null; // sendLongMessage nao retorna referencia unica
    }
    return await bot.sendMessage(chatId, fullMessage);
  } catch (error) {
    log.error('Erro ao enviar resposta chat', error);
    try {
      return await bot.sendMessage(chatId, content.substring(0, 3500));
    } catch (e) {
      return null;
    }
  }
}

/**
 * Detecta caminhos de arquivo na resposta do Claude e envia automaticamente via Telegram
 * Procura por padroes como: "Arquivo salvo em: /caminho/arquivo.ext"
 * ou caminhos absolutos para arquivos conhecidos (.png, .jpg, .pdf, .mp4, etc.)
 */
async function detectAndSendFiles(chatId, content) {
  if (!content || !bot || !isRunning) return;

  // Se o Claude ja enviou via API (curl send-photo/send-document/send-video/send-media/send-file),
  // nao re-enviar os mesmos arquivos
  const alreadySentViaAPI = /curl\s+.*localhost:3847\/api\/telegram\/send-(photo|document|video|audio|file|media)/i.test(content);

  const fileExts = /\.(png|jpg|jpeg|gif|webp|bmp|pdf|csv|xlsx|xls|doc|docx|zip|rar|mp4|avi|mov|mkv|webm|mp3|ogg|wav|flac|m4a|aac|json|txt|html|svg|pptx|ppt)$/i;

  // Padroes para detectar arquivos gerados/mencionados
  const patterns = [
    // "Arquivo salvo em: /caminho/arquivo.ext"
    /(?:arquivo|file|salvo|gerado|criado|screenshot|captura|exportado|gravado|output|resultado)[\s:]+([A-Za-z]:[\\\/][^\s"'<>|]+|\/[^\s"'<>|]+|~[\\\/][^\s"'<>|]+)/gi,
    // Caminhos absolutos Windows/Unix isolados em linhas
    /^([A-Za-z]:[\\\/][^\s"'<>|]*(?:\.\w{2,5}))$/gm,
    /^(\/(?:home|tmp|var|opt|Users|c\/Users)[^\s"'<>|]*(?:\.\w{2,5}))$/gm,
    // Caminhos com ~ (home)
    /^(~[\\\/][^\s"'<>|]*(?:\.\w{2,5}))$/gm,
    // "path=" ou "path:" seguido de caminho (detectar args de curl/tools-cli)
    /(?:path|output|file)[=:"]\s*([A-Za-z]:[\\\/][^\s"'<>|,}]+|\/[^\s"'<>|,}]+|~[\\\/][^\s"'<>|,}]+)/gi,
  ];

  const detectedFiles = new Set();

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const filePath = match[1];
      if (fileExts.test(filePath)) {
        detectedFiles.add(filePath);
      }
    }
  }

  if (detectedFiles.size === 0) return;

  // Se Claude ja enviou via API local, nao duplicar — apenas logar
  if (alreadySentViaAPI) {
    log.info('Arquivos detectados mas Claude ja enviou via API', {
      chatId,
      files: [...detectedFiles],
      skipReason: 'already_sent_via_api'
    });
    return;
  }

  // Enviar cada arquivo detectado
  let sentCount = 0;
  for (const filePath of detectedFiles) {
    try {
      const resolved = filePath.startsWith('~')
        ? path.join(process.env.HOME || process.env.USERPROFILE || '', filePath.slice(1))
        : path.resolve(filePath);

      if (fs.existsSync(resolved)) {
        const filename = path.basename(resolved);
        const stat = fs.statSync(resolved);

        // Verificar tamanho (limite Telegram: 50MB)
        if (stat.size > 50 * 1024 * 1024) {
          log.warn('Arquivo excede 50MB, nao enviando', { file: resolved, size: stat.size });
          await bot.sendMessage(chatId, `\u{26A0}\u{FE0F} Arquivo ${filename} excede 50MB (limite do Telegram).`);
          continue;
        }

        // Nao enviar arquivos vazios
        if (stat.size === 0) {
          log.warn('Arquivo vazio, nao enviando', { file: resolved });
          continue;
        }

        log.info('Auto-enviando arquivo detectado', { chatId, file: resolved, size: stat.size });
        await sendFile(chatId, resolved, { caption: `\u{1F4CE} ${filename}` });
        sentCount++;
      }
    } catch (e) {
      log.warn('Falha ao auto-enviar arquivo detectado', { file: filePath, error: e.message });
    }
  }

  if (sentCount > 0) {
    log.info('Auto-envio concluido', { chatId, total: detectedFiles.size, sent: sentCount });
  }
}

/**
 * /nova - Iniciar nova sessao (encerra a anterior se houver)
 */
async function cmdNova(msg) {
  const chatId = msg.chat.id;
  const oldSession = endSession(chatId);

  if (oldSession) {
    const duration = formatDuration(Date.now() - oldSession.createdAt);
    await bot.sendMessage(chatId, `\u{1F504} "${oldSession.name}" encerrada (${oldSession.messageCount} msgs, ${duration}).\n\n\u{1F4AC} Envie sua proxima mensagem para iniciar uma nova conversa.`);
  } else {
    await bot.sendMessage(chatId, '\u{1F4AC} Pronto! Envie sua mensagem para iniciar uma nova conversa com o Claude.');
  }
}

/**
 * /sessao - Informacoes da sessao atual
 */
async function cmdSessao(msg) {
  const chatId = msg.chat.id;
  const session = getActiveSession(chatId);

  if (!session) {
    await bot.sendMessage(chatId, '\u{1F4ED} Nenhuma sessao ativa.\n\nEnvie qualquer mensagem de texto para iniciar uma conversa.');
    return;
  }

  const age = formatDuration(Date.now() - session.createdAt);
  const idle = formatDuration(Date.now() - session.lastActivity);
  const remaining = formatDuration(SESSION_EXPIRY_MS - (Date.now() - session.lastActivity));

  let text = `\u{1F4AC} ${session.name}\n\n`;
  text += `ID: ${shortId(session.executionId)}\n`;
  text += `Mensagens: ${session.messageCount}\n`;
  text += `Duracao: ${age}\n`;
  text += `Inativa ha: ${idle}\n`;
  text += `Expira em: ${remaining}\n`;

  if (session.claudeSessionId) {
    text += `Claude Session: ${shortId(session.claudeSessionId)}\n`;
  }

  text += `\nUse /nova para encerrar e iniciar outra.`;

  await bot.sendMessage(chatId, text);
}

// Limpar sessoes expiradas periodicamente
setInterval(() => {
  const now = Date.now();
  for (const [chatId, session] of chatSessions) {
    if (now - session.lastActivity > SESSION_EXPIRY_MS) {
      chatSessions.delete(chatId);
      log.info('Sessao expirada (cleanup)', { chatId });
    }
  }
}, 5 * 60 * 1000);

// ============ CALLBACK QUERY HANDLER (legado - para botoes antigos) ============

async function handleCallbackQuery(query) {
  const chatId = query.message.chat.id;
  const data = query.data;

  try {
    await bot.answerCallbackQuery(query.id, { text: 'Use comandos /help para ver opcoes' });

    // Redirecionar callbacks legados para comandos equivalentes
    if (data === 'main_menu' || data === 'help_full') {
      await cmdHelp({ chat: { id: chatId } });
    } else if (data.startsWith('run_')) {
      await cmdRun({ chat: { id: chatId } }, data.replace('run_', ''));
    } else if (data.startsWith('dodelete_')) {
      const taskId = data.replace('dodelete_', '');
      storage.deleteTask(taskId);
      scheduler.removeCronJob(taskId);
      await bot.sendMessage(chatId, 'Tarefa deletada.');
    } else {
      // Qualquer outro callback antigo — ignorar silenciosamente
      log.info('Callback legado ignorado', { data });
    }
  } catch (error) {
    log.error('Callback query falhou', error);
  }
}

// ============ NOTIFICATION SYSTEM ============

/**
 * Envia notificacao para todos os usuarios autorizados
 */
async function sendNotification(text, options = {}) {
  if (!bot || !isRunning) return;

  const config = getTelegramConfig();
  const users = config.authorizedUsers || [];

  if (users.length === 0) return;

  // Truncar texto excessivamente longo (>8000 chars) para evitar spam
  let safeText = text;
  if (safeText.length > 8000) {
    safeText = safeText.substring(0, 7950) + '\n\n... (truncado)';
  }

  for (const chatId of users) {
    try {
      // Se texto > 4000, usar sendLongMessage com chunking automatico
      if (safeText.length > 4000) {
        await sendLongMessage(chatId, safeText, options);
      } else {
        await bot.sendMessage(chatId, safeText, { parse_mode: 'MarkdownV2', ...options });
      }
    } catch (error) {
      // Fallback: se MarkdownV2 falhar, tentar sem formatacao
      try {
        log.warn('sendNotification fallback sem parse_mode', { chatId });
        const fallbackOpts = { ...options };
        delete fallbackOpts.parse_mode;
        if (safeText.length > 4000) {
          await sendLongMessage(chatId, safeText, fallbackOpts);
        } else {
          await bot.sendMessage(chatId, safeText, fallbackOpts);
        }
      } catch (fallbackError) {
        log.error('Falha ao enviar notificacao', { chatId, error: fallbackError.message });
      }
    }
  }
}

/**
 * Envia notificacao consolidada de tarefa concluida com output do Claude
 * para todos os usuarios autorizados
 */
async function sendConsolidatedNotification(data) {
  const tgConfig = getTelegramConfig();
  const users = tgConfig.authorizedUsers || [];

  for (const chatId of users) {
    try {
      const execution = storage.getExecution(data.executionId);
      let claudeResponse = '';

      if (execution && execution.conversationLog) {
        try {
          const steps = JSON.parse(execution.conversationLog);
          const resultStep = steps.find(s => s.type === 'result' && s.finalText);
          const assistantTexts = steps.filter(s => s.type === 'assistant_text').map(s => s.text);
          claudeResponse = resultStep?.finalText || assistantTexts[assistantTexts.length - 1] || '';
        } catch (e) { }
      }

      const MAX_LEN = 4000;
      const header = `\u{2705} Tarefa concluida: ${data.taskName}\n\u{23F1} Duracao: ${formatDuration(data.duration)}\n\n`;
      const footer = `\n\n\u{1F4AC} Responda esta mensagem para continuar a conversa com o Claude.`;
      const available = MAX_LEN - header.length - footer.length;

      let content = claudeResponse || '(Sem resposta textual)';
      if (content.length > available) {
        content = content.substring(0, available - 20) + '\n\n... (truncado)';
      }

      const sentMsg = await bot.sendMessage(chatId, header + content + footer);

      // Rastrear mensagem para sessao de conversa
      if (sentMsg && data.executionId) {
        trackExecutionMessage(sentMsg.message_id, chatId, data.executionId);
      }
    } catch (err) {
      log.error('Falha ao enviar notificacao consolidada', { chatId, error: err.message });
    }
  }
}

/**
 * Hook para broadcast de eventos do executor
 */
function setupNotificationHooks() {
  // Salvar referencia ORIGINAL apenas na primeira vez (evita empilhamento)
  if (!originalBroadcastUpdate) {
    originalBroadcastUpdate = global.broadcastUpdate;
  }

  global.broadcastUpdate = (event, data) => {
    // Chamar broadcast original (WebSocket) - sempre a referencia ORIGINAL
    if (originalBroadcastUpdate) {
      originalBroadcastUpdate(event, data);
    }

    // Notificacoes por task individual DESATIVADAS
    // Apenas sessao (Stop event) notifica via telegram-notify-hook.js
  };

  log.info('Notification hooks configurados');
}

// ============ BOT LIFECYCLE ============

/**
 * Agenda reconexao com backoff exponencial
 */
function scheduleReconnect(token) {
  if (reconnectTimer) clearTimeout(reconnectTimer);

  const delay = Math.min(RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts), RECONNECT_MAX_DELAY);
  reconnectAttempts++;

  log.warn(`Telegram reconnect agendado em ${delay}ms (tentativa ${reconnectAttempts})`);

  reconnectTimer = setTimeout(() => {
    log.info('Tentando reconectar Telegram Bot...');
    // Limpar estado anterior
    if (bot) {
      try { bot.stopPolling(); } catch (_) {}
      bot = null;
    }
    isRunning = false;
    start(token);
  }, delay);
}

/**
 * Reseta o estado de reconexao (conexao estavel estabelecida)
 */
function resetReconnectState() {
  reconnectAttempts = 0;
  lastStableConnection = Date.now();
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

/**
 * Inicia o bot do Telegram
 */
function start(token) {
  if (isRunning) {
    log.warn('Bot ja esta rodando');
    return bot;
  }

  const botToken = token || getTelegramConfig().botToken || process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    log.warn('Token do Telegram nao configurado. Bot nao iniciado.');
    return null;
  }

  log.info('Iniciando Telegram Bot...');

  try {
    bot = new TelegramBot(botToken, {
      polling: {
        interval: 1000,
        autoStart: true,
        params: { timeout: 30 }
      }
    });

    // Auto-reconnect em caso de erro de polling
    bot.on('polling_error', (err) => {
      log.error('Telegram polling error', { error: err.message });
      if (isRunning) {
        isRunning = false;
        scheduleReconnect(botToken);
      }
    });

    bot.on('error', (err) => {
      log.error('Telegram bot error', { error: err.message });
    });

    // Registrar comandos
    bot.onText(/\/start(?!\w)/, (msg) => guardedHandler(msg, cmdStart));
    bot.onText(/\/help(?!\w)/, (msg) => guardedHandler(msg, cmdHelp));
    bot.onText(/\/menu(?!\w)/, (msg) => guardedHandler(msg, cmdMenu));
    bot.onText(/\/status(?!\w)/, (msg) => guardedHandler(msg, cmdStatus));
    bot.onText(/\/tasks$/, (msg) => guardedHandler(msg, cmdTasks));
    bot.onText(/\/task (.+)/, (msg, match) => guardedHandler(msg, (m) => cmdTaskDetail(m, match[1].trim())));
    bot.onText(/\/run (.+)/, (msg, match) => guardedHandler(msg, (m) => cmdRun(m, match[1].trim())));
    bot.onText(/\/pause (.+)/, (msg, match) => guardedHandler(msg, (m) => cmdPause(m, match[1].trim())));
    bot.onText(/\/resume (.+)/, (msg, match) => guardedHandler(msg, (m) => cmdResume(m, match[1].trim())));
    bot.onText(/\/delete (.+)/, (msg, match) => guardedHandler(msg, (m) => cmdDelete(m, match[1].trim())));
    bot.onText(/\/stats(?!\w)/, (msg) => guardedHandler(msg, cmdStats));
    bot.onText(/\/history\s*(\d*)/, (msg, match) => guardedHandler(msg, (m) => cmdHistory(m, match[1] || 10)));
    bot.onText(/\/kb (.+)/, (msg, match) => guardedHandler(msg, (m) => cmdKb(m, match[1].trim())));
    bot.onText(/\/kblist/, (msg) => guardedHandler(msg, cmdKbList));
    bot.onText(/\/memory(?!\w)/, (msg) => guardedHandler(msg, cmdMemory));
    bot.onText(/\/sessions(?!\w)/, (msg) => guardedHandler(msg, cmdSessions));
    bot.onText(/\/scheduler(?!\w)/, (msg) => guardedHandler(msg, cmdScheduler));
    bot.onText(/\/ping(?!\w)/, (msg) => guardedHandler(msg, cmdPing));
    bot.onText(/\/uptime(?!\w)/, (msg) => guardedHandler(msg, cmdUptime));
    bot.onText(/\/config(?!\w)/, (msg) => guardedHandler(msg, cmdConfig));
    bot.onText(/\/newtask(?!\w)/, (msg) => guardedHandler(msg, cmdNewTask));
    bot.onText(/\/create (.+)/, (msg, match) => guardedHandler(msg, (m) => cmdCreate(m, match[1].trim())));

    // Prompt Manager commands
    bot.onText(/\/prompts$/, (msg) => guardedHandler(msg, cmdPrompts));
    bot.onText(/\/execprompt (.+)/, (msg, match) => guardedHandler(msg, (m) => cmdExecPrompt(m, match[1].trim())));

    // CRM commands
    bot.onText(/\/leads$/, (msg) => guardedHandler(msg, (m) => cmdLeads(m, null)));
    bot.onText(/\/leads (.+)/, (msg, match) => guardedHandler(msg, (m) => cmdLeads(m, match[1].trim())));
    bot.onText(/\/lead (.+)/, (msg, match) => guardedHandler(msg, (m) => cmdLeadDetail(m, match[1].trim())));
    bot.onText(/\/lead$/, (msg) => guardedHandler(msg, (m) => cmdLeadDetail(m, null)));
    bot.onText(/\/newlead (.+)/, (msg, match) => guardedHandler(msg, (m) => cmdNewLead(m, match[1].trim())));
    bot.onText(/\/newlead$/, (msg) => guardedHandler(msg, (m) => cmdNewLead(m, null)));
    bot.onText(/\/campaigns$/, (msg) => guardedHandler(msg, cmdCampaigns));
    bot.onText(/\/campaign (.+)/, (msg, match) => guardedHandler(msg, (m) => cmdCampaignDetail(m, match[1].trim())));
    bot.onText(/\/campaign$/, (msg) => guardedHandler(msg, (m) => cmdCampaignDetail(m, null)));
    bot.onText(/\/dashboard$/, (msg) => guardedHandler(msg, cmdCrmDashboard));
    bot.onText(/\/pipeline$/, (msg) => guardedHandler(msg, cmdCrmPipeline));

    // Personal Tasks commands
    bot.onText(/\/mytasks$/, (msg) => guardedHandler(msg, cmdMyTasks));
    bot.onText(/\/addtask (.+)/, (msg, match) => guardedHandler(msg, (m) => cmdAddTask(m, match[1].trim())));
    bot.onText(/\/addtask$/, (msg) => guardedHandler(msg, (m) => cmdAddTask(m, null)));
    bot.onText(/\/donetask (.+)/, (msg, match) => guardedHandler(msg, (m) => cmdDoneTask(m, match[1].trim())));
    bot.onText(/\/deltask (.+)/, (msg, match) => guardedHandler(msg, (m) => cmdDelTask(m, match[1].trim())));

    // Finance commands
    bot.onText(/\/fin$/, (msg) => guardedHandler(msg, (m) => cmdFin(m, null)));
    bot.onText(/\/fin (.+)/, (msg, match) => guardedHandler(msg, (m) => cmdFin(m, match[1].trim())));
    bot.onText(/\/income (.+)/, (msg, match) => guardedHandler(msg, (m) => cmdIncome(m, match[1].trim())));
    bot.onText(/\/income$/, (msg) => guardedHandler(msg, (m) => cmdIncome(m, null)));
    bot.onText(/\/expense (.+)/, (msg, match) => guardedHandler(msg, (m) => cmdExpense(m, match[1].trim())));
    bot.onText(/\/expense$/, (msg) => guardedHandler(msg, (m) => cmdExpense(m, null)));
    bot.onText(/\/balance$/, (msg) => guardedHandler(msg, cmdBalance));
    bot.onText(/\/goals$/, (msg) => guardedHandler(msg, cmdGoals));

    // Notes commands
    bot.onText(/\/notes$/, (msg) => guardedHandler(msg, cmdNotes));
    bot.onText(/\/note (.+)/, (msg, match) => guardedHandler(msg, (m) => cmdNoteDetail(m, match[1].trim())));
    bot.onText(/\/note$/, (msg) => guardedHandler(msg, (m) => cmdNoteDetail(m, null)));
    bot.onText(/\/addnote (.+)/s, (msg, match) => guardedHandler(msg, (m) => cmdAddNote(m, match[1].trim())));
    bot.onText(/\/addnote$/, (msg) => guardedHandler(msg, (m) => cmdAddNote(m, null)));
    bot.onText(/\/pinnote (.+)/, (msg, match) => guardedHandler(msg, (m) => cmdPinNote(m, match[1].trim())));
    bot.onText(/\/delnote (.+)/, (msg, match) => guardedHandler(msg, (m) => cmdDelNote(m, match[1].trim())));

    // Transações e Categorias
    bot.onText(/\/txs$/, (msg) => guardedHandler(msg, (m) => cmdTxs(m, null)));
    bot.onText(/\/txs (.+)/, (msg, match) => guardedHandler(msg, (m) => cmdTxs(m, match[1].trim())));
    bot.onText(/\/deltx (.+)/, (msg, match) => guardedHandler(msg, (m) => cmdDelTx(m, match[1].trim())));
    bot.onText(/\/deltx$/, (msg) => guardedHandler(msg, (m) => cmdDelTx(m, null)));
    bot.onText(/\/cats$/, (msg) => guardedHandler(msg, cmdCats));
    bot.onText(/\/addcat (.+)/, (msg, match) => guardedHandler(msg, (m) => cmdAddCat(m, match[1].trim())));
    bot.onText(/\/addcat$/, (msg) => guardedHandler(msg, (m) => cmdAddCat(m, null)));
    // Starttask
    bot.onText(/\/starttask (.+)/, (msg, match) => guardedHandler(msg, (m) => cmdStartTask(m, match[1].trim())));
    bot.onText(/\/starttask$/, (msg) => guardedHandler(msg, (m) => cmdStartTask(m, null)));

    // Comandos de terminal Claude Code (abrir terminal local)
    bot.onText(/\/terminal$/, (msg) => guardedHandler(msg, cmdTerminalToggle));
    bot.onText(/\/terminal (.+)/s, (msg, match) => guardedHandler(msg, (m) => cmdTerminalSend(m, match[1].trim())));
    bot.onText(/\/t (.+)/s, (msg, match) => guardedHandler(msg, (m) => cmdTerminalSend(m, match[1].trim())));

    // Comandos de sessao conversacional
    bot.onText(/\/nova(?!\w)/, (msg) => guardedHandler(msg, cmdNova));
    bot.onText(/\/sessao(?!\w)/, (msg) => guardedHandler(msg, cmdSessao));

    // Callback queries (botoes inline)
    bot.on('callback_query', (query) => {
      if (!isAuthorized(query.message.chat.id)) {
        bot.answerCallbackQuery(query.id, { text: 'Nao autorizado' });
        return;
      }
      handleCallbackQuery(query);
    });

    // Handler para mensagens sem comando - MODO CONVERSACIONAL
    // Texto livre E arquivos (fotos, documentos, videos) vao para o Claude
    bot.on('message', (msg) => {
      // Ignorar comandos (ja tratados pelos onText handlers)
      if (msg.text && msg.text.startsWith('/')) return;
      // Ignorar se nao autorizado
      if (!isAuthorized(msg.chat.id)) return;

      // Verificar se e uma mensagem com arquivo (foto, documento, video, audio)
      const hasFile = msg.photo || msg.document || msg.video || msg.audio || msg.voice;

      // Ignorar mensagens sem texto E sem arquivo (stickers, etc)
      if (!msg.text && !hasFile) return;

      // Se tem arquivo, processar e converter para contexto textual para o Claude
      if (hasFile) {
        handleFileMessage(msg).catch(err => {
          log.error('Erro no handler de arquivo', err);
          bot.sendMessage(msg.chat.id, `\u{274C} Erro ao processar arquivo: ${safeText(err.message, 500)}`).catch(() => {});
        });
        return;
      }

      // Processar como texto livre conversacional
      handleFreeText(msg).catch(err => {
        log.error('Erro no handler de texto livre', err);
        bot.sendMessage(msg.chat.id, `\u{274C} Erro ao processar mensagem: ${safeText(err.message, 500)}`).catch(() => {});
      });
    });

    // Erros de polling
    bot.on('polling_error', (error) => {
      if (error.code === 'ETELEGRAM' && error.message.includes('409')) {
        log.warn('Conflito de polling - outra instancia pode estar rodando');
      } else {
        log.error('Polling error', error);
      }
    });

    // Registrar comandos no BotFather (apenas essenciais)
    bot.setMyCommands([
      { command: 'help', description: 'Ver atalhos disponiveis' },
      { command: 'nova', description: 'Iniciar nova conversa' },
      { command: 'mytasks', description: 'Minhas tarefas' },
      { command: 'fin', description: 'Resumo financeiro' },
      { command: 'leads', description: 'Listar leads' },
      { command: 'notes', description: 'Notas' },
      { command: 'status', description: 'Status do sistema' },
    ]).catch(e => log.warn('Falha ao registrar comandos', { error: e.message }));

    // Remover teclado persistente (ReplyKeyboardMarkup) que possa existir de versoes anteriores
    const config = getTelegramConfig();
    const chatId = config.chatId || (config.authorizedUsers && config.authorizedUsers[0]);
    if (chatId) {
      bot.sendMessage(chatId, '\u{2705} Bot iniciado. Envie qualquer mensagem.', {
        reply_markup: { remove_keyboard: true }
      }).catch(() => {});
    }

    // Setup notification hooks
    setupNotificationHooks();

    isRunning = true;
    startTime = Date.now();
    resetReconnectState();

    // Restaurar sessoes conversacionais de disco
    restoreSessions();

    log.info('Telegram Bot iniciado com sucesso');

    // Notificar usuarios que o bot esta online com menu rapido
    setTimeout(() => {
      const config2 = getTelegramConfig();
      const users2 = config2.authorizedUsers || [];
      for (const uid of users2) {
        safeSend(uid, '\u{1F7E2} *Bot Online\\!*\n\nClaude Code Ecosystem esta ativo e pronto\\.').catch(() => {});
      }
    }, 2000);

    // Heartbeat: verifica se polling esta ativo a cada 60s
    if (global._telegramHeartbeat) clearInterval(global._telegramHeartbeat);
    global._telegramHeartbeat = setInterval(() => {
      if (!bot || !isRunning) return;
      try {
        if (!bot.isPolling()) {
          log.warn('Telegram bot nao esta fazendo polling, reconectando...');
          isRunning = false;
          scheduleReconnect(botToken);
        } else if (Date.now() - (lastStableConnection || Date.now()) > STABLE_CONNECTION_THRESHOLD) {
          // Conexao estavel por 5min — resetar contador
          resetReconnectState();
        }
      } catch (err) {
        log.error('Heartbeat check failed', { error: err.message });
      }
    }, 60000);

    return bot;

  } catch (error) {
    log.error('Falha ao iniciar bot', error);
    isRunning = false;
    return null;
  }
}

/**
 * Para o bot
 */
function stop() {
  if (!bot || !isRunning) {
    log.warn('Bot nao esta rodando');
    return;
  }

  log.info('Parando Telegram Bot...');

  // Cancelar timers de reconnect
  resetReconnectState();
  if (global._telegramHeartbeat) {
    clearInterval(global._telegramHeartbeat);
    global._telegramHeartbeat = null;
  }

  sendNotification('\u{1F534} *Bot Offline*\n\nClaude Code Ecosystem esta parando\\.').catch(() => {});

  setTimeout(() => {
    bot.stopPolling();
    isRunning = false;
    bot = null;

    // Restaurar broadcastUpdate original (remover hook do Telegram)
    if (originalBroadcastUpdate) {
      global.broadcastUpdate = originalBroadcastUpdate;
      originalBroadcastUpdate = null;
    }

    log.info('Telegram Bot parado');
  }, 1000);
}

/**
 * Guarda de autorizacao para handlers
 */
async function guardedHandler(msg, handler) {
  const chatId = msg.chat.id;

  if (!isAuthorized(chatId)) {
    log.warn('Acesso nao autorizado', { chatId, username: msg.from?.username });
    await bot.sendMessage(chatId, '\u{1F6AB} Voce nao tem permissao para usar este bot.\n\nSeu Chat ID: ' + chatId);
    return;
  }

  try {
    await handler(msg);
  } catch (error) {
    log.error('Handler error', error);
    await bot.sendMessage(chatId, `\u{274C} Erro interno: ${safeText(error.message, 500)}`).catch(() => {});
  }
}

/**
 * Obtem status do bot
 */
function getStatus() {
  return {
    isRunning,
    uptime: startTime ? Date.now() - startTime : 0,
    startedAt: startTime ? new Date(startTime).toISOString() : null,
    reconnectAttempts,
    lastStableConnection: lastStableConnection ? new Date(lastStableConnection).toISOString() : null,
    config: getTelegramConfig()
  };
}

/**
 * Obtem instancia do bot
 */
function getBot() {
  return bot;
}

// ============ CRM COMMANDS ============

// Mapas de label para emojis/textos
const CRM_STATUS_EMOJI = {
  new: '\u{1F7E3}',          // roxo - novo
  contacted: '\u{1F7E1}',    // amarelo - contatado
  replied: '\u{1F535}',      // azul - respondeu
  interested: '\u{1F7E0}',   // laranja - interessado
  negotiating: '\u{1F7E4}',  // marrom - negociando
  won: '\u{1F7E2}',          // verde - ganhou
  lost: '\u{26AB}'           // cinza - perdeu
};

const CRM_STATUS_LABEL = {
  new: 'Novo',
  contacted: 'Contatado',
  replied: 'Respondeu',
  interested: 'Interessado',
  negotiating: 'Negociando',
  won: 'Ganhou',
  lost: 'Perdeu'
};

const CRM_TEMP_EMOJI = {
  cold: '\u{2744}',   // frio
  warm: '\u{1F7E1}',  // morno
  hot: '\u{1F525}'    // quente
};

const CRM_TEMP_LABEL = {
  cold: 'Frio',
  warm: 'Morno',
  hot: 'Quente'
};

/**
 * /leads [status] [temperatura] - Listar leads com filtros opcionais
 * Exemplos: /leads | /leads new | /leads hot | /leads interested hot
 */
async function cmdLeads(msg, args) {
  const chatId = msg.chat.id;
  log.info('/leads', { chatId, args });

  try {
    // Parsear argumentos: status e/ou temperatura
    const params = new URLSearchParams();
    if (args) {
      const parts = args.trim().toLowerCase().split(/\s+/);
      const validStatuses = Object.keys(CRM_STATUS_EMOJI);
      const validTemps = Object.keys(CRM_TEMP_EMOJI);
      for (const p of parts) {
        if (validStatuses.includes(p)) params.set('status', p);
        else if (validTemps.includes(p)) params.set('temperature', p);
        else if (p) params.set('search', p);
      }
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    const resp = await crmFetch(`/leads${query}`);

    if (resp.status !== 200) {
      await safeSend(chatId, `\u{274C} Erro ao buscar leads: ${escapeMarkdown(String(resp.status))}`);
      return;
    }

    const leads = resp.data?.data || resp.data?.leads || (Array.isArray(resp.data) ? resp.data : []);
    const total = resp.data?.pagination?.total ?? resp.data?.total ?? leads.length;

    if (leads.length === 0) {
      const filterDesc = args ? ` para filtro _${escapeMarkdown(args)}_` : '';
      await safeSend(chatId, `\u{1F4ED} Nenhum lead encontrado${filterDesc}\\.`);
      return;
    }

    const filterTitle = args ? ` \\(${escapeMarkdown(args)}\\)` : '';
    let text = `\u{1F465} *Leads${filterTitle}: ${total}*\n`;

    const show = leads.slice(0, 12);
    show.forEach((lead, i) => {
      const statusE = CRM_STATUS_EMOJI[lead.status] || '\u{26AA}';
      const tempE = CRM_TEMP_EMOJI[lead.temperature] || '';
      const name = escapeMarkdown((lead.name || 'Sem nome').substring(0, 28));
      const company = lead.company ? ` \\- _${escapeMarkdown(lead.company.substring(0, 20))}_` : '';
      text += `\n${statusE}${tempE} *${name}*${company}\n   ID: \`${escapeMarkdown(String(lead.id))}\``;
    });

    if (total > 12) {
      text += `\n\n_\\.\\.\\. e mais ${total - 12} leads_`;
    }

    text += `\n\n_Use /lead \\[ID\\] para detalhes_`;

    // Botoes de filtro rapido por status
    const filterRow1 = [
    ];
    const filterRow2 = [
    ];

    // Botoes de lead clicavel para os primeiros 5
    const leadButtons = show.slice(0, 5).map(l => ([{
      text: `${CRM_STATUS_EMOJI[l.status] || '\u{26AA}'} ${(l.name || 'Sem nome').substring(0, 25)}`,
    }]));
    await safeSend(chatId, text);

  } catch (error) {
    log.error('/leads falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro ao acessar CRM: ${safeText(error.message, 500)}`);
  }
}

/**
 * /lead <ID ou nome> - Detalhe de um lead
 */
async function cmdLeadDetail(msg, query) {
  const chatId = msg.chat.id;
  log.info('/lead', { chatId, query });

  if (!query) {
    await safeSend(chatId, '\u{1F465} *Detalhe de Lead*\n\nUse: `/lead <ID ou nome>`\n\nExemplo: `/lead 42` ou `/lead Joao Silva`');
    return;
  }

  try {
    // Tentar buscar por ID numerico primeiro
    let lead = null;
    const numId = parseInt(query, 10);

    if (!isNaN(numId)) {
      const resp = await crmFetch(`/leads/${numId}`);
      if (resp.status === 200) lead = resp.data?.lead || resp.data;
    }

    // Se nao encontrou por ID, buscar por nome
    if (!lead) {
      const searchResp = await crmFetch(`/leads?search=${encodeURIComponent(query)}&limit=1`);
      if (searchResp.status === 200) {
        const results = searchResp.data?.leads || searchResp.data || [];
        if (results.length > 0) lead = results[0];
      }
    }

    if (!lead) {
      await safeSend(chatId, `\u{274C} Lead nao encontrado: \`${escapeMarkdown(query)}\``);
      return;
    }

    const statusE = CRM_STATUS_EMOJI[lead.status] || '\u{26AA}';
    const tempE = CRM_TEMP_EMOJI[lead.temperature] || '\u{26AA}';
    const statusL = CRM_STATUS_LABEL[lead.status] || lead.status || 'Desconhecido';
    const tempL = CRM_TEMP_LABEL[lead.temperature] || lead.temperature || 'N/A';

    let text = `${statusE} *${escapeMarkdown(lead.name || 'Sem nome')}*\n\n`;
    text += `\u{1F194} ID: \`${lead.id}\`\n`;
    if (lead.company) text += `\u{1F3E2} Empresa: ${escapeMarkdown(lead.company)}\n`;
    if (lead.email) text += `\u{1F4E7} Email: ${escapeMarkdown(lead.email)}\n`;
    if (lead.phone) text += `\u{1F4F1} Telefone: ${escapeMarkdown(lead.phone)}\n`;
    text += `\u{1F4CA} Status: ${statusE} ${escapeMarkdown(statusL)}\n`;
    text += `\u{1F321} Temperatura: ${tempE} ${escapeMarkdown(tempL)}\n`;
    if (lead.source) text += `\u{1F4CD} Origem: ${escapeMarkdown(lead.source)}\n`;
    if (lead.tags && lead.tags.length > 0) {
      const tagsStr = lead.tags.map(t => escapeMarkdown(String(t))).join(', ');
      text += `\u{1F3F7} Tags: ${tagsStr}\n`;
    }
    if (lead.notes) {
      const notePreview = lead.notes.substring(0, 200);
      text += `\n\u{1F4AC} *Notas:*\n_${escapeMarkdown(notePreview)}${lead.notes.length > 200 ? '\\.\\.\\.' : ''}_\n`;
    }
    text += `\n\u{1F4C5} Criado: ${escapeMarkdown(formatDate(lead.createdAt))}`;
    if (lead.updatedAt) text += `\n\u{1F504} Atualizado: ${escapeMarkdown(formatDate(lead.updatedAt))}`;
    await safeSend(chatId, text);

  } catch (error) {
    log.error('/lead falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${safeText(error.message, 500)}`);
  }
}

/**
 * /newlead <nome> - Criar novo lead rapido
 * Exemplo: /newlead Joao Silva
 * Exemplo: /newlead Joao Silva | empresa=Acme | email=joao@acme.com
 */
async function cmdNewLead(msg, args) {
  const chatId = msg.chat.id;
  log.info('/newlead', { chatId, args });

  if (!args) {
    await safeSend(chatId,
      '\u{2795} *Criar Novo Lead*\n\n' +
      'Envie: `/newlead Nome` ou com extras:\n' +
      '`/newlead Nome | empresa=X | email=X | telefone=X`\n\n' +
      '*Exemplo:*\n' +
      '`/newlead Joao Silva | empresa=Acme`'
    );
    return;
  }

  try {
    // Parsear: primeiro token ate "|" e o nome, resto sao campos opcionais
    const parts = args.split('|').map(s => s.trim());
    const name = parts[0];

    if (!name) {
      await bot.sendMessage(chatId, '\u{274C} Nome do lead e obrigatorio.');
      return;
    }

    const leadData = { name, status: 'new', temperature: 'cold' };

    // Parsear campos extras (key=value)
    for (let i = 1; i < parts.length; i++) {
      const eqIdx = parts[i].indexOf('=');
      if (eqIdx > 0) {
        const key = parts[i].substring(0, eqIdx).trim().toLowerCase();
        const value = parts[i].substring(eqIdx + 1).trim();
        const keyMap = { empresa: 'company', email: 'email', telefone: 'phone', phone: 'phone', company: 'company' };
        if (keyMap[key]) leadData[keyMap[key]] = value;
      }
    }

    const resp = await crmFetch('/leads', { method: 'POST', body: leadData });

    if (resp.status !== 200 && resp.status !== 201) {
      const errMsg = resp.data?.error || resp.data?.message || String(resp.status);
      await safeSend(chatId, `\u{274C} Erro ao criar lead: ${escapeMarkdown(errMsg)}`);
      return;
    }

    const created = resp.data?.lead || resp.data;
    const leadId = created?.id;

    let text = `\u{2705} *Lead criado com sucesso\\!*\n\n`;
    text += `\u{1F194} ID: \`${leadId}\`\n`;
    text += `\u{1F465} Nome: *${escapeMarkdown(name)}*\n`;
    if (leadData.company) text += `\u{1F3E2} Empresa: ${escapeMarkdown(leadData.company)}\n`;
    if (leadData.email) text += `\u{1F4E7} Email: ${escapeMarkdown(leadData.email)}\n`;
    if (leadData.phone) text += `\u{1F4F1} Tel: ${escapeMarkdown(leadData.phone)}\n`;
    text += `\u{1F4CA} Status: ${CRM_STATUS_EMOJI.new} Novo\n`;
    text += `\u{1F321} Temp: ${CRM_TEMP_EMOJI.cold} Frio`;
    await safeSend(chatId, text);

  } catch (error) {
    log.error('/newlead falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro ao criar lead: ${safeText(error.message, 500)}`);
  }
}

/**
 * /campaigns - Listar campanhas
 */
async function cmdCampaigns(msg) {
  const chatId = msg.chat.id;
  log.info('/campaigns', { chatId });

  try {
    const resp = await crmFetch('/campaigns');

    if (resp.status !== 200) {
      await safeSend(chatId, `\u{274C} Erro ao buscar campanhas: ${escapeMarkdown(String(resp.status))}`);
      return;
    }

    const campaigns = resp.data?.data || resp.data?.campaigns || (Array.isArray(resp.data) ? resp.data : []);

    if (campaigns.length === 0) {
      await safeSend(chatId, '\u{1F4ED} Nenhuma campanha cadastrada\\.');
      return;
    }

    const statusCampEmoji = { active: '\u{1F7E2}', paused: '\u{23F8}', draft: '\u{1F4DD}', completed: '\u{2705}', stopped: '\u{1F534}' };

    let text = `\u{1F4E3} *Campanhas \\(${campaigns.length}\\)*\n`;

    campaigns.forEach((c, i) => {
      const se = statusCampEmoji[c.status] || '\u{26AA}';
      const name = escapeMarkdown((c.name || 'Sem nome').substring(0, 35));
      const status = escapeMarkdown(c.status || 'N/A');
      const leadsCount = c.leadsCount ?? c.leads?.length ?? '?';
      text += `\n${se} *${name}*\n   Status: ${status} \\| Leads: ${leadsCount}`;
    });

    // Botoes para as primeiras 6 campanhas
    const campButtons = campaigns.slice(0, 6).map(c => ([{
      text: `${statusCampEmoji[c.status] || '\u{26AA}'} ${(c.name || 'Sem nome').substring(0, 28)}`,
    }]));

    campButtons.push([
    ]);

    await safeSend(chatId, text);

  } catch (error) {
    log.error('/campaigns falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${safeText(error.message, 500)}`);
  }
}

/**
 * /campaign <ID> - Detalhe de uma campanha
 */
async function cmdCampaignDetail(msg, campId) {
  const chatId = msg.chat.id;
  log.info('/campaign', { chatId, campId });

  if (!campId) {
    await safeSend(chatId, '\u{1F4E3} *Detalhe de Campanha*\n\nUse: `/campaign <ID>`');
    return;
  }

  try {
    const resp = await crmFetch(`/campaigns/${campId}`);

    if (resp.status !== 200) {
      await safeSend(chatId, `\u{274C} Campanha nao encontrada: \`${escapeMarkdown(String(campId))}\``);
      return;
    }

    const c = resp.data?.campaign || resp.data;

    const statusCampEmoji = { active: '\u{1F7E2}', paused: '\u{23F8}', draft: '\u{1F4DD}', completed: '\u{2705}', stopped: '\u{1F534}' };
    const se = statusCampEmoji[c.status] || '\u{26AA}';

    let text = `${se} *${escapeMarkdown(c.name || 'Sem nome')}*\n\n`;
    text += `\u{1F194} ID: \`${c.id}\`\n`;
    text += `\u{1F4CA} Status: ${escapeMarkdown(c.status || 'N/A')}\n`;
    if (c.description) text += `\u{1F4CB} ${escapeMarkdown(c.description.substring(0, 150))}\n`;
    if (c.type) text += `\u{1F4E6} Tipo: ${escapeMarkdown(c.type)}\n`;

    const leadsCount = c.leadsCount ?? c.leads?.length ?? 0;
    const stepsCount = c.stepsCount ?? c.steps?.length ?? 0;
    text += `\u{1F465} Leads: ${leadsCount}\n`;
    text += `\u{1F4CD} Steps: ${stepsCount}\n`;

    if (c.startedAt) text += `\u{1F680} Iniciada: ${escapeMarkdown(formatDate(c.startedAt))}\n`;
    if (c.completedAt) text += `\u{2705} Concluida: ${escapeMarkdown(formatDate(c.completedAt))}\n`;
    text += `\u{1F4C5} Criada: ${escapeMarkdown(formatDate(c.createdAt))}`;

    // Stats de envio se disponiveis
    if (c.stats || c.sentCount !== undefined) {
      const stats = c.stats || {};
      text += `\n\n\u{1F4C8} *Estatisticas:*\n`;
      if (c.sentCount !== undefined) text += `  Enviadas: ${c.sentCount}\n`;
      if (c.repliedCount !== undefined) text += `  Respondidas: ${c.repliedCount}\n`;
      if (stats.sent !== undefined) text += `  Enviadas: ${stats.sent}\n`;
      if (stats.opened !== undefined) text += `  Abertas: ${stats.opened}\n`;
      if (stats.clicked !== undefined) text += `  Clicadas: ${stats.clicked}\n`;
    }

    // Botoes de acao com base no status
    const actionRow = [];
    if (c.status === 'active') {
    } else if (c.status === 'paused' || c.status === 'draft') {
    }
    await safeSend(chatId, text);

  } catch (error) {
    log.error('/campaign falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${safeText(error.message, 500)}`);
  }
}

/**
 * /dashboard - KPIs do CRM
 */
async function cmdCrmDashboard(msg) {
  const chatId = msg.chat.id;
  log.info('/dashboard', { chatId });

  try {
    const resp = await crmFetch('/dashboard/stats');

    if (resp.status !== 200) {
      await safeSend(chatId, `\u{274C} Erro ao obter dashboard: ${escapeMarkdown(String(resp.status))}`);
      return;
    }

    const s = resp.data?.data || resp.data?.stats || (typeof resp.data === 'object' && !Array.isArray(resp.data) ? resp.data : {});

    // Totais gerais
    const totalLeads    = s.totalLeads ?? s.leads?.total ?? 0;
    const hotLeads      = s.hotLeads ?? s.leads?.hot ?? 0;
    const newLeads      = s.newLeads ?? s.leads?.new ?? 0;
    const wonLeads      = s.wonLeads ?? s.leads?.won ?? 0;
    const lostLeads     = s.lostLeads ?? s.leads?.lost ?? 0;
    const msgsSent      = s.messagesSent ?? s.messages?.sent ?? 0;
    const msgsReceived  = s.messagesReceived ?? s.messages?.received ?? 0;
    const replyRate     = s.replyRate ?? (msgsReceived && msgsSent ? ((msgsReceived / msgsSent) * 100).toFixed(1) : 0);
    const activeCamp    = s.activeCampaigns ?? s.campaigns?.active ?? 0;

    let text = `\u{1F4CA} *Dashboard CRM*\n`;
    text += `\`${'─'.repeat(26)}\`\n\n`;

    text += `\u{1F465} *Leads*\n`;
    text += `  Total:        \`${String(totalLeads).padStart(6)}\`\n`;
    text += `  ${CRM_TEMP_EMOJI.hot} Quentes:    \`${String(hotLeads).padStart(6)}\`\n`;
    text += `  ${CRM_STATUS_EMOJI.new} Novos:      \`${String(newLeads).padStart(6)}\`\n`;
    text += `  ${CRM_STATUS_EMOJI.won} Convertidos:\`${String(wonLeads).padStart(6)}\`\n`;
    text += `  ${CRM_STATUS_EMOJI.lost} Perdidos:   \`${String(lostLeads).padStart(6)}\`\n`;

    text += `\n\u{1F4AC} *Mensagens*\n`;
    text += `  Enviadas:     \`${String(msgsSent).padStart(6)}\`\n`;
    text += `  Recebidas:    \`${String(msgsReceived).padStart(6)}\`\n`;
    text += `  Taxa resposta:\`${String(replyRate + '%').padStart(6)}\`\n`;

    text += `\n\u{1F4E3} *Campanhas*\n`;
    text += `  Ativas:       \`${String(activeCamp).padStart(6)}\`\n`;

    // Taxa de conversao se disponivel
    if (totalLeads > 0) {
      const convRate = ((wonLeads / totalLeads) * 100).toFixed(1);
      text += `\n\u{1F3AF} *Conversao:* \`${convRate}%\`\n`;
    }

    text += `\n_Atualizado: ${escapeMarkdown(new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }))}_`;
    await safeSend(chatId, text);

  } catch (error) {
    log.error('/dashboard falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro ao acessar CRM: ${safeText(error.message, 500)}`);
  }
}

/**
 * /pipeline - Pipeline visual (kanban simplificado por contagem)
 */
async function cmdCrmPipeline(msg) {
  const chatId = msg.chat.id;
  log.info('/pipeline', { chatId });

  try {
    const resp = await crmFetch('/dashboard/pipeline');

    if (resp.status !== 200) {
      await safeSend(chatId, `\u{274C} Erro ao obter pipeline: ${escapeMarkdown(String(resp.status))}`);
      return;
    }

    const pipeline = resp.data?.data || resp.data?.pipeline || (typeof resp.data === 'object' && !Array.isArray(resp.data) ? resp.data : {});

    // Normalizar: pode ser array ou objeto
    const stages = {};
    if (Array.isArray(pipeline)) {
      for (const item of pipeline) {
        stages[item.status || item.stage || item._id] = item.count ?? item.total ?? 0;
      }
    } else {
      Object.assign(stages, pipeline);
    }

    const ORDER = ['new', 'contacted', 'replied', 'interested', 'negotiating', 'won', 'lost'];
    const total = Object.values(stages).reduce((a, b) => a + Number(b || 0), 0);

    let text = `\u{1F4CA} *Pipeline CRM*\n`;
    text += `\`${'─'.repeat(28)}\`\n\n`;

    // Barra visual para cada etapa
    for (const status of ORDER) {
      const count = Number(stages[status] || 0);
      const emoji = CRM_STATUS_EMOJI[status] || '\u{26AA}';
      const label = (CRM_STATUS_LABEL[status] || status).padEnd(12);
      const pct = total > 0 ? Math.round((count / total) * 20) : 0; // max 20 blocos
      const bar = '\u{2588}'.repeat(pct) + '\u{2591}'.repeat(20 - pct);
      const countStr = String(count).padStart(4);
      text += `${emoji} \`${escapeMarkdown(label)}\` \`${bar}\` \`${countStr}\`\n`;
    }

    text += `\n\`${'─'.repeat(28)}\`\n`;
    text += `\u{1F4CB} *Total: ${total} leads*`;

    if (total > 0) {
      const wonCount = Number(stages.won || 0);
      const convRate = ((wonCount / total) * 100).toFixed(1);
      text += `  \\|  \u{1F3AF} Conv: \`${escapeMarkdown(convRate)}%\``;
    }
    await safeSend(chatId, text);

  } catch (error) {
    log.error('/pipeline falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro ao acessar CRM: ${safeText(error.message, 500)}`);
  }
}

// ============ TAREFAS PESSOAIS COMMANDS ============

/**
 * /mytasks - Listar tarefas pessoais
 */
async function cmdMyTasks(msg) {
  const chatId = msg.chat.id;
  log.info('/mytasks', { chatId });
  try {
    const resp = await crmFetch('/personal-tasks?limit=20');
    if (resp.status !== 200) {
      await safeSend(chatId, `\u{274C} Erro: ${escapeMarkdown(String(resp.status))}`);
      return;
    }
    const tasks = resp.data?.data || resp.data || [];
    if (!tasks.length) {
      await safeSend(chatId, `\u{1F4CB} *Minhas Tarefas*\n\nNenhuma tarefa encontrada\\.\n\nUse /addtask para criar\\!`);
      return;
    }
    const statusEmoji = { pending: '\u{23F3}', in_progress: '\u{1F504}', completed: '\u{2705}', cancelled: '\u{274C}' };
    const priorityEmoji = { high: '\u{1F534}', medium: '\u{1F7E1}', low: '\u{1F7E2}' };
    const pendingTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
    const doneTasks = tasks.filter(t => t.status === 'completed');

    let text = `\u{1F4CB} *Minhas Tarefas* \\(${tasks.length}\\)\n`;
    text += `\u{23F3} Pendentes: ${pendingTasks.length} | \u{2705} Concluidas: ${doneTasks.length}\n\n`;

    // Listar tarefas pendentes
    for (const t of pendingTasks) {
      const se = statusEmoji[t.status] || '\u{23F3}';
      const pe = priorityEmoji[t.priority] || '';
      const id = (t.id || '').substring(0, 8);
      text += `${se}${pe} \`${id}\` ${escapeMarkdown((t.title || 'Sem titulo').substring(0, 40))}\n`;
    }

    // Listar concluídas (últimas 3)
    if (doneTasks.length > 0) {
      text += `\n_Concluidas recentes:_\n`;
      for (const t of doneTasks.slice(0, 3)) {
        text += `\u{2705} \`${(t.id || '').substring(0, 8)}\` ~~${escapeMarkdown((t.title || '').substring(0, 35))}~~\n`;
      }
    }

    text += `\n_Acoes:_\n/donetask \\[id\\] \\- Concluir\n/starttask \\[id\\] \\- Iniciar\n/deltask \\[id\\] \\- Deletar\n/addtask \\[titulo\\] \\- Nova tarefa`;

    await safeSend(chatId, text);
  } catch (error) {
    log.error('/mytasks falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${safeText(error.message, 500)}`);
  }
}

/**
 * /deltask <id> - Deletar tarefa pessoal
 */
async function cmdDelTask(msg, idPrefix) {
  const chatId = msg.chat.id;
  if (!idPrefix) {
    await safeSend(chatId, `\u{2139}\u{FE0F} Uso: \`/deltask <id>\``);
    return;
  }
  try {
    const listResp = await crmFetch('/personal-tasks');
    const tasks = listResp.data?.data || listResp.data || [];
    const task = tasks.find(t => t.id?.startsWith(idPrefix));
    if (!task) {
      await safeSend(chatId, `\u{274C} Tarefa nao encontrada`);
      return;
    }
    await crmFetch(`/personal-tasks/${task.id}`, { method: 'DELETE' });
    await safeSend(chatId, `\u{1F5D1}\u{FE0F} Tarefa deletada: *${escapeMarkdown(task.title)}*`);
  } catch (error) {
    log.error('/deltask falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${safeText(error.message, 500)}`);
  }
}

/**
 * /starttask <id> - Marcar tarefa como em progresso
 */
async function cmdStartTask(msg, idPrefix) {
  const chatId = msg.chat.id;
  if (!idPrefix) {
    await safeSend(chatId, `\u{2139}\u{FE0F} Uso: \`/starttask <id>\``);
    return;
  }
  try {
    const listResp = await crmFetch('/personal-tasks');
    const tasks = listResp.data?.data || listResp.data || [];
    const task = tasks.find(t => t.id?.startsWith(idPrefix));
    if (!task) {
      await safeSend(chatId, `\u{274C} Tarefa nao encontrada`);
      return;
    }
    await crmFetch(`/personal-tasks/${task.id}/status`, { method: 'PUT', body: { status: 'in_progress' } });
    await safeSend(chatId, `\u{1F504} Tarefa em progresso\\!\n\n*${escapeMarkdown(task.title)}*`);
  } catch (error) {
    log.error('/starttask falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${safeText(error.message, 500)}`);
  }
}

// ============ FINANCEIRO COMMANDS ============

/**
 * /fin [mes] [ano] - Resumo financeiro
 */
async function cmdFin(msg, args) {
  const chatId = msg.chat.id;
  log.info('/fin', { chatId, args });

  const now = new Date();
  let month = now.getMonth() + 1;
  let year = now.getFullYear();

  if (args) {
    const parts = args.trim().split(/\s+/);
    if (parts[0]) month = parseInt(parts[0], 10) || month;
    if (parts[1]) year = parseInt(parts[1], 10) || year;
  }

  try {
    const resp = await crmFetch(`/finance/summary?month=${month}&year=${year}`);
    if (resp.status !== 200) {
      await safeSend(chatId, `\u{274C} Erro: ${escapeMarkdown(String(resp.status))}`);
      return;
    }

    const s = resp.data?.data || resp.data || {};
    // API retorna totalIncome / totalExpense / balance
    const income = Number(s.totalIncome ?? s.income ?? 0);
    const expense = Number(s.totalExpense ?? s.expense ?? 0);
    const balance = Number(s.balance ?? (income - expense));

    const MONTHS = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    let text = `\u{1F4B0} *Financeiro ${escapeMarkdown(MONTHS[month])}/${year}*\n\n`;
    text += `\u{1F7E2} Receita: \`R$ ${escapeMarkdown(income.toFixed(2))}\`\n`;
    text += `\u{1F534} Despesa: \`R$ ${escapeMarkdown(expense.toFixed(2))}\`\n`;
    text += `${balance >= 0 ? '\u{1F7E3}' : '\u{1F534}'} Saldo: \`R$ ${escapeMarkdown(balance.toFixed(2))}\`\n`;

    if (s.transactionsCount) {
      text += `\n\u{1F4CB} Transacoes: ${s.transactionsCount}`;
    }

    await safeSend(chatId, text);
  } catch (error) {
    log.error('/fin falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${safeText(error.message, 500)}`);
  }
}

/**
 * /income <valor> <descricao> [catID] - Registrar receita
 * Formato: /income 5000 Salario
 *          /income 5000 Salario abc12345
 */
async function cmdIncome(msg, args) {
  const chatId = msg.chat.id;
  if (!args) {
    await safeSend(chatId, `\u{2139}\u{FE0F} Uso: \`/income 5000 Salario\`\nCom categoria: \`/income 5000 Salario catID\`\nVer categorias: /cats`);
    return;
  }

  const parts = args.trim().split(/\s+/);
  const amount = parseFloat(parts[0]);

  if (isNaN(amount) || amount <= 0) {
    await safeSend(chatId, `\u{274C} Valor invalido\\. Uso: \`/income 5000 Salario\``);
    return;
  }

  // Ultimo token pode ser catID (8+ chars hex) ou parte da descricao
  let description = parts.slice(1).join(' ') || 'Receita';
  let categoryId;
  const lastPart = parts[parts.length - 1];
  if (parts.length > 2 && /^[a-f0-9-]{6,}$/i.test(lastPart)) {
    // Tenta usar como categoryId — busca nas categorias
    try {
      const catResp = await crmFetch('/finance/categories');
      const cats = catResp.data?.data || catResp.data || [];
      const cat = cats.find(c => c.id?.startsWith(lastPart) && c.type === 'income');
      if (cat) {
        categoryId = cat.id;
        description = parts.slice(1, -1).join(' ') || 'Receita';
      }
    } catch (_) {}
  }

  try {
    // Se nao tem categoria, buscar/criar categoria padrao de receita
    if (!categoryId) {
      try {
        const catResp = await crmFetch('/finance/categories');
        const cats = catResp.data?.data || catResp.data || [];
        const defaultCat = cats.find(c => c.type === 'income');
        if (defaultCat) {
          categoryId = defaultCat.id;
        } else {
          // Criar categoria padrao de receita
          const newCatResp = await crmFetch('/finance/categories', { method: 'POST', body: { name: 'Receita Geral', type: 'income' } });
          if (newCatResp.status === 200 || newCatResp.status === 201) {
            categoryId = (newCatResp.data?.data || newCatResp.data)?.id;
          }
        }
      } catch (_) { log.warn('Falha ao buscar/criar categoria padrao de receita'); }
    }

    const body = { amount, description, date: new Date().toISOString(), paid: true };
    if (categoryId) body.categoryId = categoryId;

    const resp = await crmFetch('/finance/transactions', { method: 'POST', body });

    if (resp.status === 201 || resp.status === 200) {
      const catLine = categoryId ? `\n\u{1F3F7} Categoria: ${escapeMarkdown(categoryId.slice(0, 8))}` : '';
      await safeSend(chatId, `\u{2705} Receita registrada\\!\n\n\u{1F7E2} \\+R$ ${escapeMarkdown(amount.toFixed(2))}\n\u{1F4DD} ${escapeMarkdown(description)}${catLine}`);
    } else {
      const errMsg = resp.data?.message || resp.data?.error || String(resp.status);
      await safeSend(chatId, `\u{274C} Erro: ${escapeMarkdown(errMsg)}`);
    }
  } catch (error) {
    log.error('/income falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${safeText(error.message, 500)}`);
  }
}

/**
 * /expense <valor> <descricao> [catID] - Registrar despesa
 * Valores sempre positivos — tipo determinado pela categoria
 * Formato: /expense 150 Almoco
 *          /expense 150 Almoco abc12345
 */
async function cmdExpense(msg, args) {
  const chatId = msg.chat.id;
  if (!args) {
    await safeSend(chatId, `\u{2139}\u{FE0F} Uso: \`/expense 150 Almoco\`\nCom categoria: \`/expense 150 Almoco catID\`\nVer categorias: /cats`);
    return;
  }

  const parts = args.trim().split(/\s+/);
  const amount = parseFloat(parts[0]);

  if (isNaN(amount) || amount <= 0) {
    await safeSend(chatId, `\u{274C} Valor invalido\\. Uso: \`/expense 150 Almoco\``);
    return;
  }

  // Ultimo token pode ser catID (8+ chars hex) ou parte da descricao
  let description = parts.slice(1).join(' ') || 'Despesa';
  let categoryId;
  const lastPart = parts[parts.length - 1];
  if (parts.length > 2 && /^[a-f0-9-]{6,}$/i.test(lastPart)) {
    // Tenta usar como categoryId — busca nas categorias de despesa
    try {
      const catResp = await crmFetch('/finance/categories');
      const cats = catResp.data?.data || catResp.data || [];
      const cat = cats.find(c => c.id?.startsWith(lastPart) && c.type === 'expense');
      if (cat) {
        categoryId = cat.id;
        description = parts.slice(1, -1).join(' ') || 'Despesa';
      }
    } catch (_) {}
  }

  try {
    // Se nao tem categoria, buscar/criar categoria padrao de despesa
    if (!categoryId) {
      try {
        const catResp = await crmFetch('/finance/categories');
        const cats = catResp.data?.data || catResp.data || [];
        const defaultCat = cats.find(c => c.type === 'expense');
        if (defaultCat) {
          categoryId = defaultCat.id;
        } else {
          // Criar categoria padrao de despesa
          const newCatResp = await crmFetch('/finance/categories', { method: 'POST', body: { name: 'Despesa Geral', type: 'expense' } });
          if (newCatResp.status === 200 || newCatResp.status === 201) {
            categoryId = (newCatResp.data?.data || newCatResp.data)?.id;
          }
        }
      } catch (_) { log.warn('Falha ao buscar/criar categoria padrao de despesa'); }
    }

    const body = { amount, description, date: new Date().toISOString(), paid: true };
    if (categoryId) body.categoryId = categoryId;

    const resp = await crmFetch('/finance/transactions', { method: 'POST', body });

    if (resp.status === 201 || resp.status === 200) {
      const catLine = categoryId ? `\n\u{1F3F7} Categoria: ${escapeMarkdown(categoryId.slice(0, 8))}` : '';
      await safeSend(chatId, `\u{2705} Despesa registrada\\!\n\n\u{1F534} R$ ${escapeMarkdown(amount.toFixed(2))}\n\u{1F4DD} ${escapeMarkdown(description)}${catLine}`);
    } else {
      const errMsg = resp.data?.message || resp.data?.error || String(resp.status);
      await safeSend(chatId, `\u{274C} Erro: ${escapeMarkdown(errMsg)}`);
    }
  } catch (error) {
    log.error('/expense falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${safeText(error.message, 500)}`);
  }
}

/**
 * /balance - Saldo atual
 */
async function cmdBalance(msg) {
  const chatId = msg.chat.id;
  try {
    const now = new Date();
    const resp = await crmFetch(`/finance/summary?month=${now.getMonth() + 1}&year=${now.getFullYear()}`);
    const s = resp.data?.data || resp.data || {};
    // API retorna totalIncome / totalExpense / balance
    const income = Number(s.totalIncome ?? s.income ?? 0);
    const expense = Number(s.totalExpense ?? s.expense ?? 0);
    const balance = Number(s.balance ?? (income - expense));
    const emoji = balance >= 0 ? '\u{1F7E2}' : '\u{1F534}';
    const MONTHS = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    let text = `${emoji} *Saldo ${escapeMarkdown(MONTHS[now.getMonth() + 1])}/${now.getFullYear()}:* \`R$ ${escapeMarkdown(balance.toFixed(2))}\`\n`;
    text += `\u{1F7E2} Receita: \`R$ ${escapeMarkdown(income.toFixed(2))}\`\n`;
    text += `\u{1F534} Despesa: \`R$ ${escapeMarkdown(expense.toFixed(2))}\``;
    await safeSend(chatId, text);
  } catch (error) {
    log.error('/balance falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${safeText(error.message, 500)}`);
  }
}

/**
 * /goals - Listar metas com progresso
 */
async function cmdGoals(msg) {
  const chatId = msg.chat.id;
  try {
    const resp = await crmFetch('/finance/goals');
    const goals = resp.data?.data || resp.data || [];
    if (!goals.length) {
      await safeSend(chatId, `\u{1F3AF} *Metas*\n\nNenhuma meta encontrada\\.`);
      return;
    }
    let text = `\u{1F3AF} *Metas Financeiras*\n\n`;
    for (const g of goals) {
      const pct = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;
      const filled = Math.round(pct / 5);
      const bar = '\u{2588}'.repeat(filled) + '\u{2591}'.repeat(20 - filled);
      text += `*${escapeMarkdown(g.name)}*\n`;
      text += `\`${bar}\` ${pct}%\n`;
      text += `R$ ${escapeMarkdown(Number(g.currentAmount).toFixed(2))} / R$ ${escapeMarkdown(Number(g.targetAmount).toFixed(2))}\n\n`;
    }
    await safeSend(chatId, text);
  } catch (error) {
    log.error('/goals falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${safeText(error.message, 500)}`);
  }
}

// ============ NOTAS COMMANDS ============

/**
 * /notes - Listar notas (pinned primeiro)
 */
async function cmdNotes(msg) {
  const chatId = msg.chat.id;
  try {
    const resp = await crmFetch('/notes?limit=10');
    const notes = resp.data?.data || resp.data || [];
    if (!notes.length) {
      await safeSend(chatId, `\u{1F4DD} *Notas*\n\nNenhuma nota encontrada\\.\n\nUse /addnote para criar\\!`);
      return;
    }
    let text = `\u{1F4DD} *Notas* \\(${notes.length}\\)\n\n`;
    for (const n of notes) {
      const pin = n.pinned ? '\u{1F4CC}' : '';
      const id = (n.id || '').substring(0, 8);
      text += `${pin}\`${id}\` ${escapeMarkdown((n.title || 'Sem titulo').substring(0, 40))}\n`;
    }
    text += `\n_Acoes:_ /note \\[id\\] \\| /addnote \\[titulo\\] \\| /pinnote \\[id\\] \\| /delnote \\[id\\]`;
    await safeSend(chatId, text);
  } catch (error) {
    log.error('/note falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${safeText(error.message, 500)}`);
  }
}

/**
 * /addnote <titulo>\n<conteudo> - Criar nota rápida
 */
async function cmdAddNote(msg, args) {
  const chatId = msg.chat.id;
  if (!args) {
    await safeSend(chatId, `\u{2139}\u{FE0F} Uso: \`/addnote Titulo da nota\`\nOu: \`/addnote Titulo\\nConteudo aqui\``);
    return;
  }

  const lines = args.split('\n');
  const title = lines[0].trim();
  const content = lines.slice(1).join('\n').trim() || undefined;

  try {
    const resp = await crmFetch('/notes', {
      method: 'POST',
      body: { title, content }
    });

    if (resp.status === 201 || resp.status === 200) {
      await safeSend(chatId, `\u{2705} Nota criada\\!\n\n\u{1F4DD} *${escapeMarkdown(title)}*`);
    } else {
      await safeSend(chatId, `\u{274C} Erro: ${escapeMarkdown(String(resp.status))}`);
    }
  } catch (error) {
    log.error('/addnote falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${safeText(error.message, 500)}`);
  }
}

/**
 * /pinnote <id> - Toggle pin de uma nota
 */
async function cmdPinNote(msg, idPrefix) {
  const chatId = msg.chat.id;
  if (!idPrefix) {
    await safeSend(chatId, `\u{2139}\u{FE0F} Uso: \`/pinnote <id>\``);
    return;
  }
  try {
    const listResp = await crmFetch('/notes');
    const notes = listResp.data?.data || listResp.data || [];
    const note = notes.find(n => n.id?.startsWith(idPrefix));
    if (!note) {
      await safeSend(chatId, `\u{274C} Nota nao encontrada`);
      return;
    }
    await crmFetch(`/notes/${note.id}/pin`, { method: 'PUT' });
    const newState = !note.pinned;
    await safeSend(chatId, `${newState ? '\u{1F4CC}' : '\u{2705}'} Nota ${newState ? 'fixada' : 'desafixada'}: *${escapeMarkdown(note.title)}*`);
  } catch (error) {
    log.error('/pinnote falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${safeText(error.message, 500)}`);
  }
}

/**
 * /delnote <id> - Deletar nota
 */
async function cmdDelNote(msg, idPrefix) {
  const chatId = msg.chat.id;
  if (!idPrefix) {
    await safeSend(chatId, `\u{2139}\u{FE0F} Uso: \`/delnote <id>\``);
    return;
  }
  try {
    const listResp = await crmFetch('/notes');
    const notes = listResp.data?.data || listResp.data || [];
    const note = notes.find(n => n.id?.startsWith(idPrefix));
    if (!note) {
      await safeSend(chatId, `\u{274C} Nota nao encontrada`);
      return;
    }
    await crmFetch(`/notes/${note.id}`, { method: 'DELETE' });
    await safeSend(chatId, `\u{1F5D1}\u{FE0F} Nota deletada: *${escapeMarkdown(note.title)}*`);
  } catch (error) {
    log.error('/delnote falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${safeText(error.message, 500)}`);
  }
}

// ============ TRANSACOES COMMANDS ============

/**
 * /txs [mes] [ano] - Listar transacoes do mes com botoes de deletar
 */
async function cmdTxs(msg, args) {
  const chatId = msg.chat.id;
  const now = new Date();
  let month = now.getMonth() + 1;
  let year = now.getFullYear();
  if (args) {
    const parts = args.trim().split(/\s+/);
    if (parts[0]) month = parseInt(parts[0], 10) || month;
    if (parts[1]) year = parseInt(parts[1], 10) || year;
  }
  try {
    const [txResp, catResp] = await Promise.all([
      crmFetch('/finance/transactions?month=' + month + '&year=' + year + '&limit=20'),
      crmFetch('/finance/categories')
    ]);
    const txs = txResp.data?.data || txResp.data || [];
    const cats = catResp.data?.data || catResp.data || [];
    const catMap = {};
    cats.forEach(c => { catMap[c.id] = c; });

    if (!txs.length) {
      await safeSend(chatId, '\u{1F4B3} *Transacoes ' + month + '/' + year + '*\n\nNenhuma transacao encontrada\\.');
      return;
    }
    const MONTHS = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    let text = '\u{1F4B3} *Transacoes ' + escapeMarkdown(MONTHS[month]) + '/' + year + '* \\(' + txs.length + '\\)\n\n';
    const tx = txs.find(t => t.id?.startsWith(idPrefix));
    if (!tx) {
      await safeSend(chatId, '\u{274C} Transacao nao encontrada com ID \u0060' + escapeMarkdown(idPrefix) + '\u0060');
      return;
    }
    await crmFetch('/finance/transactions/' + tx.id, { method: 'DELETE' });
    const amount = Math.abs(Number(tx.amount));
    await safeSend(chatId, '\u{1F5D1}\u{FE0F} Transacao deletada\\!\n\n*' + escapeMarkdown(tx.description || 'Sem descricao') + '* \\- R$ ' + escapeMarkdown(amount.toFixed(2)));
  } catch (error) {
    log.error('/deltx falhou', error);
    await bot.sendMessage(chatId, '\u{274C} Erro: ' + error.message);
  }
}

/**
 * /cats - Listar categorias financeiras
 */
async function cmdCats(msg) {
  const chatId = msg.chat.id;
  try {
    const resp = await crmFetch('/finance/categories');
    const cats = resp.data?.data || resp.data || [];
    if (!cats.length) {
      await safeSend(chatId, '\u{1F3F7}\u{FE0F} *Categorias*\n\nNenhuma categoria encontrada\\.\n\nUse \u0060/addcat income Nome\u0060 ou \u0060/addcat expense Nome\u0060');
      return;
    }
    const incomes = cats.filter(c => c.type === 'income');
    const expenses = cats.filter(c => c.type === 'expense');
    let text = '\u{1F3F7}\u{FE0F} *Categorias Financeiras*\n\n';
    if (incomes.length) {
      text += '\u{1F7E2} *Receitas* \\(' + incomes.length + '\\)\n';
      incomes.forEach(c => { text += '  \u2022 ' + escapeMarkdown(c.name) + ' \\| \u0060' + escapeMarkdown(c.id.slice(0, 8)) + '\u0060\n'; });
      text += '\n';
    }
    if (expenses.length) {
      text += '\u{1F534} *Despesas* \\(' + expenses.length + '\\)\n';
      expenses.forEach(c => { text += '  \u2022 ' + escapeMarkdown(c.name) + ' \\| \u0060' + escapeMarkdown(c.id.slice(0, 8)) + '\u0060\n'; });
    }
    text += '\n_Use \u0060/income 500 Descricao catID\u0060 ou \u0060/expense 100 Descricao catID\u0060 para registrar com categoria_';
    await safeSend(chatId, text);
  } catch (error) {
    log.error('/cats falhou', error);
    await bot.sendMessage(chatId, '\u{274C} Erro: ' + error.message);
  }
}

/**
 * /addcat <income|expense> <nome> - Criar categoria financeira
 */
async function cmdAddCat(msg, args) {
  const chatId = msg.chat.id;
  if (!args) {
    await safeSend(chatId, '\u{2139}\u{FE0F} Uso: \u0060/addcat income Salario\u0060\nOu: \u0060/addcat expense Alimentacao\u0060');
    return;
  }
  const parts = args.trim().split(/\s+/);
  const type = parts[0]?.toLowerCase();
  const name = parts.slice(1).join(' ').trim();
  if (!['income', 'expense'].includes(type)) {
    await safeSend(chatId, '\u{274C} Tipo invalido\\. Use \u0060income\u0060 ou \u0060expense\u0060');
    return;
  }
  if (!name) {
    await safeSend(chatId, '\u{274C} Informe o nome da categoria\\. Ex: \u0060/addcat expense Alimentacao\u0060');
    return;
  }
  try {
    const resp = await crmFetch('/finance/categories', {
      method: 'POST',
      body: { name, type }
    });
    if (resp.status === 201 || resp.status === 200) {
      const cat = resp.data?.data || resp.data;
      const emoji = type === 'income' ? '\u{1F7E2}' : '\u{1F534}';
      await safeSend(chatId, '\u{2705} Categoria criada\\!\n\n' + emoji + ' *' + escapeMarkdown(name) + '* \\(' + escapeMarkdown(type === 'income' ? 'Receita' : 'Despesa') + '\\)\n\u0060ID: ' + escapeMarkdown(cat?.id?.slice(0, 8) || '?') + '\u0060');
    } else {
      const errMsg = resp.data?.message || resp.data?.error || String(resp.status);
      await safeSend(chatId, '\u{274C} Erro ao criar categoria: ' + escapeMarkdown(errMsg));
    }
  } catch (error) {
    log.error('/addcat falhou', error);
    await bot.sendMessage(chatId, '\u{274C} Erro: ' + error.message);
  }
}

// ============ CRM CALLBACK HELPERS ============

/**
 * Processar callbacks CRM dentro do handleCallbackQuery
 * Retorna true se o callback foi tratado, false caso contrario
 */
async function handleCrmCallback(chatId, data, messageId) {
  // Dashboard
  if (data === 'crm_dashboard') {
    await bot.deleteMessage(chatId, messageId).catch(() => {});
    await cmdCrmDashboard({ chat: { id: chatId } });
    return true;
  }

  // Pipeline
  if (data === 'crm_pipeline') {
    await bot.deleteMessage(chatId, messageId).catch(() => {});
    await cmdCrmPipeline({ chat: { id: chatId } });
    return true;
  }

  // Listar campanhas
  if (data === 'crm_campaigns') {
    await bot.deleteMessage(chatId, messageId).catch(() => {});
    await cmdCampaigns({ chat: { id: chatId } });
    return true;
  }

  // Detalhe campanha: crm_campaign_<id>
  if (data.startsWith('crm_campaign_')) {
    const campId = data.replace('crm_campaign_', '');
    await bot.deleteMessage(chatId, messageId).catch(() => {});
    await cmdCampaignDetail({ chat: { id: chatId } }, campId);
    return true;
  }

  // Iniciar campanha: crm_camp_start_<id>
  if (data.startsWith('crm_camp_start_')) {
    const campId = data.replace('crm_camp_start_', '');
    try {
      const resp = await crmFetch(`/campaigns/${campId}/start`, { method: 'POST' });
      if (resp.status === 200) {
        await bot.sendMessage(chatId, `\u{25B6} Campanha iniciada com sucesso\\!`, { parse_mode: 'MarkdownV2' });
      } else {
        await bot.sendMessage(chatId, `\u{274C} Erro ao iniciar campanha: ${resp.data?.error || resp.status}`);
      }
    } catch (e) {
      await bot.sendMessage(chatId, `\u{274C} Erro: ${safeText(e.message, 500)}`);
    }
    return true;
  }

  // Pausar campanha: crm_camp_pause_<id>
  if (data.startsWith('crm_camp_pause_')) {
    const campId = data.replace('crm_camp_pause_', '');
    try {
      const resp = await crmFetch(`/campaigns/${campId}/pause`, { method: 'POST' });
      if (resp.status === 200) {
        await bot.sendMessage(chatId, `\u{23F8} Campanha pausada com sucesso\\!`, { parse_mode: 'MarkdownV2' });
      } else {
        await bot.sendMessage(chatId, `\u{274C} Erro ao pausar campanha: ${resp.data?.error || resp.status}`);
      }
    } catch (e) {
      await bot.sendMessage(chatId, `\u{274C} Erro: ${safeText(e.message, 500)}`);
    }
    return true;
  }

  // Listar leads (todos ou com filtro de status/temperatura)
  if (data === 'crm_leads_all') {
    await bot.deleteMessage(chatId, messageId).catch(() => {});
    await cmdLeads({ chat: { id: chatId } }, null);
    return true;
  }

  const leadFilterMap = {
    crm_leads_new: 'new',
    crm_leads_contacted: 'contacted',
    crm_leads_replied: 'replied',
    crm_leads_interested: 'interested',
    crm_leads_negotiating: 'negotiating',
    crm_leads_won: 'won',
    crm_leads_lost: 'lost',
    crm_leads_hot: 'hot',
    crm_leads_warm: 'warm',
    crm_leads_cold: 'cold'
  };

  if (leadFilterMap[data]) {
    await bot.deleteMessage(chatId, messageId).catch(() => {});
    await cmdLeads({ chat: { id: chatId } }, leadFilterMap[data]);
    return true;
  }

  // Detalhe de lead: crm_lead_<id>
  if (data.startsWith('crm_lead_')) {
    const leadId = data.replace('crm_lead_', '');
    await bot.deleteMessage(chatId, messageId).catch(() => {});
    await cmdLeadDetail({ chat: { id: chatId } }, leadId);
    return true;
  }

  // Historico de mensagens do lead: crm_msgs_<id>
  if (data.startsWith('crm_msgs_')) {
    const leadId = data.replace('crm_msgs_', '');
    try {
      const resp = await crmFetch(`/leads/${leadId}/messages`);
      if (resp.status !== 200) {
        await bot.sendMessage(chatId, `\u{274C} Erro ao buscar mensagens.`);
        return true;
      }
      const msgs = resp.data?.data || resp.data?.messages || (Array.isArray(resp.data) ? resp.data : []);
      if (msgs.length === 0) {
        await bot.sendMessage(chatId, `\u{1F4ED} Nenhuma mensagem registrada para este lead.`);
        return true;
      }
      let text = `\u{1F4AC} *Mensagens do Lead \\#${escapeMarkdown(String(leadId))}*\n\n`;
      msgs.slice(-8).forEach(m => {
        const direction = m.direction === 'outbound' ? '\u{27A1}' : '\u{2B05}';
        const channel = escapeMarkdown(m.channel || 'msg');
        const content = escapeMarkdown((m.content || '').substring(0, 120));
        const date = escapeMarkdown(formatDate(m.createdAt || m.sentAt));
        text += `${direction} _${channel}_ \\| ${date}\n${content}\n\n`;
      });
      await safeSend(chatId, text);
    } catch (e) {
      await bot.sendMessage(chatId, `\u{274C} Erro: ${safeText(e.message, 500)}`);
    }
    return true;
  }

  // Notas do lead: crm_notes_<id>
  if (data.startsWith('crm_notes_')) {
    const leadId = data.replace('crm_notes_', '');
    try {
      const resp = await crmFetch(`/leads/${leadId}/notes`);
      if (resp.status !== 200) {
        await bot.sendMessage(chatId, `\u{274C} Erro ao buscar notas.`);
        return true;
      }
      const notes = resp.data?.data || resp.data?.notes || (Array.isArray(resp.data) ? resp.data : []);
      if (notes.length === 0) {
        await bot.sendMessage(chatId, `\u{1F4ED} Nenhuma nota registrada para este lead.`);
        return true;
      }
      let text = `\u{1F4CC} *Notas do Lead \\#${escapeMarkdown(String(leadId))}*\n\n`;
      notes.slice(-5).forEach(n => {
        const date = escapeMarkdown(formatDate(n.createdAt));
        const content = escapeMarkdown((n.content || n.text || '').substring(0, 200));
        text += `\u{1F4CD} _${date}_\n${content}\n\n`;
      });
      await safeSend(chatId, text);
    } catch (e) {
      await bot.sendMessage(chatId, `\u{274C} Erro: ${safeText(e.message, 500)}`);
    }
    return true;
  }

  // Prompt para criar novo lead via callback
  if (data === 'crm_newlead_prompt') {
    await bot.sendMessage(chatId, '\u{2795} Para criar um lead, envie:\n\n`/newlead Nome Completo`\n\nOu com extras:\n`/newlead Nome | empresa=X | email=X`', { parse_mode: 'MarkdownV2' });
    return true;
  }

  return false;
}

// ============ FILE RECEIVING & PROCESSING ============

/**
 * Processa mensagens com arquivos (fotos, documentos, videos, audio)
 * Faz download do arquivo e repassa ao Claude com contexto
 */
async function handleFileMessage(msg) {
  const chatId = msg.chat.id;
  const caption = msg.caption || '';

  let fileId, fileType, fileName, fileSize;

  if (msg.photo) {
    // Telegram envia array de tamanhos, pegar o maior
    const photo = msg.photo[msg.photo.length - 1];
    fileId = photo.file_id;
    fileType = 'foto';
    fileName = `photo_${Date.now()}.jpg`;
    fileSize = photo.file_size;
  } else if (msg.document) {
    fileId = msg.document.file_id;
    fileType = 'documento';
    fileName = msg.document.file_name || `document_${Date.now()}`;
    fileSize = msg.document.file_size;
  } else if (msg.video) {
    fileId = msg.video.file_id;
    fileType = 'video';
    fileName = msg.video.file_name || `video_${Date.now()}.mp4`;
    fileSize = msg.video.file_size;
  } else if (msg.audio) {
    fileId = msg.audio.file_id;
    fileType = 'audio';
    fileName = msg.audio.file_name || `audio_${Date.now()}.mp3`;
    fileSize = msg.audio.file_size;
  } else if (msg.voice) {
    fileId = msg.voice.file_id;
    fileType = 'audio de voz';
    fileName = `voice_${Date.now()}.ogg`;
    fileSize = msg.voice.file_size;
  }

  if (!fileId) return;

  // Limitar tamanho (Telegram API download limit: 20MB)
  if (fileSize && fileSize > 20 * 1024 * 1024) {
    await bot.sendMessage(chatId, `\u{26A0} Arquivo muito grande (${(fileSize / 1024 / 1024).toFixed(1)}MB). Limite de download: 20MB.`);
    return;
  }

  try {
    // Criar diretorio temporario
    const tmpDir = path.join(__dirname, 'data', 'telegram-uploads');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const localPath = path.join(tmpDir, fileName);

    // Download do arquivo via Telegram API
    const fileStream = await bot.getFileStream(fileId);
    const writeStream = fs.createWriteStream(localPath);

    await new Promise((resolve, reject) => {
      fileStream.pipe(writeStream);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
      fileStream.on('error', reject);
    });

    log.info('Arquivo recebido do Telegram', { chatId, fileType, fileName, path: localPath });

    // ── TRANSCRIÇÃO AUTOMÁTICA DE ÁUDIO/VOZ ──────────────────────
    const audioExts = ['.ogg', '.oga', '.mp3', '.wav', '.m4a', '.flac', '.aac', '.opus', '.webm', '.wma'];
    const ext = path.extname(fileName).toLowerCase();
    const isAudio = audioExts.includes(ext) || fileType === 'audio de voz' || fileType === 'audio';

    if (isAudio) {
      log.info('Áudio detectado — iniciando transcrição', { fileName, fileType });
      await bot.sendMessage(chatId, '\u{1F3A4} Transcrevendo áudio...');

      try {
        const { spawnSync } = require('child_process');
        const transcribeScript = path.join(__dirname, '..', 'tools', 'python-tools', 'transcribe_audio.py');
        const argsJson = JSON.stringify({ input: localPath.replace(/\\/g, '/'), language: 'pt', model: 'small', format: 'text' });
        const proc = spawnSync('python', [transcribeScript, argsJson], {
          encoding: 'utf8', timeout: 120000, maxBuffer: 10 * 1024 * 1024
        });
        const result = proc.stdout || '';
        if (proc.error) throw proc.error;
        if (proc.status !== 0 && proc.stderr) log.warn('Whisper stderr', { stderr: proc.stderr.substring(0, 200) });

        let transcription = '';
        try {
          const parsed = JSON.parse(result);
          if (parsed.error) {
            log.error('Erro na transcrição', { error: parsed.error });
            await bot.sendMessage(chatId, `\u{26A0} Não consegui transcrever: ${parsed.error}`);
            transcription = '';
          } else {
            transcription = parsed.text || '';
            const duration = parsed.duration_seconds || 0;
            const time = parsed.transcribe_time || 0;
            log.info('Transcrição concluída', { chars: transcription.length, duration, time });
            await bot.sendMessage(chatId, `\u{2705} *Transcrição* (${duration}s de áudio):\n\n_${transcription}_`, { parse_mode: 'Markdown' });
          }
        } catch (parseErr) {
          transcription = result.trim();
          if (transcription) {
            await bot.sendMessage(chatId, `\u{2705} *Transcrição*:\n\n_${transcription}_`, { parse_mode: 'Markdown' });
          }
        }

        // Se tem transcrição, enviar para o Claude processar
        if (transcription) {
          let textForClaude = '';
          if (caption) textForClaude = caption + '\n\n';
          textForClaude += `[O usuário enviou um áudio de voz pelo Telegram que foi transcrito automaticamente]\n`;
          textForClaude += `[Transcrição do áudio]: ${transcription}`;
          msg.text = textForClaude;
          await handleFreeText(msg);
        }

        // Limpar após 5 min
        setTimeout(() => { fs.unlink(localPath, () => {}); }, 5 * 60 * 1000);
        return;

      } catch (transcribeErr) {
        log.error('Falha na transcrição — fallback para modo arquivo', { error: transcribeErr.message });
        // Fallback: enviar como arquivo normal para o Claude
      }
    }

    // ── DEMAIS ARQUIVOS (fotos, docs, vídeos, ou áudio sem transcrição) ──
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const isImage = imageExts.includes(ext);

    let textForClaude = '';
    if (caption) {
      textForClaude = caption + '\n\n';
    }
    textForClaude += `[O usuario enviou um ${fileType}: ${fileName} (${(fileSize / 1024).toFixed(1)}KB)]`;
    textForClaude += `\n[Arquivo salvo em: ${localPath}]`;

    if (isImage) {
      textForClaude += `\n[Use a ferramenta Read para visualizar a imagem, ou processe conforme necessario]`;
    }

    // Injetar como mensagem de texto para o Claude processar
    msg.text = textForClaude;
    await handleFreeText(msg);

    // Limpar arquivo apos 10 minutos
    setTimeout(() => {
      fs.unlink(localPath, () => {});
    }, 10 * 60 * 1000);

  } catch (error) {
    log.error('Erro ao processar arquivo recebido', { error: error.message });
    await bot.sendMessage(chatId, `\u{274C} Erro ao processar ${fileType}: ${safeText(error.message, 500)}`);
  }
}

// ============ FILE SENDING FUNCTIONS ============

/**
 * Envia foto para um chatId especifico ou para todos os usuarios autorizados
 * @param {string|number|null} chatId - Chat ID destino (null = broadcast para autorizados)
 * @param {string|ReadableStream} photo - Caminho local, URL ou stream da foto
 * @param {object} options - { caption, parse_mode, reply_markup, ... }
 * @returns {Promise<object|object[]>} Mensagem(ns) enviada(s)
 */
async function sendPhoto(chatId, photo, options = {}) {
  if (!bot || !isRunning) throw new Error('Bot nao esta rodando');

  const photoSource = _resolveFileSource(photo);
  const sendOpts = { caption: options.caption || '', ...options };
  delete sendOpts.caption; // será passado separado
  const finalOpts = { caption: options.caption || '', ...sendOpts };

  if (chatId) {
    return await bot.sendPhoto(chatId, photoSource, finalOpts);
  }

  // Broadcast para todos os usuarios autorizados
  const config = getTelegramConfig();
  const users = config.authorizedUsers || [];
  const results = [];
  for (const uid of users) {
    try {
      results.push(await bot.sendPhoto(uid, photoSource, finalOpts));
    } catch (e) {
      log.error('sendPhoto falhou', { chatId: uid, error: e.message });
    }
  }
  return results;
}

/**
 * Envia documento (qualquer arquivo) para um chatId ou broadcast
 * @param {string|number|null} chatId - Chat ID destino (null = broadcast)
 * @param {string|ReadableStream} document - Caminho local, URL ou stream
 * @param {object} options - { caption, filename, parse_mode, reply_markup, ... }
 * @returns {Promise<object|object[]>}
 */
async function sendDocument(chatId, document, options = {}) {
  if (!bot || !isRunning) throw new Error('Bot nao esta rodando');

  const docSource = _resolveFileSource(document);
  const finalOpts = { caption: options.caption || '' };
  if (options.filename) {
    finalOpts.contentType = options.contentType || 'application/octet-stream';
  }
  // node-telegram-bot-api aceita fileOptions como 3o arg
  const fileOpts = {};
  if (options.filename) fileOpts.filename = options.filename;
  if (options.contentType) fileOpts.contentType = options.contentType;

  if (chatId) {
    return await bot.sendDocument(chatId, docSource, finalOpts, fileOpts);
  }

  const config = getTelegramConfig();
  const users = config.authorizedUsers || [];
  const results = [];
  for (const uid of users) {
    try {
      results.push(await bot.sendDocument(uid, docSource, finalOpts, fileOpts));
    } catch (e) {
      log.error('sendDocument falhou', { chatId: uid, error: e.message });
    }
  }
  return results;
}

/**
 * Envia video para um chatId ou broadcast
 * @param {string|number|null} chatId - Chat ID destino (null = broadcast)
 * @param {string|ReadableStream} video - Caminho local, URL ou stream
 * @param {object} options - { caption, width, height, duration, ... }
 * @returns {Promise<object|object[]>}
 */
async function sendVideo(chatId, video, options = {}) {
  if (!bot || !isRunning) throw new Error('Bot nao esta rodando');

  const videoSource = _resolveFileSource(video);
  const finalOpts = { caption: options.caption || '' };
  if (options.width) finalOpts.width = options.width;
  if (options.height) finalOpts.height = options.height;
  if (options.duration) finalOpts.duration = options.duration;
  if (options.supports_streaming) finalOpts.supports_streaming = true;

  if (chatId) {
    return await bot.sendVideo(chatId, videoSource, finalOpts);
  }

  const config = getTelegramConfig();
  const users = config.authorizedUsers || [];
  const results = [];
  for (const uid of users) {
    try {
      results.push(await bot.sendVideo(uid, videoSource, finalOpts));
    } catch (e) {
      log.error('sendVideo falhou', { chatId: uid, error: e.message });
    }
  }
  return results;
}

/**
 * Envia audio para um chatId ou broadcast
 * @param {string|number|null} chatId - Chat ID destino (null = broadcast)
 * @param {string|ReadableStream} audio - Caminho local, URL ou stream
 * @param {object} options - { caption, title, performer, duration, ... }
 * @returns {Promise<object|object[]>}
 */
async function sendAudio(chatId, audio, options = {}) {
  if (!bot || !isRunning) throw new Error('Bot nao esta rodando');

  const audioSource = _resolveFileSource(audio);
  const finalOpts = { caption: options.caption || '' };
  if (options.title) finalOpts.title = options.title;
  if (options.performer) finalOpts.performer = options.performer;
  if (options.duration) finalOpts.duration = options.duration;

  if (chatId) {
    return await bot.sendAudio(chatId, audioSource, finalOpts);
  }

  const config = getTelegramConfig();
  const users = config.authorizedUsers || [];
  const results = [];
  for (const uid of users) {
    try {
      results.push(await bot.sendAudio(uid, audioSource, finalOpts));
    } catch (e) {
      log.error('sendAudio falhou', { chatId: uid, error: e.message });
    }
  }
  return results;
}

/**
 * Envia arquivo generico - detecta tipo automaticamente pela extensao
 * @param {string|number|null} chatId - Chat ID destino (null = broadcast)
 * @param {string} filePath - Caminho local ou URL do arquivo
 * @param {object} options - { caption, filename, ... }
 * @returns {Promise<object|object[]>}
 */
async function sendFile(chatId, filePath, options = {}) {
  if (!bot || !isRunning) throw new Error('Bot nao esta rodando');

  const ext = path.extname(filePath).toLowerCase();
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
  const videoExts = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.gif'];
  const audioExts = ['.mp3', '.ogg', '.wav', '.flac', '.m4a', '.aac'];

  if (imageExts.includes(ext)) {
    return await sendPhoto(chatId, filePath, options);
  } else if (videoExts.includes(ext) && ext !== '.gif') {
    return await sendVideo(chatId, filePath, options);
  } else if (audioExts.includes(ext)) {
    return await sendAudio(chatId, filePath, options);
  } else {
    return await sendDocument(chatId, filePath, options);
  }
}

/**
 * Resolve fonte de arquivo: caminho local -> ReadStream, URL -> string, stream -> stream
 */
function _resolveFileSource(source) {
  if (typeof source === 'string') {
    // Se e URL, retornar como string (node-telegram-bot-api suporta URL direta)
    if (source.startsWith('http://') || source.startsWith('https://')) {
      return source;
    }
    // Caminho local: resolver e criar stream
    const resolved = source.startsWith('~')
      ? path.join(process.env.HOME || process.env.USERPROFILE || '', source.slice(1))
      : path.resolve(source);

    if (!fs.existsSync(resolved)) {
      throw new Error(`Arquivo nao encontrado: ${resolved}`);
    }
    return fs.createReadStream(resolved);
  }
  // Ja e um stream ou Buffer
  return source;
}

// ============ TERMINAL CLAUDE CODE — INTEGRACAO ============

/**
 * Injeta a referencia ao modulo ScheduledTasks
 * Chamado pelo server.js apos inicializacao
 */
function setScheduledTasks(ref) {
  scheduledTasksRef = ref;
  log.info('ScheduledTasks ref injetado no telegram-bot');
}

/**
 * /terminal — Toggle modo terminal (mensagens livres abrem terminal)
 */
async function cmdTerminalToggle(msg) {
  const chatId = msg.chat.id;
  const current = terminalModeChats.get(chatId) || false;
  terminalModeChats.set(chatId, !current);

  if (!current) {
    await bot.sendMessage(chatId,
      'Modo Terminal ATIVADO\n\n' +
      'Agora suas mensagens de texto serao enviadas diretamente para o terminal do Claude Code na sua maquina local.\n\n' +
      'Use /terminal novamente para desativar e voltar ao modo chat.'
    );
  } else {
    await bot.sendMessage(chatId,
      'Modo Terminal DESATIVADO\n\n' +
      'Voltando ao modo chat normal. Suas mensagens serao processadas pelo assistente IA.\n\n' +
      'Use /terminal para reativar ou /t <texto> para enviar pontualmente ao terminal.'
    );
  }
}

/**
 * /terminal <texto> ou /t <texto> — Envia texto diretamente ao terminal Claude Code
 */
async function cmdTerminalSend(msg, text) {
  const chatId = msg.chat.id;

  if (!scheduledTasksRef) {
    await bot.sendMessage(chatId, 'Modulo de tarefas agendadas nao inicializado. Reinicie o servidor.');
    return;
  }

  if (!text || !text.trim()) {
    await bot.sendMessage(chatId, 'Uso: /terminal <prompt> ou /t <prompt>\n\nExemplo: /t Analise o projeto e rode os testes');
    return;
  }

  try {
    // Avisar que esta processando
    await bot.sendMessage(chatId, `Executando via Claude Code...\n"${text.slice(0, 150)}${text.length > 150 ? '...' : ''}"`);

    const result = await scheduledTasksRef.launchFromTelegram(text.trim(), String(chatId));

    if (result.status === 'completed' && result.output) {
      // Enviar resposta capturada (truncar para limite do Telegram)
      const output = result.output.length > 3800
        ? result.output.slice(0, 3700) + '\n\n... (truncado)'
        : result.output;
      await bot.sendMessage(chatId, output);
    } else if (result.status === 'failed') {
      await bot.sendMessage(chatId, `Falha na execucao: ${result.error || 'erro desconhecido'}`);
    } else {
      await bot.sendMessage(chatId, 'Execucao concluida (sem output capturado).');
    }
  } catch (err) {
    log.error('Erro no cmdTerminalSend', { error: err.message });
    await bot.sendMessage(chatId, `Erro: ${err.message}`);
  }
}

/**
 * Handler para mensagens livres em modo terminal
 * Retorna true se processou (modo terminal ativo), false se deve seguir fluxo normal
 */
async function handleTerminalMode(msg) {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!terminalModeChats.get(chatId)) return false;
  if (!text || text.startsWith('/')) return false;
  if (!scheduledTasksRef) return false;

  try {
    await bot.sendMessage(chatId, `Executando: "${text.slice(0, 100)}${text.length > 100 ? '...' : ''}"`);

    const result = await scheduledTasksRef.launchFromTelegram(text.trim(), String(chatId));

    if (result.status === 'completed' && result.output) {
      const output = result.output.length > 3800
        ? result.output.slice(0, 3700) + '\n\n... (truncado)'
        : result.output;
      await bot.sendMessage(chatId, output);
    } else if (result.status === 'failed') {
      await bot.sendMessage(chatId, `Falha: ${result.error || 'erro desconhecido'}`);
    } else {
      await bot.sendMessage(chatId, 'Concluido (sem output).');
    }
  } catch (err) {
    log.error('handleTerminalMode erro', { error: err.message });
    await bot.sendMessage(chatId, `Erro: ${err.message}`);
  }

  return true;
}

/**
 * Envia mensagem e retorna o message_id do Telegram
 * Usado pelo ScheduledTasks para sessao bidirecional
 */
async function sendAndGetId(chatId, text) {
  if (!bot || !isRunning) return null;

  try {
    let sent;
    if (text.length > 4000) {
      // Enviar em chunks, retornar ID do ultimo
      sent = await sendLongMessage(chatId, text);
    } else {
      sent = await bot.sendMessage(chatId, text);
    }
    return sent?.message_id || null;
  } catch (err) {
    log.error('sendAndGetId falhou', { chatId, error: err.message });
    return null;
  }
}

module.exports = {
  start,
  stop,
  getStatus,
  getBot,
  sendNotification,
  getTelegramConfig,
  updateTelegramConfig,
  sendFile,
  sendPhoto,
  sendDocument,
  sendVideo,
  sendAudio,
  setScheduledTasks,
  sendAndGetId
};
