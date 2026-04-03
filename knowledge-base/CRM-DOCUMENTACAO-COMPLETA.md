# CRM Prospeccao IA — Documentacao Completa

## Visao Geral

O CRM Prospeccao IA e um sistema integrado ao Claude Code Ecosystem para gerenciamento de leads, prospeccao multicanal (WhatsApp + Email) e campanhas automatizadas.

**Stack:** Node.js + Express + Prisma + SQLite
**Projeto:** `~/.claude/task-scheduler` (CRM integrado ao ecossistema)
**Frontend:** `http://localhost:3847/` (SPA vanilla JS)
**API CRM:** `http://localhost:3847/api/crm`
**API Ecossistema:** `http://localhost:3847/api`

---

## 1. AUTENTICACAO

### Endpoints

| Metodo | Path | Descricao |
|--------|------|-----------|
| POST | `/api/crm/auth/register` | Registrar novo usuario |
| POST | `/api/crm/auth/login` | Fazer login (retorna JWT) |
| POST | `/api/crm/auth/logout` | Logout (requer token) |
| GET | `/api/crm/auth/me` | Dados do usuario logado |

### Registro
```bash
curl -X POST http://localhost:3847/api/crm/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Nome", "email": "user@email.com", "password": "senha-8-chars-min"}'
```

### Login
```bash
TOKEN=$(curl -s -X POST http://localhost:3847/api/crm/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@email.com", "password": "senha"}' | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).data.token))")
```

Usar em TODAS as requisicoes protegidas:
```
-H "Authorization: Bearer $TOKEN"
```

---

## 2. LEADS

### Endpoints

| Metodo | Path | Descricao | Body/Params |
|--------|------|-----------|------------|
| GET | `/api/crm/leads` | Listar leads | Query: `page, limit(max100), status, temperature, source, search, tags` |
| GET | `/api/crm/leads/:id` | Detalhe do lead | - |
| POST | `/api/crm/leads` | Criar lead | Body completo abaixo |
| PUT | `/api/crm/leads/:id` | Atualizar lead | Campos parciais |
| DELETE | `/api/crm/leads/:id` | Deletar lead | - |
| POST | `/api/crm/leads/import` | Importar CSV | Multipart (max 5MB) |
| GET | `/api/crm/leads/:id/messages` | Historico mensagens | Query: `page, limit` |
| GET | `/api/crm/leads/:id/activities` | Historico atividades | Query: `page, limit` |
| POST | `/api/crm/leads/:id/notes` | Adicionar nota | `{content: string}` |

### Criar Lead — Campos

```json
{
  "name": "Nome (obrigatorio)",
  "email": "email@empresa.com",
  "phone": "5554999887766",
  "company": "Empresa",
  "position": "Cargo",
  "source": "manual|whatsapp_inbound|email_inbound|import_csv|website|referral|meta_ads",
  "status": "new|contacted|replied|interested|negotiating|won|lost",
  "temperature": "cold|warm|hot",
  "tags": ["tag1", "tag2"],
  "notes": "Observacao inicial",
  "customFields": {
    "orcamento_mensal": "R$ 5.000",
    "plataforma": "Shopify",
    "segmento": "moda",
    "como_conheceu": "Instagram"
  }
}
```

### Buscar com Filtros

```bash
# Busca por texto (nome, email, phone, company)
curl "http://localhost:3847/api/crm/leads?search=joao&page=1&limit=20" -H "Authorization: Bearer $TOKEN"

# Filtrar por status e temperatura
curl "http://localhost:3847/api/crm/leads?status=interested&temperature=hot" -H "Authorization: Bearer $TOKEN"

# Filtrar por tags
curl "http://localhost:3847/api/crm/leads?tags=ecommerce,trafego" -H "Authorization: Bearer $TOKEN"
```

### Importar CSV

Colunas aceitas: `nome/name`, `email`, `telefone/phone`, `empresa/company`, `cargo/position`, `source`, `status`, `temperatura/temperature`, `observacoes/notes`, `tags` (separadas por `;`)

```bash
curl -X POST http://localhost:3847/api/crm/leads/import \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@lista-leads.csv"
```

---

## 3. PIPELINE (KANBAN) — 7 STATUS

| Status | Quando usar | Exemplo real |
|--------|-------------|-------------|
| `new` | Lead recem-adicionado, sem contato | Importou lista CSV, indicacao |
| `contacted` | Primeira mensagem enviada | Mandou WhatsApp de apresentacao |
| `replied` | Lead respondeu (qualquer canal) | Lead disse "oi, pode falar" |
| `interested` | Demonstrou interesse real | "Quanto custa?", "Me manda proposta" |
| `negotiating` | Proposta enviada, negociando | Enviou orcamento, discutindo valores |
| `won` | Fechou negocio/converteu | Lead virou cliente |
| `lost` | Desistiu ou nao responde mais | "Nao tenho interesse", 30d sem resposta |

### Regras de Transicao

```
new → contacted: ao enviar primeira mensagem
contacted → replied: ao receber primeira resposta
replied → interested: lead pediu preco/proposta/reuniao
interested → negotiating: proposta enviada
negotiating → won: confirmou compra
qualquer → lost: recusou ou 30+ dias sem resposta
```

---

## 4. TEMPERATURA — 3 NIVEIS

| Temp | Criterio | Acao recomendada |
|------|----------|-----------------|
| `cold` | Sem interacao ou 14+ dias sem resposta | Follow-up em 7 dias |
| `warm` | Respondeu mas sem decisao | Follow-up em 3 dias, enviar case |
| `hot` | Interesse claro, pediu proposta | Prioridade maxima, responder em minutos |

### Regras Automaticas

- Lead criado → `cold` (padrao)
- Lead respondeu primeira vez → `warm`
- Lead perguntou preco/pediu proposta → `hot`
- Lead nao responde ha 14+ dias → `cold`
- Lead disse "nao agora" → `warm` (nao cold, pode voltar)

---

## 5. ETIQUETAS (TAGS)

Tags sao armazenadas como array JSON no campo `tags` do lead.

### Tags Automaticas por Contexto

| Contexto | Tags a aplicar |
|----------|---------------|
| Veio do WhatsApp | `whatsapp`, `inbound` |
| Veio por email | `email`, `inbound` |
| Importado CSV | `importacao`, `csv` |
| Prospeccao ativa | `prospeccao-ativa`, `outbound` |
| E-commerce/Shopify | `ecommerce`, `shopify` |
| Quer trafego pago | `trafego`, `meta-ads` |
| Quer website/landing page | `website`, `landing-page` |
| Quer automacao/IA | `automacao`, `ia` |
| Agencia/B2B | `agencia`, `b2b` |
| Loja fisica | `varejo`, `local` |
| Follow-up pendente | `follow-up` |
| Proposta enviada | `proposta-enviada` |
| Reuniao agendada | `reuniao-agendada` |

### Tags IA (Regras Automaticas)

O CRM suporta regras de tag automaticas via IA, armazenadas na chave `tag_rules` em Settings:

```bash
# Ler regras
curl http://localhost:3847/api/crm/settings -H "Authorization: Bearer $TOKEN"
# → data.tag_rules (JSON string com array de regras)

# Salvar regras
curl -X PUT http://localhost:3847/api/crm/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tag_rules": "[{\"name\":\"Interesse\",\"condition\":\"ia_intent\",\"value\":\"Lead demonstrou interesse\",\"keywords\":\"interesse|quero|preciso\",\"tag\":\"interesse\"}]"}'
```

**Tipos de regra:**
- `message_contains`: mensagem do lead contem texto
- `notes_contain`: notas contem texto
- `status_is`: status do lead e X
- `source_is`: origem do lead e X
- `company_contains`: empresa contem texto
- `no_reply_days`: sem resposta ha X dias
- `ia_intent`: analise de intencao por IA (keywords semanticos)

---

## 6. MENSAGENS

### Endpoints

| Metodo | Path | Descricao | Body |
|--------|------|-----------|------|
| POST | `/api/crm/messages/whatsapp` | Enviar WhatsApp | `{leadId, content}` |
| POST | `/api/crm/messages/email` | Enviar email | `{leadId, subject, content, html?}` |
| GET | `/api/crm/messages/:leadId` | Historico msgs do lead | Query: `page, limit` |

### WhatsApp

```bash
curl -X POST http://localhost:3847/api/crm/messages/whatsapp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"leadId": "LEAD_ID", "content": "Mensagem aqui"}'
```

**Regras Anti-Ban:**
- Delay minimo 30s entre mensagens
- Maximo 50 msgs/dia (novas conversas)
- Horario: 8h-20h
- Sem links encurtados, sem CAPS
- Maximo 3 tentativas se nao responde
- Opt-out = status lost, NUNCA mais enviar

### Email

```bash
curl -X POST http://localhost:3847/api/crm/messages/email \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "LEAD_ID",
    "subject": "Assunto",
    "content": "Corpo texto",
    "html": "<p>HTML opcional</p>"
  }'
```

### Webhook WhatsApp (Evolution API)

Endpoint publico para receber mensagens:
```
POST /api/crm/webhooks/evolution
```

---

## 7. TEMPLATES

### Endpoints

| Metodo | Path | Descricao |
|--------|------|-----------|
| GET | `/api/crm/templates` | Listar (filtro: `channel`, `category`) |
| GET | `/api/crm/templates/:id` | Detalhe |
| POST | `/api/crm/templates` | Criar |
| PUT | `/api/crm/templates/:id` | Atualizar |
| DELETE | `/api/crm/templates/:id` | Deletar |
| POST | `/api/crm/templates/:id/render` | Renderizar com dados do lead |

### Variaveis Suportadas

`{{name}}`, `{{company}}`, `{{position}}`, `{{email}}`, `{{phone}}`, `{{agentName}}`, `{{agentCompany}}`, `{{agentSignature}}`

---

## 8. CAMPANHAS

### Endpoints

| Metodo | Path | Descricao |
|--------|------|-----------|
| GET | `/api/crm/campaigns` | Listar (filtro: `status`, `page`, `limit`) |
| POST | `/api/crm/campaigns` | Criar (`{name, description?, channel}`) |
| GET | `/api/crm/campaigns/:id` | Detalhe com steps e leads |
| PUT | `/api/crm/campaigns/:id` | Atualizar campos |
| POST | `/api/crm/campaigns/:id/steps` | Definir steps da cadencia |
| POST | `/api/crm/campaigns/:id/leads` | Adicionar leads (`{leadIds: []}`) |
| POST | `/api/crm/campaigns/:id/start` | Iniciar campanha |
| POST | `/api/crm/campaigns/:id/pause` | Pausar campanha |
| GET | `/api/crm/campaigns/:id/stats` | Metricas da campanha |

### Status da Campanha

`draft` → `active` → `paused` / `completed`

### Definir Steps (Cadencia)

```json
{
  "steps": [
    {"order": 0, "delayDays": 0, "channel": "whatsapp", "template": "oi {{name}}..."},
    {"order": 1, "delayDays": 3, "channel": "whatsapp", "template": "e ai {{name}}..."},
    {"order": 2, "delayDays": 7, "channel": "email", "subject": "Assunto", "template": "Oi {{name}}..."}
  ]
}
```

### Regras de Campanha

1. Lead responde → campanha pausa para aquele lead
2. Um lead so pode estar em UMA campanha por vez
3. Mensagens apenas em horario comercial (8h-20h)
4. Taxa resposta < 5% → ajustar copy

---

## 9. DASHBOARD

### Endpoints

| Metodo | Path | Descricao |
|--------|------|-----------|
| GET | `/api/crm/dashboard/stats` | KPIs gerais (total leads, taxa resposta, campanhas ativas) |
| GET | `/api/crm/dashboard/pipeline` | Contadores por status do kanban |
| GET | `/api/crm/dashboard/activity` | Ultimas atividades (`limit` param) |

---

## 10. SETTINGS (Configuracoes)

### Endpoints

| Metodo | Path | Descricao |
|--------|------|-----------|
| GET | `/api/crm/settings` | Listar todas configuracoes |
| PUT | `/api/crm/settings` | Atualizar em batch (`{key: value, ...}`) |
| GET | `/api/crm/settings/setup-status` | Status do setup inicial |

### Campos do Perfil do Agente

| Chave | Descricao |
|-------|-----------|
| `agentName` | Nome usado nas mensagens |
| `agentCompany` | Nome da empresa |
| `agentRole` | Funcao/cargo do agente |
| `agentToneOfVoice` | casual, formal, profissional ou amigavel |
| `agentToneDescription` | Descricao detalhada do tom |
| `companyDescription` | O que a empresa faz |
| `companyServices` | Servicos oferecidos |
| `companyWebsite` | Site da empresa |
| `agentSignature` | Bloco de assinatura para emails |

### Outros Settings

| Chave | Descricao |
|-------|-----------|
| `tag_rules` | JSON string com regras de tag automaticas |
| `telegram_bot_token` | Token do bot Telegram |
| `telegram_chat_id` | Chat ID para notificacoes |

---

## 11. HEALTH CHECK

| Metodo | Path | Descricao |
|--------|------|-----------|
| GET | `/api/crm/health` | Status: ok ou initializing |
| GET | `/api/crm/` | Info: nome, versao, integrado |

---

## 12. FLUXO INTELIGENTE — DECISAO AUTOMATICA

```
LEAD MENCIONADO OU CONTATO REALIZADO?
  ├─ SIM → Buscar no CRM (GET /leads?search=...)
  │    ├─ ENCONTROU → Atualizar status + temperatura + nota
  │    └─ NAO ENCONTROU → Criar lead com dados disponiveis
  ├─ MENSAGEM ENVIADA?
  │    ├─ WhatsApp → POST /messages/whatsapp + status=contacted
  │    └─ Email → POST /messages/email + status=contacted
  ├─ LEAD RESPONDEU?
  │    ├─ Interesse → status=interested, temp=hot
  │    ├─ Duvida → status=replied, temp=warm
  │    └─ Recusa → status=lost (ou warm se "nao agora")
  └─ PROPOSTA/NEGOCIACAO?
       ├─ Proposta enviada → status=negotiating, tag=proposta-enviada
       ├─ Fechou → status=won, temp=hot
       └─ Perdeu → status=lost
```

---

## 13. API ECOSSISTEMA (Nao-CRM)

O servidor em `http://localhost:3847/api` tambem expoe:

| Area | Endpoints |
|------|-----------|
| Tasks | CRUD em `/api/tasks`, `/api/tasks/:id/run`, `/api/tasks/:id/pause` |
| Executions | `/api/executions`, `/api/executions/stats`, `/api/executions/running` |
| Config | `/api/config` |
| Scheduler | `/api/scheduler/start`, `/api/scheduler/stop` |
| Notifications | `/api/notifications/config`, `/api/notifications/test` |
| Memory | `/api/memory/sessions` (CRUD completo com checkpoints, tags, favoritos) |
| Export/Import | `/api/export`, `/api/import` |
| Knowledge Base | `/api/kb/documents`, `/api/kb/documents/:id` |
| Prompt Templates | `/api/prompt-templates` (CRUD) |
| Credentials | `/api/credentials/list` |
| Telegram | `/api/telegram/config`, `/api/telegram/test` |

---

## 14. AGENTES ESPECIALIZADOS

| Agente | Responsabilidade |
|--------|-----------------|
| `crm-lead-manager` | CRUD leads, pipeline, temperatura, tags, importacao |
| `crm-outreach-specialist` | Envio de msgs (WhatsApp/Email), templates, personalizacao |
| `crm-campaign-manager` | Campanhas automatizadas, cadencias, metricas |

---

## 15. VALIDACAO (ZOD)

Todos os inputs sao validados com Zod. Principais regras:
- `name`: string 2-100 chars
- `email`: formato email valido
- `password`: string 8-128 chars
- `status`: enum `new|contacted|replied|interested|negotiating|won|lost`
- `temperature`: enum `cold|warm|hot`
- `channel`: enum `whatsapp|email`
- `page`: int >= 1
- `limit`: int 1-100 (padrao 20)
- `tags`: array de strings

---

## 16. LIÇÕES APRENDIDAS

### 2026-03-11 — Tarefas pessoais devem ser criadas no CRM local (porta 3847)

**Contexto:** Usuário pediu para criar uma tarefa no projeto do Claude Code.
**Erro:** IA usou TaskCreate (tarefa interna da sessão) em vez da API do sistema real. Tarefas internas do Claude somem quando a sessão termina e não ficam persistidas no sistema do usuário.
**Solução:** Usar `POST http://localhost:3847/api/crm/personal-tasks` com body JSON incluindo `title`, `description`, `priority`, `dueDate` (ISO 8601 completo, ex: `"2026-03-12T12:00:00.000Z"`), `status`.
**Regra:** SEMPRE que o usuário pedir "crie uma tarefa", "lembre-me de", "adicione um to-do", usar `POST /api/crm/personal-tasks` — NUNCA TaskCreate do Claude.
**Valores válidos:**
- `priority`: `low | medium | high | urgent`
- `status`: `pending | in_progress | completed | cancelled`
- `dueDate`: ISO 8601 com timezone — NUNCA só a data sem hora/timezone

**Documentação completa das rotas:** `knowledge-base/CRM-SISTEMA-LOCAL-PORT-3847-DOCUMENTACAO.md`
- `leadIds`: array de CUIDs (min 1)

### 2026-03-21 — Módulo Financeiro é frontend-only (SPA), NÃO tem API REST

**Contexto:** Usuário pediu resumo do financeiro do mês. IA tentou acessar `/api/crm/financial/summary`, `/api/crm/financial/bills` e buscou notas com "financeiro"/"pagar"/"conta".
**Erro:** Todas as tentativas via API REST falharam com "Rota não encontrada". O módulo financeiro do CRM NÃO expõe endpoints REST — os dados são renderizados apenas no frontend React em `http://localhost:3847/finance`.
**Solução:** Usar Chrome DevTools MCP (`navigate_page` + `take_snapshot`) para acessar `http://localhost:3847/finance` e ler os dados do DOM/a11y tree.
**Regra:** Para consultar dados financeiros do CRM, SEMPRE usar Chrome DevTools no `http://localhost:3847/finance`. NUNCA tentar endpoints `/api/crm/finance*` — eles NÃO existem. O filtro de mês/ano está disponível via combobox na página.

### 2026-03-24 — Scheduled Tasks: endpoint correto para CRUD é /api/tasks/scheduled

**Contexto:** Deletar tarefa agendada "Fiber - Auditoria Diária Criativos" do CRM local (porta 3847).
**Erro:** Tentativas em `DELETE /api/scheduled-tasks/:id` e diversas variações retornaram 404. O endpoint `/api/scheduled-tasks` (módulo compat) é READ-ONLY (apenas GET).
**Solução:** O endpoint CRUD completo fica em `/api/tasks/scheduled/:id` (módulo `src/modules/tasks/routes.js`). Suporta GET, POST, PUT e DELETE.
**Regra:** Para CRUD de scheduled tasks, SEMPRE usar `/api/tasks/scheduled/:id`. O endpoint `/api/scheduled-tasks` é alias read-only do módulo compat e possui cache em memória separado — pode mostrar dados stale após DELETE via `/api/tasks/scheduled/:id`.
