#!/usr/bin/env node
/**
 * MCP Server — Ecossistema ~/.claude
 * Expõe CRM, Personal Tasks, Finance, Notes, Knowledge Base e Session Diary
 * para uso no Claude Desktop.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import http from "http";
import { exec } from "child_process";
import { promisify } from "util";
import { readFileSync, writeFileSync, readdirSync, statSync, unlinkSync, renameSync, existsSync, mkdirSync, rmSync } from "fs";
import { join, resolve, basename } from "path";
import os from "os";

const execAsync = promisify(exec);
const CRM_BASE = "http://localhost:3847/api/crm";
const CRM_TOKEN = "local-dev-token";
const CLAUDE_HOME = join(os.homedir(), ".claude");
const KB_PATH = join(CLAUDE_HOME, "knowledge-base");

// ─── HTTP helper ─────────────────────────────────────────────────────────────
function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(CRM_BASE + path);
    const postData = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        Authorization: `Bearer ${CRM_TOKEN}`,
        "Content-Type": "application/json; charset=utf-8",
        ...(postData ? { "Content-Length": Buffer.byteLength(postData, "utf8") } : {}),
      },
    };
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ raw: data }); }
      });
    });
    req.on("error", reject);
    if (postData) req.write(postData, "utf8");
    req.end();
  });
}

function fmt(obj) {
  return JSON.stringify(obj, null, 2);
}

// ─── Criar servidor ───────────────────────────────────────────────────────────
const server = new McpServer({
  name: "claude-ecosystem",
  version: "1.0.0",
});

// ══════════════════════════════════════════════════════════════════════════════
// SISTEMA
// ══════════════════════════════════════════════════════════════════════════════

server.tool(
  "sistema_saude",
  "Verifica se o CRM e o ecossistema estão online.",
  {},
  async () => {
    try {
      const res = await apiRequest("GET", "/health");
      return { content: [{ type: "text", text: `CRM: ${fmt(res)}` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `CRM OFFLINE: ${e.message}` }] };
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// CRM — LEADS
// ══════════════════════════════════════════════════════════════════════════════

server.tool(
  "crm_listar_leads",
  "Lista leads do CRM com filtros opcionais.",
  {
    status: z.enum(["new", "contacted", "replied", "interested", "negotiating", "won", "lost"]).optional().describe("Filtrar por status do pipeline"),
    temperature: z.enum(["cold", "warm", "hot"]).optional().describe("Filtrar por temperatura"),
    search: z.string().optional().describe("Buscar por nome, email ou telefone"),
    page: z.number().optional().describe("Página (padrão: 1)"),
    limit: z.number().optional().describe("Resultados por página (padrão: 20)"),
  },
  async ({ status, temperature, search, page = 1, limit = 20 }) => {
    const params = new URLSearchParams({ page, limit });
    if (status) params.set("status", status);
    if (temperature) params.set("temperature", temperature);
    if (search) params.set("search", search);
    const res = await apiRequest("GET", `/leads?${params}`);
    return { content: [{ type: "text", text: fmt(res) }] };
  }
);

server.tool(
  "crm_ver_lead",
  "Retorna detalhes completos de um lead pelo ID.",
  { id: z.string().describe("ID do lead") },
  async ({ id }) => {
    const res = await apiRequest("GET", `/leads/${id}`);
    return { content: [{ type: "text", text: fmt(res) }] };
  }
);

server.tool(
  "crm_criar_lead",
  "Cria um novo lead no CRM.",
  {
    name: z.string().describe("Nome do lead"),
    email: z.string().optional().describe("Email"),
    phone: z.string().optional().describe("Telefone (com DDD, ex: 5499999999)"),
    company: z.string().optional().describe("Empresa"),
    position: z.string().optional().describe("Cargo"),
    source: z.string().optional().describe("Origem (manual, instagram, etc)"),
    status: z.enum(["new", "contacted", "replied", "interested", "negotiating", "won", "lost"]).optional(),
    temperature: z.enum(["cold", "warm", "hot"]).optional(),
    notes: z.string().optional().describe("Observações iniciais"),
  },
  async (body) => {
    const res = await apiRequest("POST", "/leads", body);
    return { content: [{ type: "text", text: fmt(res) }] };
  }
);

server.tool(
  "crm_atualizar_lead",
  "Atualiza dados, status ou temperatura de um lead.",
  {
    id: z.string().describe("ID do lead"),
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    company: z.string().optional(),
    position: z.string().optional(),
    status: z.enum(["new", "contacted", "replied", "interested", "negotiating", "won", "lost"]).optional(),
    temperature: z.enum(["cold", "warm", "hot"]).optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional().describe("Lista de tags"),
  },
  async ({ id, ...body }) => {
    if (body.tags) body.tags = JSON.stringify(body.tags);
    const res = await apiRequest("PUT", `/leads/${id}`, body);
    return { content: [{ type: "text", text: fmt(res) }] };
  }
);

server.tool(
  "crm_adicionar_nota",
  "Adiciona uma nota de acompanhamento a um lead.",
  {
    id: z.string().describe("ID do lead"),
    content: z.string().describe("Conteúdo da nota"),
  },
  async ({ id, content }) => {
    const res = await apiRequest("POST", `/leads/${id}/notes`, { content });
    return { content: [{ type: "text", text: fmt(res) }] };
  }
);

server.tool(
  "crm_historico_mensagens",
  "Retorna o histórico de mensagens (WhatsApp/email) de um lead.",
  { id: z.string().describe("ID do lead") },
  async ({ id }) => {
    const res = await apiRequest("GET", `/leads/${id}/messages`);
    return { content: [{ type: "text", text: fmt(res) }] };
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// CRM — MENSAGENS
// ══════════════════════════════════════════════════════════════════════════════

server.tool(
  "crm_enviar_whatsapp",
  "Envia mensagem WhatsApp para um lead pelo CRM (registra no histórico).",
  {
    leadId: z.string().describe("ID do lead"),
    content: z.string().describe("Texto da mensagem"),
  },
  async ({ leadId, content }) => {
    const res = await apiRequest("POST", "/messages/whatsapp", { leadId, content });
    return { content: [{ type: "text", text: fmt(res) }] };
  }
);

server.tool(
  "crm_enviar_email",
  "Envia email para um lead pelo CRM (registra no histórico).",
  {
    leadId: z.string().describe("ID do lead"),
    subject: z.string().describe("Assunto do email"),
    content: z.string().describe("Corpo do email"),
  },
  async ({ leadId, subject, content }) => {
    const res = await apiRequest("POST", "/messages/email", { leadId, subject, content });
    return { content: [{ type: "text", text: fmt(res) }] };
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// CRM — DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════

server.tool(
  "crm_dashboard_stats",
  "Retorna KPIs do CRM: total de leads, por status, temperatura, mensagens enviadas.",
  {},
  async () => {
    const [stats, pipeline] = await Promise.all([
      apiRequest("GET", "/dashboard/stats"),
      apiRequest("GET", "/dashboard/pipeline"),
    ]);
    return { content: [{ type: "text", text: `STATS:\n${fmt(stats)}\n\nPIPELINE:\n${fmt(pipeline)}` }] };
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// CRM — CAMPANHAS
// ══════════════════════════════════════════════════════════════════════════════

server.tool(
  "crm_listar_campanhas",
  "Lista campanhas de prospecção do CRM.",
  {},
  async () => {
    const res = await apiRequest("GET", "/campaigns");
    return { content: [{ type: "text", text: fmt(res) }] };
  }
);

server.tool(
  "crm_listar_templates",
  "Lista templates de mensagens do CRM.",
  {},
  async () => {
    const res = await apiRequest("GET", "/templates");
    return { content: [{ type: "text", text: fmt(res) }] };
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// PERSONAL TASKS
// ══════════════════════════════════════════════════════════════════════════════

server.tool(
  "tasks_listar",
  "Lista tarefas pessoais com filtros opcionais.",
  {
    status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    search: z.string().optional(),
  },
  async ({ status, priority, search }) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (priority) params.set("priority", priority);
    if (search) params.set("search", search);
    const res = await apiRequest("GET", `/personal-tasks?${params}`);
    return { content: [{ type: "text", text: fmt(res) }] };
  }
);

server.tool(
  "tasks_criar",
  "Cria uma nova tarefa pessoal.",
  {
    title: z.string().describe("Título da tarefa"),
    description: z.string().optional().describe("Descrição detalhada"),
    priority: z.enum(["low", "medium", "high"]).optional().describe("Prioridade (padrão: medium)"),
    status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
    dueDate: z.string().optional().describe("Data limite em ISO (ex: 2026-03-15T23:59:59.000Z)"),
    tags: z.array(z.string()).optional().describe("Lista de tags"),
  },
  async (body) => {
    if (body.tags) body.tags = JSON.stringify(body.tags);
    const res = await apiRequest("POST", "/personal-tasks", body);
    return { content: [{ type: "text", text: fmt(res) }] };
  }
);

server.tool(
  "tasks_atualizar",
  "Atualiza uma tarefa pessoal (status, prioridade, etc).",
  {
    id: z.string().describe("ID da tarefa"),
    title: z.string().optional(),
    description: z.string().optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
    dueDate: z.string().optional(),
    tags: z.array(z.string()).optional(),
  },
  async ({ id, ...body }) => {
    if (body.tags) body.tags = JSON.stringify(body.tags);
    const res = await apiRequest("PUT", `/personal-tasks/${id}`, body);
    return { content: [{ type: "text", text: fmt(res) }] };
  }
);

server.tool(
  "tasks_stats",
  "Retorna estatísticas das tarefas pessoais (total por status e prioridade).",
  {},
  async () => {
    const res = await apiRequest("GET", "/personal-tasks/stats");
    return { content: [{ type: "text", text: fmt(res) }] };
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// FINANCE
// ══════════════════════════════════════════════════════════════════════════════

server.tool(
  "finance_resumo",
  "Retorna resumo financeiro mensal (receitas, despesas, saldo).",
  {
    month: z.number().min(1).max(12).describe("Mês (1-12)"),
    year: z.number().describe("Ano (ex: 2026)"),
  },
  async ({ month, year }) => {
    const res = await apiRequest("GET", `/finance/summary?month=${month}&year=${year}`);
    return { content: [{ type: "text", text: fmt(res) }] };
  }
);

server.tool(
  "finance_listar_transacoes",
  "Lista transações financeiras com filtros.",
  {
    month: z.number().min(1).max(12).optional(),
    year: z.number().optional(),
    type: z.enum(["income", "expense"]).optional(),
    search: z.string().optional(),
  },
  async ({ month, year, type, search }) => {
    const params = new URLSearchParams();
    if (month) params.set("month", month);
    if (year) params.set("year", year);
    if (type) params.set("type", type);
    if (search) params.set("search", search);
    const res = await apiRequest("GET", `/finance/transactions?${params}`);
    return { content: [{ type: "text", text: fmt(res) }] };
  }
);

server.tool(
  "finance_criar_transacao",
  "Registra uma nova transação financeira.",
  {
    description: z.string().describe("Descrição da transação"),
    amount: z.number().positive().describe("Valor (sempre positivo)"),
    date: z.string().describe("Data em ISO (ex: 2026-03-01T12:00:00.000Z)"),
    categoryId: z.string().describe("ID da categoria"),
    paid: z.boolean().optional().describe("Se já foi pago/recebido"),
    notes: z.string().optional(),
  },
  async (body) => {
    const res = await apiRequest("POST", "/finance/transactions", body);
    return { content: [{ type: "text", text: fmt(res) }] };
  }
);

server.tool(
  "finance_listar_categorias",
  "Lista categorias financeiras (receita e despesa).",
  {},
  async () => {
    const res = await apiRequest("GET", "/finance/categories");
    return { content: [{ type: "text", text: fmt(res) }] };
  }
);

server.tool(
  "finance_listar_metas",
  "Lista metas financeiras.",
  {},
  async () => {
    const res = await apiRequest("GET", "/finance/goals");
    return { content: [{ type: "text", text: fmt(res) }] };
  }
);

server.tool(
  "finance_listar_investimentos",
  "Lista investimentos cadastrados.",
  {},
  async () => {
    const res = await apiRequest("GET", "/finance/investments");
    return { content: [{ type: "text", text: fmt(res) }] };
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// NOTES
// ══════════════════════════════════════════════════════════════════════════════

server.tool(
  "notas_listar",
  "Lista notas com filtros.",
  {
    search: z.string().optional().describe("Buscar por título ou conteúdo"),
    pinned: z.boolean().optional().describe("Filtrar apenas fixadas"),
    archived: z.boolean().optional().describe("Incluir arquivadas (padrão: false)"),
  },
  async ({ search, pinned, archived = false }) => {
    const params = new URLSearchParams({ archived: String(archived) });
    if (search) params.set("search", search);
    if (pinned !== undefined) params.set("pinned", String(pinned));
    const res = await apiRequest("GET", `/notes?${params}`);
    return { content: [{ type: "text", text: fmt(res) }] };
  }
);

server.tool(
  "notas_criar",
  "Cria uma nova nota.",
  {
    title: z.string().describe("Título da nota"),
    content: z.string().optional().describe("Conteúdo da nota"),
    color: z.string().optional().describe("Cor hex (ex: #7c6aef)"),
    pinned: z.boolean().optional().describe("Fixar nota"),
    categoryId: z.string().optional().describe("ID da categoria"),
  },
  async (body) => {
    const res = await apiRequest("POST", "/notes", body);
    return { content: [{ type: "text", text: fmt(res) }] };
  }
);

server.tool(
  "notas_atualizar",
  "Atualiza título, conteúdo ou cor de uma nota.",
  {
    id: z.string().describe("ID da nota"),
    title: z.string().optional(),
    content: z.string().optional(),
    color: z.string().optional(),
    pinned: z.boolean().optional(),
  },
  async ({ id, ...body }) => {
    const res = await apiRequest("PUT", `/notes/${id}`, body);
    return { content: [{ type: "text", text: fmt(res) }] };
  }
);

server.tool(
  "notas_toggle_pin",
  "Alterna o status de fixada de uma nota.",
  { id: z.string().describe("ID da nota") },
  async ({ id }) => {
    const res = await apiRequest("PUT", `/notes/${id}/pin`, {});
    return { content: [{ type: "text", text: fmt(res) }] };
  }
);

server.tool(
  "notas_listar_categorias",
  "Lista categorias de notas.",
  {},
  async () => {
    const res = await apiRequest("GET", "/notes/categories");
    return { content: [{ type: "text", text: fmt(res) }] };
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// KNOWLEDGE BASE
// ══════════════════════════════════════════════════════════════════════════════

server.tool(
  "kb_listar_documentos",
  "Lista todos os documentos disponíveis na knowledge base.",
  {},
  async () => {
    try {
      const files = readdirSync(KB_PATH)
        .filter((f) => f.endsWith(".md"))
        .map((f) => f.replace(".md", ""));
      return { content: [{ type: "text", text: `Documentos disponíveis (${files.length}):\n\n${files.join("\n")}` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Erro: ${e.message}` }] };
    }
  }
);

server.tool(
  "kb_buscar",
  "Busca termos na knowledge base e retorna documentos relevantes.",
  {
    query: z.string().describe("Termos de busca"),
    category: z.string().optional().describe("Filtrar por categoria (CRM, Shopify, APIs, etc)"),
  },
  async ({ query, category }) => {
    try {
      const args = [
        `"${join(CLAUDE_HOME, "knowledge-base", "knowledge-search.js")}"`,
        `"${query}"`,
        ...(category ? [`--category=${category}`] : []),
      ].join(" ");
      const { stdout, stderr } = await execAsync(`node ${args}`, { cwd: KB_PATH });
      return { content: [{ type: "text", text: stdout || stderr }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Erro na busca: ${e.message}` }] };
    }
  }
);

server.tool(
  "kb_ler_documento",
  "Lê o conteúdo completo de um documento da knowledge base.",
  {
    name: z.string().describe("Nome do documento sem extensão (ex: CRM-DOCUMENTACAO-COMPLETA)"),
    offset: z.number().optional().describe("Linha inicial (para documentos longos)"),
    limit: z.number().optional().describe("Número de linhas a ler (padrão: 200)"),
  },
  async ({ name, offset = 0, limit = 200 }) => {
    try {
      const path = join(KB_PATH, `${name}.md`);
      const content = readFileSync(path, "utf-8");
      const lines = content.split("\n");
      const slice = lines.slice(offset, offset + limit).join("\n");
      const total = lines.length;
      return {
        content: [{
          type: "text",
          text: `[${name}] — linhas ${offset + 1}-${Math.min(offset + limit, total)} de ${total}\n\n${slice}`,
        }],
      };
    } catch (e) {
      return { content: [{ type: "text", text: `Documento não encontrado: ${name}\nErro: ${e.message}` }] };
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// SESSION DIARY
// ══════════════════════════════════════════════════════════════════════════════

server.tool(
  "sessao_ultima",
  "Lê o registro da última sessão salva no diário de sessões.",
  {},
  async () => {
    try {
      const diary = join(CLAUDE_HOME, "session-diary", "session-diary.js");
      const { stdout } = await execAsync(`node "${diary}" latest`);
      return { content: [{ type: "text", text: stdout }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Erro: ${e.message}` }] };
    }
  }
);

server.tool(
  "sessao_pendencias",
  "Lista tarefas pendentes de sessões anteriores.",
  {},
  async () => {
    try {
      const diary = join(CLAUDE_HOME, "session-diary", "session-diary.js");
      const { stdout } = await execAsync(`node "${diary}" pending`);
      return { content: [{ type: "text", text: stdout }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Erro: ${e.message}` }] };
    }
  }
);

server.tool(
  "sessao_salvar",
  "Salva um registro no diário de sessões.",
  {
    project: z.string().describe("Nome do projeto"),
    summary: z.string().describe("Resumo do que foi feito"),
    pending: z.string().optional().describe("Pendências separadas por |"),
    decisions: z.string().optional().describe("Decisões tomadas separadas por |"),
  },
  async ({ project, summary, pending = "nenhuma", decisions = "" }) => {
    try {
      const diary = join(CLAUDE_HOME, "session-diary", "session-diary.js");
      const args = [
        `node "${diary}" write`,
        `--project "${project}"`,
        `--summary "${summary}"`,
        `--pending "${pending}"`,
        ...(decisions ? [`--decisions "${decisions}"`] : []),
      ].join(" ");
      const { stdout } = await execAsync(args);
      return { content: [{ type: "text", text: stdout }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Erro: ${e.message}` }] };
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// CHROME MANAGER
// ══════════════════════════════════════════════════════════════════════════════

server.tool(
  "chrome_perfis",
  "Lista os perfis de Chrome disponíveis para automação.",
  {},
  async () => {
    try {
      const mgr = join(CLAUDE_HOME, "chrome-manager.js");
      const { stdout } = await execAsync(`node "${mgr}" profiles`);
      return { content: [{ type: "text", text: stdout }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Erro: ${e.message}` }] };
    }
  }
);

server.tool(
  "chrome_abrir_url",
  "Abre uma URL em um perfil específico do Chrome para debug/automação.",
  {
    profile: z.string().describe("Nome do perfil Chrome"),
    url: z.string().describe("URL para abrir"),
  },
  async ({ profile, url }) => {
    try {
      const mgr = join(CLAUDE_HOME, "chrome-manager.js");
      const { stdout } = await execAsync(`node "${mgr}" open --profile "${profile}" "${url}"`);
      return { content: [{ type: "text", text: stdout }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Erro: ${e.message}` }] };
    }
  }
);

server.tool(
  "chrome_status",
  "Verifica instâncias Chrome de debug ativas (portas em uso).",
  {},
  async () => {
    try {
      const mgr = join(CLAUDE_HOME, "chrome-manager.js");
      const { stdout } = await execAsync(`node "${mgr}" status`);
      return { content: [{ type: "text", text: stdout }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Erro: ${e.message}` }] };
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// MEMORY
// ══════════════════════════════════════════════════════════════════════════════

server.tool(
  "memoria_ler",
  "Lê o arquivo MEMORY.md com contexto persistente do projeto.",
  {},
  async () => {
    try {
      const path = join(CLAUDE_HOME, "memory", "MEMORY.md");
      const content = readFileSync(path, "utf-8");
      return { content: [{ type: "text", text: content }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Erro: ${e.message}` }] };
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// INSTRUÇÕES E CONTEXTO — CLAUDE.md + CONTEXTOS SOB DEMANDA
// ══════════════════════════════════════════════════════════════════════════════

server.tool(
  "instrucoes_claude",
  "IMPORTANTE: Execute esta ferramenta NO INÍCIO de cada conversa para carregar as instruções globais do usuário (CLAUDE.md). Retorna todas as regras, protocolos, ferramentas e configurações que devem ser seguidas.",
  {},
  async () => {
    try {
      const claudeMd = readFileSync(join(CLAUDE_HOME, "CLAUDE.md"), "utf-8");
      return { content: [{ type: "text", text: `# INSTRUÇÕES GLOBAIS DO USUÁRIO\n\nVocê DEVE seguir estas instruções em todas as interações:\n\n${claudeMd}` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Erro ao ler CLAUDE.md: ${e.message}` }] };
    }
  }
);

server.tool(
  "instrucoes_contexto",
  "Carrega um arquivo de contexto sob demanda (CRM, Tools CLI, Credenciais, WhatsApp, MCPs, Agentes, Chrome, Validação). Use quando a tarefa envolver esses temas.",
  {
    contexto: z.enum([
      "crm",
      "tools-cli",
      "credentials",
      "whatsapp",
      "mcp",
      "agents",
      "chrome-protocol",
      "validation-protocol"
    ]).describe("Nome do contexto a carregar"),
  },
  async ({ contexto }) => {
    const map = {
      "crm": "contexts/crm-context.md",
      "tools-cli": "contexts/tools-cli-context.md",
      "credentials": "contexts/credentials-context.md",
      "whatsapp": "contexts/whatsapp-context.md",
      "mcp": "contexts/mcp-context.md",
      "agents": "contexts/agents-context.md",
      "chrome-protocol": "contexts/protocols/chrome-protocol.md",
      "validation-protocol": "contexts/protocols/validation-protocol.md",
    };
    try {
      const filePath = join(CLAUDE_HOME, map[contexto]);
      const content = readFileSync(filePath, "utf-8");
      return { content: [{ type: "text", text: `# Contexto: ${contexto}\n\n${content}` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Erro ao ler contexto "${contexto}": ${e.message}` }] };
    }
  }
);

server.tool(
  "instrucoes_memoria",
  "Lê a memória persistente (MEMORY.md) com informações do usuário, feedbacks, projetos e referências.",
  {},
  async () => {
    try {
      const memoryIndex = readFileSync(join(CLAUDE_HOME, "projects", "C--Users-USER", "memory", "MEMORY.md"), "utf-8");
      return { content: [{ type: "text", text: `# MEMÓRIA PERSISTENTE\n\n${memoryIndex}` }] };
    } catch (e) {
      try {
        const memoryIndex = readFileSync(join(CLAUDE_HOME, "memory", "MEMORY.md"), "utf-8");
        return { content: [{ type: "text", text: `# MEMÓRIA PERSISTENTE\n\n${memoryIndex}` }] };
      } catch (e2) {
        return { content: [{ type: "text", text: `Erro: ${e2.message}` }] };
      }
    }
  }
);

server.tool(
  "instrucoes_memoria_detalhe",
  "Lê o conteúdo de um arquivo de memória específico (feedback, projeto, referência).",
  {
    arquivo: z.string().describe("Nome do arquivo de memória (ex: feedback_ssh_batch_commands.md)"),
  },
  async ({ arquivo }) => {
    try {
      const paths = [
        join(CLAUDE_HOME, "projects", "C--Users-USER", "memory", arquivo),
        join(CLAUDE_HOME, "memory", arquivo),
      ];
      for (const p of paths) {
        try {
          const content = readFileSync(p, "utf-8");
          return { content: [{ type: "text", text: content }] };
        } catch {}
      }
      return { content: [{ type: "text", text: `Arquivo não encontrado: ${arquivo}` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Erro: ${e.message}` }] };
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// FILE SYSTEM — OPERAÇÕES DE ARQUIVO DIRETAS
// ══════════════════════════════════════════════════════════════════════════════

server.tool(
  "fs_ler_arquivo",
  "Lê o conteúdo de qualquer arquivo do sistema.",
  {
    path: z.string().describe("Caminho absoluto do arquivo"),
    offset: z.number().optional().describe("Linha inicial (padrão: 0)"),
    limit: z.number().optional().describe("Número de linhas (padrão: 500)"),
  },
  async ({ path: filePath, offset = 0, limit = 500 }) => {
    try {
      const resolved = resolve(filePath.replace(/^~/, os.homedir()));
      const content = readFileSync(resolved, "utf-8");
      const lines = content.split("\n");
      const slice = lines.slice(offset, offset + limit).join("\n");
      return { content: [{ type: "text", text: `[${basename(resolved)}] linhas ${offset + 1}-${Math.min(offset + limit, lines.length)} de ${lines.length}\n\n${slice}` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Erro: ${e.message}` }] };
    }
  }
);

server.tool(
  "fs_escrever_arquivo",
  "Escreve conteúdo em um arquivo (cria ou sobrescreve).",
  {
    path: z.string().describe("Caminho absoluto do arquivo"),
    content: z.string().describe("Conteúdo a escrever"),
  },
  async ({ path: filePath, content }) => {
    try {
      const resolved = resolve(filePath.replace(/^~/, os.homedir()));
      const dir = resolve(resolved, "..");
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(resolved, content, "utf-8");
      return { content: [{ type: "text", text: `Arquivo escrito: ${resolved} (${Buffer.byteLength(content, "utf-8")} bytes)` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Erro: ${e.message}` }] };
    }
  }
);

server.tool(
  "fs_deletar",
  "Deleta um arquivo ou pasta do sistema.",
  {
    path: z.string().describe("Caminho absoluto do arquivo ou pasta"),
    recursive: z.boolean().optional().describe("Deletar pasta recursivamente (padrão: false)"),
  },
  async ({ path: filePath, recursive = false }) => {
    try {
      const resolved = resolve(filePath.replace(/^~/, os.homedir()));
      if (!existsSync(resolved)) return { content: [{ type: "text", text: `Não existe: ${resolved}` }] };
      const stats = statSync(resolved);
      if (stats.isDirectory()) {
        rmSync(resolved, { recursive: true, force: true });
        return { content: [{ type: "text", text: `Pasta deletada: ${resolved}` }] };
      }
      const size = stats.size;
      unlinkSync(resolved);
      return { content: [{ type: "text", text: `Arquivo deletado: ${resolved} (${(size / 1024 / 1024).toFixed(2)} MB liberados)` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Erro: ${e.message}` }] };
    }
  }
);

server.tool(
  "fs_mover",
  "Move ou renomeia um arquivo ou pasta.",
  {
    from: z.string().describe("Caminho de origem"),
    to: z.string().describe("Caminho de destino"),
  },
  async ({ from, to }) => {
    try {
      const src = resolve(from.replace(/^~/, os.homedir()));
      const dst = resolve(to.replace(/^~/, os.homedir()));
      renameSync(src, dst);
      return { content: [{ type: "text", text: `Movido: ${src} → ${dst}` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Erro: ${e.message}` }] };
    }
  }
);

server.tool(
  "fs_listar",
  "Lista arquivos e pastas de um diretório com tamanhos e datas.",
  {
    path: z.string().describe("Caminho absoluto do diretório"),
    pattern: z.string().optional().describe("Filtrar por extensão (ex: .mp4, .html)"),
  },
  async ({ path: dirPath, pattern }) => {
    try {
      const resolved = resolve(dirPath.replace(/^~/, os.homedir()));
      const entries = readdirSync(resolved);
      const results = entries
        .filter(f => !pattern || f.toLowerCase().endsWith(pattern.toLowerCase()))
        .map(f => {
          try {
            const s = statSync(join(resolved, f));
            const size = s.isDirectory() ? "<DIR>" : `${(s.size / 1024 / 1024).toFixed(2)} MB`;
            const date = s.mtime.toISOString().split("T")[0];
            return `${date}  ${size.padStart(12)}  ${f}`;
          } catch { return `  ???  ${f}`; }
        });
      return { content: [{ type: "text", text: `${resolved} (${results.length} itens)\n\n${results.join("\n")}` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Erro: ${e.message}` }] };
    }
  }
);

server.tool(
  "fs_info",
  "Retorna metadados de um arquivo (tamanho, datas, tipo).",
  {
    path: z.string().describe("Caminho absoluto do arquivo"),
  },
  async ({ path: filePath }) => {
    try {
      const resolved = resolve(filePath.replace(/^~/, os.homedir()));
      const s = statSync(resolved);
      return { content: [{ type: "text", text: fmt({
        path: resolved,
        type: s.isDirectory() ? "directory" : "file",
        size: `${(s.size / 1024 / 1024).toFixed(2)} MB`,
        sizeBytes: s.size,
        created: s.birthtime.toISOString(),
        modified: s.mtime.toISOString(),
      }) }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Erro: ${e.message}` }] };
    }
  }
);

server.tool(
  "shell_executar",
  "Executa qualquer comando shell no sistema local. Use para operações que não têm ferramenta específica.",
  {
    command: z.string().describe("Comando a executar (bash/cmd)"),
    timeout: z.number().optional().describe("Timeout em ms (padrão: 30000)"),
  },
  async ({ command, timeout = 30000 }) => {
    try {
      const { stdout, stderr } = await execAsync(command, { timeout });
      return { content: [{ type: "text", text: stdout || stderr || "Comando executado sem output" }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Erro: ${e.stdout || e.stderr || e.message}` }] };
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// TOOLS CLI — ACESSO A TODAS AS 103+ FERRAMENTAS
// ══════════════════════════════════════════════════════════════════════════════

server.tool(
  "tools_listar",
  "Lista todas as ferramentas CLI disponíveis no ecossistema (103+). Inclui: scrape_website, dns_lookup, ssl_check, send_whatsapp, send_telegram, send_email, image_optimize, color_palette, google_search, meta_ads, seo_check, html_validator, password_generator, calculator, fishing_conditions, e muitas mais.",
  {},
  async () => {
    try {
      const { stdout } = await execAsync(`node "${join(CLAUDE_HOME, "task-scheduler", "tools-cli.js")}" --list`);
      return { content: [{ type: "text", text: stdout }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Erro: ${e.message}` }] };
    }
  }
);

server.tool(
  "tools_help",
  "Mostra help detalhado de uma ferramenta CLI específica (parâmetros, exemplos).",
  {
    tool: z.string().describe("Nome da ferramenta. Ex: send_whatsapp, dns_lookup, image_optimize, meta_ads, seo_check"),
  },
  async ({ tool }) => {
    try {
      const { stdout } = await execAsync(`node "${join(CLAUDE_HOME, "task-scheduler", "tools-cli.js")}" --help ${tool}`);
      return { content: [{ type: "text", text: stdout }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Erro: ${e.message}` }] };
    }
  }
);

server.tool(
  "tools_executar",
  "Executa qualquer ferramenta CLI do ecossistema. Use tools_listar para ver todas e tools_help para ver parâmetros. Exemplos: tool=dns_lookup args='domain=google.com type=A' | tool=send_telegram args='text=Olá' | tool=color_palette args='input=logo.jpg' | tool=seo_check args='url=https://meusite.com'",
  {
    tool: z.string().describe("Nome da ferramenta a executar"),
    args: z.string().optional().describe("Argumentos no formato key=value separados por espaço. Ex: 'domain=google.com type=A'"),
  },
  async ({ tool, args = "" }) => {
    try {
      const cmd = `node "${join(CLAUDE_HOME, "task-scheduler", "tools-cli.js")}" ${tool} ${args}`;
      const { stdout, stderr } = await execAsync(cmd, { timeout: 60000 });
      return { content: [{ type: "text", text: stdout || stderr || "Comando executado sem output" }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Erro: ${e.stdout || e.stderr || e.message}` }] };
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// SENTINEL — AÇÕES E CRIPTOMOEDAS (rodam no servidor via Docker)
// ══════════════════════════════════════════════════════════════════════════════

const SENTINEL_SERVER = "46.202.149.24";

server.tool(
  "sentinel_acoes_rodar",
  "Executa o robô Sentinel Alpha no servidor remoto (Docker). Análise de ações com yfinance + alertas Telegram. Roda automaticamente todo dia às 08:00, mas pode ser executado manualmente.",
  {
    command: z.enum(["once", "report", "validate", "export"]).optional().describe("once=scan único (padrão), report=relatório, validate=backtesting, export=JSON"),
  },
  async ({ command = "once" }) => {
    try {
      const cmd = `ssh root@${SENTINEL_SERVER} "docker run --rm --env-file /opt/sentinels/.env -v sentinel-alpha-data:/app/db sentinel-alpha python run.py --${command} 2>&1"`;
      const { stdout, stderr } = await execAsync(cmd, { timeout: 180000 });
      return { content: [{ type: "text", text: stdout || stderr }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Erro Sentinel Alpha: ${e.stdout || e.stderr || e.message}` }] };
    }
  }
);

server.tool(
  "sentinel_crypto_rodar",
  "Executa o robô Sentinel Crypto no servidor remoto (Docker). Scanner de explosões crypto. Roda automaticamente a cada hora, mas pode ser executado manualmente.",
  {
    command: z.enum(["once", "report", "dashboard", "validate", "export"]).optional().describe("once=scan (padrão), report=relatório, dashboard=painel, validate=backtesting, export=JSON"),
  },
  async ({ command = "once" }) => {
    try {
      const cmd = `ssh root@${SENTINEL_SERVER} "docker run --rm --env-file /opt/sentinels/.env -v sentinel-crypto-data:/app/db sentinel-crypto python run.py --${command} 2>&1"`;
      const { stdout, stderr } = await execAsync(cmd, { timeout: 180000 });
      return { content: [{ type: "text", text: stdout || stderr }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Erro Sentinel Crypto: ${e.stdout || e.stderr || e.message}` }] };
    }
  }
);

server.tool(
  "sentinel_logs",
  "Visualiza os logs mais recentes dos sentinels no servidor.",
  {
    type: z.enum(["alpha", "crypto"]).describe("Qual sentinel ver logs"),
    lines: z.number().optional().describe("Número de linhas (padrão: 50)"),
  },
  async ({ type, lines = 50 }) => {
    try {
      const logFile = type === "alpha" ? "/var/log/sentinel-alpha.log" : "/var/log/sentinel-crypto.log";
      const { stdout } = await execAsync(`ssh root@${SENTINEL_SERVER} "tail -${lines} ${logFile} 2>&1"`, { timeout: 15000 });
      return { content: [{ type: "text", text: stdout || "Log vazio" }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Erro: ${e.message}` }] };
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ══════════════════════════════════════════════════════════════════════════════

const transport = new StdioServerTransport();
await server.connect(transport);
