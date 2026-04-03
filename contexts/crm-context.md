# CRM Context - Carregar quando usar CRM

## AUTENTICACAO

```bash
# Login (retorna JWT)
curl -X POST http://localhost:3847/api/crm/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"USER_EMAIL","password":"USER_PASS"}'
# → salvar data.token para usar como Bearer em todas requisicoes
```

## PIPELINE (KANBAN) — 7 STATUS

| Status | Quando usar |
|--------|-------------|
| `new` | Lead recem-adicionado, sem contato |
| `contacted` | Primeira mensagem enviada |
| `replied` | Lead respondeu (qualquer canal) |
| `interested` | Demonstrou interesse real ("quanto custa?", "proposta") |
| `negotiating` | Proposta enviada, negociando |
| `won` | Fechou negocio/converteu |
| `lost` | Desistiu ou nao responde mais |

## TEMPERATURA — 3 NIVEIS

| Temp | Criterio | Acao |
|------|----------|------|
| `cold` | Sem interacao ou 14+ dias sem resposta | Follow-up em 7 dias |
| `warm` | Respondeu mas sem decisao | Follow-up em 3 dias |
| `hot` | Interesse claro, pediu proposta | Prioridade maxima |

## API RAPIDA — ENDPOINTS

| Acao | Metodo | Endpoint |
|------|--------|----------|
| Listar leads | GET | `/api/crm/leads?status=X&temperature=Y&search=Z` |
| Criar lead | POST | `/api/crm/leads` |
| Atualizar lead | PUT | `/api/crm/leads/:id` |
| Deletar lead | DELETE | `/api/crm/leads/:id` |
| Detalhe lead | GET | `/api/crm/leads/:id` |
| Adicionar nota | POST | `/api/crm/leads/:id/notes` |
| Enviar WhatsApp | POST | `/api/crm/messages/whatsapp` |
| Enviar e-mail | POST | `/api/crm/messages/email` |
| Historico msgs | GET | `/api/crm/leads/:id/messages` |
| Importar CSV | POST | `/api/crm/leads/import` (multipart) |
| KPIs dashboard | GET | `/api/crm/dashboard/stats` |
| Pipeline | GET | `/api/crm/dashboard/pipeline` |
| Atividades | GET | `/api/crm/dashboard/activity` |
| Templates | GET/POST | `/api/crm/templates` |
| Campanhas | GET/POST | `/api/crm/campaigns` |
| Steps campanha | POST | `/api/crm/campaigns/:id/steps` |
| Iniciar campanha | POST | `/api/crm/campaigns/:id/start` |
| Pausar campanha | POST | `/api/crm/campaigns/:id/pause` |
| Settings | GET/PUT | `/api/crm/settings` |
| Tags IA (rules) | via Settings | `tag_rules` key em settings |
| Health check | GET | `/api/crm/health` |

## FLUXO INTELIGENTE — DECISAO AUTOMATICA

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

## MODULOS DO ECOSSISTEMA — Personal Tasks, Finance, Notes

**Frontend:** `http://localhost:3847/` (SPA React, menu lateral)
**API Base:** `http://localhost:3847/api/crm`
**Auth:** `Authorization: Bearer local-dev-token`

### Personal Tasks (Minhas Tarefas)

| Acao | Metodo | Endpoint |
|------|--------|----------|
| Listar | GET | `/api/crm/personal-tasks?status=X&priority=Y&search=Z` |
| Criar | POST | `/api/crm/personal-tasks` |
| Atualizar | PUT | `/api/crm/personal-tasks/:id` |
| Mudar status | PUT | `/api/crm/personal-tasks/:id/status` |
| Deletar | DELETE | `/api/crm/personal-tasks/:id` |
| Estatisticas | GET | `/api/crm/personal-tasks/stats` |

**Status:** `pending` | `in_progress` | `completed` | `cancelled`
**Prioridade:** `low` | `medium` | `high`

### Finance (Financeiro)

| Acao | Metodo | Endpoint |
|------|--------|----------|
| Transacoes | GET | `/api/crm/finance/transactions?month=X&year=Y&type=Z` |
| Criar transacao | POST | `/api/crm/finance/transactions` |
| Categorias | GET | `/api/crm/finance/categories` |
| Resumo mensal | GET | `/api/crm/finance/summary?month=X&year=Y` |
| Orcamentos | GET/POST | `/api/crm/finance/budgets?month=X&year=Y` |
| Metas | GET/POST | `/api/crm/finance/goals` |
| Investimentos | GET/POST | `/api/crm/finance/investments` |

### Notes (Notas)

| Acao | Metodo | Endpoint |
|------|--------|----------|
| Listar | GET | `/api/crm/notes?search=X&categoryId=Y&archived=false&pinned=true` |
| Criar | POST | `/api/crm/notes` |
| Atualizar | PUT | `/api/crm/notes/:id` |
| Toggle pin | PUT | `/api/crm/notes/:id/pin` |
| Categorias | GET/POST | `/api/crm/notes/categories` |

## REGRA DE OURO — SEMPRE MANTER O CRM ATUALIZADO

Ao interagir com QUALQUER lead (WhatsApp, email, ligacao, reuniao):
1. **BUSCAR** se o lead ja existe: `GET /api/crm/leads?search=nome_ou_telefone`
2. **CRIAR** se nao existe: `POST /api/crm/leads` com dados coletados
3. **ATUALIZAR** status/temperatura conforme a interacao
4. **REGISTRAR** nota com contexto da conversa: `POST /api/crm/leads/:id/notes`

NUNCA enviar mensagem para lead sem antes criar/atualizar no CRM.

## WHATSAPP — REGRA CRITICA

**ENVIAR SEMPRE VIA CRM:**
```bash
curl -X POST http://localhost:3847/api/crm/messages/whatsapp \
  -H "Authorization: Bearer local-dev-token" \
  -H "Content-Type: application/json" \
  -d '{"leadId":"ID_DO_LEAD","content":"mensagem aqui"}'
```
Isso garante que TODAS as mensagens aparecem em http://localhost:3847/#/conversations.

**Tom e estilo:** Carregar do perfil do agente no CRM (GET /api/crm/settings):
- `agentToneOfVoice`: casual | amigavel | profissional | formal
- `agentToneDescription`: descricao detalhada

Instancia: `cenora`. Confirmar com usuario ANTES de enviar. 30s entre msgs.

## DOCUMENTACAO COMPLETA

Ver: `~/.claude/knowledge-base/CRM-DOCUMENTACAO-COMPLETA.md`