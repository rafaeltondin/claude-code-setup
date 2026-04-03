# Plano: Sentinel Alpha — Sistema de Inteligência Contínua para Ações

## Contexto

Rafael quer um sistema que rode **diariamente como tarefa agendada**, analise o mercado global cruzando todas as informações possíveis (macro, notícias, earnings, insider buying, relatórios financeiros oficiais, cenário geopolítico), preserve histórico para comparação, e diga **exatamente qual ação comprar e quando**.

O sistema atual é um protótipo que roda manualmente e não persiste dados. Precisa virar um **sistema de inteligência contínua**.

**Mudança arquitetural importante (pedido do usuário):** A análise profunda diária deve ser feita pelo **Claude Code** (que tem WebSearch, WebFetch, agentes especializados) invocado como tarefa agendada. O bot Python coleta dados e persiste, mas o Claude faz a análise crítica e gera os sinais.

---

## Arquitetura: Híbrida Python + Claude Code

```
┌─────────────────────────────────────────────────────────┐
│  CAMADA 1 — PYTHON (roda 24/7, coleta e persiste)       │
│                                                         │
│  scheduler.py → Cron diário 06:00 EST                   │
│    → collector.py: preços, dividendos, macro, VIX       │
│    → piotroski.py: F-Score de cada ação                 │
│    → shareholder_yield.py: SY de cada ação              │
│    → momentum.py: RSI, MACD, EMA                        │
│    → Salva TUDO no SQLite                               │
│    → Gera JSON resumo do dia                            │
│                                                         │
│  Quando termina → dispara Claude Code via task agendada │
└────────────────────────┬────────────────────────────────┘
                         │
                         v
┌─────────────────────────────────────────────────────────┐
│  CAMADA 2 — CLAUDE CODE (análise profunda)              │
│                                                         │
│  Recebe: JSON com dados do dia + histórico do DB        │
│  Faz:                                                   │
│    → WebSearch: notícias globais, geopolítica, macro    │
│    → WebFetch: relatórios financeiros oficiais (10-Q,   │
│      earnings releases nos sites de RI das empresas)    │
│    → Agentes especializados: análise crítica cruzada    │
│    → Compara com histórico (DB) — o que mudou?          │
│    → Gera sinais: BUY/SELL/HOLD com reasoning           │
│    → Envia relatório via Telegram                       │
│                                                         │
│  Salva: sinais, relatório, scores no SQLite             │
└─────────────────────────────────────────────────────────┘
```

### Por que híbrido?

| Tarefa | Python | Claude Code |
|--------|--------|-------------|
| Coletar preços/dividendos | ✓ (yfinance) | — |
| Calcular F-Score/SY | ✓ (math) | — |
| Buscar notícias globais | — | ✓ (WebSearch) |
| Ler relatórios financeiros oficiais | — | ✓ (WebFetch) |
| Analisar cenário geopolítico | — | ✓ (WebSearch + raciocínio) |
| Cruzar informações criticamente | — | ✓ (agentes especializados) |
| Gerar recomendação em linguagem natural | — | ✓ (LLM) |
| Persistir dados | ✓ (SQLite) | — |
| Enviar Telegram | ✓ (python-telegram-bot) | — |
| Rodar 24/7 no schedule | ✓ (APScheduler) | — |

---

## Banco de Dados (SQLite)

**8 tabelas principais:**

1. `daily_scores` — snapshot diário de cada ação (preço, F-Score, SY, momentum, composite)
2. `signals` — sinais BUY/SELL/HOLD com reasoning + validação posterior (was_correct)
3. `positions` — holdings atuais com cost basis
4. `trades` — histórico de trades executados
5. `macro_history` — VIX, Fear&Greed, SPY regime, oil, ouro diário
6. `earnings_calendar` — datas de earnings + surprises + PEAD tracking
7. `news_events` — notícias relevantes com impacto mapeado
8. `daily_reports` — texto completo de cada relatório diário
9. `score_trends` — tendência de cada métrica (improving/stable/declining)
10. `signal_performance` — win rate mensal/trimestral

---

## Pipeline Diário

### Fase 1 — Python coleta dados (06:00 EST)
1. Macro: SPY, VIX, Fear&Greed, Oil, Gold, DXY
2. Stocks: preço, dividendo, volume para 26 ações (portfolio + watchlist)
3. Scores: F-Score, Shareholder Yield, RSI, MACD, EMA200
4. Trends: comparar com 7d/30d/90d atrás
5. Composite score 0-100
6. Salvar tudo no SQLite
7. Gerar JSON resumo

### Fase 2 — Claude Code analisa (06:30 EST, via task agendada)
1. Ler JSON resumo + histórico do DB
2. WebSearch: notícias globais, geopolítica, macro
3. WebFetch: relatórios financeiros oficiais (10-Q, earnings releases)
4. Cruzar: quais ações se beneficiam dos eventos atuais?
5. Comparar: o que mudou vs ontem/semana passada/mês passado?
6. Gerar sinais com reasoning detalhado
7. Formatar relatório
8. Enviar via Telegram
9. Salvar sinais e relatório no DB

### Fase 3 — Validação (semanal)
1. Verificar sinais de 30/60/90 dias atrás
2. Calcular win rate
3. Ajustar pesos do composite se necessário

---

## Arquivos a criar/modificar

### Novos (14 arquivos):
- `db/schema.sql` — DDL completo
- `db/database.py` — SQLite manager
- `config/sectors.py` — Mapa de setores + macro impact
- `analysis/momentum.py` — RSI, MACD, EMA cross
- `analysis/composite.py` — Score 0-100 engine
- `analysis/history.py` — Comparação temporal + trend detection
- `signals/generator.py` — Signal engine
- `signals/convergence.py` — Detector de convergência multi-catalyst
- `data/earnings.py` — Earnings calendar + PEAD
- `data/news.py` — RSS feeds + sentiment
- `alerts/telegram.py` — Telegram bot sender
- `alerts/formatter.py` — Formata relatórios para Telegram
- `pipeline/daily.py` — Orquestrador do pipeline Python
- `run.py` — Entry point (--once, --schedule, --backfill)

### Modificar (2 arquivos):
- `config/settings.py` — Atualizar portfolio (AVGO, NOC, MSFT, CEG, LLY, SCHD) + Telegram config
- `main.py` — Refatorar para chamar pipeline

### Task agendada Claude Code (1 arquivo):
- `~/.claude/tasks/sentinel-daily-analysis.md` — Prompt estruturado que o scheduler invoca diariamente

---

## Lógica de Sinais

**BUY STRONG (3+ catalisadores convergindo):**
- F-Score ≥ 7 AND improving
- Regime BULL + VIX < 25
- Pelo menos 1 catalyst: PEAD, insider buying, price dip em BULL, sector rotation
- Momentum confirmado (preço > EMA200)

**BUY MODERATE (2 catalisadores):**
- F-Score ≥ 6, composite improving
- Sem red flags

**SELL/TRIM:**
- F-Score ≤ 3 (qualidade deteriorando)
- Stop loss -10% atingido
- Posição > 30% do portfólio

---

## Relatórios Financeiros Oficiais

O Claude Code deve buscar e analisar:
- **10-Q/10-K** via SEC EDGAR (já temos sec-edgar-downloader)
- **Earnings releases** nos sites de Investor Relations das empresas
- **Guidance** — o que a empresa disse sobre o futuro
- **Conference call highlights** — pontos principais da call com analistas
- **Comparar** guidance atual vs anterior: melhorou ou piorou?

---

## Faseamento

**Fase 1 (Dia 1-2):** DB + config atualizado + momentum
**Fase 2 (Dia 3-4):** Composite score + history + trends
**Fase 3 (Dia 5-6):** Signals + convergence
**Fase 4 (Dia 7-8):** Pipeline daily + Telegram
**Fase 5 (Dia 9-10):** Scheduler + run.py + task Claude Code
**Fase 6 (Dia 11+):** Backfill histórico + refinamento

---

## Verificação

1. `python run.py --once` → roda pipeline completo uma vez, verifica DB populado
2. Checar SQLite: `SELECT * FROM daily_scores WHERE date = '2026-03-18'`
3. Checar Telegram: mensagem recebida com relatório
4. `python run.py --backfill 30` → preenche 30 dias de histórico
5. `python run.py --schedule` → deixar rodando e verificar na manhã seguinte
