# Claude Code Setup — Windows

> Configuração avançada do Claude Code para Windows, desenvolvida e mantida por **Rafael Tondin** — fundador da [Riwer Labs](https://riwerlabs.com).
>
> Instagram: [@rafaeltondin](https://instagram.com/rafaeltondin) | Site: [riwerlabs.com](https://riwerlabs.com)

---

## O que é este projeto?

O Claude Code, na sua instalação padrão, é uma ferramenta poderosa — mas genérica. Este repositório é uma **configuração completa e personalizada** que transforma o Claude Code em um sistema de produtividade e desenvolvimento muito mais capaz, com agentes especializados, automações, ferramentas integradas e um framework de execução de projetos.

Pense assim: o Claude Code padrão é como um carro zero km saindo da fábrica. Este projeto é o mesmo carro depois de anos de uso real, com cada ajuste, ferramenta e otimização que faz diferença no dia a dia.

---

## Claude Code padrão vs. esta configuração

| Recurso | Claude Code Padrão | Esta Configuração |
|---|---|---|
| Agentes especializados | Nenhum | 69+ agentes com expertise específica |
| Skills / comandos customizados | Nenhum | 30+ skills e comandos prontos |
| Memória persistente entre sessões | Básica | Sistema de memória estruturado por tipo |
| Planejamento de projetos | Manual | Framework GSD completo (plano → execução → verificação) |
| Ferramentas CLI integradas | Nenhuma | 72+ ferramentas via task-scheduler |
| Rotação automática de contas | Não | Sim — evita rate limits com múltiplas contas |
| Hooks automáticos | Nenhum | Monitoramento de erros, notificações, proteção de workflow |
| Knowledge Base | Não | Documentação técnica indexada e pesquisável |
| Contextos sob demanda | Não | Arquivos de contexto carregados conforme a tarefa |
| Suporte a Shopify | Básico | 4 agentes + 3 skills específicas (liquid-lint, theme-check, css-overlap) |
| Design e criativos | Básico | UI/UX Pro Max com 50+ estilos, banners, motion, slides |
| Protocolos de trabalho | Não | Chrome, validação, criativos, SSH em batch |
| Instruções globais (CLAUDE.md) | Vazio | Regras, protocolos e comportamentos definidos |
| Windows nativo | Parcial | Configuração completa com encoding UTF-8, paths e scripts |

---

## Recursos e funcionalidades

### Agentes Especializados (`/agents`)

69+ agentes, cada um com instruções, tom e ferramentas calibradas para sua área:

- **Desenvolvimento:** nodejs-ninja, python-expert, javascript-wizard, php-professional, database-expert, architecture-architect
- **Frontend:** html5-guru, css-master, frontend-testing-expert, performance-optimizer
- **DevOps:** devops-engineer, docker-hub-expert, linux-ssh-expert, security-specialist, easypanel-expert, cyberpanel-expert
- **Shopify:** shopify-theme-expert, shopify-liquid-expert, shopify-api-specialist, shopify-fullstack-specialist, shopify-analytics-specialist
- **Marketing:** meta-ads-optimizer, email-marketing-specialist, content-writer, seo-specialist
- **IA & Dados:** ml-specialist, prompt-engineer, data-analyst, api-designer
- **GSD:** 12 agentes especializados em planejamento, execução e verificação de fases

### Framework GSD (`/get-shit-done`)

Sistema spec-driven completo para desenvolvimento de projetos. O Claude não apenas escreve código — ele planeja, executa em fases, verifica e documenta tudo.

```bash
/gsd:new-project    # Inicia projeto com pesquisa profunda de domínio
/gsd:plan-phase     # Planeja fase com análise de dependências
/gsd:execute-phase  # Executa com commits atômicos e verificação
/gsd:progress       # Mostra status atual e próximos passos
/gsd:debug          # Debugging sistemático com estado persistente
/gsd:autonomous     # Executa todas as fases restantes de forma autônoma
/gsd:help           # Lista todos os comandos disponíveis
```

### Skills (`/skills`)

Capacidades especializadas que podem ser combinadas:

- **UI/UX Pro Max** — Design intelligence com 50+ estilos e 161 componentes
- **GSD** — Framework de desenvolvimento spec-driven
- **Shopify** — `liquid-lint` (valida templates Liquid), `theme-check` (auditoria OS 2.0), `css-overlap` (detecta CSS sobreposto)
- **Design** — `banner-design`, `brand`, `design-system`, `slides`, `ui-styling`

### Rotação de Contas (`/accounts`)

Sistema que gerencia múltiplas contas Claude automaticamente para evitar rate limits. Quando uma conta atinge o limite, o hook detecta e rotaciona para a próxima sem interromper o trabalho.

```bash
node accounts/status.js            # Ver status de todas as contas
node accounts/rate-limit-status.js # Verificar limites atuais
node accounts/rotate.js            # Rotação manual
node accounts/token-refresher.js   # Renovar tokens expirados
```

### Hooks Automáticos (`/hooks`)

Scripts que executam automaticamente em eventos do Claude Code:

- **error-monitor-hook.js** — Monitora erros em tempo real, aprende e salva na Knowledge Base
- **account-rotate-hook.js** — Rotaciona conta automaticamente ao detectar rate limit
- **gsd-workflow-guard.js** — Protege o fluxo GSD contra desvios e garante consistência
- **session-logger.js** — Registra atividade de cada sessão para análise futura
- **telegram-notify-hook.js** — Notificações via Telegram para eventos importantes

### Task Scheduler + Tools CLI (`/task-scheduler`)

Servidor Node.js local com 72+ ferramentas acessíveis via linha de comando:

```bash
node tools-cli.js search_kb query="shopify liquid"   # Busca na Knowledge Base
node tools-cli.js html_validator input="index.html"  # Valida HTML/SEO/acessibilidade
node tools-cli.js color_palette input="logo.jpg"     # Extrai paleta de cores
node tools-cli.js scrape_website url="site.com"      # Scraping de sites
```

Inclui: validação de HTML, análise de performance, extração de paletas, transcrição de áudio, OCR, transformação de dados, e muito mais.

### Knowledge Base (`/knowledge-base`)

Documentação técnica indexada e pesquisável cobrindo:

- Shopify (temas, APIs, Liquid sections)
- Meta Ads e marketing digital
- Infraestrutura (CyberPanel, SSL, OpenLiteSpeed)
- APIs externas (Evolution, Google, WooCommerce, ActiveCampaign)
- Guias de criativos, motion e neuromarketing

### Contextos Sob Demanda (`/contexts`)

Arquivos carregados apenas quando necessário, economizando tokens e mantendo o contexto focado:

- `agents-context.md` — Mapeamento completo dos 69 agentes
- `tools-cli-context.md` — Referência das 72 ferramentas CLI
- `mcp-context.md` — Protocolo de uso dos MCPs disponíveis
- `whatsapp-context.md` — Integração com WhatsApp via Evolution API
- Protocolos específicos: chrome-protocol, criativos-protocol, validation-protocol

### CLAUDE.md — Instruções Globais

O arquivo central da configuração. Define como o Claude se comporta em **toda sessão**:

- **Regras obrigatórias** — nunca declarar "pronto" sem testar, sempre explicar antes de executar
- **Protocolos de trabalho** — encoding UTF-8 Windows, SSH em batch, proteção de processos Node
- **Escala de complexidade** — quando usar tasks, heartbeats e âncoras de sessão
- **Segurança** — nunca logar tokens, nunca commitar arquivos sensíveis
- **Economia de tokens** — Grep antes de Read, contextos sob demanda, agentes por função

### MCPs Integrados

Servidores MCP pré-configurados e prontos para uso:

- **chrome-devtools** — Screenshots, automação de browser, análise de performance
- **desktop-commander** — Execução de comandos no terminal
- **sequential-thinking** — Raciocínio estruturado para tarefas complexas
- **context7** — Documentação atualizada de libs e frameworks
- **codebase-memory** — Knowledge graph do código, reduz consumo de tokens em até 49x

---

## Instalação

### Requisitos

- Windows 10/11
- [Claude Code](https://claude.ai/code) instalado
- Node.js 18+
- Git + Git Bash
- Python 3.10+ (ferramentas opcionais)

### Passo a passo

```bash
# 1. Clone na pasta correta do Claude Code
git clone https://github.com/rafaeltondin/claude-code-setup.git "%USERPROFILE%\.claude"

# 2. Instale as dependências principais
cd "%USERPROFILE%\.claude"
npm install

# 3. Instale as dependências do task-scheduler
cd task-scheduler && npm install && cd ..
```

> Use Git Bash para executar os comandos shell no Windows.

### Configuração de contas

Crie os arquivos em `accounts/` (não commitados por segurança):

```json
{
  "email": "sua-conta@email.com",
  "sessionKey": "sk-ant-...",
  "name": "Conta Principal"
}
```

Salve como `account-1.json`, `account-2.json`, `account-3.json` e execute:

```bash
node accounts/setup.js
```

### Variáveis de ambiente opcionais

Crie `settings.local.json` na raiz (não commitado):

```json
{
  "env": {
    "TELEGRAM_BOT_TOKEN": "seu-token",
    "TELEGRAM_CHAT_ID": "seu-chat-id"
  }
}
```

---

## Diferenças desta configuração para o Mac

Esta versão é **nativa para Windows**:

- Encoding UTF-8 via Node.js — `curl -d` quebra caracteres PT-BR no Windows
- `core.autocrlf=false` configurado automaticamente no `settings.json`
- Scripts `.bat` para inicialização do servidor (`start-all.bat`, `stop-all.bat`)
- Paths compatíveis com Git Bash e PowerShell
- Proteção de processos Node via PowerShell (`Get-Process` em vez de `pkill`)

---

## Sobre

Desenvolvido por **Rafael Tondin**, fundador da [Riwer Labs](https://riwerlabs.com) — agência especializada em desenvolvimento web, automações e marketing digital.

- Site: [riwerlabs.com](https://riwerlabs.com)
- Instagram: [@rafaeltondin](https://instagram.com/rafaeltondin)

---

## Licença

MIT — Use, modifique e compartilhe livremente.
