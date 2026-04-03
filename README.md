# Claude Code Setup — Windows

Configuração completa do Claude Code para **Windows**, com agentes especializados, sistema de skills, hooks automáticos, ferramentas de produtividade e o framework GSD (Get Shit Done).

## Requisitos

- Windows 10/11
- [Claude Code](https://claude.ai/code) instalado
- Node.js 18+
- Git (Git Bash recomendado)
- Python 3.10+ (para ferramentas opcionais)

## Instalação

```bash
# 1. Clone este repositório na pasta correta
git clone https://github.com/rafaeltondin/claude-code-setup.git "%USERPROFILE%\.claude"

# 2. Instale as dependências principais
cd "%USERPROFILE%\.claude"
npm install

# 3. Instale as dependências do task-scheduler
cd task-scheduler
npm install
cd ..
```

> **Nota:** No Windows, use Git Bash ou WSL para executar comandos shell.

## O que está incluído

### Agentes Especializados (`/agents`)
69+ agentes com expertise específica:
- **Desenvolvimento:** nodejs-ninja, python-expert, javascript-wizard, php-professional, database-expert
- **Frontend:** html5-guru, css-master, frontend-testing-expert, performance-optimizer
- **DevOps:** devops-engineer, docker-hub-expert, linux-ssh-expert, security-specialist
- **Shopify:** shopify-theme-expert, shopify-liquid-expert, shopify-api-specialist, shopify-fullstack-specialist
- **Marketing:** meta-ads-optimizer, email-marketing-specialist, content-writer, seo-specialist
- **IA:** ml-specialist, prompt-engineer, architecture-architect, api-designer
- **GSD:** 12 agentes do framework GSD para planejamento e execução

### Skills (`/skills`)
- **GSD** — Framework de desenvolvimento spec-driven
- **UI/UX Pro Max** — Design intelligence com 50+ estilos
- **Shopify** — liquid-lint, theme-check, css-overlap
- **Design** — banner-design, brand, design-system, slides, ui-styling

### Comandos (`/commands`)
- `/gsd:*` — Família completa de comandos GSD
- `/aprender` — Análise de erros e persistência na KB
- `/end-session` — Análise e atualização de documentação
- `/auto` — Orquestrador paralelo de tarefas

### Hooks Automáticos (`/hooks`)
- Monitoramento de erros em tempo real
- Rotação automática de contas
- Proteção de workflow GSD
- Logger de sessão
- Notificações Telegram

### Task Scheduler (`/task-scheduler`)
Servidor Node.js com ferramentas CLI (72+ ferramentas):
- Gerenciamento de tarefas
- Ferramentas de produtividade
- API local em `http://localhost:3847`

### Rotação de Contas (`/accounts`)
Sistema de múltiplas contas Claude para evitar rate limits:
- Rotação automática via hooks
- Monitoramento de status
- Re-autenticação isolada

### Contextos (`/contexts`)
Arquivos de contexto carregados sob demanda:
- `agents-context.md` — Mapeamento de 69 agentes
- `tools-cli-context.md` — 72 ferramentas CLI
- `mcp-context.md` — Protocolo de MCPs
- `whatsapp-context.md` — Integração WhatsApp
- Protocolos: chrome, criativos, validação

### Knowledge Base (`/knowledge-base`)
Documentação técnica e guias:
- Shopify, Meta Ads, APIs
- Infraestrutura e servidor
- Marketing digital e criativos

## Configuração de Contas

Crie os arquivos de conta em `/accounts/`:

```json
{
  "email": "sua-conta@email.com",
  "sessionKey": "sk-ant-...",
  "name": "Conta Principal"
}
```

Salve como `account-1.json`, `account-2.json`, `account-3.json` e execute `node accounts/setup.js` para configurar.

## Variáveis de Ambiente

Adicione ao seu `settings.local.json` (não commitado):
```json
{
  "env": {
    "TELEGRAM_BOT_TOKEN": "seu-token",
    "TELEGRAM_CHAT_ID": "seu-chat-id"
  }
}
```

## CLAUDE.md

O arquivo `CLAUDE.md` contém todas as instruções globais do Claude Code, incluindo:
- Regras de comportamento e tom
- Protocolos de trabalho
- Referências a ferramentas e contextos
- Comandos e atalhos

## Framework GSD

O [Get Shit Done](https://gsd.so) é um framework spec-driven integrado:

```bash
/gsd:new-project   # Iniciar projeto
/gsd:plan-phase    # Planejar fase
/gsd:execute-phase # Executar fase
/gsd:progress      # Ver progresso
/gsd:help          # Ajuda completa
```

## Diferenças da versão Mac

Esta é a versão **Windows** com:
- Paths usando `%USERPROFILE%` nos hooks (compatível com cmd e PowerShell)
- Configuração `core.autocrlf=false` já inclusa no `settings.json`
- Encoding UTF-8 via Node.js (nunca `curl -d` com dados PT-BR)
- Caminhos usam barras invertidas nos hooks Windows

## Licença

MIT — Use, modifique e compartilhe livremente.
