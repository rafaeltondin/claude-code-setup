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
 * Botao padrao para voltar ao menu principal
 */
function menuButton() {
  return { text: '\u{1F3E0} Menu', callback_data: 'main_menu' };
}

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

  const welcome = `\u{1F916} *Claude Code Ecosystem*

Ola, ${escapeMarkdown(username)}\\! Bem\\-vindo ao painel de controle\\.

${getQuickStatus()}

_Escolha uma opcao abaixo ou use /help_`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '\u{1F4CA} Status', callback_data: 'refresh_status' },
        { text: '\u{1F4CB} Tarefas', callback_data: 'list_tasks' },
        { text: '\u{1F4C3} Historico', callback_data: 'list_history' }
      ],
      [
        { text: '\u{1F4DD} Prompts', callback_data: 'pm_categories' },
        { text: '\u{1F4DA} Knowledge Base', callback_data: 'menu_kb' },
        { text: '\u{2795} Nova Tarefa', callback_data: 'menu_newtask' }
      ],
      [
        { text: '\u{1F9E0} Memoria', callback_data: 'menu_memory' },
        { text: '\u{2699} Configuracao', callback_data: 'menu_config' },
        { text: '\u{1F3D3} Ping', callback_data: 'menu_ping' }
      ]
    ]
  };

  await safeSend(chatId, welcome, { reply_markup: keyboard });
}

/**
 * Menu principal interativo - acessivel via /menu ou botao
 */
async function cmdMenu(msg) {
  const chatId = msg.chat?.id || msg;
  log.info('/menu', { chatId });

  const status = getQuickStatus();

  const text = `\u{1F3E0} *Menu Principal*

${status}

_Selecione uma opcao:_`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '📊 Status', callback_data: 'refresh_status' },
        { text: '📋 Tarefas Bot', callback_data: 'list_tasks' },
        { text: '📈 Estatísticas', callback_data: 'menu_stats' }
      ],
      [
        { text: '✅ Minhas Tarefas', callback_data: 'menu_mytasks' },
        { text: '💰 Financeiro', callback_data: 'menu_fin' },
        { text: '📝 Notas', callback_data: 'menu_notes' }
      ],
      [
        { text: '👥 CRM Leads', callback_data: 'crm_leads_all' },
        { text: '📊 CRM Dashboard', callback_data: 'crm_dashboard' }
      ],
      [
        { text: '📝 Prompts', callback_data: 'pm_categories' },
        { text: '📚 Knowledge Base', callback_data: 'menu_kb' },
        { text: '➕ Nova Tarefa Bot', callback_data: 'menu_newtask' }
      ],
      [
        { text: '🧠 Memória', callback_data: 'menu_memory' },
        { text: '⚙️ Config', callback_data: 'menu_config' },
        { text: '🏓 Ping', callback_data: 'menu_ping' }
      ]
    ]
  };

  await safeSend(chatId, text, { reply_markup: keyboard });
}

async function cmdHelp(msg) {
  const chatId = msg.chat.id;

  const help = `\u{1F4D6} *Ajuda Rapida*

\u{1F3E0} /menu \\- Menu principal com botoes
\u{1F4CA} /status \\- Status do sistema
\u{1F4CB} /tasks \\- Listar tarefas
\u{2795} /newtask \\- Criar tarefa
\u{1F4DD} /prompts \\- Prompt Manager
\u{1F4DA} /kb \\[busca\\] \\- Buscar na KB

\u{1F4AC} *Dica:* Responda a mensagem de resultado para continuar a conversa com o Claude\\.

_Use o menu abaixo para navegar:_`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '\u{1F3E0} Menu Principal', callback_data: 'main_menu' },
        { text: '\u{1F4D6} Comandos Completos', callback_data: 'help_full' }
      ]
    ]
  };

  await safeSend(chatId, help, { reply_markup: keyboard });
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

    const keyboard = {
      inline_keyboard: [
        [
          { text: '\u{1F504} Atualizar', callback_data: 'refresh_status' },
          { text: status.isRunning ? '\u{23F9} Parar' : '\u{25B6} Iniciar', callback_data: status.isRunning ? 'scheduler_stop' : 'scheduler_start' }
        ],
        [
          { text: '\u{1F4CB} Ver Tarefas', callback_data: 'list_tasks' },
          { text: '\u{1F4C3} Historico', callback_data: 'list_history' }
        ],
        [menuButton()]
      ]
    };

    await safeSend(chatId, text, { reply_markup: keyboard });
  } catch (error) {
    log.error('/status falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro ao obter status: ${error.message}`);
  }
}

async function cmdTasks(msg) {
  const chatId = msg.chat.id;
  log.info('/tasks', { chatId });

  try {
    const tasks = storage.getTasks();

    if (tasks.length === 0) {
      await safeSend(chatId, '\u{1F4ED} Nenhuma tarefa cadastrada\\.\n\n_Use o botao abaixo para criar uma:_', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '\u{2795} Criar Tarefa', callback_data: 'menu_newtask' }],
            [menuButton()]
          ]
        }
      });
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

    // Botoes de acao rapida para as primeiras 5 tarefas
    const buttons = tasks.slice(0, 5).map(task => ([{
      text: `${statusEmoji(task.status)} ${(task.name || 'Sem nome').substring(0, 20)}`,
      callback_data: `detail_${task.id}`
    }]));

    buttons.push([
      { text: '\u{1F504} Atualizar', callback_data: 'list_tasks' },
      { text: '\u{2795} Nova', callback_data: 'menu_newtask' },
      menuButton()
    ]);

    await safeSend(chatId, text, {
      reply_markup: { inline_keyboard: buttons }
    });
  } catch (error) {
    log.error('/tasks falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${error.message}`);
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

    // Botoes de acao
    const buttons = [];
    if (task.status !== 'running') {
      buttons.push({ text: '\u{25B6} Executar', callback_data: `run_${task.id}` });
    }
    if (task.status === 'paused') {
      buttons.push({ text: '\u{23EF} Retomar', callback_data: `resume_${task.id}` });
    } else if (task.status !== 'paused' && task.status !== 'running') {
      buttons.push({ text: '\u{23F8} Pausar', callback_data: `pause_${task.id}` });
    }
    buttons.push({ text: '\u{1F5D1} Deletar', callback_data: `confirmdelete_${task.id}` });

    const keyboard = [buttons];
    keyboard.push([
      { text: '\u{2B05} Tarefas', callback_data: 'list_tasks' },
      { text: '\u{1F504} Atualizar', callback_data: `detail_${task.id}` },
      menuButton()
    ]);

    await safeSend(chatId, text, {
      reply_markup: { inline_keyboard: keyboard }
    });
  } catch (error) {
    log.error('/task falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${error.message}`);
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

    await bot.sendMessage(chatId, `\u{23F3} Executando *${escapeMarkdown(task.name)}*\\.\\.\\.\n_Aguarde a conclusao\\._`, { parse_mode: 'MarkdownV2' });

    // Marcar ANTES de executar para evitar duplicacao (broadcast dispara antes do retorno)
    telegramInitiatedTasks.set(task.id, Date.now());

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
        const resetMatch = errMsg.match(/resets?\s+([^\n\r·•]+)/i);
        const resetStr = resetMatch ? `Resets ${escapeMarkdown(resetMatch[1].trim())}` : 'Tente novamente mais tarde';
        await bot.sendMessage(chatId, `\u{23F3} *Limite de uso atingido*\n\n*${escapeMarkdown(task.name)}*\n\u{1F552} ${resetStr}`, { parse_mode: 'MarkdownV2' });
      } else {
        await bot.sendMessage(chatId, `\u{274C} *Falha na execucao*\n\n*${escapeMarkdown(task.name)}*\n\u{1F6A8} Erro: ${escapeMarkdown(errMsg)}`, { parse_mode: 'MarkdownV2' });
      }
    }
  } catch (error) {
    log.error('/run falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro ao executar: ${error.message}`);
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

  // Truncar resposta se necessario
  let content = claudeResponse || '(Sem resposta)';
  if (content.length > availableSpace) {
    content = content.substring(0, availableSpace - 20) + '\n\n... (truncado)';
  }

  const fullMessage = header + content + footer;

  try {
    const sentMsg = await bot.sendMessage(chatId, fullMessage);
    return sentMsg;
  } catch (error) {
    log.error('Erro ao enviar resultado consolidado', error);
    // Fallback: enviar sem formatacao especial
    try {
      const fallbackMsg = `\u{2705} ${task.name} concluida (${formatDuration(result.duration)})\n\n${content.substring(0, 3500)}`;
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
    await bot.sendMessage(chatId, `\u{274C} Erro: ${error.message}`);
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
    await bot.sendMessage(chatId, `\u{274C} Erro: ${error.message}`);
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

    // Pedir confirmacao
    await bot.sendMessage(chatId, `\u{26A0} Tem certeza que deseja deletar *${escapeMarkdown(task.name)}*?`, {
      parse_mode: 'MarkdownV2',
      reply_markup: {
        inline_keyboard: [[
          { text: '\u{2705} Sim, deletar', callback_data: `dodelete_${task.id}` },
          { text: '\u{274C} Cancelar', callback_data: 'cancel_action' }
        ]]
      }
    });
  } catch (error) {
    log.error('/delete falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${error.message}`);
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

    await safeSend(chatId, text, {
      reply_markup: { inline_keyboard: [[
        { text: '\u{1F504} Atualizar', callback_data: 'menu_stats' },
        menuButton()
      ]]}
    });
  } catch (error) {
    log.error('/stats falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${error.message}`);
  }
}

async function cmdHistory(msg, limit = 10) {
  const chatId = msg.chat.id;
  log.info('/history', { chatId, limit });

  try {
    const executions = storage.getExecutions(parseInt(limit) || 10);

    if (executions.length === 0) {
      await safeSend(chatId, '\u{1F4ED} Nenhuma execucao registrada\\.', {
        reply_markup: { inline_keyboard: [[menuButton()]] }
      });
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

    await safeSend(chatId, text, {
      reply_markup: { inline_keyboard: [[
        { text: '\u{1F504} Atualizar', callback_data: 'list_history' },
        menuButton()
      ]]}
    });
  } catch (error) {
    log.error('/history falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${error.message}`);
  }
}

async function cmdKb(msg, query) {
  const chatId = msg.chat.id;
  log.info('/kb', { chatId, query });

  if (!query) {
    await safeSend(chatId, '\u{1F4DA} *Buscar na Knowledge Base*\n\nEnvie: /kb \\[termo\\]\n\nExemplo: `/kb shopify api`', {
      reply_markup: { inline_keyboard: [[
        { text: '\u{1F4DA} Listar Todos', callback_data: 'menu_kblist' },
        menuButton()
      ]]}
    });
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

    await safeSend(chatId, text, {
      reply_markup: { inline_keyboard: [[
        { text: '\u{1F4DA} Listar Todos', callback_data: 'menu_kblist' },
        menuButton()
      ]]}
    });
  } catch (error) {
    log.error('/kb falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro na busca KB: ${error.message}`);
  }
}

async function cmdKbList(msg) {
  const chatId = msg.chat.id;
  log.info('/kblist', { chatId });

  try {
    const kbDir = path.join(__dirname, '..', 'knowledge-base');
    const files = fs.readdirSync(kbDir).filter(f => f.endsWith('.md') && f !== 'README.md');

    if (files.length === 0) {
      await safeSend(chatId, '\u{1F4ED} Nenhum documento na Knowledge Base\\.', {
        reply_markup: { inline_keyboard: [[menuButton()]] }
      });
      return;
    }

    let text = `\u{1F4DA} *Knowledge Base \\(${files.length} docs\\)*\n`;

    files.forEach((f, i) => {
      const name = escapeMarkdown(f.replace('.md', ''));
      const fstats = fs.statSync(path.join(kbDir, f));
      const size = (fstats.size / 1024).toFixed(1);
      text += `\n${i + 1}\\. \`${name}\`\n   ${size}KB`;
    });

    await safeSend(chatId, text, {
      reply_markup: { inline_keyboard: [[menuButton()]] }
    });
  } catch (error) {
    log.error('/kblist falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${error.message}`);
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

    await safeSend(chatId, text, {
      reply_markup: { inline_keyboard: [[
        { text: '\u{1F4C3} Sessoes', callback_data: 'menu_sessions' },
        menuButton()
      ]]}
    });
  } catch (error) {
    log.error('/memory falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${error.message}`);
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

    await safeSend(chatId, text, {
      reply_markup: { inline_keyboard: [[
        { text: '\u{1F9E0} Sessao Ativa', callback_data: 'menu_memory' },
        menuButton()
      ]]}
    });
  } catch (error) {
    log.error('/sessions falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${error.message}`);
  }
}

async function cmdScheduler(msg) {
  const chatId = msg.chat.id;
  log.info('/scheduler', { chatId });

  const status = scheduler.getStatus();

  await safeSend(chatId, `\u{2699} *Controle do Scheduler*\n\nEstado atual: ${status.isRunning ? '\u{1F7E2} RODANDO' : '\u{1F534} PARADO'}`, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '\u{25B6} Iniciar', callback_data: 'scheduler_start' },
          { text: '\u{23F9} Parar', callback_data: 'scheduler_stop' }
        ],
        [menuButton()]
      ]
    }
  });
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

  await safeSend(chatId, text, {
    reply_markup: { inline_keyboard: [[menuButton()]] }
  });
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

    await safeSend(chatId, text, {
      reply_markup: { inline_keyboard: [[
        { text: '\u{2699} Scheduler', callback_data: 'menu_scheduler' },
        menuButton()
      ]]}
    });
  } catch (error) {
    log.error('/config falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${error.message}`);
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

  await safeSend(chatId, text, {
    reply_markup: { inline_keyboard: [[
      { text: '\u{1F4CB} Ver Tarefas', callback_data: 'list_tasks' },
      menuButton()
    ]]}
  });
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

    await bot.sendMessage(chatId, `\u{2705} *Tarefa criada\\!*\n\n\u{1F194} \`${escapeMarkdown(shortId(task.id))}\`\n\u{1F4DD} ${escapeMarkdown(name)}\n${cronExpression ? `\u{23F0} Cron: \`${escapeMarkdown(cronExpression)}\`` : '\u{1F4C5} Execucao unica'}`, {
      parse_mode: 'MarkdownV2',
      reply_markup: {
        inline_keyboard: [[
          { text: '\u{25B6} Executar Agora', callback_data: `run_${task.id}` },
          { text: '\u{1F4CB} Ver Tarefas', callback_data: 'list_tasks' }
        ]]
      }
    });
  } catch (error) {
    log.error('/create falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro ao criar tarefa: ${error.message}`);
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

    // Botoes de categorias (maximo 3 por linha)
    const keyboard = [];
    let row = [];
    for (const cat of catNames) {
      row.push({ text: `${cat} (${categories[cat]})`, callback_data: `pm_cat_${cat.substring(0, 40)}` });
      if (row.length >= 2) {
        keyboard.push(row);
        row = [];
      }
    }
    if (row.length > 0) keyboard.push(row);

    // Botao para ver todos + menu
    keyboard.push([
      { text: '\u{1F4CB} Ver Todos', callback_data: 'pm_all' },
      menuButton()
    ]);

    await safeSend(chatId, text, {
      reply_markup: { inline_keyboard: keyboard }
    });
  } catch (error) {
    log.error('/prompts falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${error.message}`);
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

    // Botoes de acao
    const keyboard = [
      [
        { text: '\u{25B6} Executar Prompt', callback_data: `pm_exec_${template.id}` },
        { text: '\u{1F4CB} Ver Completo', callback_data: `pm_full_${template.id}` }
      ],
      [
        { text: '\u{2B05} Voltar', callback_data: 'pm_all' },
        menuButton()
      ]
    ];

    await safeSend(chatId, text, {
      reply_markup: { inline_keyboard: keyboard }
    });
  } catch (error) {
    log.error('prompt detail falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${error.message}`);
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

  // Botoes para cada prompt (maximo 8)
  const keyboard = [];
  for (let i = 0; i < Math.min(show.length, 8); i++) {
    const t = show[i];
    keyboard.push([{
      text: `${t.icon || '\u{1F4DD}'} ${(t.name || 'Sem nome').substring(0, 30)}`,
      callback_data: `pm_detail_${t.id}`
    }]);
  }

  keyboard.push([
    { text: '\u{2B05} Categorias', callback_data: 'pm_categories' },
    { text: '\u{1F504} Atualizar', callback_data: 'pm_all' },
    menuButton()
  ]);

  await safeSend(chatId, text, {
    reply_markup: { inline_keyboard: keyboard }
  });
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
      await bot.sendMessage(chatId, `\u{274C} Falha: ${result.error || 'Erro desconhecido'}`);
    }
  } catch (error) {
    log.error('/execprompt falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${error.message}`);
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
      const sentMsg = await bot.sendMessage(chatId, `\u{1F4AC} Resposta do Claude\nSessao: ${shortId(execution.claudeSessionId)}\n\n${content}\n\n\u{1F4AC} Responda esta mensagem para continuar a conversa.`);

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
    await bot.sendMessage(chatId, `\u{274C} Erro ao continuar conversa: ${error.message}`);
    return true;
  }
}

// ============ CALLBACK QUERY HANDLER ============

async function handleCallbackQuery(query) {
  const chatId = query.message.chat.id;
  const data = query.data;
  const messageId = query.message.message_id;

  log.info('Callback query', { chatId, data });

  try {
    await bot.answerCallbackQuery(query.id);

    // ============ MENU PRINCIPAL ============
    if (data === 'main_menu') {
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      await cmdMenu({ chat: { id: chatId } });

    } else if (data === 'help_full') {
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      const fullHelp = `\u{1F4D6} *Todos os Comandos*

\u{1F4CA} *Sistema*
/status \\- Status do scheduler
/stats \\- Estatisticas de execucao
/ping \\- Verificar conexao
/uptime \\- Tempo ativo

\u{1F4CB} *Tarefas Bot \\(Claude\\)*
/tasks \\- Listar tarefas automatizadas
/task \\[id\\] \\- Detalhes de uma tarefa
/run \\[id\\] \\- Executar tarefa agora
/pause \\[id\\] \\- Pausar tarefa
/resume \\[id\\] \\- Retomar tarefa
/delete \\[id\\] \\- Remover tarefa
/newtask \\- Criar nova tarefa
/create Nome \\| Prompt \\- Criar e salvar tarefa

\u{2705} *Minhas Tarefas Pessoais*
/mytasks \\- Listar minhas tarefas
/addtask \\[alta\\|baixa\\] Titulo \\- Criar tarefa
/starttask \\[id\\] \\- Marcar como em progresso
/donetask \\[id\\] \\- Marcar como concluida
/deltask \\[id\\] \\- Deletar tarefa

\u{1F4B0} *Financeiro*
/fin \\[mes\\] \\[ano\\] \\- Resumo do mes
/income Valor Descricao \\[catID\\] \\- Registrar receita
/expense Valor Descricao \\[catID\\] \\- Registrar despesa
/balance \\- Saldo atual
/goals \\- Metas financeiras
/txs \\[mes\\] \\[ano\\] \\- Listar transacoes \\(com botao deletar\\)
/deltx \\[id\\] \\- Deletar transacao
/cats \\- Listar categorias com IDs
/addcat income\\|expense Nome \\- Criar categoria

\u{1F4DD} *Notas*
/notes \\- Listar notas
/note \\[id\\] \\- Ver nota completa
/addnote Titulo \\- Criar nota rapida
/pinnote \\[id\\] \\- Fixar\\/desafixar nota
/delnote \\[id\\] \\- Deletar nota

\u{1F4C3} *Historico de Execucoes*
/history \\- Ultimas 10 execucoes
/history \\[n\\] \\- Ultimas N execucoes

\u{1F4DA} *Knowledge Base*
/kb \\[busca\\] \\- Buscar na KB
/kblist \\- Listar documentos

\u{1F9E0} *Memoria*
/memory \\- Sessao ativa
/sessions \\- Listar sessoes

\u{1F4DD} *Prompt Manager*
/prompts \\- Ver prompts cadastrados
/execprompt \\[id\\] \\- Executar prompt

\u{2699} *Controle*
/scheduler \\- Iniciar\\/parar scheduler
/config \\- Ver configuracao
/menu \\- Menu principal

\u{1F465} *CRM*
/dashboard \\- KPIs e metricas
/pipeline \\- Pipeline visual
/leads \\[status\\] \\- Listar leads
/lead \\[ID\\] \\- Detalhe de lead
/newlead \\[nome\\] \\- Criar lead
/campaigns \\- Listar campanhas`;

      await safeSend(chatId, fullHelp, {
        reply_markup: { inline_keyboard: [[menuButton()]] }
      });

    // ============ MENU SHORTCUTS ============
    } else if (data === 'menu_stats') {
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      await cmdStats({ chat: { id: chatId } });

    } else if (data === 'menu_kb') {
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      await cmdKb({ chat: { id: chatId } }, null);

    } else if (data === 'menu_kblist') {
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      await cmdKbList({ chat: { id: chatId } });

    } else if (data === 'menu_memory') {
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      await cmdMemory({ chat: { id: chatId } });

    } else if (data === 'menu_sessions') {
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      await cmdSessions({ chat: { id: chatId } });

    } else if (data === 'menu_config') {
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      await cmdConfig({ chat: { id: chatId } });

    } else if (data === 'menu_scheduler') {
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      await cmdScheduler({ chat: { id: chatId } });

    } else if (data === 'menu_newtask') {
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      await cmdNewTask({ chat: { id: chatId } });

    } else if (data === 'menu_ping') {
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      await cmdPing({ chat: { id: chatId } });

    } else if (data === 'menu_uptime') {
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      await cmdUptime({ chat: { id: chatId } });

    } else if (data === 'menu_mytasks') {
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      await cmdMyTasks({ chat: { id: chatId } });

    } else if (data === 'menu_fin') {
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      await cmdFin({ chat: { id: chatId } }, null);

    } else if (data === 'menu_notes') {
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      await cmdNotes({ chat: { id: chatId } });

    } else if (data === 'menu_txs') {
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      await cmdTxs({ chat: { id: chatId } }, null);

    } else if (data === 'menu_cats') {
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      await cmdCats({ chat: { id: chatId } });

    } else if (data === 'menu_goals') {
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      await cmdGoals({ chat: { id: chatId } });

    } else if (data === 'menu_balance') {
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      await cmdBalance({ chat: { id: chatId } });

    } else if (data.startsWith('tx_del_')) {
      const txId = data.replace('tx_del_', '');
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      try {
        await crmFetch(`/finance/transactions/${txId}`, { method: 'DELETE' });
        await safeSend(chatId, `\u{1F5D1}\u{FE0F} Transacao deletada\\!`, {
          reply_markup: { inline_keyboard: [[menuButton()]] }
        });
      } catch (e) {
        await safeSend(chatId, `\u{274C} Erro ao deletar: ${escapeMarkdown(e.message)}`);
      }

    } else if (data.startsWith('task_done_')) {
      const taskId = data.replace('task_done_', '');
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      try {
        const r = await crmFetch(`/personal-tasks/${taskId}/status`, { method: 'PUT', body: { status: 'completed' } });
        const t = r.data?.data || r.data;
        await safeSend(chatId, `\u{2705} Tarefa concluida\\!\n\n*${escapeMarkdown(t?.title || 'Tarefa')}*`, {
          reply_markup: { inline_keyboard: [[menuButton()]] }
        });
      } catch (e) {
        await safeSend(chatId, `\u{274C} Erro: ${escapeMarkdown(e.message)}`);
      }

    } else if (data.startsWith('task_start_')) {
      const taskId = data.replace('task_start_', '');
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      try {
        const r = await crmFetch(`/personal-tasks/${taskId}/status`, { method: 'PUT', body: { status: 'in_progress' } });
        const t = r.data?.data || r.data;
        await safeSend(chatId, `\u{1F504} Tarefa em progresso\\!\n\n*${escapeMarkdown(t?.title || 'Tarefa')}*`, {
          reply_markup: { inline_keyboard: [[menuButton()]] }
        });
      } catch (e) {
        await safeSend(chatId, `\u{274C} Erro: ${escapeMarkdown(e.message)}`);
      }

    } else if (data.startsWith('task_del_')) {
      const taskId = data.replace('task_del_', '');
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      try {
        await crmFetch(`/personal-tasks/${taskId}`, { method: 'DELETE' });
        await safeSend(chatId, `\u{1F5D1}\u{FE0F} Tarefa deletada\\!`, {
          reply_markup: { inline_keyboard: [[menuButton()]] }
        });
      } catch (e) {
        await safeSend(chatId, `\u{274C} Erro: ${escapeMarkdown(e.message)}`);
      }

    } else if (data.startsWith('note_pin_')) {
      const noteId = data.replace('note_pin_', '');
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      try {
        await crmFetch(`/notes/${noteId}/pin`, { method: 'PUT' });
        await safeSend(chatId, `\u{1F4CC} Estado de pin alterado\\.`, {
          reply_markup: { inline_keyboard: [[{ text: '\u{1F4DD} Ver Notas', callback_data: 'menu_notes' }, menuButton()]] }
        });
      } catch (e) {
        await safeSend(chatId, `\u{274C} Erro: ${escapeMarkdown(e.message)}`);
      }

    } else if (data.startsWith('note_del_')) {
      const noteId = data.replace('note_del_', '');
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      try {
        await crmFetch(`/notes/${noteId}`, { method: 'DELETE' });
        await safeSend(chatId, `\u{1F5D1}\u{FE0F} Nota deletada\\.`, {
          reply_markup: { inline_keyboard: [[{ text: '\u{1F4DD} Ver Notas', callback_data: 'menu_notes' }, menuButton()]] }
        });
      } catch (e) {
        await safeSend(chatId, `\u{274C} Erro: ${escapeMarkdown(e.message)}`);
      }

    // ============ STATUS & TASKS ============
    } else if (data === 'refresh_status') {
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      await cmdStatus({ chat: { id: chatId } });

    } else if (data === 'list_tasks') {
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      await cmdTasks({ chat: { id: chatId } });

    } else if (data === 'list_history') {
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      await cmdHistory({ chat: { id: chatId } });

    } else if (data.startsWith('detail_')) {
      const taskId = data.replace('detail_', '');
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      await cmdTaskDetail({ chat: { id: chatId } }, taskId);

    } else if (data.startsWith('run_')) {
      const taskId = data.replace('run_', '');
      await cmdRun({ chat: { id: chatId } }, taskId);

    } else if (data.startsWith('pause_')) {
      const taskId = data.replace('pause_', '');
      await cmdPause({ chat: { id: chatId } }, taskId);

    } else if (data.startsWith('resume_')) {
      const taskId = data.replace('resume_', '');
      await cmdResume({ chat: { id: chatId } }, taskId);

    } else if (data.startsWith('confirmdelete_')) {
      const taskId = data.replace('confirmdelete_', '');
      const task = storage.getTask(taskId);
      await bot.editMessageText(
        `\u{26A0} Confirmar exclusao de *${escapeMarkdown(task?.name || 'tarefa')}*?`,
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'MarkdownV2',
          reply_markup: {
            inline_keyboard: [[
              { text: '\u{2705} Confirmar', callback_data: `dodelete_${taskId}` },
              { text: '\u{274C} Cancelar', callback_data: 'cancel_action' }
            ]]
          }
        }
      );

    } else if (data.startsWith('dodelete_')) {
      const taskId = data.replace('dodelete_', '');
      storage.deleteTask(taskId);
      scheduler.removeCronJob(taskId);
      await bot.editMessageText('\u{2705} Tarefa deletada com sucesso\\.', {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'MarkdownV2'
      });

    } else if (data === 'cancel_action') {
      await bot.editMessageText('\u{274C} Acao cancelada\\.', {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'MarkdownV2'
      });

    } else if (data === 'scheduler_start') {
      scheduler.start();
      await bot.sendMessage(chatId, '\u{25B6} Scheduler iniciado\\!', { parse_mode: 'MarkdownV2' });

    } else if (data === 'scheduler_stop') {
      scheduler.stop();
      await bot.sendMessage(chatId, '\u{23F9} Scheduler parado\\!', { parse_mode: 'MarkdownV2' });

    // ============ PROMPT MANAGER CALLBACKS ============

    } else if (data === 'pm_categories' || data === 'pm_back_cats') {
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      await cmdPrompts({ chat: { id: chatId } });

    } else if (data === 'pm_all') {
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      const templates = readPromptTemplates();
      await sendPromptList(chatId, templates, `Todos os Prompts (${templates.length})`);

    } else if (data.startsWith('pm_cat_')) {
      const category = data.replace('pm_cat_', '');
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      const templates = readPromptTemplates().filter(t => (t.category || 'Sem Categoria') === category);
      await sendPromptList(chatId, templates, `Prompts: ${category}`);

    } else if (data.startsWith('pm_detail_')) {
      const templateId = data.replace('pm_detail_', '');
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      await cmdPromptDetail(chatId, templateId);

    } else if (data.startsWith('pm_full_')) {
      // Enviar prompt completo sem truncar
      const templateId = data.replace('pm_full_', '');
      const templates = readPromptTemplates();
      const template = templates.find(t => t.id === templateId);
      if (template && template.promptText) {
        const fullText = `\u{1F4DD} ${template.name}\n\n${template.promptText}`;
        await sendLongMessage(chatId, fullText);
      } else {
        await bot.sendMessage(chatId, '\u{274C} Prompt nao encontrado.');
      }

    // ============ CRM CALLBACKS ============
    } else if (data.startsWith('crm_')) {
      const handled = await handleCrmCallback(chatId, data, messageId);
      if (!handled) {
        await bot.sendMessage(chatId, `\u{274C} Acao CRM desconhecida: ${data}`);
      }

    } else if (data.startsWith('pm_exec_')) {
      // Criar tarefa a partir do prompt template e executar
      const templateId = data.replace('pm_exec_', '');
      const templates = readPromptTemplates();
      const template = templates.find(t => t.id === templateId);

      if (!template) {
        await bot.sendMessage(chatId, '\u{274C} Prompt nao encontrado.');
        return;
      }

      // Verificar se o prompt tem variaveis obrigatorias
      const requiredVars = (template.variables || []).filter(v => v.required);
      if (requiredVars.length > 0) {
        let varText = `\u{1F3AF} *${escapeMarkdown(template.name)}*\n\n`;
        varText += `Este prompt precisa de variaveis\\. Envie no formato:\n\n`;
        varText += `\`/execprompt ${escapeMarkdown(shortId(templateId))} `;
        varText += requiredVars.map(v => `${escapeMarkdown(v.name)}=valor`).join(' ');
        varText += `\`\n\n*Variaveis:*\n`;
        for (const v of requiredVars) {
          varText += `  \\- \`${escapeMarkdown(v.name)}\`: ${escapeMarkdown(v.label || v.name)}${v.placeholder ? ` \\(Ex: ${escapeMarkdown(v.placeholder)}\\)` : ''}\n`;
        }
        await bot.sendMessage(chatId, varText, { parse_mode: 'MarkdownV2' });
      } else {
        // Executar diretamente (sem variaveis)
        const task = {
          id: uuidv4(),
          name: `Prompt: ${template.name}`,
          type: 'claude_prompt',
          prompt: template.promptText,
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
          await bot.sendMessage(chatId, `\u{274C} Falha: ${escapeMarkdown(result.error || 'Erro desconhecido')}`, { parse_mode: 'MarkdownV2' });
        }
      }

    }
  } catch (error) {
    log.error('Callback query falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${error.message}`).catch(() => {});
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

  for (const chatId of users) {
    try {
      await bot.sendMessage(chatId, text, { parse_mode: 'MarkdownV2', ...options });
    } catch (error) {
      // Fallback: se MarkdownV2 falhar, tentar sem formatacao
      try {
        log.warn('sendNotification fallback sem parse_mode', { chatId });
        const fallbackOpts = { ...options };
        delete fallbackOpts.parse_mode;
        await bot.sendMessage(chatId, text, fallbackOpts);
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

    // Pular notificacao Telegram se esta execucao foi iniciada via Telegram
    // (cmdRun/cmdExecPrompt ja enviam a resposta inline)
    if (data?.taskId && telegramInitiatedTasks.has(data.taskId)) {
      telegramInitiatedTasks.delete(data.taskId);
      return;
    }

    // Enviar notificacao Telegram
    const config = getTelegramConfig();
    const notifConfig = config.notifications || {};

    if (event === 'execution:completed' && notifConfig.onTaskSuccess) {
      // Enviar notificacao consolidada com output (async, fire-and-forget)
      sendConsolidatedNotification(data).catch(() => {});
      return; // Ja enviamos diretamente, nao usar sendNotification generico
    }

    if (event === 'execution:failed' && notifConfig.onTaskFailure) {
      let text;
      if (data.isRateLimit || /RATE_LIMIT:|you[\u2019']?ve hit your limit/i.test(data.error || '')) {
        // Rate limit: mensagem amigável com horário de reset
        const resetInfo = data.resetInfo || (data.error || '').match(/resets?\s+([^\n\r·•]+)/i)?.[1]?.trim();
        const resetStr = resetInfo ? `Resets ${escapeMarkdown(resetInfo)}` : 'Tente novamente mais tarde';
        text = `\u{23F3} *Limite de uso atingido*\n\n*${escapeMarkdown(data.taskName)}*\n\u{1F552} ${resetStr}`;
      } else {
        text = `\u{274C} *Tarefa falhou*\n\n*${escapeMarkdown(data.taskName)}*\n\u{1F6A8} ${escapeMarkdown(data.error || 'Erro desconhecido')}`;
      }
      sendNotification(text).catch(() => {});
    }
  };

  log.info('Notification hooks configurados');
}

// ============ BOT LIFECYCLE ============

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

    // Callback queries (botoes inline)
    bot.on('callback_query', (query) => {
      if (!isAuthorized(query.message.chat.id)) {
        bot.answerCallbackQuery(query.id, { text: 'Nao autorizado' });
        return;
      }
      handleCallbackQuery(query);
    });

    // Handler para mensagens sem comando - sessao de conversa via reply
    bot.on('message', (msg) => {
      // Ignorar comandos (ja tratados pelos onText handlers)
      if (msg.text && msg.text.startsWith('/')) return;
      // Ignorar se nao autorizado
      if (!isAuthorized(msg.chat.id)) return;
      // Tentar processar como reply de sessao
      handleSessionReply(msg).then(handled => {
        if (!handled && msg.text) {
          // Mensagem sem sessao ativa - mostrar dica e menu
          safeSend(msg.chat.id, `\u{1F4AC} Nenhuma sessao ativa encontrada\\.\n\n_Execute uma tarefa primeiro ou use o menu:_`, {
            reply_markup: {
              inline_keyboard: [[
                { text: '\u{1F3E0} Menu', callback_data: 'main_menu' },
                { text: '\u{1F4DD} Prompts', callback_data: 'pm_categories' },
                { text: '\u{2795} Nova Tarefa', callback_data: 'menu_newtask' }
              ]]
            }
          }).catch(() => {});
        }
      }).catch(err => {
        log.error('Erro no handler de session reply', err);
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

    // Registrar comandos no BotFather (menu) - ordenados por importancia
    bot.setMyCommands([
      { command: 'menu', description: 'Menu principal com botoes' },
      { command: 'status', description: 'Status do sistema' },
      { command: 'tasks', description: 'Listar tarefas agendadas' },
      { command: 'prompts', description: 'Prompt Manager' },
      { command: 'newtask', description: 'Criar tarefa agendada' },
      { command: 'history', description: 'Historico de execucoes' },
      { command: 'kb', description: 'Buscar Knowledge Base' },
      { command: 'stats', description: 'Estatisticas' },
      { command: 'help', description: 'Todos os comandos' },
      { command: 'ping', description: 'Testar conexao' },
      { command: 'dashboard', description: 'CRM: KPIs e metricas' },
      { command: 'pipeline', description: 'CRM: Pipeline visual' },
      { command: 'leads', description: 'CRM: Listar leads' },
      { command: 'lead', description: 'CRM: Detalhe de um lead' },
      { command: 'newlead', description: 'CRM: Criar novo lead' },
      { command: 'campaigns', description: 'CRM: Listar campanhas' },
      { command: 'campaign', description: 'CRM: Detalhe de campanha' },
      { command: 'mytasks', description: 'Minhas tarefas pessoais' },
      { command: 'addtask', description: 'Criar tarefa pessoal' },
      { command: 'donetask', description: 'Concluir tarefa pessoal' },
      { command: 'fin', description: 'Resumo financeiro do mes' },
      { command: 'income', description: 'Registrar receita' },
      { command: 'expense', description: 'Registrar despesa' },
      { command: 'balance', description: 'Saldo atual' },
      { command: 'goals', description: 'Metas financeiras' },
      { command: 'notes', description: 'Listar notas' },
      { command: 'addnote', description: 'Criar nota rapida' },
      { command: 'pinnote', description: 'Fixar/desafixar nota' },
    ]).catch(e => log.warn('Falha ao registrar comandos', { error: e.message }));

    // Setup notification hooks
    setupNotificationHooks();

    isRunning = true;
    startTime = Date.now();

    log.info('Telegram Bot iniciado com sucesso');

    // Notificar usuarios que o bot esta online com menu rapido
    setTimeout(() => {
      const config2 = getTelegramConfig();
      const users2 = config2.authorizedUsers || [];
      for (const uid of users2) {
        safeSend(uid, '\u{1F7E2} *Bot Online\\!*\n\nClaude Code Ecosystem esta ativo e pronto\\.', {
          reply_markup: {
            inline_keyboard: [[
              { text: '\u{1F3E0} Menu', callback_data: 'main_menu' },
              { text: '\u{1F4CA} Status', callback_data: 'refresh_status' }
            ]]
          }
        }).catch(() => {});
      }
    }, 2000);

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
    await bot.sendMessage(chatId, `\u{274C} Erro interno: ${error.message}`).catch(() => {});
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
      await safeSend(chatId, `\u{274C} Erro ao buscar leads: ${escapeMarkdown(String(resp.status))}`, {
        reply_markup: { inline_keyboard: [[menuButton()]] }
      });
      return;
    }

    const leads = resp.data?.data || resp.data?.leads || (Array.isArray(resp.data) ? resp.data : []);
    const total = resp.data?.pagination?.total ?? resp.data?.total ?? leads.length;

    if (leads.length === 0) {
      const filterDesc = args ? ` para filtro _${escapeMarkdown(args)}_` : '';
      await safeSend(chatId, `\u{1F4ED} Nenhum lead encontrado${filterDesc}\\.`, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '\u{2795} Novo Lead', callback_data: 'crm_newlead_prompt' },
              { text: '\u{1F4CA} Dashboard', callback_data: 'crm_dashboard' }
            ],
            [menuButton()]
          ]
        }
      });
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
      { text: `${CRM_STATUS_EMOJI.new} Novos`, callback_data: 'crm_leads_new' },
      { text: `${CRM_STATUS_EMOJI.interested} Interessados`, callback_data: 'crm_leads_interested' },
      { text: `${CRM_STATUS_EMOJI.negotiating} Negociando`, callback_data: 'crm_leads_negotiating' }
    ];
    const filterRow2 = [
      { text: `${CRM_TEMP_EMOJI.hot} Quentes`, callback_data: 'crm_leads_hot' },
      { text: `${CRM_TEMP_EMOJI.cold} Frios`, callback_data: 'crm_leads_cold' },
      { text: '\u{1F504} Todos', callback_data: 'crm_leads_all' }
    ];

    // Botoes de lead clicavel para os primeiros 5
    const leadButtons = show.slice(0, 5).map(l => ([{
      text: `${CRM_STATUS_EMOJI[l.status] || '\u{26AA}'} ${(l.name || 'Sem nome').substring(0, 25)}`,
      callback_data: `crm_lead_${l.id}`
    }]));

    const keyboard = {
      inline_keyboard: [
        filterRow1,
        filterRow2,
        ...leadButtons,
        [
          { text: '\u{2795} Novo Lead', callback_data: 'crm_newlead_prompt' },
          { text: '\u{1F4CA} Dashboard', callback_data: 'crm_dashboard' },
          menuButton()
        ]
      ]
    };

    await safeSend(chatId, text, { reply_markup: keyboard });

  } catch (error) {
    log.error('/leads falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro ao acessar CRM: ${error.message}`);
  }
}

/**
 * /lead <ID ou nome> - Detalhe de um lead
 */
async function cmdLeadDetail(msg, query) {
  const chatId = msg.chat.id;
  log.info('/lead', { chatId, query });

  if (!query) {
    await safeSend(chatId, '\u{1F465} *Detalhe de Lead*\n\nUse: `/lead <ID ou nome>`\n\nExemplo: `/lead 42` ou `/lead Joao Silva`', {
      reply_markup: { inline_keyboard: [
        [{ text: '\u{1F465} Ver Todos', callback_data: 'crm_leads_all' }],
        [menuButton()]
      ]}
    });
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
      await safeSend(chatId, `\u{274C} Lead nao encontrado: \`${escapeMarkdown(query)}\``, {
        reply_markup: { inline_keyboard: [
          [{ text: '\u{1F465} Ver Todos', callback_data: 'crm_leads_all' }],
          [menuButton()]
        ]}
      });
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

    const keyboard = {
      inline_keyboard: [
        [
          { text: '\u{1F4AC} Historico Msgs', callback_data: `crm_msgs_${lead.id}` },
          { text: '\u{1F4CB} Notas', callback_data: `crm_notes_${lead.id}` }
        ],
        [
          { text: '\u{2B05} Todos os Leads', callback_data: 'crm_leads_all' },
          { text: '\u{1F504} Atualizar', callback_data: `crm_lead_${lead.id}` },
          menuButton()
        ]
      ]
    };

    await safeSend(chatId, text, { reply_markup: keyboard });

  } catch (error) {
    log.error('/lead falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${error.message}`);
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
      '`/newlead Joao Silva | empresa=Acme`',
      { reply_markup: { inline_keyboard: [[menuButton()]] } }
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
      await safeSend(chatId, `\u{274C} Erro ao criar lead: ${escapeMarkdown(errMsg)}`, {
        reply_markup: { inline_keyboard: [[menuButton()]] }
      });
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

    const keyboard = {
      inline_keyboard: [
        [
          { text: '\u{1F465} Ver Lead', callback_data: `crm_lead_${leadId}` },
          { text: '\u{1F465} Todos os Leads', callback_data: 'crm_leads_all' }
        ],
        [menuButton()]
      ]
    };

    await safeSend(chatId, text, { reply_markup: keyboard });

  } catch (error) {
    log.error('/newlead falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro ao criar lead: ${error.message}`);
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
      await safeSend(chatId, `\u{274C} Erro ao buscar campanhas: ${escapeMarkdown(String(resp.status))}`, {
        reply_markup: { inline_keyboard: [[menuButton()]] }
      });
      return;
    }

    const campaigns = resp.data?.data || resp.data?.campaigns || (Array.isArray(resp.data) ? resp.data : []);

    if (campaigns.length === 0) {
      await safeSend(chatId, '\u{1F4ED} Nenhuma campanha cadastrada\\.', {
        reply_markup: { inline_keyboard: [[menuButton()]] }
      });
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
      callback_data: `crm_campaign_${c.id}`
    }]));

    campButtons.push([
      { text: '\u{1F504} Atualizar', callback_data: 'crm_campaigns' },
      { text: '\u{1F4CA} Dashboard', callback_data: 'crm_dashboard' },
      menuButton()
    ]);

    await safeSend(chatId, text, { reply_markup: { inline_keyboard: campButtons } });

  } catch (error) {
    log.error('/campaigns falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${error.message}`);
  }
}

/**
 * /campaign <ID> - Detalhe de uma campanha
 */
async function cmdCampaignDetail(msg, campId) {
  const chatId = msg.chat.id;
  log.info('/campaign', { chatId, campId });

  if (!campId) {
    await safeSend(chatId, '\u{1F4E3} *Detalhe de Campanha*\n\nUse: `/campaign <ID>`', {
      reply_markup: { inline_keyboard: [
        [{ text: '\u{1F4E3} Ver Campanhas', callback_data: 'crm_campaigns' }],
        [menuButton()]
      ]}
    });
    return;
  }

  try {
    const resp = await crmFetch(`/campaigns/${campId}`);

    if (resp.status !== 200) {
      await safeSend(chatId, `\u{274C} Campanha nao encontrada: \`${escapeMarkdown(String(campId))}\``, {
        reply_markup: { inline_keyboard: [
          [{ text: '\u{1F4E3} Ver Campanhas', callback_data: 'crm_campaigns' }],
          [menuButton()]
        ]}
      });
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
      actionRow.push({ text: '\u{23F8} Pausar', callback_data: `crm_camp_pause_${c.id}` });
    } else if (c.status === 'paused' || c.status === 'draft') {
      actionRow.push({ text: '\u{25B6} Iniciar', callback_data: `crm_camp_start_${c.id}` });
    }
    actionRow.push({ text: '\u{1F504} Atualizar', callback_data: `crm_campaign_${c.id}` });

    const keyboard = {
      inline_keyboard: [
        actionRow,
        [
          { text: '\u{2B05} Campanhas', callback_data: 'crm_campaigns' },
          menuButton()
        ]
      ]
    };

    await safeSend(chatId, text, { reply_markup: keyboard });

  } catch (error) {
    log.error('/campaign falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${error.message}`);
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
      await safeSend(chatId, `\u{274C} Erro ao obter dashboard: ${escapeMarkdown(String(resp.status))}`, {
        reply_markup: { inline_keyboard: [[menuButton()]] }
      });
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

    const keyboard = {
      inline_keyboard: [
        [
          { text: '\u{1F504} Atualizar', callback_data: 'crm_dashboard' },
          { text: '\u{1F4CA} Pipeline', callback_data: 'crm_pipeline' }
        ],
        [
          { text: '\u{1F465} Leads', callback_data: 'crm_leads_all' },
          { text: '\u{1F4E3} Campanhas', callback_data: 'crm_campaigns' },
          menuButton()
        ]
      ]
    };

    await safeSend(chatId, text, { reply_markup: keyboard });

  } catch (error) {
    log.error('/dashboard falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro ao acessar CRM: ${error.message}`);
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
      await safeSend(chatId, `\u{274C} Erro ao obter pipeline: ${escapeMarkdown(String(resp.status))}`, {
        reply_markup: { inline_keyboard: [[menuButton()]] }
      });
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

    const keyboard = {
      inline_keyboard: [
        [
          { text: '\u{1F504} Atualizar', callback_data: 'crm_pipeline' },
          { text: '\u{1F4CA} Dashboard', callback_data: 'crm_dashboard' }
        ],
        [
          { text: `${CRM_STATUS_EMOJI.new} Novos`, callback_data: 'crm_leads_new' },
          { text: `${CRM_STATUS_EMOJI.interested} Interessados`, callback_data: 'crm_leads_interested' },
          { text: `${CRM_STATUS_EMOJI.won} Ganhos`, callback_data: 'crm_leads_won' }
        ],
        [menuButton()]
      ]
    };

    await safeSend(chatId, text, { reply_markup: keyboard });

  } catch (error) {
    log.error('/pipeline falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro ao acessar CRM: ${error.message}`);
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
      await safeSend(chatId, `\u{1F4CB} *Minhas Tarefas*\n\nNenhuma tarefa encontrada\\.\n\nUse /addtask para criar\\!`, {
        reply_markup: { inline_keyboard: [[menuButton()]] }
      });
      return;
    }
    const statusEmoji = { pending: '\u{23F3}', in_progress: '\u{1F504}', completed: '\u{2705}', cancelled: '\u{274C}' };
    const priorityEmoji = { high: '\u{1F534}', medium: '\u{1F7E1}', low: '\u{1F7E2}' };
    const pendingTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
    const doneTasks = tasks.filter(t => t.status === 'completed');

    let text = `\u{1F4CB} *Minhas Tarefas* \\(${tasks.length}\\)\n`;
    text += `\u{23F3} Pendentes: ${pendingTasks.length} | \u{2705} Concluidas: ${doneTasks.length}\n\n`;

    const buttons = [];
    for (const t of tasks.slice(0, 10)) {
      const se = statusEmoji[t.status] || '\u{26AA}';
      const pe = priorityEmoji[t.priority] || '\u{26AA}';
      const title = escapeMarkdown(t.title || 'Sem titulo');
      const due = t.dueDate ? ` \u{1F4C5}${escapeMarkdown(new Date(t.dueDate).toLocaleDateString('pt-BR'))}` : '';
      text += `${se}${pe} *${title}*${due}\n\`${escapeMarkdown(t.id?.slice(0, 8) || '?')}\`\n\n`;
      if (t.status !== 'completed' && t.status !== 'cancelled') {
        const row = [];
        if (t.status === 'pending') row.push({ text: `▶ Iniciar`, callback_data: `task_start_${t.id}` });
        row.push({ text: `✅ Concluir`, callback_data: `task_done_${t.id}` });
        row.push({ text: `🗑 Deletar`, callback_data: `task_del_${t.id}` });
        buttons.push(row);
      }
    }
    buttons.push([menuButton()]);
    await safeSend(chatId, text, { reply_markup: { inline_keyboard: buttons } });
  } catch (error) {
    log.error('/mytasks falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${error.message}`);
  }
}

/**
 * /addtask <titulo> - Criar tarefa pessoal rápida
 */
async function cmdAddTask(msg, args) {
  const chatId = msg.chat.id;
  log.info('/addtask', { chatId, args });
  if (!args) {
    await safeSend(chatId, `\u{2139}\u{FE0F} Uso:\n\`/addtask Titulo da tarefa\`\n\`/addtask alta Reuniao importante\`\n\`/addtask baixa Ler livro\``);
    return;
  }
  const parts = args.trim().split(/\s+/);
  let priority = 'medium';
  let titulo = args.trim();
  if (['alta', 'high'].includes(parts[0].toLowerCase())) { priority = 'high'; titulo = parts.slice(1).join(' '); }
  else if (['baixa', 'low'].includes(parts[0].toLowerCase())) { priority = 'low'; titulo = parts.slice(1).join(' '); }
  else if (['media', 'medium'].includes(parts[0].toLowerCase())) { priority = 'medium'; titulo = parts.slice(1).join(' '); }
  if (!titulo) { await safeSend(chatId, `\u{274C} Informe o titulo da tarefa\\.`); return; }
  const priorityEmoji = { high: '\u{1F534}', medium: '\u{1F7E1}', low: '\u{1F7E2}' };
  try {
    const resp = await crmFetch('/personal-tasks', {
      method: 'POST',
      body: { title: titulo, status: 'pending', priority }
    });
    if (resp.status === 201 || resp.status === 200) {
      const task = resp.data?.data || resp.data;
      await safeSend(chatId, `\u{2705} Tarefa criada\\!\n\n${priorityEmoji[priority]} *${escapeMarkdown(titulo)}*\n\u{23F3} Status: Pendente\n\`ID: ${escapeMarkdown(task?.id?.slice(0, 8) || '?')}\``, {
        reply_markup: { inline_keyboard: [[menuButton()]] }
      });
    } else {
      await safeSend(chatId, `\u{274C} Erro ao criar: ${escapeMarkdown(String(resp.status))}`);
    }
  } catch (error) {
    log.error('/addtask falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${error.message}`);
  }
}

/**
 * /donetask <id> - Marcar tarefa como concluída
 */
async function cmdDoneTask(msg, idPrefix) {
  const chatId = msg.chat.id;
  log.info('/donetask', { chatId, idPrefix });

  if (!idPrefix) {
    await safeSend(chatId, `\u{2139}\u{FE0F} Uso: \`/donetask <id>\``);
    return;
  }

  try {
    // Buscar tarefas para encontrar pelo prefixo do ID
    const listResp = await crmFetch('/personal-tasks');
    const tasks = listResp.data?.data || listResp.data || [];
    const task = tasks.find(t => t.id?.startsWith(idPrefix));

    if (!task) {
      await safeSend(chatId, `\u{274C} Tarefa nao encontrada com ID \`${escapeMarkdown(idPrefix)}\``);
      return;
    }

    const resp = await crmFetch(`/personal-tasks/${task.id}/status`, {
      method: 'PUT',
      body: { status: 'completed' }
    });

    if (resp.status === 200) {
      await safeSend(chatId, `\u{2705} Tarefa concluida\\!\n\n*${escapeMarkdown(task.title)}*`, {
        reply_markup: { inline_keyboard: [[menuButton()]] }
      });
    } else {
      await safeSend(chatId, `\u{274C} Erro: ${escapeMarkdown(String(resp.status))}`);
    }
  } catch (error) {
    log.error('/donetask falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${error.message}`);
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
    await safeSend(chatId, `\u{1F5D1}\u{FE0F} Tarefa deletada: *${escapeMarkdown(task.title)}*`, {
      reply_markup: { inline_keyboard: [[menuButton()]] }
    });
  } catch (error) {
    log.error('/deltask falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${error.message}`);
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
    await safeSend(chatId, `\u{1F504} Tarefa em progresso\\!\n\n*${escapeMarkdown(task.title)}*`, {
      reply_markup: { inline_keyboard: [[menuButton()]] }
    });
  } catch (error) {
    log.error('/starttask falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${error.message}`);
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

    const finButtons = [
      [
        { text: '📋 Transações', callback_data: 'menu_txs' },
        { text: '🏷️ Categorias', callback_data: 'menu_cats' }
      ],
      [
        { text: '🎯 Metas', callback_data: 'menu_goals' },
        { text: '💰 Balanço', callback_data: 'menu_balance' }
      ],
      [menuButton()]
    ];

    await safeSend(chatId, text, { reply_markup: { inline_keyboard: finButtons } });
  } catch (error) {
    log.error('/fin falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${error.message}`);
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
      await safeSend(chatId, `\u{2705} Receita registrada\\!\n\n\u{1F7E2} \\+R$ ${escapeMarkdown(amount.toFixed(2))}\n\u{1F4DD} ${escapeMarkdown(description)}${catLine}`, {
        reply_markup: { inline_keyboard: [[{ text: '📊 Ver Financeiro', callback_data: 'menu_fin' }, menuButton()]] }
      });
    } else {
      const errMsg = resp.data?.message || resp.data?.error || String(resp.status);
      await safeSend(chatId, `\u{274C} Erro: ${escapeMarkdown(errMsg)}`);
    }
  } catch (error) {
    log.error('/income falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${error.message}`);
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
      await safeSend(chatId, `\u{2705} Despesa registrada\\!\n\n\u{1F534} R$ ${escapeMarkdown(amount.toFixed(2))}\n\u{1F4DD} ${escapeMarkdown(description)}${catLine}`, {
        reply_markup: { inline_keyboard: [[{ text: '📊 Ver Financeiro', callback_data: 'menu_fin' }, menuButton()]] }
      });
    } else {
      const errMsg = resp.data?.message || resp.data?.error || String(resp.status);
      await safeSend(chatId, `\u{274C} Erro: ${escapeMarkdown(errMsg)}`);
    }
  } catch (error) {
    log.error('/expense falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${error.message}`);
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
    await safeSend(chatId, text, {
      reply_markup: { inline_keyboard: [[menuButton()]] }
    });
  } catch (error) {
    log.error('/balance falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${error.message}`);
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
      await safeSend(chatId, `\u{1F3AF} *Metas*\n\nNenhuma meta encontrada\\.`, {
        reply_markup: { inline_keyboard: [[menuButton()]] }
      });
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
    await safeSend(chatId, text, { reply_markup: { inline_keyboard: [[menuButton()]] } });
  } catch (error) {
    log.error('/goals falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${error.message}`);
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
      await safeSend(chatId, `\u{1F4DD} *Notas*\n\nNenhuma nota encontrada\\.\n\nUse /addnote para criar\\!`, {
        reply_markup: { inline_keyboard: [[menuButton()]] }
      });
      return;
    }
    let text = `\u{1F4DD} *Notas* \\(${notes.length}\\)\n\n`;
    const buttons = [];
    for (const n of notes.slice(0, 8)) {
      const pin = n.pinned ? '\u{1F4CC} ' : '';
      const title = escapeMarkdown(n.title || 'Sem titulo');
      const preview = n.content ? escapeMarkdown(n.content.substring(0, 50)) : '';
      text += `${pin}*${title}*\n`;
      if (preview) text += `${preview}${n.content?.length > 50 ? '\\.\\.\\.' : ''}\n`;
      text += `\`${escapeMarkdown(n.id?.slice(0, 8) || '?')}\`\n\n`;
      const pinLabel = n.pinned ? '📌 Desafixar' : '📌 Fixar';
      buttons.push([
        { text: pinLabel, callback_data: `note_pin_${n.id}` },
        { text: '🗑 Deletar', callback_data: `note_del_${n.id}` }
      ]);
    }
    buttons.push([menuButton()]);
    await safeSend(chatId, text, { reply_markup: { inline_keyboard: buttons } });
  } catch (error) {
    log.error('/notes falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${error.message}`);
  }
}

/**
 * /note <id> - Ver conteúdo completo de uma nota
 */
async function cmdNoteDetail(msg, idPrefix) {
  const chatId = msg.chat.id;
  if (!idPrefix) {
    await safeSend(chatId, `\u{2139}\u{FE0F} Uso: \`/note <id>\``);
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
    const pin = note.pinned ? '\u{1F4CC} Fixada' : '';
    let text = `\u{1F4DD} *${escapeMarkdown(note.title)}*\n`;
    if (pin) text += `${pin}\n`;
    text += `\n${escapeMarkdown(note.content || 'Sem conteudo')}`;
    text += `\n\n\u{1F4C5} ${escapeMarkdown(new Date(note.createdAt).toLocaleDateString('pt-BR'))}`;
    await safeSend(chatId, text, { reply_markup: { inline_keyboard: [[menuButton()]] } });
  } catch (error) {
    log.error('/note falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${error.message}`);
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
      await safeSend(chatId, `\u{2705} Nota criada\\!\n\n\u{1F4DD} *${escapeMarkdown(title)}*`, {
        reply_markup: { inline_keyboard: [[menuButton()]] }
      });
    } else {
      await safeSend(chatId, `\u{274C} Erro: ${escapeMarkdown(String(resp.status))}`);
    }
  } catch (error) {
    log.error('/addnote falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${error.message}`);
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
    await safeSend(chatId, `${newState ? '\u{1F4CC}' : '\u{2705}'} Nota ${newState ? 'fixada' : 'desafixada'}: *${escapeMarkdown(note.title)}*`, {
      reply_markup: { inline_keyboard: [[menuButton()]] }
    });
  } catch (error) {
    log.error('/pinnote falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${error.message}`);
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
    await safeSend(chatId, `\u{1F5D1}\u{FE0F} Nota deletada: *${escapeMarkdown(note.title)}*`, {
      reply_markup: { inline_keyboard: [[menuButton()]] }
    });
  } catch (error) {
    log.error('/delnote falhou', error);
    await bot.sendMessage(chatId, `\u{274C} Erro: ${error.message}`);
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
      await safeSend(chatId, '\u{1F4B3} *Transacoes ' + month + '/' + year + '*\n\nNenhuma transacao encontrada\\.', {
        reply_markup: { inline_keyboard: [[menuButton()]] }
      });
      return;
    }
    const MONTHS = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    let text = '\u{1F4B3} *Transacoes ' + escapeMarkdown(MONTHS[month]) + '/' + year + '* \\(' + txs.length + '\\)\n\n';
    const buttons = [];
    for (const tx of txs.slice(0, 10)) {
      const cat = catMap[tx.categoryId];
      const isIncome = cat?.type === 'income';
      const emoji = isIncome ? '\u{1F7E2}' : '\u{1F534}';
      const sign = isIncome ? '+' : '-';
      const amount = Math.abs(Number(tx.amount));
      const desc = escapeMarkdown(tx.description || 'Sem descricao');
      const catName = cat ? ' \\(' + escapeMarkdown(cat.name) + '\\)' : '';
      const paid = tx.paid ? '' : ' \u{23F3}';
      text += emoji + ' ' + sign + 'R$ ' + escapeMarkdown(amount.toFixed(2)) + ' ' + desc + catName + paid + '\n';
      text += '\u0060ID: ' + escapeMarkdown(tx.id?.slice(0, 8) || '?') + '\u0060\n\n';
      buttons.push([{ text: '\u{1F5D1} ' + sign + 'R$' + amount.toFixed(2) + ' ' + (tx.description || '').slice(0, 20), callback_data: 'tx_del_' + tx.id }]);
    }
    buttons.push([menuButton()]);
    await safeSend(chatId, text, { reply_markup: { inline_keyboard: buttons } });
  } catch (error) {
    log.error('/txs falhou', error);
    await bot.sendMessage(chatId, '\u{274C} Erro: ' + error.message);
  }
}

/**
 * /deltx <id> - Deletar transacao por prefixo de ID
 */
async function cmdDelTx(msg, idPrefix) {
  const chatId = msg.chat.id;
  if (!idPrefix) {
    await safeSend(chatId, '\u{2139}\u{FE0F} Uso: \u0060/deltx <id>\u0060\nUse /txs para ver os IDs\\.');
    return;
  }
  try {
    const listResp = await crmFetch('/finance/transactions?limit=50');
    const txs = listResp.data?.data || listResp.data || [];
    const tx = txs.find(t => t.id?.startsWith(idPrefix));
    if (!tx) {
      await safeSend(chatId, '\u{274C} Transacao nao encontrada com ID \u0060' + escapeMarkdown(idPrefix) + '\u0060');
      return;
    }
    await crmFetch('/finance/transactions/' + tx.id, { method: 'DELETE' });
    const amount = Math.abs(Number(tx.amount));
    await safeSend(chatId, '\u{1F5D1}\u{FE0F} Transacao deletada\\!\n\n*' + escapeMarkdown(tx.description || 'Sem descricao') + '* \\- R$ ' + escapeMarkdown(amount.toFixed(2)), {
      reply_markup: { inline_keyboard: [[menuButton()]] }
    });
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
      await safeSend(chatId, '\u{1F3F7}\u{FE0F} *Categorias*\n\nNenhuma categoria encontrada\\.\n\nUse \u0060/addcat income Nome\u0060 ou \u0060/addcat expense Nome\u0060', {
        reply_markup: { inline_keyboard: [[menuButton()]] }
      });
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
    await safeSend(chatId, text, { reply_markup: { inline_keyboard: [[menuButton()]] } });
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
      await safeSend(chatId, '\u{2705} Categoria criada\\!\n\n' + emoji + ' *' + escapeMarkdown(name) + '* \\(' + escapeMarkdown(type === 'income' ? 'Receita' : 'Despesa') + '\\)\n\u0060ID: ' + escapeMarkdown(cat?.id?.slice(0, 8) || '?') + '\u0060', {
        reply_markup: { inline_keyboard: [[menuButton()]] }
      });
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
      await bot.sendMessage(chatId, `\u{274C} Erro: ${e.message}`);
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
      await bot.sendMessage(chatId, `\u{274C} Erro: ${e.message}`);
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
      await safeSend(chatId, text, {
        reply_markup: { inline_keyboard: [[
          { text: '\u{2B05} Voltar ao Lead', callback_data: `crm_lead_${leadId}` },
          menuButton()
        ]]}
      });
    } catch (e) {
      await bot.sendMessage(chatId, `\u{274C} Erro: ${e.message}`);
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
      await safeSend(chatId, text, {
        reply_markup: { inline_keyboard: [[
          { text: '\u{2B05} Voltar ao Lead', callback_data: `crm_lead_${leadId}` },
          menuButton()
        ]]}
      });
    } catch (e) {
      await bot.sendMessage(chatId, `\u{274C} Erro: ${e.message}`);
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

module.exports = {
  start,
  stop,
  getStatus,
  getBot,
  sendNotification,
  getTelegramConfig,
  updateTelegramConfig
};
