/**
 * Tools: SCHEDULER — scheduler, orchestrate, chrome
 *
 * Nota: scheduler e orchestrate referenciam objetos do servidor.
 * ctx = { credentialVault, httpRequest, CRM_BASE, CRM_TOKEN, toolUtils, executeTool }
 * chrome usa chromeTool carregado via require com try/catch.
 */
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Chrome DevTools Protocol — carregado sob demanda
let chromeTool = null;
try { chromeTool = require('../chrome-tool'); } catch (_) {}

const definitions = [
  // ── SCHEDULER ───────────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'scheduler',
      description: `Agenda tarefas recorrentes ou unicas usando cron. Persiste entre reinicializacoes.
Acoes:
- create: Cria nova tarefa agendada (cron expression + comando/script)
- list: Lista todas as tarefas agendadas
- delete: Remove uma tarefa agendada por ID
- pause: Pausa uma tarefa
- resume: Retoma uma tarefa pausada
- history: Mostra historico de execucoes recentes`,
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['create', 'list', 'delete', 'pause', 'resume', 'history'], description: 'Acao a executar' },
          id: { type: 'string', description: 'ID da tarefa (para delete/pause/resume/history)' },
          name: { type: 'string', description: 'Nome descritivo da tarefa' },
          cron: { type: 'string', description: 'Cron expression. Ex: "0 9 * * 1" (seg 9h), "*/30 * * * *" (a cada 30min), "0 8 * * *" (todo dia 8h)' },
          command: { type: 'string', description: 'Comando shell ou caminho de script Node.js a executar' },
          type: { type: 'string', enum: ['shell', 'node', 'api'], description: 'Tipo: shell=comando, node=script .js, api=chamada HTTP' },
          api_config: {
            type: 'object',
            description: 'Config para type=api: {url, method, headers, body}',
            properties: {
              url: { type: 'string' },
              method: { type: 'string' },
              headers: { type: 'object' },
              body: { type: 'string' }
            }
          }
        },
        required: ['action']
      }
    }
  },
  // ── ORCHESTRATE ─────────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'orchestrate',
      description: `Orquestra uma tarefa complexa usando multiplos agentes especializados em paralelo.
Use quando a tarefa requer multiplos passos, diferentes especialidades ou quando o usuario pede para "orquestrar", "usar agentes" ou a tarefa e claramente complexa.
O orquestrador decompoe automaticamente em subtarefas, despacha agentes especializados e so retorna quando 100% concluido.`,
      parameters: {
        type: 'object',
        properties: {
          instruction: {
            type: 'string',
            description: 'A instrucao/tarefa completa a ser orquestrada. Inclua todos os detalhes relevantes.'
          },
          mode: {
            type: 'string',
            enum: ['auto', 'sequential', 'parallel'],
            description: 'Modo de execucao. auto=decide automaticamente, sequential=um por vez, parallel=paralelo'
          }
        },
        required: ['instruction']
      }
    }
  },
  // ── CHROME ──────────────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'chrome',
      description: `Controla o Chrome via Chrome DevTools Protocol (CDP). Equivalente ao MCP chrome-devtools.
O Chrome deve estar aberto com --remote-debugging-port (portas 9222, 9333-9350).
Para abrir: node ~/.claude/chrome-manager.js open --port 9333

AÇÕES DISPONÍVEIS:
- screenshot: Tira screenshot da aba ativa. Salva PNG em arquivo temp e retorna o caminho.
- snapshot: Retorna DOM simplificado (títulos, links, inputs, texto) para entender a página sem imagem.
- navigate: Navega para uma URL. Args: {url}
- click: Clica em elemento CSS. Args: {selector}
- type: Digita texto em input. Args: {selector, text}
- evaluate: Executa JavaScript. Args: {code} → retorna o resultado
- wait_for: Aguarda elemento aparecer. Args: {selector, timeout?}
- scroll: Scrolla a página. Args: {y?, selector?}
- get_url: Retorna URL e título da aba ativa.
- list_tabs: Lista todas as abas abertas.

PROTOCOLO OBRIGATÓRIO:
1. SEMPRE tire snapshot() ANTES de interagir com a página
2. SEMPRE use wait_for() APÓS navigate() antes de clicar
3. Use screenshot() para validar resultados visuais`,
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['screenshot', 'snapshot', 'navigate', 'click', 'type', 'evaluate', 'wait_for', 'scroll', 'get_url', 'list_tabs'],
            description: 'Ação a executar'
          },
          args: {
            type: 'object',
            description: 'Argumentos da ação. Ex: {url: "https://..."} para navigate, {selector: "#btn"} para click, {code: "document.title"} para evaluate'
          }
        },
        required: ['action']
      }
    }
  }
];

const handlers = {
  async scheduler(args, ctx) {
    const action = args.action || 'list';
    const SCHEDULE_FILE = path.join(__dirname, '..', 'data', 'scheduled-tasks.json');
    const SCHEDULE_LOG = path.join(__dirname, '..', 'data', 'scheduled-tasks-log.json');

    // Garantir diretorio data existe
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    // Função httpRequest local para uso no scheduler
    function httpRequest(opts, bodyBuf) {
      const http = require('http');
      const https = require('https');
      return new Promise((resolve) => {
        const lib = (opts.port === 443 || opts._isHttps) ? https : http;
        const req = lib.request(opts, res => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => {
            const truncated = data.length > 8000 ? data.substring(0, 8000) + '\n...[truncado]' : data;
            resolve(`HTTP ${res.statusCode}\n${truncated}`);
          });
        });
        req.on('error', e => resolve(`Erro HTTP: ${e.message}`));
        if (bodyBuf) req.write(bodyBuf);
        req.end();
      });
    }

    function loadSchedules() {
      try { return JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf-8')); } catch { return []; }
    }
    function saveSchedules(tasks) {
      fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(tasks, null, 2), 'utf-8');
    }
    function loadLog() {
      try { return JSON.parse(fs.readFileSync(SCHEDULE_LOG, 'utf-8')); } catch { return []; }
    }
    function appendLog(entry) {
      const log = loadLog();
      log.push({ ...entry, timestamp: new Date().toISOString() });
      // Manter apenas ultimas 200 entradas
      const trimmed = log.slice(-200);
      fs.writeFileSync(SCHEDULE_LOG, JSON.stringify(trimmed, null, 2), 'utf-8');
    }

    try {
      switch (action) {
        case 'create': {
          const name = args.name || 'Tarefa sem nome';
          const cron = args.cron;
          const command = args.command || '';
          const type = args.type || 'shell';
          const apiConfig = args.api_config || null;

          if (!cron) return JSON.stringify({ ok: false, error: 'cron expression e obrigatoria. Ex: "0 9 * * 1" (seg 9h)' });
          if (type !== 'api' && !command) return JSON.stringify({ ok: false, error: 'command e obrigatorio para type shell/node' });

          // Validar cron
          const cronLib = require('node-cron');
          if (!cronLib.validate(cron)) return JSON.stringify({ ok: false, error: `Cron expression invalida: "${cron}"` });

          const id = `sched_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const task = { id, name, cron, command, type, api_config: apiConfig, status: 'active', created_at: new Date().toISOString() };
          const tasks = loadSchedules();
          tasks.push(task);
          saveSchedules(tasks);

          // Ativar o cron job
          cronLib.schedule(cron, async () => {
            const startTime = Date.now();
            try {
              let output = '';
              if (type === 'shell') {
                output = execSync(command, { timeout: 60000, encoding: 'utf-8' }).substring(0, 2000);
              } else if (type === 'node') {
                output = execSync(`node "${command}"`, { timeout: 60000, encoding: 'utf-8' }).substring(0, 2000);
              } else if (type === 'api' && apiConfig) {
                const resp = await httpRequest({
                  hostname: new URL(apiConfig.url).hostname,
                  port: new URL(apiConfig.url).port || (apiConfig.url.startsWith('https') ? 443 : 80),
                  path: new URL(apiConfig.url).pathname + (new URL(apiConfig.url).search || ''),
                  method: apiConfig.method || 'GET',
                  headers: apiConfig.headers || { 'Content-Type': 'application/json' },
                  protocol: new URL(apiConfig.url).protocol
                }, apiConfig.body ? Buffer.from(apiConfig.body, 'utf8') : null);
                output = resp.substring(0, 2000);
              }
              appendLog({ id, name, status: 'success', duration_ms: Date.now() - startTime, output: output.substring(0, 500) });
            } catch (e) {
              appendLog({ id, name, status: 'error', duration_ms: Date.now() - startTime, error: e.message.substring(0, 500) });
            }
          }, { name: id });

          return JSON.stringify({ ok: true, message: `Tarefa "${name}" agendada com sucesso`, task });
        }

        case 'list': {
          const tasks = loadSchedules();
          return JSON.stringify({ ok: true, total: tasks.length, tasks });
        }

        case 'delete': {
          const id = args.id;
          if (!id) return JSON.stringify({ ok: false, error: 'id e obrigatorio' });
          let tasks = loadSchedules();
          const before = tasks.length;
          tasks = tasks.filter(t => t.id !== id);
          saveSchedules(tasks);
          // Tentar destruir o cron job
          try { const cronLib = require('node-cron'); const jobs = cronLib.getTasks(); if (jobs.has(id)) jobs.get(id).stop(); } catch {}
          return JSON.stringify({ ok: true, deleted: before > tasks.length, remaining: tasks.length });
        }

        case 'pause': {
          const id = args.id;
          if (!id) return JSON.stringify({ ok: false, error: 'id e obrigatorio' });
          const tasks = loadSchedules();
          const task = tasks.find(t => t.id === id);
          if (!task) return JSON.stringify({ ok: false, error: `Tarefa ${id} nao encontrada` });
          task.status = 'paused';
          saveSchedules(tasks);
          try { const cronLib = require('node-cron'); const jobs = cronLib.getTasks(); if (jobs.has(id)) jobs.get(id).stop(); } catch {}
          return JSON.stringify({ ok: true, message: `Tarefa "${task.name}" pausada` });
        }

        case 'resume': {
          const id = args.id;
          if (!id) return JSON.stringify({ ok: false, error: 'id e obrigatorio' });
          const tasks = loadSchedules();
          const task = tasks.find(t => t.id === id);
          if (!task) return JSON.stringify({ ok: false, error: `Tarefa ${id} nao encontrada` });
          task.status = 'active';
          saveSchedules(tasks);
          try { const cronLib = require('node-cron'); const jobs = cronLib.getTasks(); if (jobs.has(id)) jobs.get(id).start(); } catch {}
          return JSON.stringify({ ok: true, message: `Tarefa "${task.name}" retomada` });
        }

        case 'history': {
          const id = args.id;
          const log = loadLog();
          const filtered = id ? log.filter(l => l.id === id) : log;
          return JSON.stringify({ ok: true, total: filtered.length, entries: filtered.slice(-50) });
        }

        default:
          return JSON.stringify({ ok: false, error: `Action "${action}" nao reconhecida` });
      }
    } catch (e) {
      return JSON.stringify({ ok: false, error: `Erro no scheduler: ${e.message}` });
    }
  },

  async orchestrate(args, ctx) {
    try {
      const { Orchestrator } = require('../orchestrator');
      const agentsConfig = require('../agents-config');

      // Obter API key
      const credentialVault = ctx && ctx.credentialVault;
      let apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey && credentialVault) {
        try {
          const envVars = credentialVault.getEnvVars ? credentialVault.getEnvVars() : {};
          apiKey = envVars['OPENROUTER_API_KEY'];
        } catch (e) {
          // ignorar erro de vault
        }
      }

      const events = [];
      const executeTool = ctx && ctx.executeTool;
      const orchestrator = new Orchestrator({
        apiKey,
        model: process.env.OPENROUTER_DEFAULT_MODEL || 'anthropic/claude-sonnet-4-6',
        agentsConfig,
        executeTool: async (name, toolCallArgs) => {
          if (executeTool) return executeTool(name, toolCallArgs, credentialVault);
          return `Ferramenta "${name}" indisponível no contexto modular`;
        },
        credentialVault,
        sendEvent: (evt) => events.push(evt)
      });

      const instruction = args.instruction || args.task || '';
      if (!instruction) {
        return JSON.stringify({ ok: false, error: 'Parametro "instruction" e obrigatorio' });
      }

      const result = await orchestrator.run(instruction);
      return JSON.stringify({ ok: true, result, events: events.slice(-10) });
    } catch (e) {
      return JSON.stringify({ ok: false, error: `Erro ao orquestrar: ${e.message}` });
    }
  },

  async chrome(args, ctx) {
    if (!chromeTool) {
      return 'chrome-remote-interface não está instalado. Execute: npm install chrome-remote-interface --save no diretório do servidor.';
    }
    const { action, args: chromeArgs = {} } = args;
    if (!action) return 'Argumento "action" é obrigatório para chrome.';
    try {
      return await chromeTool.executeChromeAction(action, chromeArgs);
    } catch (e) {
      return `Erro chrome: ${e.message}`;
    }
  }
};

module.exports = { definitions, handlers };
