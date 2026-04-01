# Claude Code Setup

Ecossistema completo que transforma o [Claude Code](https://docs.anthropic.com/en/docs/claude-code) de um assistente de terminal em uma plataforma de desenvolvimento autonoma com CRM, dashboard, 62 agentes especializados, 11 hooks de automacao, 14 skills e 72 ferramentas CLI.

---

## O que e isto?

O Claude Code, por padrao, e um CLI que responde comandos num terminal. Este repositorio adiciona uma camada inteira de infraestrutura em cima dele, criando um ecossistema onde o Claude opera com memoria persistente, ferramentas proprias, automacao de browser, gestao de leads, criacao de criativos e muito mais.

Pense assim: **Claude Code padrao e um martelo. Este setup e uma oficina completa.**

---

## Claude Code normal vs. este setup

| Aspecto | Claude Code padrao | Com este setup |
|---------|-------------------|----------------|
| **Agentes** | 1 agente generico | 62 agentes especializados (shopify-expert, debug-master, devops-engineer, security-specialist, etc.) com routing automatico por tipo de tarefa |
| **Hooks** | Nenhum configurado | 11 hooks ativos: rotacao de conta em rate-limit, log de sessao, monitoramento de erros, notificacao Telegram, sincronizacao de tasks, guard de prompts |
| **Skills** | Nenhuma | 14 skills instaladas: GSD (framework de desenvolvimento spec-driven), UI/UX Pro Max (50+ estilos de design), Liquid Lint, Theme Check, CSS Overlap, Banner Design, Design System, Slides, e mais |
| **Ferramentas** | Apenas tools nativas (Read, Write, Bash...) | 72 ferramentas CLI adicionais via tools-cli: html_validator, seo_check, color_palette, scrape_website, search_kb, csv_processor, image_generator, topaz_enhance, etc. |
| **Memoria** | Esquece tudo entre sessoes | Base de conhecimento pesquisavel, diario de sessoes, sistema de memorias tipadas (user, feedback, project, reference), graph de memoria via MCP |
| **CRM** | Inexistente | CRM local completo na porta 3847 com gestao de leads, campanhas de prospecao, envio multicanal (WhatsApp, email), dashboard financeiro, tarefas pessoais |
| **Browser** | Nao controla browser | Automacao completa via Chrome DevTools MCP: screenshots, navegacao, preenchimento de formularios, scraping, testes visuais, multiplos perfis |
| **Rate limits** | Para quando atinge limite | Rotacao automatica entre 3+ contas com hooks — detecta 429/rate-limit e troca de conta sem intervencao |
| **Erros** | Repete o mesmo erro | Error Learning System: monitora erros em tempo real, detecta padroes (3+ consecutivos = parar e mudar abordagem), documenta solucoes na KB para nao repetir |
| **Frontend** | Nao valida qualidade | Validacao obrigatoria: html_validator (score >= 70, a11y >= 80) + frontend-analyzer antes de entregar qualquer pagina |
| **Tasks** | Sem gestao estruturada | Orquestrador universal de tarefas com 4 fases: ancora, decomposicao (max 12 tasks paralelas), execucao com self-audit, relatorio final |
| **MCPs** | Nenhum configurado | 8 MCP servers pre-configurados: chrome-devtools, desktop-commander, sequential-thinking, memory, context7, fetch, codebase-memory, claude-ecosystem |
| **Criativos** | Nao cria assets visuais | Pipeline completo: banners para Meta Ads (22 estilos), motion videos (HTML to MP4), pixel analysis, neuromarketing, upscale com Topaz |
| **Shopify** | Conhecimento generico | Suite especializada: Liquid Lint (score 0-100), Theme Check (8 categorias OS 2.0), CSS Overlap (detecta sobreposicoes cross-file) |
| **Contexto** | Carrega tudo sempre | Carregamento sob demanda: 9 contextos especializados carregados apenas quando relevante, economizando tokens |
| **Tokens** | Gasta sem controle | 12 regras de economia: haiku para pesquisa, sonnet para implementacao, opus para arquitetura, compact proativo, grep antes de read |
| **Seguranca** | Regras basicas | Protocolos rigidos: nunca logar tokens, confirmacao obrigatoria para comunicacao externa, protecao de processos Node, batch SSH obrigatorio |
| **Sessoes** | Sem continuidade | Session diary com pendencias, decisoes e resumo. Inicio de sessao carrega estado anterior automaticamente |

---

## Arquitetura do ecossistema

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLAUDE CODE CLI                          │
│                    (terminal do usuario)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CLAUDE.md ──── Instrucoes master (carregado toda sessao)       │
│  settings.json ── Permissoes, hooks, env vars                   │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ 62       │  │ 14       │  │ 11       │  │ 8        │       │
│  │ Agentes  │  │ Skills   │  │ Hooks    │  │ MCPs     │       │
│  │          │  │          │  │          │  │          │       │
│  │ shopify  │  │ GSD      │  │ error-   │  │ chrome   │       │
│  │ devops   │  │ ui-ux    │  │ monitor  │  │ memory   │       │
│  │ debug    │  │ liquid   │  │ account- │  │ context7 │       │
│  │ security │  │ theme    │  │ rotate   │  │ codebase │       │
│  │ ...      │  │ ...      │  │ ...      │  │ ...      │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              TASK SCHEDULER (porta 3847)                 │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────────┐ │   │
│  │  │Dashboard│ │CRM Local│ │72 Tools │ │Prompt Manager│ │   │
│  │  │ React   │ │ Prisma  │ │  CLI    │ │  Templates   │ │   │
│  │  │ Vite    │ │ SQLite  │ │         │ │              │ │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └──────────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────┐  ┌──────────────────────────────┐   │
│  │  Knowledge Base      │  │  Contexts (sob demanda)      │   │
│  │  Busca obrigatoria   │  │  CRM, Chrome, WhatsApp,     │   │
│  │  antes de cada task  │  │  Criativos, Validacao...    │   │
│  └──────────────────────┘  └──────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Os 62 agentes especializados

Cada agente tem instrucoes especificas, skills pre-carregadas e foco em um dominio:

| Categoria | Agentes | Exemplo de uso |
|-----------|---------|----------------|
| **Shopify** | shopify-theme-expert, shopify-liquid-expert, shopify-fullstack-specialist, shopify-api-specialist, shopify-analytics-specialist | Customizar tema, validar Liquid, integrar APIs |
| **Frontend** | css-master, html5-guru, frontend-testing-expert, performance-optimizer | CSS responsivo, testes E2E, Core Web Vitals |
| **Backend** | nodejs-ninja, python-expert, php-professional, database-expert | APIs REST, Django, Laravel, SQL/NoSQL |
| **DevOps** | devops-engineer, docker-hub-expert, linux-ssh-expert, cyberpanel-expert, easypanel-expert | CI/CD, containers, servidores, SSL |
| **Qualidade** | code-reviewer, security-specialist, chaos-engineer, debug-master | Code review, pentesting, testes de resiliencia |
| **Design** | css-master, html5-guru | UI/UX, design systems, animacoes |
| **Marketing** | meta-ads-optimizer, email-marketing-specialist, seo-specialist, content-writer | Campanhas, SEO, copywriting |
| **CRM** | crm-campaign-manager, crm-lead-manager, crm-outreach-specialist | Prospecao, leads, mensagens multicanal |
| **Dados** | data-analyst, ml-specialist | BI, visualizacao, machine learning |
| **GSD** | gsd-planner, gsd-executor, gsd-verifier, gsd-debugger, gsd-ui-researcher, e mais 15 | Framework completo de desenvolvimento |
| **Outros** | prompt-engineer, git-specialist, documentation-specialist, api-designer, architecture-architect | Prompts, git, docs, APIs, arquitetura |

O routing e automatico: o Claude escolhe o agente certo baseado na tarefa. Modelo por complexidade: **haiku** para pesquisa rapida, **sonnet** para implementacao, **opus** para decisoes de arquitetura.

---

## Os 11 hooks

Hooks sao scripts que rodam automaticamente em momentos especificos:

| Hook | Evento | O que faz |
|------|--------|-----------|
| `account-rotate-hook` | UserPromptSubmit, Stop | Detecta rate limit e rotaciona para outra conta automaticamente |
| `session-logger` | UserPromptSubmit, PostToolUse, Stop | Registra tudo em log para auditoria e continuidade |
| `error-monitor-hook` | PostToolUse | Monitora erros em tempo real; 3+ consecutivos = alerta para mudar abordagem |
| `sync-tasks-hook` | PostToolUse (TaskCreate/Update) | Sincroniza tasks do Claude com o CRM local |
| `gsd-context-monitor` | PostToolUse (Bash/Edit/Write/Agent) | Monitora contexto do GSD durante execucao de fases |
| `gsd-check-update` | SessionStart | Verifica se ha atualizacoes do GSD skill ao iniciar sessao |
| `gsd-prompt-guard` | PreToolUse (Write/Edit) | Protege arquivos criticos de edicoes acidentais |
| `gsd-statusline` | StatusLine | Exibe status do GSD na barra inferior do Claude Code |
| `gsd-workflow-guard` | PreToolUse | Valida workflow do GSD |
| `telegram-notify-hook` | Stop | Envia notificacao via Telegram quando a sessao termina |
| `session-end-reminder` | Stop | Lembra de executar `/aprender` e salvar diario antes de encerrar |

---

## As 14 skills

| Skill | Slash command | O que faz |
|-------|--------------|-----------|
| **GSD (Get Shit Done)** | `/gsd:new-project`, `/gsd:plan-phase`, `/gsd:execute-phase`, `/gsd:autonomous` | Framework spec-driven completo: define requisitos, planeja fases, executa com commits atomicos, verifica entrega |
| **UI/UX Pro Max** | `/ui-ux-pro-max` | Design intelligence com 50+ estilos, 161 paletas, 57 pares tipograficos, 99 guidelines UX |
| **Banner Design** | `/banner-design` | Cria banners para 22 plataformas (Meta, Google, YouTube, LinkedIn, etc.) com AI |
| **Design System** | `/design-system` | Arquitetura de tokens (primitive > semantic > component), specs de componentes |
| **UI Styling** | `/ui-styling` | Interfaces com shadcn/ui + Tailwind CSS |
| **Brand** | `/brand` | Identidade visual, tom de voz, guias de estilo |
| **Slides** | `/slides` | Apresentacoes HTML com Chart.js e design tokens |
| **Liquid Lint** | `/liquid-lint` | Valida templates Shopify: sintaxe, filtros deprecados, performance, a11y (score 0-100) |
| **Theme Check** | `/theme-check` | Auditoria completa de temas Shopify OS 2.0 (8 categorias) |
| **CSS Overlap** | `/css-overlap` | Detecta CSS sobreposto entre arquivos de temas Shopify |
| **Nano Banana Pro** | `/nano-banana-pro` | Geracao e edicao de imagens via AI |
| **Memory** | `/memory` | Gerenciamento de memoria de conversacao |
| **End Session** | `/end-session` | Analise e documentacao de fim de sessao |
| **Auto** | `/auto` | Orquestrador paralelo que delega para multiplos agentes simultaneamente |

---

## O CRM local (porta 3847)

Um CRM completo rodando localmente, integrado ao Claude:

- **Gestao de leads** — cadastro, qualificacao, historico, notas
- **Campanhas de prospecao** — cadencias multi-step com follow-ups automaticos
- **Mensagens multicanal** — WhatsApp (Evolution API), email (SMTP), com templates e variaveis
- **Dashboard financeiro** — controle de receitas, despesas, investimentos
- **Tarefas pessoais** — to-do list com datas, prioridades e lembretes
- **Prompt templates** — templates salvos com variaveis para reusar em tarefas recorrentes
- **API REST completa** — `http://localhost:3847/api/crm` com auth Bearer token

---

## Os 8 MCP servers

| MCP | O que faz |
|-----|-----------|
| **chrome-devtools** | Controla Chrome: navegar, clicar, preencher forms, screenshots, scraping, testes visuais |
| **desktop-commander** | Executa comandos no terminal, gerencia processos, le/escreve arquivos |
| **sequential-thinking** | Raciocinio estruturado multi-step para problemas complexos |
| **memory** | Grafo de memoria persistente entre sessoes (entidades, relacoes, observacoes) |
| **context7** | Documentacao atualizada de qualquer biblioteca (React, Next.js, etc.) |
| **fetch** | Requisicoes HTTP para APIs externas |
| **codebase-memory** | Knowledge graph do codebase inteiro — busca sub-milissegundo, reduz tokens em ate 49x |
| **claude-ecosystem** | MCP server customizado que expoe as 72 ferramentas do tools-cli |

---

## Instalacao rapida (macOS)

### Pre-requisitos

- **macOS 12+** (Monterey ou superior)
- **Homebrew** — se nao tem:
  ```bash
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  ```

### Passo a passo

```bash
# 1. Instalar Node.js e Git (se necessario)
brew install node git

# 2. Instalar Claude Code CLI
npm install -g @anthropic-ai/claude-code

# 3. Clonar o repositorio
git clone https://github.com/rafaeltondin/claude-code-setup.git ~/.claude

# 4. Entrar no diretorio
cd ~/.claude

# 5. Dar permissao aos scripts
chmod +x scripts/*.sh

# 6. Rodar o instalador automatico
./scripts/install-all.sh
```

O `install-all.sh` faz tudo automaticamente:
- Verifica e instala Node.js, Git, npm, Claude Code CLI
- Instala dependencias de todos os modulos
- Configura MCPs, settings e permissoes
- Cria LaunchAgent para auto-inicio no login
- Inicializa dados do CRM e task scheduler
- Roda verificacao final com checklist

### Instalacao manual (se preferir)

```bash
git clone https://github.com/rafaeltondin/claude-code-setup.git ~/.claude
cd ~/.claude

npm install
cd task-scheduler && npm install && cd ..
cd frontend && npm install && cd ..
cd frontend-analyzer && npm install && cd ..
cd mcp-server && npm install && cd ..

mkdir -p ~/.claude/{data,logs,temp,cache,memory,knowledge-base,sessions,session-logs,session-env,shell-snapshots,file-history,paste-cache,backups,plans,tasks,telemetry,statsig}
```

---

## Iniciar o ecossistema

```bash
# Iniciar (abre o browser)
~/.claude/scripts/start-all.sh

# Iniciar em background
~/.claude/scripts/start-all.sh --no-browser

# Parar tudo
~/.claude/scripts/stop-all.sh
```

**Endpoints:**

| Servico | URL |
|---------|-----|
| Dashboard | http://localhost:3847 |
| API CRM | http://localhost:3847/api/crm |
| API Tasks | http://localhost:3847/api |

---

## Auto-inicio no login (macOS)

```bash
# Ativar
cp ~/.claude/scripts/com.claude-code.autostart.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.claude-code.autostart.plist

# Desativar
launchctl unload ~/Library/LaunchAgents/com.claude-code.autostart.plist
rm ~/Library/LaunchAgents/com.claude-code.autostart.plist
```

---

## Configuracao pos-instalacao

### 1. Autenticar no Claude Code
```bash
claude login
```

### 2. Configurar MCPs (opcional)
Edite `~/.claude/config/mcp.json`. Para o MCP fetch, instale uv:
```bash
brew install uv
```

### 3. Telegram (opcional)
Configure pelo dashboard em http://localhost:3847 apos iniciar o servidor.

### 4. CRM Backend (opcional)
```bash
cd ~/.claude/task-scheduler/crm-backend
cp .env.example .env  # editar com suas configs
npx prisma generate && npx prisma db push && npx tsc
```

---

## Estrutura do projeto

```
~/.claude/
├── CLAUDE.md              # Instrucoes master — o "cerebro" do setup
├── settings.json          # Permissoes, hooks, env vars
├── config/mcp.json        # Configuracao dos 8 MCP servers
│
├── agents/                # 62 agentes especializados (.md com instrucoes)
├── skills/                # 14 skills instaladas (GSD, UI/UX, Shopify, etc.)
├── hooks/                 # 11 hooks de automacao (.js)
├── commands/              # Slash commands customizados
├── contexts/              # 9 contextos carregaveis sob demanda
│
├── task-scheduler/        # Servidor local (porta 3847)
│   ├── crm-backend/       #   CRM com Prisma + SQLite
│   ├── frontend/          #   Dashboard React
│   ├── tools/             #   Ferramentas CLI expostas via API
│   └── tools-cli.js       #   CLI unificado (72 ferramentas)
│
├── src/                   # Codigo-fonte core
│   ├── integrations/      #   Chrome, APIs externas
│   ├── services/          #   Telegram bot, scheduler, autostart
│   ├── tools/             #   Modulos de execucao, arquivos, infra
│   └── modules/           #   CRM Prisma, Chrome routes
│
├── frontend/              # Dashboard principal (React + Vite)
├── frontend-analyzer/     # Analisador de qualidade HTML/CSS/JS
├── tools/                 # Ferramentas standalone (motion-gen, error-learner)
├── accounts/              # Rotacao multi-conta (rate-limit)
├── get-shit-done/         # GSD framework (workflows, templates)
├── mcp-server/            # MCP server customizado
├── plugins/               # Sistema de plugins
├── scripts/               # install-all.sh, start-all.sh, stop-all.sh
├── session-analyzer/      # Analise de sessoes
└── session-diary/         # Diario de sessoes com pendencias
```

---

## Compatibilidade

| Plataforma | Status |
|------------|--------|
| macOS (Apple Silicon + Intel) | Totalmente suportado |
| Windows 10/11 | Totalmente suportado |
| Linux (Ubuntu/Debian) | Suportado |

---

## Licenca

Uso pessoal — fork e adapte conforme necessidade.
