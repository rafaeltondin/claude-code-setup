# ADS DASHBOARD — Documentação Completa

**URL:** https://ads.rafaeltondin.com.br/
**Servidor:** `/home/ads.rafaeltondin.com.br/ads-dashboard/`
**Stack:** Next.js 14.2.29 + Prisma + PostgreSQL + TailwindCSS + Recharts
**PM2:** `ads-dashboard` (id 4)
**Data:** 2026-03-24

---

## 1. Visão Geral

Dashboard unificado de anúncios que consolida Meta Ads e Google Ads. Desenvolvido pela Riwer Labs. Permite gerenciar múltiplas contas de anúncio, visualizar métricas agregadas, configurar alertas e enviar relatórios via WhatsApp.

---

## 2. Credenciais e Variáveis de Ambiente

```env
DATABASE_URL=postgresql://ads_user:ads_secure_2026@127.0.0.1:5432/ads_dashboard
NEXTAUTH_URL=https://ads.rafaeltondin.com.br
SESSION_SECRET=riwer-labs-ads-dashboard-2026-secret-key
DASHBOARD_PASSWORD=riwerlabs2026

# Meta Ads
META_APP_ID=2352475445252847
META_APP_SECRET=b301a6fe4ab5175d77233b0a5f9d0662
META_REDIRECT_URI=https://ads.rafaeltondin.com.br/api/auth/meta/callback
META_GRAPH_VERSION=v21.0

# Google Ads
GOOGLE_CLIENT_ID=<SEU_GOOGLE_CLIENT_ID>
GOOGLE_CLIENT_SECRET=<SEU_GOOGLE_CLIENT_SECRET>
GOOGLE_REDIRECT_URI=https://ads.rafaeltondin.com.br/api/auth/google/callback
GOOGLE_DEVELOPER_TOKEN=<SEU_GOOGLE_DEVELOPER_TOKEN>

# API Pública
PUBLIC_API_KEY=<SUA_PUBLIC_API_KEY>
```

---

## 3. Schema do Banco (Prisma)

### Account
- `id` (cuid), `platform` (META|GOOGLE), `customerId`, `name`, `displayName`, `clientName`
- `status` (ACTIVE|INACTIVE|ERROR), `active` (bool)
- `goalRoas`, `goalCpa`, `goalBudget` (floats)
- `displayMetrics`, `dailyColumnOrder`, `dailyVisibleCols`, `campaignColumnOrder`, `campaignVisibleCols` (string arrays)
- Relations: insights[], integration?, notifications[]
- Unique: [platform, customerId]

### Integration
- `id`, `accountId` (unique → Account), `accessToken`, `refreshToken`, `scopes[]`, `expiresAt`, `platform`

### Insight
- `id`, `accountId` → Account, `date` (Date), `platform`
- `impressions`, `clicks`, `spend`, `conversions`, `revenue`
- `roas`, `cpa`, `ctr` (calculados)
- `whatsappContacts`, `profileVisits`
- Unique: [accountId, date, platform]

### NotificationConfig
- `id`, `accountId` → Account, `frequency` (WEEKLY|BIWEEKLY|MONTHLY)
- `recipientPhones[]`, `recipientNames[]`, `dayOfWeek`, `sendTime`
- `reportMetrics[]`, `active`, `lastSent`

### Alert
- `id`, `name`, `condition` (text), `active`, `triggered`, `lastTrigger`

---

## 4. APIs Autenticadas (Cookie `ads_s`)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/auth/login` | POST | Login user/pass → JWT cookie |
| `/api/auth/logout` | POST | Logout |
| `/api/auth/meta/login` | GET | OAuth Meta redirect |
| `/api/auth/meta/callback` | GET | OAuth Meta callback |
| `/api/auth/google/login` | GET | OAuth Google redirect |
| `/api/auth/google/callback` | GET | OAuth Google callback |
| `/api/accounts/list` | GET | Listar contas (com ?platform=GOOGLE\|META para pending) |
| `/api/accounts/connect` | POST | Conectar conta (com auto-sync) |
| `/api/accounts/disconnect` | POST | Desconectar conta |
| `/api/accounts/[id]/goals` | GET/PUT | Metas da conta |
| `/api/accounts/[id]/preferences` | GET/PUT | Preferências de colunas |
| `/api/insights/fetch` | POST | Buscar insights de uma conta |
| `/api/insights/aggregate` | GET | Agregar insights cross-account |
| `/api/campaigns/[accountId]` | GET | Listar campanhas Meta |
| `/api/campaigns/[accountId]` | POST | Pausar/ativar campanha |
| `/api/notifications` | GET/POST | Configurações de notificação |
| `/api/notifications/[id]` | PUT/DELETE/POST | CRUD + envio de relatório WhatsApp |

---

## 5. APIs Públicas (Header `X-API-Key` ou `?api_key=`)

**API Key:** `ads-public-api-2026-riwerlabs`
**Vault:** `ADS_DASHBOARD_API_KEY`

| Endpoint | Método | Descrição | Params |
|----------|--------|-----------|--------|
| `/api/public/health` | GET | Status do sistema | — |
| `/api/public/accounts` | GET | Todas as contas com métricas | `?days=7` |
| `/api/public/accounts/[id]` | GET | Detalhes conta + daily breakdown | `?days=7` |
| `/api/public/accounts/[id]/insights` | GET | Insights diários por conta | `?days=7&start=&end=` |
| `/api/public/accounts/[id]/campaigns` | GET | Campanhas Meta com métricas | `?days=7` |
| `/api/public/insights` | GET | Insights agregados cross-account | `?days=7&platform=META&accountId=` |
| `/api/public/summary` | GET | Resumo executivo completo | `?days=7` |
| `/api/public/sync` | POST | Trigger manual de sync | body: `{days: 2}` |

### Exemplos com curl

```bash
# Health
curl -H "X-API-Key: ads-public-api-2026-riwerlabs" https://ads.rafaeltondin.com.br/api/public/health

# Resumo 30 dias
curl -H "X-API-Key: ads-public-api-2026-riwerlabs" "https://ads.rafaeltondin.com.br/api/public/summary?days=30"

# Campanhas de uma conta
curl -H "X-API-Key: ads-public-api-2026-riwerlabs" "https://ads.rafaeltondin.com.br/api/public/accounts/cmn1zuyna0000y16ugi33sztu/campaigns?days=7"

# Sync manual
curl -X POST -H "X-API-Key: ads-public-api-2026-riwerlabs" -H "Content-Type: application/json" -d '{"days":3}' https://ads.rafaeltondin.com.br/api/public/sync
```

---

## 6. Ferramenta tools-cli: `ads_dashboard`

```bash
# Ações disponíveis
node tools-cli.js ads_dashboard action=health
node tools-cli.js ads_dashboard action=accounts days=7
node tools-cli.js ads_dashboard action=account account_id=ID days=7
node tools-cli.js ads_dashboard action=insights days=30 platform=META
node tools-cli.js ads_dashboard action=account_insights account_id=ID days=30
node tools-cli.js ads_dashboard action=campaigns account_id=ID days=7
node tools-cli.js ads_dashboard action=summary days=7
node tools-cli.js ads_dashboard action=sync days=2
```

---

## 7. Sync Diário Automático

**Script:** `/home/ads.rafaeltondin.com.br/ads-dashboard/scripts/sync-daily.js`
**Cron:** `0 6 * * *` (diariamente às 06:00)
**Log:** `/var/log/ads-sync.log`

Busca dados dos últimos 2 dias para todas as contas ativas (Meta + Google). Usa Prisma diretamente (sem Next.js), dotenv para env vars, fetch nativo do Node 22.

---

## 8. Contas Conectadas (2026-03-24)

| ID | Nome | Cliente | Plataforma | Spend 7d | ROAS |
|----|------|---------|------------|----------|------|
| cmn1zuyna... | conta 01 | TakeBag | META | R$ 3.005 | 5.61x |
| cmn1yss18... | Pinha Originals | Pinha Originals | META | R$ 932 | 2.29x |
| cmn1d2ebo... | Performa Academia | Performa Academia | META | R$ 533 | — |
| cmn24kfka... | CA1 | Chaiane | META | R$ 140 | — |
| cmn24g0aq... | A1 | Fama Odontologia | META | R$ 102 | — |
| cmn24h75d... | CA1 | BetPredict | META | R$ 24 | — |
| cmn351i70... | Cristian Batista | DropKite | META | R$ 24 | — |

**Total 7d:** R$ 4.760 investidos, R$ 18.997 receita, ROAS 3.99x, 120 conversões

---

## 9. Arquitetura de Arquivos

```
/home/ads.rafaeltondin.com.br/ads-dashboard/
├── app/
│   ├── api/
│   │   ├── auth/ (login, logout, meta/*, google/*)
│   │   ├── accounts/ (list, connect, disconnect, [id]/goals, [id]/preferences)
│   │   ├── campaigns/ ([accountId])
│   │   ├── insights/ (fetch, aggregate)
│   │   ├── notifications/ (route, [id])
│   │   ├── public/ (health, accounts, accounts/[id], accounts/[id]/insights, accounts/[id]/campaigns, insights, summary, sync)
│   │   └── cron/ (sync-daily)
│   ├── accounts/ (pages)
│   ├── alerts/ (page)
│   ├── login/ (page)
│   ├── page.tsx (dashboard)
│   └── layout.tsx
├── lib/ (auth, db, meta-ads, google-ads, public-auth, utils)
├── prisma/ (schema.prisma)
├── scripts/ (sync-daily.js)
├── middleware.ts
└── .env
```

---

## 10. Observações

- **791 restarts no PM2** — instabilidade histórica, monitorar
- Middleware permite `/api/public/*` sem cookie, mas exige `X-API-Key` header ou `?api_key=` query param
- Meta tokens são long-lived (~60 dias), Google usa refresh token automático
- 3 contas com erro de permissão Meta no sync (tokens expirados) — reautorizar
- WhatsApp reports via Evolution API (`evolution.rafaeltondin.com.br`)
