# CRM Sistema Local — Porta 3847 — Documentação Completa

**Versão:** 1.0.0
**Data:** 2026-03-11
**Base URL:** `http://localhost:3847`
**Auth:** Bearer token — usar `Bearer local-dev-token` para acesso local

---

## VISÃO GERAL

O servidor local na porta 3847 é o coração do ecossistema. Ele integra:
- **CRM de Prospecção IA** (`/api/crm/*`)
- **Módulos Orbity** (tarefas pessoais, finanças, notas)
- **Proxy Evolution API** (`/api/evolution/*`)
- **Dashboard e WebSocket** para tempo real

**Regra de ouro:** SEMPRE usar este sistema para criar tarefas, registrar despesas, gerenciar leads — NUNCA usar ferramentas internas da sessão (como TaskCreate do Claude) para isso.

---

## AUTENTICAÇÃO

Todas as rotas protegidas exigem header:
```
Authorization: Bearer local-dev-token
```

### Rotas de Auth
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/crm/auth/register` | Cadastrar novo usuário |
| POST | `/api/crm/auth/login` | Autenticar (retorna JWT) |
| POST | `/api/crm/auth/logout` | Revogar token atual |
| GET | `/api/crm/auth/me` | Dados do usuário autenticado |

---

## HEALTH CHECK

```bash
GET /api/crm/health
# Retorna: { "status": "ok", "timestamp": "..." }

GET /api/crm
# Retorna: { "name": "CRM Prospecção IA", "version": "1.0.0", "integrated": true }
```

---

## MÓDULO: TAREFAS PESSOAIS

**Base:** `/api/crm/personal-tasks`

> **REGRA CRÍTICA:** Quando o usuário pedir para criar uma tarefa, lembrete ou agendamento, SEMPRE usar este endpoint — NUNCA usar TaskCreate interno do Claude.

### Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/crm/personal-tasks` | Listar tarefas com filtros e paginação |
| GET | `/api/crm/personal-tasks/stats` | Estatísticas das tarefas |
| GET | `/api/crm/personal-tasks/:id` | Detalhe de uma tarefa |
| POST | `/api/crm/personal-tasks` | **Criar nova tarefa** |
| PUT | `/api/crm/personal-tasks/:id` | Atualizar tarefa completa |
| PUT | `/api/crm/personal-tasks/:id/status` | Atualizar apenas o status |
| DELETE | `/api/crm/personal-tasks/:id` | Deletar tarefa |

### Schema — Criar Tarefa (POST)

```json
{
  "title": "string (obrigatório, mínimo 1 char)",
  "description": "string (opcional)",
  "status": "pending | in_progress | completed | cancelled (opcional, default: pending)",
  "priority": "low | medium | high | urgent (opcional)",
  "dueDate": "ISO 8601 com offset: '2026-03-12T12:00:00.000Z' (opcional)",
  "tags": ["string"] // array de tags (opcional)
}
```

### Schema — Atualizar Status (PUT /:id/status)

```json
{
  "status": "pending | in_progress | completed | cancelled"
}
```

### Schema — Listar Tarefas (GET, query params)

| Param | Tipo | Descrição |
|-------|------|-----------|
| `page` | number | Página (default: 1) |
| `limit` | number | Itens por página (max 100) |
| `status` | string | Filtrar por status |
| `priority` | string | Filtrar por prioridade |
| `search` | string | Busca textual |
| `tag` | string | Filtrar por tag |

### ATENÇÃO — Formato de dueDate

O campo `dueDate` usa validação Zod `.datetime({ offset: true })`.
- **CORRETO:** `"2026-03-12T12:00:00.000Z"` ou `"2026-03-12T09:00:00-03:00"`
- **ERRADO:** `"2026-03-12"` (causa erro 400 de validação)

### Exemplo — Criar tarefa via Node.js

```js
const http = require('http');
const body = JSON.stringify({
  title: "Revisar proposta comercial",
  description: "Analisar a proposta do cliente X antes da reunião",
  priority: "high",
  dueDate: "2026-03-12T14:00:00.000Z",
  status: "pending",
  tags: ["comercial", "urgente"]
});
const opts = {
  hostname: 'localhost', port: 3847,
  path: '/api/crm/personal-tasks',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer local-dev-token',
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body, 'utf8')
  }
};
const req = http.request(opts, r => {
  let d = '';
  r.on('data', c => d += c);
  r.on('end', () => console.log(JSON.parse(d)));
});
req.write(body, 'utf8');
req.end();
```

### Exemplo — Via Tools CLI

```bash
node ~/.claude/task-scheduler/tools-cli.js call_crm endpoint=/personal-tasks method=POST body='{"title":"Minha tarefa","priority":"high","dueDate":"2026-03-12T12:00:00.000Z"}'
```

---

## MÓDULO: FINANÇAS

**Base:** `/api/crm/finance`

### Transações

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/crm/finance/transactions` | Listar transações com filtros |
| GET | `/api/crm/finance/transactions/:id` | Detalhe de transação |
| POST | `/api/crm/finance/transactions` | **Criar transação (despesa/receita)** |
| PUT | `/api/crm/finance/transactions/:id` | Atualizar transação |
| DELETE | `/api/crm/finance/transactions/:id` | Deletar transação |

### Schema — Criar Transação

```json
{
  "description": "string (opcional)",
  "amount": "number positivo (obrigatório)",
  "date": "string data (obrigatório, ex: '2026-03-11')",
  "categoryId": "string ID da categoria (opcional)",
  "isRecurring": "boolean (opcional)",
  "paid": "boolean (opcional)"
}
```

### Filtros de Listagem de Transações (query params)

| Param | Tipo | Descrição |
|-------|------|-----------|
| `categoryId` | string | Filtrar por categoria |
| `paid` | true/false | Filtrar por status de pagamento |
| `isRecurring` | true/false | Filtrar recorrentes |
| `dateFrom` | string | Data inicial |
| `dateTo` | string | Data final |
| `month` | number (1-12) | Mês |
| `year` | number | Ano |
| `search` | string | Busca textual |

### Categorias

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/crm/finance/categories` | Listar categorias |
| POST | `/api/crm/finance/categories` | Criar categoria |
| PUT | `/api/crm/finance/categories/:id` | Atualizar categoria |
| DELETE | `/api/crm/finance/categories/:id` | Deletar categoria |

Schema de categoria: `{ "name": "string", "type": "income | expense" }`

### Orçamentos (Budgets)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/crm/finance/budgets` | Listar orçamentos |
| POST | `/api/crm/finance/budgets` | Criar orçamento |
| DELETE | `/api/crm/finance/budgets/:id` | Deletar orçamento |

Schema: `{ "categoryId": "string (opcional)", "amount": number, "month": number, "year": number }`

### Metas (Goals)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/crm/finance/goals` | Listar metas |
| POST | `/api/crm/finance/goals` | Criar meta |
| PUT | `/api/crm/finance/goals/:id` | Atualizar meta |
| DELETE | `/api/crm/finance/goals/:id` | Deletar meta |

Schema: `{ "name": "string", (outros campos opcionais, deadline?: string) }`

### Investimentos

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/crm/finance/investments` | Listar investimentos |
| POST | `/api/crm/finance/investments` | Criar investimento |
| PUT | `/api/crm/finance/investments/:id` | Atualizar investimento |
| DELETE | `/api/crm/finance/investments/:id` | Deletar investimento |

Schema: `{ "name": "string", "amount": number, "type": "string (opcional)", "date": "string (opcional)" }`

### Resumo e Saldo

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/crm/finance/summary?month=3&year=2026` | Resumo financeiro do mês |
| GET | `/api/crm/finance/balance/monthly` | Saldo mensal histórico |

### Exemplo — Registrar despesa via Node.js

```js
const http = require('http');
const body = JSON.stringify({
  description: "Assinatura Adobe Creative Cloud",
  amount: 299.90,
  date: "2026-03-11",
  paid: true,
  isRecurring: true
});
const opts = {
  hostname: 'localhost', port: 3847,
  path: '/api/crm/finance/transactions',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer local-dev-token',
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body, 'utf8')
  }
};
const req = http.request(opts, r => {
  let d = '';
  r.on('data', c => d += c);
  r.on('end', () => console.log(JSON.parse(d)));
});
req.write(body, 'utf8');
req.end();
```

---

## MÓDULO: NOTAS

**Base:** `/api/crm/notes`

### Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/crm/notes` | Listar notas |
| POST | `/api/crm/notes` | Criar nota |
| GET | `/api/crm/notes/:id` | Detalhe de nota |
| PUT | `/api/crm/notes/:id` | Atualizar nota |
| PUT | `/api/crm/notes/:id/pin` | Fixar/desafixar nota |
| PUT | `/api/crm/notes/:id/archive` | Arquivar/desarquivar nota |
| DELETE | `/api/crm/notes/:id` | Deletar nota |

### Categorias de Notas

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/crm/notes/categories` | Listar categorias |
| POST | `/api/crm/notes/categories` | Criar categoria |
| PUT | `/api/crm/notes/categories/:id` | Atualizar categoria |
| DELETE | `/api/crm/notes/categories/:id` | Deletar categoria |

---

## MÓDULO: LEADS (CRM)

**Base:** `/api/crm/leads`

### Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/crm/leads` | Listar leads com filtros e paginação |
| POST | `/api/crm/leads` | Criar lead |
| GET | `/api/crm/leads/:id` | Detalhe do lead (inclui messages e activities) |
| PUT | `/api/crm/leads/:id` | Atualizar lead |
| DELETE | `/api/crm/leads/:id` | Deletar lead |
| GET | `/api/crm/leads/:id/messages` | Histórico de mensagens |
| GET | `/api/crm/leads/:id/activities` | Histórico de atividades |
| POST | `/api/crm/leads/:id/notes` | Adicionar nota ao lead |
| POST | `/api/crm/leads/import` | Importar CSV de leads |
| POST | `/api/crm/leads/check-whatsapp` | Verificar se números têm WhatsApp |
| POST | `/api/crm/leads/bulk-whatsapp-cleanup` | Remover leads sem WhatsApp (?dryRun=true para simular) |

### Schema — Criar Lead

```json
{
  "name": "string (obrigatório)",
  "phone": "string (ex: '5548999999999')",
  "email": "string (opcional)",
  "company": "string (opcional)",
  "status": "new | contacted | qualified | converted | lost (opcional)",
  "temperature": "cold | warm | hot (opcional)"
}
```

### Buscar Lead

```bash
GET /api/crm/leads?search=nome_ou_telefone
GET /api/crm/leads?status=new&page=1&limit=20
```

---

## MÓDULO: MENSAGENS

**Base:** `/api/crm/messages`

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/crm/messages/whatsapp` | **Enviar mensagem WhatsApp** |
| POST | `/api/crm/messages/email` | Enviar e-mail |
| POST | `/api/crm/messages/schedule` | Agendar mensagem para envio futuro |
| GET | `/api/crm/messages/:leadId` | Histórico de mensagens do lead (legado) |

### Enviar WhatsApp (Node.js — obrigatório para preservar UTF-8)

```js
const http = require('http');
const body = JSON.stringify({ leadId: 'ID_DO_LEAD', content: 'Olá! Tudo bem?' });
const opts = {
  hostname: 'localhost', port: 3847,
  path: '/api/crm/messages/whatsapp',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer local-dev-token',
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body, 'utf8')
  }
};
const req = http.request(opts, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>console.log(d)); });
req.write(body, 'utf8');
req.end();
```

---

## MÓDULO: TEMPLATES

**Base:** `/api/crm/templates`

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/crm/templates` | Listar templates (filtros: channel, category) |
| GET | `/api/crm/templates/:id` | Detalhe do template |
| POST | `/api/crm/templates` | Criar template |
| PUT | `/api/crm/templates/:id` | Atualizar template |
| DELETE | `/api/crm/templates/:id` | Deletar template |
| POST | `/api/crm/templates/:id/render` | Renderizar template com dados do lead |

---

## MÓDULO: CAMPANHAS

**Base:** `/api/crm/campaigns`

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/crm/campaigns` | Listar campanhas (query: page, limit, status) |
| POST | `/api/crm/campaigns` | Criar campanha |
| GET | `/api/crm/campaigns/:id` | Detalhe da campanha |
| PUT | `/api/crm/campaigns/:id` | Atualizar campanha (apenas draft ou paused) |
| DELETE | `/api/crm/campaigns/:id` | Deletar campanha (apenas draft/paused/completed) |
| POST | `/api/crm/campaigns/:id/start` | Iniciar campanha |
| POST | `/api/crm/campaigns/:id/pause` | Pausar campanha ativa |
| POST | `/api/crm/campaigns/:id/leads` | Adicionar leads à campanha |
| POST | `/api/crm/campaigns/:id/steps` | Definir steps da campanha |
| GET | `/api/crm/campaigns/:id/stats` | Estatísticas da campanha |
| GET | `/api/crm/campaigns/:id/leads` | Listar leads da campanha |
| DELETE | `/api/crm/campaigns/:id/leads/:leadId` | Remover lead da campanha |
| POST | `/api/crm/campaigns/:id/duplicate` | Clonar campanha |

---

## MÓDULO: CALENDÁRIO (Google Calendar)

**Base:** `/api/crm/calendar`

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/crm/calendar/availability?month=YYYY-MM` | Datas bloqueadas no mês |
| GET | `/api/crm/calendar/events?month=M&year=YYYY` | Listar eventos do mês |
| POST | `/api/crm/calendar/events` | Criar evento |
| DELETE | `/api/crm/calendar/events/:eventId` | Deletar evento |

### Schema — Criar Evento

```json
{
  "title": "string (obrigatório)",
  "start": "ISO 8601 (obrigatório)",
  "end": "ISO 8601 (obrigatório)",
  "description": "string (opcional)",
  "location": "string (opcional)",
  "isAllDay": "boolean (opcional)"
}
```

---

## MÓDULO: CONFIGURAÇÕES

**Base:** `/api/crm/settings`

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/crm/settings` | Obter todas as configurações |
| PUT | `/api/crm/settings` | Atualizar configurações |
| GET | `/api/crm/settings/setup-status` | Status do setup inicial |
| POST | `/api/crm/settings/test-smtp` | Testar conexão SMTP |
| POST | `/api/crm/settings/test-evolution` | Testar Evolution API |

### Configurações Importantes

| Chave | Descrição |
|-------|-----------|
| `agentToneOfVoice` | `casual` / `amigavel` / `profissional` / `formal` |
| `agentToneDescription` | Descrição detalhada do tom |
| `evolution_api_url` | URL da Evolution API |
| `evolution_api_key` | Chave da Evolution API |
| `evolution_instance` | Instância WhatsApp (`cenora`) |
| `smtp_host` | Host SMTP para e-mail |
| `smtp_port` | Porta SMTP |
| `smtp_user` | Usuário SMTP |
| `smtp_pass` | Senha SMTP |

---

## MÓDULO: DASHBOARD

**Base:** `/api/crm/dashboard`

Retorna métricas consolidadas do CRM (leads, mensagens, taxas de resposta, etc.)

---

## PROXY EVOLUTION API

**Base:** `/api/evolution` (requer authMiddleware)

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/evolution/send-text` | Enviar texto via WhatsApp |
| POST | `/api/evolution/send-media` | Enviar mídia (imagem, vídeo, áudio, documento) |
| POST | `/api/evolution/check-numbers` | Verificar se números têm WhatsApp |
| GET | `/api/evolution/connection` | Estado de conexão da instância |
| POST | `/api/evolution/messages` | Buscar mensagens de um chat |
| GET | `/api/evolution/instances` | Listar instâncias disponíveis |
| GET | `/api/evolution/profile/:number` | Perfil de um número |

### Enviar texto via Evolution proxy

```json
POST /api/evolution/send-text
{ "number": "5548999999999", "text": "Olá!" }
```

### Buscar mensagens (atalho)

```json
POST /api/evolution/messages
{ "remoteJid": "5548999999999@s.whatsapp.net", "limit": 20 }
```

---

## TAGS (NLP)

**Base:** `/api/crm/tags` (quando disponível)

Módulo de tags automáticas via NLP para classificar leads.

---

## EVENTOS SSE (Server-Sent Events)

**Base:** `/api/crm/events`

Stream de eventos em tempo real para o dashboard.

---

## WEBHOOKS

| Rota | Descrição |
|------|-----------|
| `/api/crm/webhooks/evolution` | Webhook para receber eventos da Evolution API |

---

## TABELA RÁPIDA — QUANDO USAR CADA ROTA

| Situação | Rota Correta |
|----------|-------------|
| Usuário pediu para criar uma tarefa / lembrete | `POST /api/crm/personal-tasks` |
| Registrar despesa ou receita | `POST /api/crm/finance/transactions` |
| Registrar uma nota pessoal | `POST /api/crm/notes` |
| Criar lead no CRM | `POST /api/crm/leads` |
| Adicionar nota sobre lead | `POST /api/crm/leads/:id/notes` |
| Enviar WhatsApp | `POST /api/crm/messages/whatsapp` |
| Enviar e-mail | `POST /api/crm/messages/email` |
| Criar evento no Google Calendar | `POST /api/crm/calendar/events` |
| Verificar saúde do sistema | `GET /api/crm/health` |

---

## REGRAS CRÍTICAS DE USO

1. **NUNCA usar `curl` com `-d` no Windows** para enviar JSON com caracteres especiais — usar Node.js
2. **dueDate sempre ISO 8601 completo** — `"2026-03-12T12:00:00.000Z"`, nunca só `"2026-03-12"`
3. **Tarefas pessoais → CRM local**, NUNCA TaskCreate interno do Claude
4. **Verificar CRM online** antes de operar: `GET /api/crm/health`
5. **Se offline:** `cd ~/.claude/task-scheduler && node server.js &`

---

## LIÇÕES APRENDIDAS

### 2026-03-11 — Tarefas pessoais devem ser criadas no CRM local

**Contexto:** Usuário pediu para criar uma tarefa no projeto Claude Code
**Erro cometido:** IA usou TaskCreate (tarefa interna de sessão) em vez da API do sistema real
**Solução correta:** `POST http://localhost:3847/api/crm/personal-tasks` com body JSON contendo `title`, `description`, `priority`, `dueDate` (ISO 8601 completo), `status`
**Regra:** SEMPRE que o usuário pedir "crie uma tarefa", usar `POST /api/crm/personal-tasks` — nunca TaskCreate do Claude

### 2026-03-18 — CRM Delete: Sucesso na API mas Dados Persistem

**Contexto:** Tentei deletar 20 leads via `DELETE /api/crm/leads/:id`, todos retornaram status 200 OK.
**Erro:** GET subsequente continuava retornando os mesmos 20 leads. Banco tinha 37 leads no total.
**Solução:** Usar Prisma `deleteMany({})` diretamente no banco SQLite (`crm-backend/data/crm.db`).
**Regra:** A rota DELETE do CRM pode ter bug de cache na listagem. Para deleções em massa, usar Prisma diretamente: `cd crm-backend && node -e "const {PrismaClient}=require('./node_modules/.prisma/client'); const p=new PrismaClient(); p.lead.deleteMany({}).then(r=>console.log(r)).then(()=>p.$disconnect())"`.

### 2026-03-18 — Tarefas Agendadas: Sentinel não aparecia no frontend

**Contexto:** Scripts Sentinel Alpha (ações) e Sentinel Crypto (cryptos) usavam scheduler interno próprio, não integrados ao CRM.
**Erro:** Os scripts rodavam via `python run.py --schedule` mas não apareciam em `http://localhost:3847/scheduled-tasks`.
**Solução:** Registrar via `POST /api/scheduled-tasks` com `cronExpression`, `prompt`, `mode: 'background'`, `enabled: true`.
**Regra:** Todo script com execução agendada deve ser registrado no sistema de tarefas agendadas do CRM para visibilidade e controle centralizado.

### 2026-03-18 — Execuções Travadas sem Cleanup Automático

**Contexto:** 2 execuções ficaram em status "running" permanentemente desde 17/03 sem processo ativo.
**Erro:** Não havia mecanismo para detectar e limpar processos órfãos no scheduled-tasks.
**Solução:** Criado método `cleanupStale()` no `scheduled-tasks.js` e endpoint `POST /api/scheduled-tasks/cleanup`.
**Regra:** Após reiniciar servidor, chamar `/api/scheduled-tasks/cleanup` para limpar execuções órfãs. Timeout aumentado de 10min para 30min para pipelines pesados.
