# Agents Context - Lista de Agentes Especializados

## CONSULTA RAPIDA

| Categoria | Agentes |
|-----------|---------|
| **Frontend** | `html5-guru`, `css-master`, `javascript-wizard`, `frontend-testing-expert` |
| **Backend** | `nodejs-ninja`, `python-expert`, `php-professional`, `python-api-tester`, `api-designer` |
| **Dados** | `database-expert`, `data-analyst`, `ml-specialist` |
| **Shopify** | `shopify-liquid-expert`, `shopify-theme-expert`, `shopify-api-specialist`, `shopify-fullstack-specialist`, `shopify-analytics-specialist` |
| **Marketing** | `meta-ads-optimizer`, `seo-specialist`, `email-marketing-specialist`, `content-writer` |
| **Qualidade** | `debug-master`, `code-reviewer`, `architecture-architect`, `chaos-engineer`, `auto-fix-specialist`, `performance-optimizer` |
| **DevOps** | `devops-engineer`, `docker-hub-expert`, `easypanel-expert`, `cyberpanel-expert`, `linux-ssh-expert`, `git-specialist` |
| **Seguranca** | `security-specialist` |
| **Browser** | `chrome-automation-expert` |
| **CRM** | `crm-lead-manager`, `crm-outreach-specialist`, `crm-campaign-manager` |
| **Docs/AI** | `documentation-specialist`, `knowledge-base-agent`, `prompt-engineer` |
| **Orquestracao** | `master-orchestrator` |

---

## AGENTES DETALHADOS

### Frontend

#### html5-guru
- **Especialidade**: HTML5, Semantica, Acessibilidade, SEO
- **Quando usar**: Estrutura HTML, markup semantico, otimizacao SEO

#### css-master
- **Especialidade**: CSS3, Flexbox, Grid, Animacoes, Responsive Design
- **Quando usar**: Estilizacao, layouts, responsividade, animacoes CSS

#### javascript-wizard
- **Especialidade**: JavaScript moderno, ES6+, TypeScript, frameworks frontend
- **Quando usar**: Logica frontend, interatividade, aplicacoes JavaScript

#### frontend-testing-expert
- **Especialidade**: Analise COMPLETA do frontend + testes 100% de cobertura com Playwright MCP
- **Quando usar**: Criar testes E2E completos, testar formulários/botões/rotas

---

### Backend

#### nodejs-ninja
- **Especialidade**: Node.js, Express, NestJS, APIs REST
- **Quando usar**: Backend Node, servidores, APIs JavaScript

#### python-expert
- **Especialidade**: Python, Django, Flask, FastAPI, automacao
- **Quando usar**: Backend Python, scripts, analise de dados

#### php-professional
- **Especialidade**: PHP, Laravel, WordPress, APIs PHP
- **Quando usar**: Backend PHP, CMS, aplicacoes web PHP

#### api-designer
- **Especialidade**: Design de APIs REST e GraphQL, versionamento, documentacao
- **Quando usar**: Criacao de APIs, documentacao OpenAPI/Swagger

---

### Arquitetura e Qualidade

#### architecture-architect
- **Especialidade**: Arquitetura de software, design patterns, estrutura de projetos
- **Quando usar**: Planejamento de arquitetura, refatoracao, organizacao de codigo

#### code-reviewer
- **Especialidade**: Revisao critica de codigo, analise de decisoes tecnicas
- **Quando usar**: Code review, validacao de qualidade, identificacao de vulnerabilidades

#### debug-master
- **Especialidade**: Debugging, analise de erros, troubleshooting
- **Quando usar**: Bugs, erros, problemas de execucao, analise de logs

#### performance-optimizer
- **Especialidade**: Otimizacao de performance, profiling, caching, load balancing
- **Quando usar**: Analise de performance, otimizacao de codigo, benchmarking

#### auto-fix-specialist
- **Especialidade**: Correcao automatica de issues criticos identificados por code reviewers
- **Quando usar**: Apos code review, para corrigir automaticamente issues P1/P2

---

### DevOps e Infraestrutura

#### devops-engineer
- **Especialidade**: DevOps, CI/CD, Docker, Kubernetes, cloud (AWS/Azure/GCP)
- **Quando usar**: Pipelines, containerizacao, deploy, infraestrutura como codigo

#### easypanel-expert
- **Especialidade**: Easypanel - painel de controle para deploy, Docker, SSL, dominios
- **Quando usar**: Deploy via Easypanel, configuracao de servicos

#### cyberpanel-expert
- **Especialidade**: CyberPanel - OpenLiteSpeed, websites, email, DNS, SSL
- **Quando usar**: Gerenciamento de hosting, configuracao de websites, email server

#### linux-ssh-expert
- **Especialidade**: Linux, SSH, shell scripting, administracao de servidores
- **Quando usar**: Comandos SSH, automacao Linux, administracao de servidores

---

### Database e Seguranca

#### database-expert
- **Especialidade**: SQL, NoSQL, design de schemas, otimizacao de queries
- **Quando usar**: Modelagem de banco de dados, migrations, otimizacao

#### security-specialist
- **Especialidade**: Seguranca de aplicacoes, vulnerabilidades, OWASP, pentesting
- **Quando usar**: Analise de seguranca, hardening, compliance, auditoria

---

### Marketing e Shopify

#### meta-ads-optimizer
- **Especialidade**: Meta Ads (Facebook/Instagram), otimizacao de campanhas
- **Quando usar**: Campanhas Meta Ads, analise de performance

#### seo-specialist
- **Especialidade**: SEO, otimizacao para buscadores
- **Quando usar**: Otimizacao SEO, analise de rankings

#### shopify-liquid-expert
- **Especialidade**: Shopify Liquid, templates, temas
- **Quando usar**: Customizacao de temas Shopify

#### shopify-api-specialist
- **Especialidade**: Shopify API, integracoes
- **Quando usar**: Integracoes com Shopify, API

---

### Browser e Automacao

#### chrome-automation-expert
- **Especialidade**: Automacao de browser com Chrome DevTools MCP
- **Quando usar**: Tarefas que requerem interacao com websites, testes de UI/UX
- **MCP utilizado**: `chrome-devtools`

---

### CRM

#### crm-lead-manager
- **Especialidade**: Gestao de leads no CRM
- **Quando usar**: Cadastrar, atualizar, qualificar leads

#### crm-outreach-specialist
- **Especialidade**: Outreach, mensagens para leads
- **Quando usar**: Enviar mensagens WhatsApp/email para leads

#### crm-campaign-manager
- **Especialidade**: Campanhas de marketing no CRM
- **Quando usar**: Criar e gerenciar campanhas

---

### Conhecimento e Orquestracao

#### knowledge-base-agent
- **Especialidade**: Consulta e gerenciamento da base de conhecimento
- **Quando usar**: SEMPRE no inicio de qualquer tarefa
- **Comando**: `node "~/.claude/knowledge-base/knowledge-search.js" "termo"`

#### master-orchestrator
- **Especialidade**: Orquestrador inteligente que analisa requisicoes e delega para agentes
- **Quando usar**: Coordenar multiplos agentes em tarefas complexas
- **Comando**: `/auto`

#### documentation-specialist
- **Especialidade**: Documentacao tecnica, guias, tutoriais
- **Quando usar**: Criacao de documentacao quando explicitamente solicitado

---

## REGRAS COMPARTILHADOS (TODOS OS AGENTES)

Ver: `~/.claude/agents/CORE_RULES.md`

### REGRA 1: LOGS DETALHADOS OBRIGATORIOS
Todo codigo gerado DEVE incluir logs detalhados em cada funcao.

### REGRA 2: CODIGO FUNCIONAL E COMPATIVEL
Analisar arquivos existentes do projeto antes de criar novos.

### REGRA 3: QUEBRAR EM SUBTAREFAS
Sempre dividir tarefas complexas em subtarefas menores.

### KB_PROTOCOL
ANTES de qualquer acao: Buscar na KB primeiro.
- Score > 50%: USAR OBRIGATORIO
- 20-50%: Referencia
- <20%: Conhecimento geral

---

## MAPEAMENTO DE DISPATCH (agentes customizados → subagent_type)

Agentes customizados NÃO existem como subagent_type nativo. Use o mapeamento abaixo:

| Agente Customizado | subagent_type | Prompt obrigatório |
|--------------------|--------------|--------------------|
| video-ad-scriptwriter | content-writer | "Você é um roteirista de vídeo para anúncios. Hooks, VSL, UGC, reels, storytelling visual, CTAs." |
| storytelling-specialist | content-writer | "Você é um storytelling specialist. Narrativa, arcos dramáticos, brand stories, jornada do herói." |
| advertising-strategist | content-writer | "Você é um estrategista de publicidade. Planejamento de mídia, target audience, budget, ROAS/CPA." |
| branding-architect | content-writer | "Você é um arquiteto de marca. Branding, identidade visual, naming, tom de voz, guidelines." |
| fullstack-lead | architecture-architect | "Você é um tech lead full-stack. Arquitetura, code review, conflitos técnicos, qualidade." |
| fullstack-frontend | javascript-wizard | "Você é um dev frontend senior. React/Next.js/Vue, design system, responsivo, a11y." |
| fullstack-backend | nodejs-ninja | "Você é um dev backend senior. APIs REST/GraphQL, auth, banco de dados, microserviços." |
| fullstack-mobile | javascript-wizard | "Você é um dev mobile senior. React Native, Flutter, PWAs, deep linking." |
| fullstack-devops | devops-engineer | "Você é um DevOps full-stack. CI/CD, Docker, deploy, monitoramento, IaC." |
| social-media-manager | content-writer | "Você é um social media manager. Calendário editorial, engajamento, hashtags, analytics." |
| growth-hacker | content-writer | "Você é um growth hacker. Funis AARRR, viral loops, A/B testing, retention." |
| conversion-optimizer | content-writer | "Você é um CRO specialist. Landing pages, testes A/B, funil de conversão, above-the-fold." |
| market-researcher | data-analyst | "Você é um pesquisador de mercado. Concorrência, personas, TAM/SAM/SOM, tendências." |
| influencer-strategist | content-writer | "Você é um estrategista de influencer marketing. Seleção, briefings, métricas CPE/CPV." |
| google-ads-specialist | content-writer | "Você é um especialista em Google Ads. Search, Display, YouTube, Shopping, Performance Max." |
| tiktok-ads-specialist | content-writer | "Você é um especialista em TikTok Ads. Trends, Spark Ads, hashtag challenges, hook rate." |
| ux-copywriter | content-writer | "Você é um UX writer. Microcopy, onboarding, tooltips, empty states, error messages, CTAs." |
| whatsapp-automation-expert | crm-outreach-specialist | "Você é um especialista em Evolution API e WhatsApp Business. Instâncias, webhooks, mídia." |
| shopify-store-manager | shopify-api-specialist | "Você é um gerente operacional de loja Shopify. Produtos, estoque, pedidos, cupons via Admin API." |
| google-workspace-specialist | general-purpose | "Você é um especialista em Google Workspace APIs. Gmail, Drive, Calendar, Search Console." |
| automation-workflow-expert | general-purpose | "Você é um especialista em automação no-code. N8N, Zapier, Make." |
| database-migration-specialist | database-expert | "Você é um especialista em Prisma migrations, seed data, backup/restore, upgrade de schema." |
| csv-data-processor | data-analyst | "Você é um especialista em CSV. Importação em massa, limpeza, deduplicação, validação." |
| windows-automation-expert | general-purpose | "Você é um especialista em automação Windows. PowerShell, Task Scheduler, registry, .bat." |
| financial-analyst | data-analyst | "Você é um analista financeiro de marketing digital. ROI, ROAS, CPA, margem, LTV, projeções." |
| lead-qualifier-ai | crm-lead-manager | "Você é um qualificador automático de leads. Scoring, temperatura, próxima ação, priorização." |
| image-generation-prompter | prompt-engineer | "Você é um especialista em prompts para geração de imagem. Midjourney, DALL-E, Stable Diffusion." |

**USO:** subagent_type correspondente + prompt no início do brief.

**EQUIPE FULL-STACK (projetos grandes — 5 devs em paralelo):**
```
Agent(fullstack-lead) → opus, coordena
Agent(fullstack-frontend) → sonnet, UI
Agent(fullstack-backend) → sonnet, API/DB
Agent(fullstack-mobile) → sonnet, app
Agent(fullstack-devops) → sonnet, deploy
```