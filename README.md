# Claude Code Setup

Ecossistema completo de configuracao para [Claude Code](https://docs.anthropic.com/en/docs/claude-code) — agentes especializados, hooks, skills, CRM local, task scheduler, ferramentas CLI e automacao.

## Instalacao Rapida (macOS)

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

O `install-all.sh` cuida de tudo automaticamente:
- Verifica Node.js, Git, npm
- Instala Claude Code CLI
- Instala dependencias de todos os modulos (task-scheduler, CRM, frontend, etc.)
- Configura MCPs
- Cria LaunchAgent para auto-inicio no login
- Roda verificacao final

### Instalacao manual (se preferir)

```bash
# Clonar
git clone https://github.com/rafaeltondin/claude-code-setup.git ~/.claude
cd ~/.claude

# Instalar deps raiz
npm install

# Task Scheduler (servidor local + CRM + dashboard)
cd task-scheduler && npm install && cd ..

# Frontend Dashboard
cd frontend && npm install && cd ..

# Frontend Analyzer
cd frontend-analyzer && npm install && cd ..

# MCP Server
cd mcp-server && npm install && cd ..

# CRM Backend (se quiser o CRM de prospecao)
cd task-scheduler/crm-backend && npm install && cd ../..

# Criar diretorios de dados pessoais
mkdir -p ~/.claude/{data,logs,temp,cache,memory,knowledge-base,sessions,session-logs,session-env,shell-snapshots,file-history,paste-cache,backups,plans,tasks,telemetry,statsig}
```

---

## Iniciar o ecossistema

```bash
# Iniciar (abre o browser automaticamente)
~/.claude/scripts/start-all.sh

# Iniciar em background (sem browser)
~/.claude/scripts/start-all.sh --no-browser

# Parar tudo
~/.claude/scripts/stop-all.sh
```

**Endpoints apos iniciar:**

| Servico | URL |
|---------|-----|
| Dashboard | http://localhost:3847 |
| API CRM | http://localhost:3847/api/crm |
| API Tasks | http://localhost:3847/api |

---

## Auto-inicio no login (macOS)

```bash
# Instalar LaunchAgent
cp ~/.claude/scripts/com.claude-code.autostart.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.claude-code.autostart.plist

# Para remover o auto-inicio
launchctl unload ~/Library/LaunchAgents/com.claude-code.autostart.plist
rm ~/Library/LaunchAgents/com.claude-code.autostart.plist
```

---

## Estrutura do projeto

```
~/.claude/
├── agents/           # 62 agentes especializados (code-reviewer, devops, shopify, etc.)
├── accounts/         # Scripts de rotacao multi-conta (rate-limit)
├── commands/         # Slash commands customizados
├── config/           # Configuracao de MCP servers (mcp.json)
├── contexts/         # Contextos carregaveis sob demanda (CRM, tools, protocolos)
├── frontend/         # Dashboard React + Vite
├── frontend-analyzer/# Analisador de qualidade HTML/CSS/JS (score, a11y, SEO)
├── get-shit-done/    # GSD — framework spec-driven de desenvolvimento
├── hooks/            # Hooks pre/pos tool-use (error monitor, session logger, etc.)
├── mcp-server/       # Servidor MCP customizado
├── plugins/          # Sistema de plugins
├── scripts/          # Scripts de instalacao, inicio e parada (.sh + .bat)
├── session-analyzer/ # Analise de sessoes
├── session-diary/    # Diario de sessoes
├── skills/           # Skills instaladas (UI/UX Pro Max, Liquid Lint, CSS Overlap, etc.)
├── src/              # Codigo-fonte core (integracoes, servicos, tools, modulos)
├── task-scheduler/   # Task scheduler com CRM backend, dashboard e automacao
├── tools/            # Ferramentas CLI (motion-gen, error-learner, etc.)
├── CLAUDE.md         # Instrucoes master (carregado em toda sessao)
├── settings.json     # Configuracoes do Claude Code (permissoes, hooks, env)
└── package.json      # Dependencias raiz
```

---

## Configuracao pos-instalacao

### 1. Autenticar no Claude Code

```bash
claude login
```

### 2. Configurar MCP servers (opcional)

Edite `~/.claude/config/mcp.json` conforme suas necessidades. MCPs disponiveis:

- **chrome-devtools** — automacao de browser, screenshots, snapshots
- **desktop-commander** — terminal, processos, arquivos
- **sequential-thinking** — raciocinio multi-step
- **memory** — grafo de memoria persistente
- **context7** — documentacao de libs
- **fetch** — requisicoes HTTP (requer `brew install uv` para uvx)
- **codebase-memory** — knowledge graph do codebase

### 3. Configurar Telegram (opcional)

O ecossistema suporta notificacoes via Telegram. Configure pelo dashboard em http://localhost:3847 apos iniciar o servidor.

### 4. Configurar CRM (opcional)

```bash
cd ~/.claude/task-scheduler/crm-backend
cp .env.example .env  # editar com suas configs
npx prisma generate
npx prisma db push
npx tsc
```

---

## Dados pessoais (nao incluidos)

Os seguintes diretorios contem dados pessoais e nao estao no repositorio. Sao criados automaticamente pelo `install-all.sh`:

- `data/` — sessoes de chat, credenciais, configs do CRM
- `knowledge-base/` — artigos da base de conhecimento
- `memory/` — memorias de conversacao
- `logs/` — logs de sessao
- `temp/` — arquivos temporarios
- `sessions/`, `session-logs/` — historico de sessoes
- `cache/`, `backups/` — cache e backups

---

## Skills disponiveis

| Skill | Comando | Descricao |
|-------|---------|-----------|
| GSD | `/gsd:*` | Framework spec-driven (plan, execute, verify) |
| UI/UX Pro Max | `/ui-ux-pro-max` | Design intelligence (50+ estilos, paletas, fonts) |
| Liquid Lint | `/liquid-lint` | Validacao de templates Shopify Liquid |
| Theme Check | `/theme-check` | Auditoria de temas Shopify OS 2.0 |
| CSS Overlap | `/css-overlap` | Detecta CSS sobreposto entre arquivos |
| Banner Design | `/banner-design` | Criacao de banners para redes sociais |
| Design System | `/design-system` | Tokens, componentes, especificacoes |

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
