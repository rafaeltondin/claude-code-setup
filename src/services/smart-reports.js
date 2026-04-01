/**
 * SMART-REPORTS — Cron Jobs Inteligentes com Relatorio Automatico
 *
 * Gera relatorios automaticos em horarios configurados:
 * - Resumo diario (leads, mensagens, financeiro, campanhas)
 * - Relatorio semanal (tendencias, metricas, sugestoes)
 * - Schedules customizados com instrucoes livres + tools (Meta Ads, WhatsApp, etc)
 *
 * Entrega via Telegram, WhatsApp ou armazena para frontend.
 */

const cron = require('node-cron');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const REPORTS_DIR = path.join(__dirname, 'data', 'reports');
const SCHEDULES_FILE = path.join(REPORTS_DIR, 'schedules.json');
const CRM_BASE = `http://localhost:${process.env.PORT || 8000}`;
const CRM_TOKEN = 'local-dev-token';

const OPENROUTER_HOST = 'openrouter.ai';
const OPENROUTER_PATH = '/api/v1/chat/completions';

// Garantir diretorio de reports
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

class SmartReports {
  constructor({ credentialVault, notifier, toolExecutor } = {}) {
    this.credentialVault = credentialVault || null;
    this.notifier = notifier || null;
    this.toolExecutor = toolExecutor || null; // executeTool from chat-tools.js
    this.cronJobs = new Map();
    this.reports = this._loadReports();
    this.configs = this._loadConfigs();
    this.schedules = this._loadSchedules();
  }

  // ─── CONFIGURACOES ───────────────────────────────────────────

  _loadConfigs() {
    const configPath = path.join(REPORTS_DIR, 'config.json');
    try {
      if (fs.existsSync(configPath)) return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (_) {}
    return {
      dailyEnabled: true,
      dailyCron: '0 8 * * *',
      weeklyEnabled: true,
      weeklyCron: '0 9 * * 1',
      deliveryChannels: ['storage'],
      timezone: 'America/Sao_Paulo'
    };
  }

  _saveConfigs() {
    const configPath = path.join(REPORTS_DIR, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(this.configs, null, 2));
  }

  updateConfig(newConfig) {
    Object.assign(this.configs, newConfig);
    this._saveConfigs();
    this.stopAll();
    this.startAll();
    return this.configs;
  }

  getConfig() {
    return { ...this.configs };
  }

  // ─── REPORTS STORAGE ─────────────────────────────────────────

  _loadReports() {
    try {
      const files = fs.readdirSync(REPORTS_DIR)
        .filter(f => f.startsWith('report_') && f.endsWith('.json'))
        .sort().reverse().slice(0, 50);
      return files.map(f => {
        try { return JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, f), 'utf-8')); }
        catch { return null; }
      }).filter(Boolean);
    } catch { return []; }
  }

  _saveReport(report) {
    const filename = `report_${report.id}.json`;
    fs.writeFileSync(path.join(REPORTS_DIR, filename), JSON.stringify(report, null, 2));
    this.reports.unshift(report);
    if (this.reports.length > 50) this.reports.pop();
  }

  getReports(limit = 20) {
    return this.reports.slice(0, limit);
  }

  getReport(id) {
    return this.reports.find(r => r.id === id) || null;
  }

  // ─── SCHEDULES CUSTOMIZADOS ────────────────────────────────────

  _loadSchedules() {
    try {
      if (fs.existsSync(SCHEDULES_FILE)) {
        return JSON.parse(fs.readFileSync(SCHEDULES_FILE, 'utf-8'));
      }
    } catch (_) {}
    return [];
  }

  _saveSchedules() {
    fs.writeFileSync(SCHEDULES_FILE, JSON.stringify(this.schedules, null, 2));
  }

  createSchedule({ title, instruction, cronExpression, enabled, delivery }) {
    if (!instruction || !instruction.trim()) throw new Error('Instrucao e obrigatoria');
    if (!cronExpression || !cron.validate(cronExpression)) throw new Error('Cron expression invalida');

    const schedule = {
      id: `sched_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: title || instruction.slice(0, 60),
      instruction: instruction.trim(),
      cronExpression,
      enabled: enabled !== false,
      delivery: delivery || { type: 'storage' }, // { type: 'whatsapp', number: '55...' } | { type: 'telegram' } | { type: 'storage' }
      createdAt: new Date().toISOString(),
      lastRun: null,
      lastReportId: null,
      runCount: 0,
      status: 'active'
    };

    this.schedules.push(schedule);
    this._saveSchedules();

    // Ativar cron imediatamente se enabled
    if (schedule.enabled) {
      this._startScheduleCron(schedule);
    }

    console.log(`[SmartReports] Schedule criado: ${schedule.id} — ${schedule.cronExpression}`);
    return schedule;
  }

  updateSchedule(id, updates) {
    const idx = this.schedules.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Schedule nao encontrado');

    const schedule = this.schedules[idx];

    // Atualizar campos permitidos
    if (updates.title !== undefined) schedule.title = updates.title;
    if (updates.instruction !== undefined) schedule.instruction = updates.instruction;
    if (updates.cronExpression !== undefined) {
      if (!cron.validate(updates.cronExpression)) throw new Error('Cron expression invalida');
      schedule.cronExpression = updates.cronExpression;
    }
    if (updates.enabled !== undefined) schedule.enabled = updates.enabled;
    if (updates.delivery !== undefined) schedule.delivery = updates.delivery;

    this._saveSchedules();

    // Reiniciar cron
    this._stopScheduleCron(schedule.id);
    if (schedule.enabled) {
      this._startScheduleCron(schedule);
    }

    return schedule;
  }

  removeSchedule(id) {
    const idx = this.schedules.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Schedule nao encontrado');

    this._stopScheduleCron(id);
    this.schedules.splice(idx, 1);
    this._saveSchedules();

    console.log(`[SmartReports] Schedule removido: ${id}`);
    return { removed: true };
  }

  getSchedules() {
    return this.schedules.map(s => ({
      ...s,
      cronRunning: this.cronJobs.has(`sched_${s.id}`)
    }));
  }

  getSchedule(id) {
    const s = this.schedules.find(s => s.id === id);
    if (!s) return null;
    return { ...s, cronRunning: this.cronJobs.has(`sched_${s.id}`) };
  }

  // ─── EXECUCAO DE SCHEDULE CUSTOMIZADO ──────────────────────────

  async executeSchedule(id) {
    const schedule = this.schedules.find(s => s.id === id);
    if (!schedule) throw new Error('Schedule nao encontrado');

    console.log(`[SmartReports] Executando schedule: ${schedule.id} — "${schedule.title}"`);

    const report = {
      id: `scheduled_${Date.now()}`,
      type: 'scheduled',
      scheduleId: schedule.id,
      title: schedule.title,
      instruction: schedule.instruction,
      createdAt: new Date().toISOString(),
      data: null,
      toolResults: [],
      aiInsights: null,
      delivery: schedule.delivery,
      status: 'running'
    };

    this._saveReport(report);

    try {
      // Fase 1: Usar IA para determinar quais tools executar
      const toolPlan = await this._planToolsForInstruction(schedule.instruction);

      // Fase 2: Executar cada tool do plano
      const toolResults = [];
      for (const step of toolPlan) {
        try {
          const result = await this._executeTool(step.tool, step.args);
          toolResults.push({
            tool: step.tool,
            args: step.args,
            description: step.description,
            result: typeof result === 'string' ? result.slice(0, 5000) : JSON.stringify(result).slice(0, 5000),
            status: 'success'
          });
        } catch (err) {
          toolResults.push({
            tool: step.tool,
            args: step.args,
            description: step.description,
            error: err.message,
            status: 'error'
          });
        }
      }

      // Fase 3: Gerar relatorio com IA baseado nos resultados
      let aiInsights = null;
      try {
        aiInsights = await this._generateScheduleReport(schedule.instruction, toolResults);
      } catch (e) {
        console.warn('[SmartReports] IA indisponivel para schedule report:', e.message);
      }

      report.data = { toolPlan, toolResultsCount: toolResults.length };
      report.toolResults = toolResults;
      report.aiInsights = aiInsights;
      report.status = 'completed';

      // Atualizar schedule
      schedule.lastRun = new Date().toISOString();
      schedule.lastReportId = report.id;
      schedule.runCount = (schedule.runCount || 0) + 1;
      this._saveSchedules();

    } catch (err) {
      report.status = 'failed';
      report.error = err.message;
      console.error(`[SmartReports] Schedule falhou: ${schedule.id}`, err.message);
    }

    // Salvar report atualizado
    const filename = `report_${report.id}.json`;
    fs.writeFileSync(path.join(REPORTS_DIR, filename), JSON.stringify(report, null, 2));
    // Atualizar in-memory
    const idx = this.reports.findIndex(r => r.id === report.id);
    if (idx >= 0) this.reports[idx] = report;

    // Fase 4: Entrega
    if (report.status === 'completed') {
      await this._deliverScheduleReport(report, schedule.delivery);
    }

    console.log(`[SmartReports] Schedule executado: ${schedule.id} — status: ${report.status}`);
    return report;
  }

  async _planToolsForInstruction(instruction) {
    let apiKey = this._getApiKey();
    if (!apiKey) {
      // Sem IA, tentar parsear instrucao manualmente
      return this._fallbackPlanTools(instruction);
    }

    const prompt = `Voce e um planejador de ferramentas. Dada a instrucao abaixo, determine quais ferramentas executar e em que ordem.

INSTRUCAO: "${instruction}"

FERRAMENTAS DISPONIVEIS:
- meta_ads: { action: "campaigns"|"insights"|"adsets"|"ads"|"account_info", status?: string, date_preset?: string }
- call_crm: { endpoint: string, method?: string, body?: string }
- google_search: { query: string, num_results?: number }
- scrape_website: { url: string }
- seo_check: { url: string }
- pagespeed: { url: string, strategy?: "mobile"|"desktop" }
- search_kb: { query: string }
- fetch_api: { url: string, method?: string, headers?: string, body?: string }

RESPONDA APENAS COM JSON (array de steps):
[
  { "tool": "nome_da_tool", "args": { ... }, "description": "o que este step faz" }
]

Se a instrucao mencionar enviar via WhatsApp/Evolution API, NAO inclua como tool (sera tratado na entrega).
Maximo 5 steps.`;

    try {
      const response = await this._callLLM(prompt);
      const match = response.match(/\[[\s\S]*\]/);
      if (match) {
        const plan = JSON.parse(match[0]);
        return Array.isArray(plan) ? plan.slice(0, 5) : [];
      }
    } catch (e) {
      console.warn('[SmartReports] Falha ao planejar tools via IA:', e.message);
    }

    return this._fallbackPlanTools(instruction);
  }

  _fallbackPlanTools(instruction) {
    const lower = instruction.toLowerCase();
    const plan = [];

    if (lower.includes('meta') || lower.includes('anuncio') || lower.includes('ads') || lower.includes('facebook') || lower.includes('instagram')) {
      plan.push({
        tool: 'meta_ads',
        args: { action: 'insights', date_preset: 'last_7d' },
        description: 'Buscar insights de Meta Ads dos ultimos 7 dias'
      });
      plan.push({
        tool: 'meta_ads',
        args: { action: 'campaigns', status: 'ACTIVE' },
        description: 'Listar campanhas ativas'
      });
    }

    if (lower.includes('lead') || lower.includes('crm')) {
      plan.push({
        tool: 'call_crm',
        args: { endpoint: '/leads?limit=50' },
        description: 'Buscar leads recentes do CRM'
      });
    }

    if (lower.includes('seo') || lower.includes('pagespeed') || lower.includes('site')) {
      const urlMatch = instruction.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        plan.push({
          tool: 'pagespeed',
          args: { url: urlMatch[0], strategy: 'mobile' },
          description: `Analisar PageSpeed de ${urlMatch[0]}`
        });
      }
    }

    if (lower.includes('financ')) {
      const now = new Date();
      plan.push({
        tool: 'call_crm',
        args: { endpoint: `/finance/report?month=${now.getMonth() + 1}&year=${now.getFullYear()}` },
        description: 'Buscar relatorio financeiro do mes'
      });
    }

    if (plan.length === 0) {
      // Default: buscar stats do CRM
      plan.push({
        tool: 'call_crm',
        args: { endpoint: '/dashboard/stats' },
        description: 'Buscar estatisticas gerais do CRM'
      });
    }

    return plan;
  }

  async _executeTool(toolName, args) {
    // Usar toolExecutor do chat-tools.js se disponivel
    if (this.toolExecutor) {
      try {
        return await this.toolExecutor(toolName, args);
      } catch (e) {
        console.warn(`[SmartReports] Tool ${toolName} falhou via executor:`, e.message);
        throw e;
      }
    }

    // Fallback: executar diretamente via HTTP para CRM e tools conhecidas
    if (toolName === 'call_crm') {
      return await this._fetchCRM(args.endpoint);
    }

    if (toolName === 'meta_ads') {
      // Chamar via server API
      return await this._fetchLocal(`/api/tools/execute`, 'POST', { tool: 'meta_ads', args });
    }

    throw new Error(`Tool ${toolName} nao disponivel sem executor`);
  }

  async _fetchLocal(endpoint, method = 'GET', body = null) {
    return new Promise((resolve) => {
      const url = new URL(`${CRM_BASE}${endpoint}`);
      const opts = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers: {
          'Authorization': `Bearer ${CRM_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      };

      const req = http.request(opts, res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch { resolve(data); }
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => resolve(null));
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  async _generateScheduleReport(instruction, toolResults) {
    let apiKey = this._getApiKey();
    if (!apiKey) throw new Error('API key nao disponivel');

    const successResults = toolResults.filter(r => r.status === 'success');
    const resultsText = successResults.map(r =>
      `[${r.tool}] ${r.description}:\n${r.result}`
    ).join('\n\n---\n\n');

    const prompt = `Voce recebeu os resultados de ferramentas executadas para atender esta instrucao:

INSTRUCAO: "${instruction}"

RESULTADOS DAS FERRAMENTAS:
${resultsText || '(nenhum resultado disponivel)'}

Gere um relatorio completo em PT-BR. Responda com JSON:
{
  "summary": "resumo executivo em 2-3 frases",
  "insights": ["insight 1", "insight 2", ...],
  "metrics": { "chave": "valor", ... },
  "alerts": ["alerta se houver"],
  "suggestion": "principal recomendacao",
  "fullReport": "relatorio detalhado em texto formatado"
}`;

    const response = await this._callLLM(prompt, 1024);
    const match = response.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return { summary: response, insights: [], metrics: {}, alerts: [], suggestion: '', fullReport: response };
  }

  async _deliverScheduleReport(report, delivery) {
    if (!delivery) return;

    const text = this._formatScheduleReport(report);

    if (delivery.type === 'whatsapp' && delivery.number) {
      try {
        await this._sendWhatsApp(delivery.number, text);
        console.log(`[SmartReports] Relatorio enviado via WhatsApp para ${delivery.number}`);
      } catch (e) {
        console.warn('[SmartReports] Falha ao enviar WhatsApp:', e.message);
      }
    }

    if (delivery.type === 'telegram' && this.notifier) {
      try {
        await this.notifier.sendTelegram(text);
      } catch (e) {
        console.warn('[SmartReports] Falha ao enviar Telegram:', e.message);
      }
    }
  }

  _formatScheduleReport(report) {
    const ai = report.aiInsights || {};
    let text = `*${report.title}*\n`;
    text += `_${new Date(report.createdAt).toLocaleString('pt-BR')}_\n\n`;

    if (ai.summary) text += `${ai.summary}\n\n`;

    if (ai.metrics && Object.keys(ai.metrics).length > 0) {
      text += `*Metricas:*\n`;
      for (const [k, v] of Object.entries(ai.metrics)) {
        text += `  ${k}: ${v}\n`;
      }
      text += '\n';
    }

    if (ai.insights?.length > 0) {
      text += `*Insights:*\n`;
      ai.insights.forEach(i => { text += `- ${i}\n`; });
      text += '\n';
    }

    if (ai.alerts?.length > 0) {
      text += `*Alertas:*\n`;
      ai.alerts.forEach(a => { text += `- ${a}\n`; });
      text += '\n';
    }

    if (ai.suggestion) text += `*Sugestao:* ${ai.suggestion}\n`;

    return text;
  }

  async _sendWhatsApp(number, text) {
    // Enviar via Evolution API (instancia cenora)
    let instanceToken = null;
    if (this.credentialVault) {
      try {
        const envVars = this.credentialVault.getEnvVars ? this.credentialVault.getEnvVars() : {};
        instanceToken = envVars['EVOLUTION_INSTANCE_TOKEN'];
      } catch (_) {}
    }

    // Normalizar numero
    const cleanNumber = number.replace(/\D/g, '');
    const jid = cleanNumber.includes('@') ? cleanNumber : `${cleanNumber}@s.whatsapp.net`;

    // Enviar via CRM proxy (que ja tem Evolution API configurada)
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({
        number: cleanNumber,
        text: text
      });
      const req = http.request({
        hostname: 'localhost',
        port: process.env.PORT || 8000,
        path: '/api/crm/messages/whatsapp/send-direct',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CRM_TOKEN}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body, 'utf8')
        },
        timeout: 15000
      }, res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(data);
          else reject(new Error(`WhatsApp send failed: ${res.statusCode} — ${data}`));
        });
      });
      req.on('error', reject);
      req.write(body, 'utf8');
      req.end();
    });
  }

  // ─── SCHEDULE CRON MANAGEMENT ──────────────────────────────────

  _startScheduleCron(schedule) {
    const cronKey = `sched_${schedule.id}`;
    if (this.cronJobs.has(cronKey)) return; // ja ativo

    const tz = this.configs.timezone || 'America/Sao_Paulo';
    if (!cron.validate(schedule.cronExpression)) return;

    const job = cron.schedule(schedule.cronExpression, () => {
      this.executeSchedule(schedule.id).catch(e =>
        console.error(`[SmartReports] Erro no schedule ${schedule.id}:`, e.message)
      );
    }, { timezone: tz });

    this.cronJobs.set(cronKey, job);
    console.log(`[SmartReports] Schedule cron ativado: ${schedule.id} — ${schedule.cronExpression}`);
  }

  _stopScheduleCron(scheduleId) {
    const cronKey = `sched_${scheduleId}`;
    if (this.cronJobs.has(cronKey)) {
      this.cronJobs.get(cronKey).stop();
      this.cronJobs.delete(cronKey);
    }
  }

  // ─── COLETA DE DADOS ─────────────────────────────────────────

  async _fetchCRM(endpoint) {
    return new Promise((resolve) => {
      const url = new URL(`${CRM_BASE}/api/crm${endpoint}`);
      http.get({
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        headers: { 'Authorization': `Bearer ${CRM_TOKEN}` },
        timeout: 10000
      }, res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch { resolve(null); }
        });
      }).on('error', () => resolve(null)).on('timeout', () => resolve(null));
    });
  }

  async collectData() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const [stats, leads, finance, tasks, campaigns] = await Promise.all([
      this._fetchCRM('/dashboard/stats'),
      this._fetchCRM('/leads?limit=100'),
      this._fetchCRM(`/finance/report?month=${month}&year=${year}`),
      this._fetchCRM('/personal-tasks?status=pending'),
      this._fetchCRM('/campaigns?status=active'),
    ]);

    return { stats, leads, finance, tasks, campaigns, collectedAt: now.toISOString() };
  }

  // ─── GERACAO DE RELATORIO PADRAO ───────────────────────────────

  async generateDaily() {
    console.log('[SmartReports] Gerando relatorio diario...');
    const data = await this.collectData();
    const summary = this._buildDailySummary(data);

    let aiInsights = null;
    try {
      aiInsights = await this._getAIInsights(summary, 'diario');
    } catch (e) {
      console.warn('[SmartReports] IA indisponivel para insights:', e.message);
    }

    const report = {
      id: `daily_${Date.now()}`,
      type: 'daily',
      title: `Relatorio Diario — ${new Date().toLocaleDateString('pt-BR')}`,
      createdAt: new Date().toISOString(),
      data: summary,
      aiInsights,
      status: 'completed'
    };

    this._saveReport(report);
    await this._deliver(report);

    console.log('[SmartReports] Relatorio diario gerado:', report.id);
    return report;
  }

  async generateWeekly() {
    console.log('[SmartReports] Gerando relatorio semanal...');
    const data = await this.collectData();
    const summary = this._buildWeeklySummary(data);

    let aiInsights = null;
    try {
      aiInsights = await this._getAIInsights(summary, 'semanal');
    } catch (e) {
      console.warn('[SmartReports] IA indisponivel para insights:', e.message);
    }

    const report = {
      id: `weekly_${Date.now()}`,
      type: 'weekly',
      title: `Relatorio Semanal — Semana ${this._getWeekNumber()}`,
      createdAt: new Date().toISOString(),
      data: summary,
      aiInsights,
      status: 'completed'
    };

    this._saveReport(report);
    await this._deliver(report);

    console.log('[SmartReports] Relatorio semanal gerado:', report.id);
    return report;
  }

  async generateCustom(title, sections) {
    console.log('[SmartReports] Gerando relatorio customizado...');
    const data = await this.collectData();

    const report = {
      id: `custom_${Date.now()}`,
      type: 'custom',
      title: title || `Relatorio Custom — ${new Date().toLocaleDateString('pt-BR')}`,
      createdAt: new Date().toISOString(),
      data,
      sections: sections || ['leads', 'finance', 'campaigns', 'tasks'],
      status: 'completed'
    };

    this._saveReport(report);
    return report;
  }

  _buildDailySummary(data) {
    const s = data.stats || {};
    const f = data.finance || {};
    const leadsArr = (data.leads?.data || data.leads || []);
    const tasksArr = (data.tasks?.data || data.tasks || []);
    const campsArr = (data.campaigns?.data || data.campaigns || []);

    const today = new Date().toISOString().slice(0, 10);
    const newToday = Array.isArray(leadsArr) ? leadsArr.filter(l => l.createdAt?.startsWith(today)).length : 0;

    return {
      date: today,
      leads: {
        total: s.totalLeads || leadsArr.length || 0,
        newToday,
        byStatus: s.leadsByStatus || {},
        byTemperature: s.leadsByTemperature || {}
      },
      finance: {
        totalReceived: f.totalRecebido || 0,
        totalPaid: f.totalPago || 0,
        pendingReceive: f.faltaReceber || 0,
        pendingPay: f.faltaPagar || 0,
        balance: (f.totalRecebido || 0) - (f.totalPago || 0)
      },
      tasks: {
        pending: Array.isArray(tasksArr) ? tasksArr.length : 0,
        overdue: Array.isArray(tasksArr) ? tasksArr.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length : 0
      },
      campaigns: {
        active: Array.isArray(campsArr) ? campsArr.length : 0
      }
    };
  }

  _buildWeeklySummary(data) {
    const daily = this._buildDailySummary(data);
    const weekReports = this.reports
      .filter(r => r.type === 'daily')
      .slice(0, 7);

    return {
      ...daily,
      weekTrend: {
        reportsAvailable: weekReports.length,
        avgNewLeads: weekReports.length > 0
          ? Math.round(weekReports.reduce((sum, r) => sum + (r.data?.leads?.newToday || 0), 0) / weekReports.length)
          : 0
      }
    };
  }

  // ─── LLM ───────────────────────────────────────────────────────

  _getApiKey() {
    if (this.credentialVault) {
      try {
        const envVars = this.credentialVault.getEnvVars ? this.credentialVault.getEnvVars() : {};
        return envVars['OPENROUTER_API_KEY'] || null;
      } catch (_) {}
    }
    return null;
  }

  async _callLLM(prompt, maxTokens = 512) {
    const apiKey = this._getApiKey();
    if (!apiKey) throw new Error('API key nao disponivel');

    return new Promise((resolve, reject) => {
      const body = JSON.stringify({
        model: 'anthropic/claude-haiku-4-5',
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        max_tokens: maxTokens,
        temperature: 0.5
      });

      const req = https.request({
        hostname: OPENROUTER_HOST,
        path: OPENROUTER_PATH,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body, 'utf8')
        }
      }, res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode !== 200) return reject(new Error(`API ${res.statusCode}`));
            resolve(parsed.choices?.[0]?.message?.content || '');
          } catch (e) { reject(e); }
        });
      });
      req.on('error', reject);
      req.write(body, 'utf8');
      req.end();
    });
  }

  async _getAIInsights(summary, type) {
    const prompt = `Analise este resumo ${type} de CRM e financeiro e gere insights acionaveis em PT-BR (maximo 5 pontos):

${JSON.stringify(summary, null, 2)}

Responda com JSON:
{
  "insights": ["insight 1", "insight 2"],
  "alerts": ["alerta se houver"],
  "suggestion": "sugestao principal do dia"
}`;

    const response = await this._callLLM(prompt);
    const objMatch = response.match(/\{[\s\S]*\}/);
    if (objMatch) return JSON.parse(objMatch[0]);
    return { insights: [response], alerts: [], suggestion: '' };
  }

  // ─── ENTREGA ─────────────────────────────────────────────────

  async _deliver(report) {
    const channels = this.configs.deliveryChannels || ['storage'];

    if (channels.includes('telegram') && this.notifier) {
      try {
        const text = this._formatForTelegram(report);
        await this.notifier.sendTelegram(text);
      } catch (e) {
        console.warn('[SmartReports] Falha ao enviar Telegram:', e.message);
      }
    }
  }

  _formatForTelegram(report) {
    const d = report.data || {};
    let text = `*${report.title}*\n\n`;
    if (d.leads) {
      text += `*Leads:* ${d.leads.total} total | +${d.leads.newToday || 0} hoje\n`;
    }
    if (d.finance) {
      text += `*Financeiro:* R$${(d.finance.totalReceived || 0).toLocaleString('pt-BR')} recebido\n`;
      text += `   Saldo: R$${(d.finance.balance || 0).toLocaleString('pt-BR')}\n`;
    }
    if (d.tasks) {
      text += `*Tarefas:* ${d.tasks.pending} pendentes`;
      if (d.tasks.overdue > 0) text += ` | ${d.tasks.overdue} atrasadas`;
      text += '\n';
    }
    if (report.aiInsights?.suggestion) {
      text += `\n*Sugestao:* ${report.aiInsights.suggestion}`;
    }
    return text;
  }

  // ─── CRON MANAGEMENT ─────────────────────────────────────────

  startAll() {
    const tz = this.configs.timezone || 'America/Sao_Paulo';

    if (this.configs.dailyEnabled && cron.validate(this.configs.dailyCron)) {
      const job = cron.schedule(this.configs.dailyCron, () => {
        this.generateDaily().catch(e => console.error('[SmartReports] Erro diario:', e.message));
      }, { timezone: tz });
      this.cronJobs.set('daily', job);
      console.log(`[SmartReports] Cron diario ativado: ${this.configs.dailyCron}`);
    }

    if (this.configs.weeklyEnabled && cron.validate(this.configs.weeklyCron)) {
      const job = cron.schedule(this.configs.weeklyCron, () => {
        this.generateWeekly().catch(e => console.error('[SmartReports] Erro semanal:', e.message));
      }, { timezone: tz });
      this.cronJobs.set('weekly', job);
      console.log(`[SmartReports] Cron semanal ativado: ${this.configs.weeklyCron}`);
    }

    // Iniciar crons de schedules customizados
    for (const schedule of this.schedules) {
      if (schedule.enabled) {
        this._startScheduleCron(schedule);
      }
    }
  }

  stopAll() {
    this.cronJobs.forEach((job) => job.stop());
    this.cronJobs.clear();
  }

  getCronStatus() {
    return {
      daily: { enabled: this.configs.dailyEnabled, cron: this.configs.dailyCron, running: this.cronJobs.has('daily') },
      weekly: { enabled: this.configs.weeklyEnabled, cron: this.configs.weeklyCron, running: this.cronJobs.has('weekly') },
      deliveryChannels: this.configs.deliveryChannels,
      timezone: this.configs.timezone,
      totalReports: this.reports.length,
      totalSchedules: this.schedules.length,
      activeSchedules: this.schedules.filter(s => s.enabled).length
    };
  }

  _getWeekNumber() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now - start;
    return Math.ceil(diff / (7 * 24 * 60 * 60 * 1000));
  }
}

module.exports = { SmartReports };
