# Framework de Teste de Criativos Meta Ads — Fiber

> **Versão:** 1.0 | **Data:** 2026-03-17 | **Base:** Revisão sistemática de 10 fontes (2025-2026)
> **Estudo principal:** Motion Creative Benchmarks 2026 — $1.29B ad spend, 600K ads, 6.015 anunciantes

---

## Índice

1. [Princípios Fundamentais](#1-princípios-fundamentais)
2. [Estrutura de Campanha (ABO/CBO)](#2-estrutura-de-campanha)
3. [Orçamento por Teste](#3-orçamento-por-teste)
4. [Protocolo Temporal (Dia a Dia)](#4-protocolo-temporal)
5. [Critérios de Decisão](#5-critérios-de-decisão)
6. [Métricas por Fase](#6-métricas-por-fase)
7. [Protocolo de Escala](#7-protocolo-de-escala)
8. [Configuração Padrão Fiber](#8-configuração-padrão-fiber)
9. [Operação Diária do Agente](#9-operação-diária-do-agente)
10. [Referências](#10-referências)

---

## 1. Princípios Fundamentais

### 1.1 Volume > Intuição
- Apenas **4-8% dos criativos** se tornam vencedores [1]
- Top performers: **54.6 criativos/semana** → **10.5 vencedores/mês** [1]
- Mediana: **18.9 criativos/semana** → **4.0 vencedores/mês** [1]
- **Conclusão:** Produzir mais criativos é mais eficaz que tentar prever vencedores

### 1.2 Efeito Andromeda
- Com 10 ads, o algoritmo concentra **80% do gasto em 2-3 ads** [3]
- Isso invalida testes com múltiplos criativos no mesmo adset
- **Solução:** 1 criativo por adset para comparação justa

### 1.3 Fadiga Criativa
- Frequência > 6x = **queda de ~16% na intenção de compra** [10]
- Top brands fazem refresh a cada **10 dias** [10]
- Contas menores: refresh **mensal** [5]

### 1.4 Advantage+ Performance
- Advantage+ gera **$4.52 por $1 gasto** — 22% superior a manual [2]
- Validar uso de Advantage+ Audience como padrão em escala

---

## 2. Estrutura de Campanha

### 2.1 Framework Híbrido (consenso 2025-2026)

```
TESTE (ABO) → Validação → ESCALA (CBO via Post ID) → Refresh → Repetir
```

### 2.2 Campanha de TESTE (ABO)

| Parâmetro | Valor |
|-----------|-------|
| Tipo | ABO (Ad Set Budget Optimization) |
| Adsets | 4-6, cada um com 1 criativo |
| Orçamento | Igual por adset (R$150/dia) |
| Audiência | Mesma em todos os adsets |
| Posicionamentos | Todos abertos |
| Otimização | Purchase (evento final) |
| Bid | Lowest cost without cap |

**Por que ABO para teste:** Garante que cada criativo receba orçamento idêntico. CBO introduz viés de alocação (Andromeda) antes da significância estatística [6].

### 2.3 Campanha de ESCALA (CBO)

| Parâmetro | Valor |
|-----------|-------|
| Tipo | CBO (Campaign Budget Optimization) |
| Conteúdo | Apenas criativos validados |
| Orçamento | R$200-500+/dia (campanha) |
| Audiência | Advantage+ Audience |
| Migração | Via Post ID (mantém social proof) |
| Escala | +20% a cada 3 dias |

**Por que CBO para escala:** Delega alocação ao algoritmo, que demonstra 22% mais eficiência [2].

---

## 3. Orçamento por Teste

### 3.1 Fórmula Universal

```
B_min = N_conversões × CPA_esperado
```

- **N_conversões:** 50+ para significância estatística [4]
- **CPA Fiber:** ~R$100 (média histórica)
- **B_min Fiber:** 50 × R$100 = **R$5.000 por criativo** (teste completo)

### 3.2 Níveis de Teste

| Nível | Conversões | Budget/criativo | Budget/dia | Duração | Confiança |
|-------|-----------|----------------|-----------|---------|-----------|
| Sinal rápido | 8-15 | R$800-1.500 | R$100/dia | 7-10 dias | Direcional |
| **Conversão válida** | **25-35** | **R$2.500-3.500** | **R$150/dia** | **14-21 dias** | **Moderada** |
| Significante | 50+ | R$5.000+ | R$200/dia | 25-30 dias | Alta |

### 3.3 Alocação Total

- **Regra 80/20:** 80% em criativos comprovados, 20% em testes [9]
- **Recomendado Fiber:** R$150/dia × 4-6 criativos = **R$600-900/dia em testes**
- Restante do budget → campanhas de escala com winners

---

## 4. Protocolo Temporal

| Dia | Fase | Ação | Gasto acumulado/criativo |
|-----|------|------|------------------------|
| **0** | Preparação | Selecionar 4-6 criativos, montar campanha ABO | R$0 |
| **1** | Lançamento | Publicar. **NÃO TOCAR** | R$150 |
| **2-4** | Learning | Observar apenas. Registrar CTR, CPM, hook rate. Sem alterações | R$450-600 |
| **5** | **1a Decisão** | Aplicar critérios 5.1. Pausar perdedores óbvios | **R$750** |
| **6-9** | Maturação | Sobreviventes rodam. Monitorar tendência ROAS | R$900-1.350 |
| **10** | **2a Decisão** | Aplicar critérios 5.2. PAUSAR / ESTENDER / ESCALAR | **R$1.500** |
| **11-14** | Confirmação | Opcional: manter borderline para 25+ conversões | R$1.650-2.100 |
| **14-21** | **Escala** | Migrar winners para CBO. Iniciar nova rodada de teste | R$2.100-3.150 |

**Regras invioláveis:**
- **Dias 1-4:** ZERO alterações (learning phase)
- **Dia 5:** APENAS pausar perdedores óbvios (ROAS < 1.0)
- **Dia 10:** Decisão final com dados suficientes (~15 conversões)

---

## 5. Critérios de Decisão

### 5.1 Dia 5 — Primeira Decisão (R$750+ gastos)

| Ação | ROAS | CPA | CTR | Conversões | Outros |
|------|------|-----|-----|-----------|--------|
| **PAUSAR** | < 1.0 | > R$200 | < 0.5% | 0 com R$500+ | Hook rate < 15% |
| **OBSERVAR** | 1.0 - 2.5 | R$100-200 | > 0.8% | Presente, baixo | Tendência de melhora |
| **PROMISSOR** | > 2.5 | < R$100 | > 1.2% | 5+ em 5 dias | Saves/shares altos |

### 5.2 Dia 10 — Decisão Final (R$1.500+ gastos)

| Ação | ROAS | CPA | Conversões | Frequência |
|------|------|-----|-----------|-----------|
| **PAUSAR definitivo** | < 2.0 (últimos 5d) | Não reduziu desde dia 5 | < 8 em 10 dias | > 3.0 |
| **ESTENDER +7 dias** | 2.0 - 2.5 (borderline) | Melhorando | < 15 (insuficiente) | Normal |
| **ESCALAR** | > 2.5 consistente | Estável ou melhorando | 15+ acumuladas | < 4.0 |

### 5.3 Metas de Referência Fiber

| Métrica | Meta | Baseado em |
|---------|------|-----------|
| ROAS | > 3.0x | Campanhas Trail (5-6x) |
| CPA | < R$100 | Média histórica R$99 |
| CTR | > 1.0% | Média da conta 1.03% |
| Frequência máx | < 6.0 | Queda 16% intenção [10] |

---

## 6. Métricas por Fase

| Métrica | Fase | Meta Fiber | Alerta | Ref |
|---------|------|-----------|--------|-----|
| Hook Rate (3s views / impressions) | Dias 1-3 | > 25% | < 15% | [9] |
| CTR (link click) | Dias 1-5 | > 1.0% | < 0.5% | [5] |
| CPM | Dias 1-5 | < R$30 | > R$50 | [4] |
| ThruPlay Rate | Dias 3-7 | > 15% | < 8% | [9] |
| ATC Rate | Dias 3-7 | > 5% | 0 ATCs em 3 dias | [5] |
| CPA | Dias 5-14 | < R$100 | > R$150 | [4] |
| ROAS | Dias 7-14 | > 3.0x | < 2.0x (5 dias) | [4] |
| Frequência | Dia 10+ | < 4.0 | > 6.0 | [10] |

---

## 7. Protocolo de Escala

| Etapa | Ação | Condição para avançar |
|-------|------|----------------------|
| 1 | Duplicar winner via Post ID → campanha CBO | ROAS > 2.5 no teste |
| 2 | Iniciar com R$200-300/dia | — |
| 3 | Após 3 dias: +20% budget | ROAS manteve ≥ 2.5 |
| 4 | Repetir +20% a cada 3 dias | ROAS estável (≤ 15% queda) |
| 5 | Se ROAS cair > 20%: pausar 48h | Retomar se ROAS ≥ 2.0 |
| 6 | Se frequência > 6.0: refresh obrigatório | Fadiga criativa [10] |

---

## 8. Configuração Padrão Fiber

### Campanha de Teste (copiar sempre)

```
Objetivo:        OUTCOME_SALES
Tipo:            ABO
Bid Strategy:    LOWEST_COST_WITHOUT_CAP
Pixel:           833019697743208
Evento:          Purchase
Geo:             Brasil (excl. AC, AL, AP, AM, BA, CE, MA, PA, PB, PR, PI, RN, RO, RR, SE, PE, TO)
Idade:           18-65
Audience:        Advantage+ (age + gender)
Posicionamentos: Todos (FB Feed, IG Feed, FB Reels, IG Reels, Stories)
Devices:         Mobile + Desktop
Budget/adset:    R$150/dia
Adsets:          4-6 (1 criativo cada)
```

### Campanha de Escala (copiar sempre)

```
Objetivo:        OUTCOME_SALES
Tipo:            CBO
Bid Strategy:    LOWEST_COST_WITHOUT_CAP
Pixel:           833019697743208
Evento:          Purchase
Geo:             Mesmo do teste
Audience:        Advantage+ Audience
Posicionamentos: Todos
Budget campanha: R$200-500+/dia (iniciar R$200)
Criativos:       Apenas winners validados (via Post ID)
```

### IDs da Conta

```
Account ID:      act_459578268603260
Pixel ID:        833019697743208
Page ID:         104041285173938
Instagram ID:    17841446463829737
```

---

## 9. Operação Diária do Agente

O agente diário deve executar as seguintes verificações:

### 9.1 Coleta de Dados
1. Buscar insights de TODAS as campanhas ativas (últimos 7 dias + lifetime)
2. Para cada campanha, calcular: ROAS, CPA, CTR, impressões, conversões, frequência
3. Identificar em qual DIA do ciclo cada campanha está (data de criação vs hoje)

### 9.2 Aplicação dos Critérios
1. Campanhas no Dia 5+: aplicar critérios da Seção 5.1
2. Campanhas no Dia 10+: aplicar critérios da Seção 5.2
3. Campanhas de escala: verificar frequência e estabilidade de ROAS

### 9.3 Ações Automáticas
- **PAUSAR:** criativos que atingem critérios de pausa
- **ALERTAR:** criativos borderline que precisam observação
- **RECOMENDAR:** escala para criativos que atingem critérios

### 9.4 Relatório Markdown
Gerar arquivo `~/.claude/temp/fiber-daily-report-YYYY-MM-DD.md` com:
- Status de cada campanha (dia do ciclo, métricas, classificação)
- Ações tomadas (pausas, alertas)
- Próximos passos para o agente do dia seguinte
- Flag se é dia de lançar nova rodada de teste

---

## 10. Remarketing: Dedicado vs. Advantage+ (Revisão 2025-2026)

### 10.1 Achado central: Advantage+ já faz remarketing automaticamente

O algoritmo Andromeda detecta automaticamente em qual estágio do funil o usuário está e serve o anúncio adequado [11]. Na prática:
- **20-30% do orçamento** de uma campanha broad Advantage+ é gasto em remarketing automaticamente [12]
- O Advantage+ Audience **prioriza pixel activity, histórico de conversão e engajamento** antes de expandir para público frio [13]
- Muitos anunciantes **eliminaram campanhas de remarketing separadas** em 2025-2026 [11]

### 10.2 Estudo Wicked Reports: 55.661 campanhas (Jun/2025)

Análise de **55.661 campanhas Meta** revelou [14]:

| Métrica | Advantage+ Mai/2024 | Advantage+ Mai/2025 | Manual Mai/2025 |
|---------|---------------------|---------------------|-----------------|
| nCAC (custo cliente novo) | $257 | **$528 (+105%)** | Estável ou menor |
| ROAS geral | Maior | Maior | Menor |

**Paradoxo:** Advantage+ infla o ROAS ao priorizar público quente (mais fácil de converter), mas o custo para novos clientes **dobrou**. O algoritmo gasta no remarketing porque é mais eficiente, não porque foi instruído.

**Conclusão dos pesquisadores:** Advantage+ funciona como **remarketing automático** (bottom-of-funnel). Campanhas manuais são mais eficientes para **prospecção** (top-of-funnel) [14].

### 10.3 DPA Remarketing: única exceção que vale

Remarketing com catálogo dinâmico (DPA) continua válido porque mostra **o produto específico** que a pessoa visitou:
- DPA remarketing entrega **2-3x ROAS maior** que retargeting estático [15]
- Retargeting por engajamento de vídeo: **3.2x mais CTR** e **41% menos CPA** [13]
- E-commerce com DPA: ROAS médio **7.5:1** [15]

### 10.4 Performance Advantage+ vs. Manual

- Advantage+ **reduz CPA em até 32%** em e-commerce [2]
- **CTR 11-15% maior** com Advantage+ [12]
- Advantage+ é o motor principal para **65% dos anunciantes** dos EUA [11]
- Teste A/B DPA Standard vs Advantage+ DPA: resultados mistos — em alguns casos Standard superou, em outros Advantage+ venceu [16]

### 10.5 Recomendação para a Fiber

**NÃO criar estrutura de remarketing dedicada.** Modelo recomendado:

| Camada | Tipo | Objetivo | Budget |
|--------|------|----------|--------|
| **Teste de criativos** | ABO, 1 criativo/adset | Encontrar winners | 20% |
| **Escala (prospecção + remarket auto)** | CBO Advantage+ | Vender (frio + quente automático) | 60% |
| **Catálogo DPA** | Advantage+ Catalog | Remarketing dinâmico de produto | 20% |

**Manter:** Campanhas Catálogo DPA (ROAS 2.99-3.60 na Fiber) — mostram produto específico.
**Não recriar:** Remarketing genérico com público semelhante (a campanha pausada com freq 7.98).
**Motivo:** Advantage+ já cobre remarketing automaticamente [11][12][14], e campanhas manuais de remarketing tendem a saturar audiência com frequência excessiva.

### 10.6 Referências adicionais (Remarketing)

| # | Fonte | Ano | Dado principal |
|---|-------|-----|---------------|
| [11] | Social Media Examiner — FB Algorithm Changes 2026 | 2026 | Muitos anunciantes eliminaram remarketing separado |
| [12] | mr.Booster — Meta Targeting 2025 | 2025 | 20-30% do budget broad vai para remarketing auto |
| [13] | Brawn Media — How Meta Targeting Works 2025 | 2025 | Video retarget: 3.2x CTR, -41% CPA |
| [14] | Wicked Reports — 55.661 Campaigns Analyzed | Jun/2025 | nCAC Advantage+ dobrou ($257→$528) |
| [15] | Cropink — Meta DPA 2026 Guide | 2026 | DPA remarketing 2-3x ROAS vs estático |
| [16] | Accelerated Digital Media — Standard vs Advantage+ | 2024-2025 | Resultados mistos em teste A/B DPA |

---

## 11. Referências

| # | Fonte | Ano | Dado principal |
|---|-------|-----|---------------|
| [1] | Motion — Creative Benchmarks 2026 | Jan/2026 | $1.29B spend, 600K ads, 4-8% win rate |
| [2] | Meta Platforms — Q1 2025 Earnings | Q1/2025 | Advantage+ $4.52 por $1, +22% |
| [3] | Foxwell Digital — Testing Frameworks 2026 | Fev/2026 | Andromeda 80% em 2-3 ads, 160+ consultas |
| [4] | ROASPIG — Minimum Viable Budget | 2026 | 50+ conversões × CPA = B_min |
| [5] | Metalla — Creative Testing & Scaling | 2025 | ABO teste, CBO escala, Post ID |
| [6] | AdsUploader — ABO vs CBO | 2026 | ABO apple-to-apple, CBO algorítmico |
| [7] | GlobalPPC — What Scales, What Doesn't | 2025 | £300-500/variante para significância |
| [8] | Scalability School — Testing on Meta 2026 | 2026 | +20% cada 3 dias, Phil Kiel CBO-first |
| [9] | Motion — Ultimate Guide Creative Testing | 2025 | Regra 80/20, hook rate, 3-5 criativos |
| [10] | inBeat Agency — Creative Testing Practices | 2025 | Freq > 6x = -16% intenção, refresh 10d |
| [11] | Social Media Examiner — FB Algorithm Changes 2026 | 2026 | Remarketing separado eliminado por muitos |
| [12] | mr.Booster — Meta Targeting 2025 | 2025 | 20-30% budget broad = remarketing automático |
| [13] | Brawn Media — How Meta Targeting Works 2025 | 2025 | Video retarget: 3.2x CTR, -41% CPA |
| [14] | Wicked Reports — 55.661 Campaigns | Jun/2025 | nCAC Advantage+ dobrou ($257→$528) |
| [15] | Cropink — Meta DPA 2026 Guide | 2026 | DPA 2-3x ROAS vs estático, e-comm 7.5:1 |
| [16] | Accelerated Digital Media — Std vs Adv+ | 2024-2025 | Teste A/B DPA: resultados mistos |

---

## Histórico de Atualizações

| Data | Versão | Alteração |
|------|--------|-----------|
| 2026-03-17 | 1.0 | Criação inicial baseada em revisão de 10 fontes |
| 2026-03-17 | 1.1 | Adicionada Seção 10: Remarketing vs Advantage+ (6 novas referências [11]-[16]) |
| 2026-03-18 | 1.2 | Adicionada seção Lições Aprendidas — erro CBO vs ABO em teste |

---

## Lições Aprendidas (Auto-gerado por /aprender)

> Seção atualizada automaticamente. Consultar ANTES de executar tarefas relacionadas.

### 2026-03-18 - NUNCA usar CBO para teste de criativos
**Contexto:** Criação de campanha Meta Ads para testar criativos (carrosséis, vídeos, estáticos) de qualquer produto/cliente.
**Erro:** IA recomendou CBO para fase de teste, deixando o algoritmo Andromeda alocar orçamento entre ad sets — o que enviesaria o teste, concentrando 80% do budget em 2-3 criativos antes de termos dados suficientes.
**Solução:** Usar **ABO** com orçamento fixo e igual por ad set (ex: R$ 150/dia cada). Cada criativo recebe exatamente o mesmo investimento = comparação apple-to-apple. CBO só entra na fase de ESCALA, após validação no dia 10-14, migrando vencedores via Post ID.
**Regra:** Teste = ABO (orçamento fixo, igual, controlado). Escala = CBO via Post ID. NUNCA inverter essa ordem. Aplicável a QUALQUER conta/cliente, não apenas Fiber.

### 2026-03-18 - Sempre incluir data de criação no nome da campanha
**Contexto:** Nomenclatura de campanhas Meta Ads ao criar via API ou Ads Manager.
**Erro:** Criar campanha sem data no nome dificulta rastrear quando o teste começou e organizar o histórico.
**Solução:** Incluir a data no formato `YYYY-MM-DD` no nome da campanha. Ex: `[TESTE] Produto X — Carrosséis Educacionais — 2026-03-18`
**Regra:** SEMPRE incluir a data de criação (YYYY-MM-DD) no nome de toda campanha Meta Ads criada. Aplicável a qualquer conta/cliente.
