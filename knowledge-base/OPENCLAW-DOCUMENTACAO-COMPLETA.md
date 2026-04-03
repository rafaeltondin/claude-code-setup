# OPENCLAW - DOCUMENTACAO COMPLETA

> Documentacao extraida de https://docs.openclaw.ai/ em 2026-03-21
> OpenClaw e um gateway self-hosted que conecta plataformas de mensagens (WhatsApp, Telegram, Discord, Slack, Signal, iMessage) a agentes de IA com soberania de dados.
> Licenca: MIT | Fundador: Peter Steinberger (@steipete)

---

## INDICE

1. [Visao Geral e Conceitos](#1-visao-geral-e-conceitos)
2. [Instalacao e Setup](#2-instalacao-e-setup)
3. [Configuracao do Gateway](#3-configuracao-do-gateway)
4. [Canais de Comunicacao](#4-canais-de-comunicacao)
5. [Multi-Agent e Roteamento](#5-multi-agent-e-roteamento)
6. [Sessoes e Gerenciamento de Estado](#6-sessoes-e-gerenciamento-de-estado)
7. [Ferramentas (Tools)](#7-ferramentas-tools)
8. [Automacao](#8-automacao)
9. [Seguranca](#9-seguranca)
10. [Nodes e Dispositivos](#10-nodes-e-dispositivos)
11. [Plataformas](#11-plataformas)
12. [Control UI (Dashboard)](#12-control-ui-dashboard)
13. [Plugins e Skills](#13-plugins-e-skills)
14. [Hooks (Eventos Internos)](#14-hooks-eventos-internos)
15. [Memoria e Workspace](#15-memoria-e-workspace)
16. [Streaming e Chunking](#16-streaming-e-chunking)
17. [Logging e Diagnostico](#17-logging-e-diagnostico)
18. [Tailscale](#18-tailscale)
19. [Referencia de CLI](#19-referencia-de-cli)

---

## 1. VISAO GERAL E CONCEITOS

### 1.1 O que e OpenClaw

OpenClaw e um gateway self-hosted que conecta plataformas de mensagens a agentes de IA. Funciona como um processo unico (Gateway) que gerencia multiplos canais simultaneamente.

**Caracteristicas principais:**
- Gateway unico gerencia WhatsApp, Telegram, Discord, Slack, Signal, iMessage
- Extensibilidade via plugins (Mattermost, Matrix, Microsoft Teams, Nostr)
- Roteamento multi-agente com sessoes isoladas
- Manipulacao de midia (imagens, audio, documentos)
- Dashboard web (Control UI) e app macOS companion
- Nodes moveis (iOS/Android) com pareamento
- Soberania de dados via self-hosting
- Licenca MIT

**Requisitos:**
- Node.js 24+ (ou Node 22.16+)
- Chave de API de um provedor de modelo (Anthropic, OpenAI, Google, etc.)
- ~5 minutos para deploy

### 1.2 Arquitetura

Um Gateway persistente unico gerencia todas as superficies de mensagens:
- WhatsApp via Baileys
- Telegram via grammY
- Slack, Discord, Signal, iMessage, WebChat

**Componentes:**
- **Gateway Daemon**: mantem conexoes com provedores e expoe API WS tipada (requests, responses, server-push events)
- **Clientes** (app macOS, CLI, web admin): conectam via WebSocket individual
- **Nodes**: conectam com `role: node`, declaram capacidades e comandos
- **WebChat**: UI estatica que usa a API WS do Gateway

**Protocolo de Conexao:**

Handshake requer frame `connect` inicial:
```
Cliente -> connect (com auth)
Servidor -> hello-ok (com snapshot de dados)
-> eventos de presenca e ticks
```

Apos handshake:
- Requests: `{type:"req", id, method, params}`
- Responses: `{type:"res", id, ok, payload|error}`
- Eventos: `{type:"event", event, payload, seq?, stateVersion?}`

**Invariantes:**
- Um Gateway controla uma sessao Baileys por host
- Handshake obrigatorio; frames nao-JSON causam desconexao
- Eventos nao sao replayados; clientes devem atualizar em gaps

### 1.3 Features

**Canais:** WhatsApp, Telegram, Discord, iMessage (built-in) + Mattermost, Matrix, Teams, Nostr (plugins)
**Agente:** Runtime embarcado com streaming de ferramentas, roteamento multi-agente, sessoes isoladas
**Auth e Provedores:** 35+ provedores de modelo, autenticacao OAuth, endpoints custom/self-hosted (vLLM, SGLang, Ollama)
**Midia:** Imagens, audio, video, documentos, transcricao de voz, TTS
**Apps:** WebChat, Control UI (browser), app macOS, node iOS, node Android
**Ferramentas:** Automacao de browser, busca web, agendamento, workflows
**Automacao:** Cron jobs, webhooks, heartbeat, standing orders

### 1.4 Queue (Fila de Mensagens)

Fila FIFO com lanes para serializar runs de auto-reply, prevenindo colisoes.

**Modos:**
- `steer`: injeta imediatamente no run atual
- `followup`: enfileira para proximo turno do agente
- `collect` (padrao): coalesce mensagens enfileiradas em unico followup
- `steer-backlog`: steer imediatamente + preserva mensagem para followup
- `interrupt`: aborta run ativo e executa mensagem mais recente (legacy)

```json5
{
  messages: {
    queue: {
      mode: "collect",
      debounceMs: 1000,
      cap: 20,
      drop: "summarize",
      byChannel: { discord: "collect" },
    },
  },
}
```

Override por sessao: `/queue <mode>`, `/queue collect debounce:2s cap:25 drop:summarize`

### 1.5 Presenca

View best-effort do Gateway e clientes conectados.

**Campos:** instanceId, host, ip, version, deviceFamily, mode, lastInputSeconds, reason, ts
**TTL:** Entradas > 5 min sao removidas
**Capacidade:** Max 200 entradas
**Debug:** `system-presence` para ver lista raw

### 1.6 Timezone

```json5
{
  agents: {
    defaults: {
      envelopeTimezone: "local", // utc | local | user | IANA string
      envelopeTimestamp: "on",
      envelopeElapsed: "on",
      userTimezone: "America/Sao_Paulo",
      timeFormat: "auto", // auto | 12 | 24
    },
  },
}
```

---

## 2. INSTALACAO E SETUP

### 2.1 Instalacao

**macOS / Linux:**
```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

**Windows (PowerShell):**
```powershell
iwr -useb https://openclaw.ai/install.ps1 | iex
```

**Alternativas:** Docker, Nix, npm

### 2.2 Setup Rapido

```bash
# Passo 1: Onboarding (~2 min)
openclaw onboard --install-daemon

# Passo 2: Verificar status
openclaw gateway status

# Passo 3: Abrir dashboard
openclaw dashboard

# Passo 4: Enviar primeira mensagem via Control UI
```

### 2.3 Variaveis de Ambiente

- `OPENCLAW_HOME`: diretorio home para resolucao de caminhos
- `OPENCLAW_STATE_DIR`: override do diretorio de estado
- `OPENCLAW_CONFIG_PATH`: override do caminho do config

### 2.4 Onboarding CLI

```bash
openclaw onboard        # Setup interativo
openclaw configure      # Reconfigurar
openclaw agents add <name>  # Adicionar agente
```

**QuickStart (defaults):**
- Gateway local (loopback)
- Porta 18789
- Auth: Token (auto-gerado)
- Tool profile: "coding"
- DM isolation: `per-channel-peer`
- Tailscale: Off

**Passos do setup local:**
1. Model/Auth (provedor, API key, modelo default)
2. Workspace (local de arquivos do agente, default `~/.openclaw/workspace`)
3. Gateway (porta, bind, auth, Tailscale)
4. Channels (WhatsApp, Telegram, Discord, Google Chat, Mattermost, Signal, BlueBubbles, iMessage)
5. Daemon (LaunchAgent macOS / systemd Linux)
6. Health check
7. Skills

### 2.5 Docker

```bash
# Build e setup
./scripts/docker/setup.sh

# OU manual:
docker build -t openclaw:local -f Dockerfile .
docker compose run --rm openclaw-cli onboard
docker compose up -d openclaw-gateway
```

**Variaveis Docker:**

| Variavel | Proposito |
|----------|-----------|
| `OPENCLAW_IMAGE` | Usar imagens remotas |
| `OPENCLAW_DOCKER_APT_PACKAGES` | Pacotes apt extras |
| `OPENCLAW_EXTENSIONS` | Dependencias de extensoes |
| `OPENCLAW_EXTRA_MOUNTS` | Bind mounts extras |
| `OPENCLAW_HOME_VOLUME` | Persistir `/home/node` |
| `OPENCLAW_SANDBOX` | Habilitar sandbox |
| `OPENCLAW_DOCKER_SOCKET` | Override do Docker socket |

**Health Checks:**
- `/healthz` - liveness probe
- `/readyz` - readiness probe

### 2.6 Doctor (Diagnostico)

```bash
openclaw doctor
openclaw doctor --fix
openclaw doctor --deep
openclaw doctor --repair --force
```

Funcoes: validacao de config, migracoes legadas, health checks, auditoria de seguranca, verificacao de permissoes, deteccao de conflitos de porta.

---

## 3. CONFIGURACAO DO GATEWAY

### 3.1 Arquivo de Configuracao

Config JSON5 em `~/.openclaw/openclaw.json`. Se ausente, defaults seguros aplicam.

```json5
// Configuracao minima
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
  channels: { whatsapp: { allowFrom: ["+15555550123"] } },
}
```

**Metodos de configuracao:**
- `openclaw onboard` (interativo)
- `openclaw configure` (wizard)
- Control UI em `http://127.0.0.1:18789`
- Edicao direta do JSON5 (hot-reload automatico)

**CLI de config:**
```bash
openclaw config get agents.defaults.workspace
openclaw config set agents.defaults.heartbeat.every "2h"
openclaw config unset plugins.entries.brave.config.webSearch.apiKey
```

### 3.2 Modelo

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-sonnet-4-6",
        fallbacks: ["openai/gpt-5.2"],
      },
      models: {
        "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
        "openai/gpt-5.2": { alias: "GPT" },
      },
    },
  },
}
```

Formato: `provider/model` (ex: `anthropic/claude-opus-4-6`).

### 3.3 DM Policy (Politica de DM)

Opcoes para `channels.<channel>.dmPolicy`:
- `pairing` (padrao): remetentes desconhecidos recebem codigo de aprovacao (expira 1h, max 3 pendentes)
- `allowlist`: apenas remetentes aprovados
- `open`: permite qualquer DM (requer `allowFrom: ["*"]`)
- `disabled`: ignora todas as DMs

### 3.4 Hot Reload

```json5
{
  gateway: {
    reload: { mode: "hybrid", debounceMs: 300 },
  },
}
```

**Modos:**
- `hybrid` (padrao): mudancas seguras instantaneas, restart automatico para criticas
- `hot`: apenas mudancas seguras
- `restart`: restart em qualquer mudanca
- `off`: desabilita watching

**Sem restart:** canais, agent/models, automacao, sessoes/mensagens, tools/media, UI
**Com restart:** configuracoes do servidor gateway (porta, bind, auth, TLS, HTTP)

### 3.5 Config File Splitting ($include)

```json5
// ~/.openclaw/openclaw.json
{
  gateway: { port: 18789 },
  agents: { $include: "./agents.json5" },
  broadcast: {
    $include: ["./clients/a.json5", "./clients/b.json5"],
  },
}
```

Suporta includes aninhados ate 10 niveis, caminhos relativos, merge profundo.

### 3.6 Substituicao de Variaveis de Ambiente

```json5
{
  gateway: { auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" } },
  models: { providers: { custom: { apiKey: "${CUSTOM_API_KEY}" } } },
}
```

Regras: apenas nomes maiusculos `[A-Z_][A-Z0-9_]*`, variaveis faltantes geram erro, escape com `$${VAR}`.

### 3.7 Secret References

```json5
{
  models: {
    providers: {
      openai: { apiKey: { source: "env", provider: "default", id: "OPENAI_API_KEY" } },
    },
  },
}
```

Fontes: `env`, `file`, `exec` com provedores configuraveis.

### 3.8 RPC de Configuracao

Rate limit: 3 requests por 60 segundos por `deviceId+clientIp`.

**config.apply** - Valida e escreve config completa:
```bash
openclaw gateway call config.apply --params '{
  "raw": "{ agents: { defaults: { workspace: \"~/.openclaw/workspace\" } } }",
  "baseHash": "<hash>",
  "sessionKey": "agent:main:whatsapp:direct:+15555550123"
}'
```

**config.patch** - Merge parcial (JSON merge patch):
```bash
openclaw gateway call config.patch --params '{
  "raw": "{ channels: { telegram: { groups: { \"*\": { requireMention: false } } } } }",
  "baseHash": "<hash>"
}'
```

### 3.9 Acesso Remoto

Gateway WebSocket liga a loopback na porta 18789 por default.

**SSH Tunnel:**
```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

**Config remota:**
```json5
{
  gateway: {
    mode: "remote",
    remote: {
      url: "ws://127.0.0.1:18789",
      token: "your-token",
    },
  },
}
```

### 3.10 Background Process (Daemon)

Gateway pode rodar como servico via:
- **macOS:** LaunchAgent
- **Linux:** systemd user unit

```bash
openclaw gateway install --force
openclaw gateway restart
```

### 3.11 Saude do Canal

```json5
{
  gateway: {
    channelHealthCheckMinutes: 5,
    channelStaleEventThresholdMinutes: 30,
    channelMaxRestartsPerHour: 10,
  },
}
```

---

## 4. CANAIS DE COMUNICACAO

### 4.1 WhatsApp

**Status:** Production-ready via Baileys (WhatsApp Web)

**Setup rapido:**
```bash
# Configurar politica de acesso
# Link WhatsApp:
openclaw channels login --channel whatsapp
# Iniciar gateway:
openclaw gateway
# Aprovar pairing:
openclaw pairing list whatsapp
openclaw pairing approve whatsapp <CODE>
```

**Config:**
```json5
{
  channels: {
    whatsapp: {
      dmPolicy: "pairing",
      allowFrom: ["+15551234567"],
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15551234567"],
      textChunkLimit: 4000,
      chunkMode: "newline",
      mediaMaxMb: 50,
      sendReadReceipts: true,
      ackReaction: { emoji: "👀", direct: true, group: "mentions" },
    },
  },
}
```

**Campos de alta prioridade:**
- Access: `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`
- Delivery: `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `sendReadReceipts`
- Multi-Account: `accounts.<id>.*`
- Sessao: `historyLimit`, `dmHistoryLimit`

### 4.2 Telegram

**Status:** Production-ready via grammY (Bot API)

**Setup:**
1. Criar bot com @BotFather
2. Configurar token e politica

```json5
{
  channels: {
    telegram: {
      enabled: true,
      botToken: "123:abc",
      dmPolicy: "pairing",
      groups: { "*": { requireMention: true } },
      streaming: "partial", // off | partial | block | progress
      textChunkLimit: 4000,
      mediaMaxMb: 100,
    },
  },
}
```

**Features especiais:**
- Forum topics com roteamento por topico
- Inline buttons (`capabilities.inlineButtons`)
- Reply threading tags (`[[reply_to_current]]`, `[[reply_to:<id>]]`)
- Stickers (inbound/outbound)
- Reacoes e notificacoes de reacao
- Webhook mode (alternativa ao long polling)
- Exec approvals em DMs/canais
- Comandos nativos e custom
- Audio como voice note (`[[audio_as_voice]]`)
- Video notes

**Config de webhook:**
```json5
{
  channels: {
    telegram: {
      webhookUrl: "https://example.com/telegram-webhook",
      webhookSecret: "your-secret",
      webhookPath: "/telegram-webhook",
      webhookHost: "127.0.0.1",
      webhookPort: 8787,
    },
  },
}
```

### 4.3 Discord

**Status:** Production-ready via Bot API

**Setup (7 passos):**
1. Criar aplicacao e bot no Developer Portal
2. Habilitar intents privilegiados (Message Content obrigatorio)
3. Copiar token do bot
4. Gerar URL de convite com escopos `bot` + `applications.commands`
5. Habilitar Developer Mode
6. Permitir DMs de membros do servidor
7. Configurar token

```json5
{
  channels: {
    discord: {
      enabled: true,
      token: { source: "env", provider: "default", id: "DISCORD_BOT_TOKEN" },
      dmPolicy: "pairing",
      groupPolicy: "allowlist",
      streaming: "partial",
      textChunkLimit: 4000,
      mediaMaxMb: 8,
    },
  },
}
```

**Features:**
- Forum channels
- Interactive components (botoes, selects, modals)
- Role-based agent routing
- Thread-bound sessions
- PluralKit support
- Presence/status customizado
- Voice channels (STT/TTS)
- Voice messages
- Exec approvals
- Components v2 UI

### 4.4 Slack

**Status:** Production-ready via Socket Mode ou HTTP Events API

**Socket Mode:**
```json5
{
  channels: {
    slack: {
      enabled: true,
      mode: "socket",
      appToken: "xapp-...",
      botToken: "xoxb-...",
      dmPolicy: "pairing",
    },
  },
}
```

**HTTP Mode:**
```json5
{
  channels: {
    slack: {
      enabled: true,
      mode: "http",
      botToken: "xoxb-...",
      signingSecret: "your-signing-secret",
      webhookPath: "/slack/events",
    },
  },
}
```

**Features:** Slash commands, interactive replies, native streaming via Agents API, threading, MPIM support.

### 4.5 Signal

**Status:** Integracao externa via signal-cli (HTTP JSON-RPC + SSE)

**Prerequisitos:** signal-cli instalado, numero de telefone para verificacao SMS

**Setup por QR Link:**
```bash
signal-cli link -n "OpenClaw"
# Escanear QR no app Signal
```

**Setup por SMS:**
```bash
signal-cli -a +<BOT_PHONE_NUMBER> register --captcha '<SIGNALCAPTCHA_URL>'
signal-cli -a +<BOT_PHONE_NUMBER> verify <VERIFICATION_CODE>
```

```json5
{
  channels: {
    signal: {
      enabled: true,
      account: "+15551234567",
      cliPath: "signal-cli",
      dmPolicy: "pairing",
    },
  },
}
```

### 4.6 iMessage (Legacy)

**Aviso:** Para novos deploys, usar BlueBubbles.

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "/opt/homebrew/bin/imsg",
      dbPath: "/Users/<username>/Library/Messages/chat.db",
      dmPolicy: "pairing",
    },
  },
}
```

Requer: macOS, Full Disk Access, Automation permission para Messages.app.

### 4.7 BlueBubbles (iMessage Recomendado)

Plugin bundled que comunica com BlueBubbles server via HTTP.

```json5
{
  channels: {
    bluebubbles: {
      enabled: true,
      serverUrl: "http://localhost:1234",
      password: "your-password",
      webhookPath: "/bluebubbles-webhook",
      dmPolicy: "pairing",
    },
  },
}
```

Features: reacoes (tapbacks), edicao de mensagens (macOS 13+), unsend, reply threading, efeitos de mensagem, gerenciamento de grupo.

### 4.8 Google Chat

Integracao via webhooks (HTTP-only).

**Setup:**
1. Habilitar Google Chat API
2. Criar Service Account
3. Baixar JSON key
4. Configurar Chat App no Google Cloud Console
5. Configurar OpenClaw

```json5
{
  channels: {
    googlechat: {
      enabled: true,
      serviceAccountFile: "/path/to/service-account.json",
      audienceType: "app-url",
      audience: "https://gateway.example.com/googlechat",
      webhookPath: "/googlechat",
      dm: { policy: "pairing" },
    },
  },
}
```

### 4.9 Mattermost (Plugin)

```bash
openclaw plugins install @openclaw/mattermost
```

```json5
{
  channels: {
    mattermost: {
      enabled: true,
      botToken: "mm-token",
      baseUrl: "https://chat.example.com",
      dmPolicy: "pairing",
      chatmode: "oncall", // oncall | onmessage | onchar
    },
  },
}
```

Features: slash commands nativos, interactive buttons com HMAC, reacoes, multi-account.

---

## 5. MULTI-AGENT E ROTEAMENTO

### 5.1 Conceito

Um agente e um "cerebro" com workspace isolado, diretorio de estado e store de sessoes. O Gateway pode hospedar um ou multiplos agentes.

**Caminhos:**
- Config: `~/.openclaw/openclaw.json`
- Workspace: `~/.openclaw/workspace` ou `~/.openclaw/workspace-<agentId>`
- Agent dir: `~/.openclaw/agents/<agentId>/agent`
- Sessoes: `~/.openclaw/agents/<agentId>/sessions`

### 5.2 Setup

```bash
openclaw agents add <name>        # Criar agente
openclaw agents list --bindings   # Verificar
```

### 5.3 Config Multi-Agente

```json5
{
  agents: {
    list: [
      { id: "home", default: true, workspace: "~/.openclaw/workspace-home" },
      { id: "work", workspace: "~/.openclaw/workspace-work" },
    ],
  },
  bindings: [
    { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
    { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } },
  ],
}
```

### 5.4 Hierarquia de Roteamento (First Match Wins)

1. Peer match (DM/grupo/canal exato)
2. Parent peer match (heranca de thread)
3. Guild ID + roles (Discord)
4. Guild ID (Discord)
5. Team ID (Slack)
6. Account ID match para canal
7. Channel-level match (`accountId: "*"`)
8. Default agent fallback

### 5.5 Sandbox e Tools por Agente

```json5
{
  agents: {
    list: [
      {
        id: "family",
        sandbox: { mode: "all", scope: "agent" },
        tools: { allow: ["exec", "read"], deny: ["write", "edit"] },
      },
    ],
  },
}
```

---

## 6. SESSOES E GERENCIAMENTO DE ESTADO

### 6.1 DM Scope

```json5
{
  session: {
    dmScope: "per-channel-peer", // main | per-peer | per-channel-peer | per-account-channel-peer
  },
}
```

### 6.2 Chaves de Sessao

- DMs (main): `agent:<agentId>:<mainKey>`
- DMs (per-channel-peer): `agent:<agentId>:<channel>:direct:<peerId>`
- Grupos: `agent:<agentId>:<channel>:group:<id>`
- Telegram topics: append `:topic:<threadId>`
- Cron: `cron:<job.id>`
- Webhooks: `hook:<uuid>`

### 6.3 Identity Links

```json5
{
  session: {
    identityLinks: {
      alice: ["telegram:123456789", "discord:987654321012345678"],
    },
  },
}
```

### 6.4 Reset de Sessao

```json5
{
  session: {
    reset: {
      mode: "daily",
      atHour: 4,
      idleMinutes: 120,
    },
    resetByType: {
      thread: { mode: "daily", atHour: 4 },
      direct: { mode: "idle", idleMinutes: 240 },
      group: { mode: "idle", idleMinutes: 120 },
    },
  },
}
```

Triggers: `/new`, `/reset` (configuraveis via `resetTriggers`)

### 6.5 Manutencao

```json5
{
  session: {
    maintenance: {
      mode: "enforce",
      pruneAfter: "30d",
      maxEntries: 500,
      rotateBytes: "10mb",
      maxDiskBytes: "1gb",
      highWaterBytes: "800mb",
    },
  },
}
```

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --enforce
```

### 6.6 Send Policy

```json5
{
  session: {
    sendPolicy: {
      rules: [
        { action: "deny", match: { channel: "discord", chatType: "group" } },
        { action: "deny", match: { keyPrefix: "cron:" } },
      ],
      default: "allow",
    },
  },
}
```

Override por sessao: `/send on`, `/send off`, `/send inherit`

---

## 7. FERRAMENTAS (TOOLS)

### 7.1 Exec

Executa comandos shell em workspaces.

**Parametros:**
- `command` (obrigatorio): comando shell
- `workdir`: diretorio de trabalho
- `env`: variaveis de ambiente
- `yieldMs` (default 10000): auto-background delay
- `background` (bool): backgrounding imediato
- `timeout` (default 1800s): timeout
- `host` (`sandbox | gateway | node`): local de execucao
- `security` (`deny | allowlist | full`): modo de enforcement
- `ask` (`off | on-miss | always`): prompts de aprovacao
- `elevated` (bool): execucao privilegiada no gateway

```json5
{
  tools: {
    exec: {
      host: "sandbox",
      security: "deny",
      ask: "on-miss",
      notifyOnExit: true,
      pathPrepend: ["~/bin"],
    },
  },
}
```

**Process tool actions:** list, poll, log, write, kill, clear, remove

**Override por sessao:** `/exec host=gateway security=allowlist ask=on-miss`

### 7.2 Browser

Controla Chrome/Brave/Edge/Chromium dedicado, isolado do browser pessoal.

**Perfis:**
- `openclaw`: browser gerenciado e isolado (padrao)
- `user`: Chrome MCP attach profile para Chrome real
- Remote profiles (CDP URL explicita)
- Existing-session profiles (Chrome DevTools MCP, Chrome 144+)

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "openclaw",
    headless: false,
    ssrfPolicy: {
      dangerouslyAllowPrivateNetwork: false,
      hostnameAllowlist: ["*.example.com"],
    },
  },
}
```

**API HTTP de controle (loopback):**
- `GET /` - status
- `POST /start` / `POST /stop` - lifecycle
- `GET /tabs` / `POST /tabs/open` / `DELETE /tabs/:targetId` - tabs
- `GET /snapshot` / `POST /screenshot` - inspecao
- `POST /navigate` / `POST /act` - navegacao/acoes
- `GET /cookies` / `POST /cookies/set` / `POST /cookies/clear` - estado
- `POST /set/offline|headers|credentials|geolocation|media|timezone|locale|device` - configuracoes

**CLI:**
```bash
openclaw browser status
openclaw browser start
openclaw browser open https://example.com
openclaw browser snapshot --interactive
openclaw browser click 12
openclaw browser type 23 "hello" --submit
openclaw browser screenshot --full-page
```

**Servicos hospedados suportados:** Browserless, Browserbase

### 7.3 PDF

Analisa PDFs via modo nativo (Anthropic/Google) ou fallback de extracao.

```json5
{
  agents: {
    defaults: {
      pdfModel: { primary: "anthropic/claude-opus-4-6" },
      pdfMaxBytesMb: 10,
      pdfMaxPages: 20,
    },
  },
}
```

**Parametros:** pdf, pdfs (max 10), prompt, pages, model, maxBytesMb

### 7.4 Elevated Mode

Permite agentes sandboxed executarem no gateway host.

```json5
{
  tools: {
    elevated: {
      enabled: true,
      allowFrom: {
        discord: ["user-id-123"],
        whatsapp: ["+15555550123"],
      },
    },
  },
}
```

Comandos: `/elevated on`, `/elevated ask`, `/elevated full`, `/elevated off`

---

## 8. AUTOMACAO

### 8.1 Cron Jobs

Scheduler built-in no Gateway para jobs agendados.

**Estilos de execucao:**
- Main session: enfileira system events para proximo heartbeat
- Isolated: runs dedicados em sessoes `cron:<jobId>`
- Current session: vincula a sessao onde o cron foi criado
- Custom session: contexto persistente com sessoes nomeadas

**Tipos de schedule:** At (one-shot ISO 8601), Every (intervalo fixo ms), Cron (5-6 campos + timezone)

```json5
{
  cron: {
    enabled: true,
    maxConcurrentRuns: 2,
    sessionRetention: "24h",
    runLog: { maxBytes: "2mb", keepLines: 2000 },
  },
}
```

**CLI:**
```bash
# One-shot
openclaw cron add --name "Reminder" --at "2026-02-01T16:00:00Z" \
  --session main --system-event "Text" --wake now --delete-after-run

# Recorrente com delivery
openclaw cron add --name "Morning brief" --cron "0 7 * * *" \
  --tz "America/Los_Angeles" --session isolated \
  --message "Summarize overnight updates." --announce \
  --channel slack --to "channel:C1234567890"
```

**API Gateway:** cron.list, cron.status, cron.add, cron.update, cron.remove, cron.run, cron.runs

### 8.2 Heartbeat

Turnos periodicos do agente na sessao principal.

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last",
        lightContext: false,
        isolatedSession: false,
        activeHours: { start: "09:00", end: "22:00", timezone: "America/New_York" },
      },
    },
  },
}
```

Modelo retorna `HEARTBEAT_OK` quando nada precisa de atencao.

**Arquivo opcional:** `HEARTBEAT.md` no workspace serve como checklist persistente.

**Trigger manual:** `openclaw system event --text "Check urgent" --mode now`

### 8.3 Hooks (Webhooks)

```json5
{
  hooks: {
    enabled: true,
    token: "shared-secret",
    path: "/hooks",
    defaultSessionKey: "hook:ingress",
    mappings: [
      {
        match: { path: "gmail" },
        action: "agent",
        agentId: "main",
        deliver: true,
      },
    ],
  },
}
```

### 8.4 Standing Orders

Ordens permanentes de operacao para agentes, definidas em `AGENTS.md` no workspace.

Componentes: Scope (acoes autorizadas), Triggers (timing), Approval gates (aprovacao humana), Escalation rules.

Arquivo auto-injetado toda sessao junto com `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `MEMORY.md`.

---

## 9. SEGURANCA

### 9.1 Modelo de Seguranca

OpenClaw opera sob modelo de **assistente pessoal**, nao isolamento multi-tenant hostil. Um operador confiavel por gateway.

### 9.2 Auditoria de Seguranca

```bash
openclaw security audit
openclaw security audit --deep
openclaw security audit --fix
```

### 9.3 Baseline Hardened (60 segundos)

```json5
{
  gateway: {
    mode: "local",
    bind: "loopback",
    auth: { mode: "token", token: "replace-with-long-random-token" },
  },
  session: { dmScope: "per-channel-peer" },
  tools: {
    profile: "messaging",
    deny: ["group:automation", "group:runtime", "group:fs", "sessions_spawn", "sessions_send"],
    fs: { workspaceOnly: true },
    exec: { security: "deny", ask: "always" },
    elevated: { enabled: false },
  },
  channels: {
    whatsapp: { dmPolicy: "pairing", groups: { "*": { requireMention: true } } },
  },
}
```

### 9.4 Modos de Auth do Gateway

- `token`: bearer token compartilhado (recomendado)
- `password`: autenticacao por senha
- `trusted-proxy`: reverse proxy identity-aware

### 9.5 Mapa de Credenciais

| Tipo | Local |
|------|-------|
| WhatsApp | `~/.openclaw/credentials/whatsapp/<accountId>/creds.json` |
| Telegram token | `channels.telegram.tokenFile` |
| Discord token | config/env ou SecretRef |
| Pairing allowlists | `~/.openclaw/credentials/<channel>-allowFrom.json` |
| Auth profiles | `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` |

### 9.6 Permissoes de Arquivo

- `~/.openclaw/openclaw.json`: `600`
- `~/.openclaw`: `700`

### 9.7 Sandboxing

**Metodos:**
1. Gateway completo em Docker (container boundary)
2. Tool sandbox: Gateway no host + tools em Docker isolado

**Workspace access:** none (padrao), ro (read-only), rw (read/write)
**Scope:** agent (padrao), session, shared

### 9.8 Prevencao de Prompt Injection

- Manter DMs bloqueadas (pairing/allowlists)
- Preferir mention gating em grupos
- Tratar links/attachments como hostis
- Rodar execucao sensivel em sandbox
- Limitar tools de alto risco a agentes confiaveis
- Usar modelos latest-generation

### 9.9 Flags Perigosas

- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback`
- `gateway.controlUi.dangerouslyDisableDeviceAuth`
- `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
- `channels.discord.dangerouslyAllowNameMatching`
- `channels.slack.dangerouslyAllowNameMatching`
- `agents.defaults.sandbox.docker.dangerouslyAllowReservedContainerTargets`
- `agents.defaults.sandbox.docker.dangerouslyAllowExternalBindSources`

### 9.10 Resposta a Incidentes

**Conter:**
1. Parar app/processo gateway
2. `gateway.bind: "loopback"`
3. `dmPolicy: "disabled"` para DMs/grupos arriscados

**Rotacionar:**
1. `gateway.auth.token`
2. `gateway.remote.token`
3. Credenciais de provedores/API

**Auditar:**
1. Logs: `/tmp/openclaw/openclaw-YYYY-MM-DD.log`
2. Transcripts: `~/.openclaw/agents/<agentId>/sessions/*.jsonl`
3. `openclaw security audit --deep`

---

## 10. NODES E DISPOSITIVOS

### 10.1 Conceito

Node = dispositivo companion (macOS/iOS/Android/headless) que conecta ao Gateway via WebSocket com `role: node`.

### 10.2 Pairing

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
openclaw nodes status
```

Requests pendentes expiram em 5 minutos.

### 10.3 Node Host Remoto

```bash
# Foreground
openclaw node run --host <gateway-host> --port 18789 --display-name "Build Node"

# Via SSH tunnel
ssh -N -L 18790:127.0.0.1:18789 user@gateway-host
openclaw node run --host 127.0.0.1 --port 18790 --display-name "Build Node"

# Instalacao como servico
openclaw node install --host <gateway-host> --port 18789
```

### 10.4 Comandos de Node

**Canvas:**
```bash
openclaw nodes canvas snapshot --node <id> --format png
openclaw nodes canvas present --node <id> --target https://example.com
openclaw nodes canvas eval --node <id> --js "document.title"
```

**Camera:**
```bash
openclaw nodes camera snap --node <id>
openclaw nodes camera clip --node <id> --duration 10s
```

**Screen Recording:**
```bash
openclaw nodes screen record --node <id> --duration 10s --fps 10
```

**Location:**
```bash
openclaw nodes location get --node <id>
```

**SMS (Android):**
```bash
openclaw nodes invoke --node <id> --command sms.send --params '{"to":"+15555550123","message":"Hello"}'
```

**Android Device:**
- `device.status`, `device.info`, `device.permissions`, `device.health`
- `notifications.list`, `notifications.actions`
- `photos.latest`, `contacts.search`, `contacts.add`
- `calendar.events`, `calendar.add`
- `callLog.search`, `sms.search`
- `motion.activity`, `motion.pedometer`

### 10.5 Exec Binding

```bash
openclaw config set tools.exec.node "node-id-or-name"
# Override por sessao:
/exec host=node security=allowlist node=<id-or-name>
```

---

## 11. PLATAFORMAS

### 11.1 macOS

App menubar companion que gerencia permissoes, conecta ao Gateway, e expoe capacidades macOS.

**Modos:** Local (padrao) e Remote (via SSH/Tailscale)

**Capacidades do node:** Canvas, Camera, Screen Recording, system.run, system.notify

**Deep links:** `openclaw://agent?message=Hello%20from%20deep%20link`

**LaunchAgent:** `ai.openclaw.gateway`

### 11.2 iOS

App companion (preview interna) com Canvas, Camera, Location, Talk mode, Voice wake.

**Requisitos:** Gateway rodando em macOS/Linux/WSL2, conectividade via LAN/tailnet/manual

**Push notifications:** Via relay externo (builds oficiais) ou APNs direto (builds locais)

**Discovery:** Bonjour (LAN), Tailnet (DNS-SD), Manual

### 11.3 Android

App companion node (nao hospeda Gateway).

**Features:** Chat/History, Canvas + Camera, Voice (mic/TTS), Device commands (notifications, photos, contacts, calendar, SMS, call logs, motion)

**Build:** `./gradlew :app:assemblePlayDebug` (Java 17 + Android SDK)

**Status:** Nao publicado publicamente ainda

---

## 12. CONTROL UI (DASHBOARD)

### 12.1 Visao Geral

Aplicacao Vite + Lit SPA servida pelo Gateway em `http://<host>:18789/`.

### 12.2 Autenticacao

WebSocket handshake via `connect.params.auth.token` ou `connect.params.auth.password`.

**Device pairing para conexoes remotas:**
```bash
openclaw devices list
openclaw devices approve <requestId>
```

Conexoes locais (127.0.0.1) auto-aprovam.

### 12.3 Idiomas Suportados

`en`, `zh-CN`, `zh-TW`, `pt-BR`, `de`, `es`

### 12.4 Funcionalidades

- **Chat:** send, history, inject, abort, stop
- **Canais:** Status, QR login, config por canal
- **Sessoes:** Lista, overrides de thinking/fast/verbose
- **Cron:** CRUD, historico de runs
- **Skills:** Status, enable/disable, install
- **Nodes:** Lista e capacidades
- **Config:** View/edit com validacao e restart
- **Debug:** Status, event log, RPC manual
- **Logs:** Live tail com filtro/export
- **Update:** Atualizacao com restart

### 12.5 Acesso via Tailscale

```bash
# Serve (Tailnet-only, recomendado)
openclaw gateway --tailscale serve

# Bind direto
openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
```

### 12.6 Dev Server + Remote Gateway

```bash
pnpm ui:dev
# Acessar: http://localhost:5173/?gatewayUrl=ws://<gateway-host>:18789
# Com auth: http://localhost:5173/?gatewayUrl=wss://<host>:18789#token=<token>
```

---

## 13. PLUGINS E SKILLS

### 13.1 Skills

Skills ensinam agentes a usar ferramentas via pastas com `SKILL.md`.

**Locais (precedencia):**
1. Workspace skills (`<workspace>/skills/`)
2. Managed/local (`~/.openclaw/skills`)
3. Bundled (shipped com install)

**Formato SKILL.md:**
```markdown
---
name: image-lab
description: Generate or edit images
metadata:
  { "openclaw": { "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"] }, "primaryEnv": "GEMINI_API_KEY" } }
---
```

**Config:**
```json5
{
  skills: {
    entries: {
      "image-lab": {
        enabled: true,
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" },
        env: { GEMINI_API_KEY: "KEY_HERE" },
      },
    },
  },
}
```

**ClawHub Registry:** https://clawhub.com
```bash
clawhub install <skill-slug>
clawhub update --all
```

### 13.2 Plugins

Plugins rodam in-process com o Gateway. Tratar como codigo confiavel.

```bash
openclaw plugins install @openclaw/mattermost
openclaw plugins install ./extensions/mattermost
```

---

## 14. HOOKS (EVENTOS INTERNOS)

### 14.1 Tipos de Evento

- **command:** command:new, command:reset, command:stop
- **session:** session:compact:before, session:compact:after
- **agent:** agent:bootstrap
- **gateway:** gateway:startup
- **message:** message:received, message:transcribed, message:preprocessed, message:sent

### 14.2 Hooks Bundled

- **session-memory:** Salva contexto de sessao em `<workspace>/memory/` no `/new`
- **bootstrap-extra-files:** Injeta arquivos extras de workspace no bootstrap
- **command-logger:** Loga comandos em `~/.openclaw/logs/commands.log` (JSONL)
- **boot-md:** Executa `BOOT.md` no startup do gateway

### 14.3 Criar Hook Customizado

```bash
mkdir -p ~/.openclaw/hooks/my-hook
```

**HOOK.md:**
```markdown
---
name: my-hook
description: "Hook customizado"
metadata: { "openclaw": { "emoji": "🎯", "events": ["command:new"] } }
---
```

**handler.ts:**
```typescript
const handler = async (event) => {
  if (event.type !== "command" || event.action !== "new") return;
  console.log("[my-hook] Running!");
};
export default handler;
```

### 14.4 CLI de Hooks

```bash
openclaw hooks list
openclaw hooks list --eligible --verbose
openclaw hooks info session-memory
openclaw hooks enable session-memory
openclaw hooks disable command-logger
openclaw hooks install <path-or-spec>
```

---

## 15. MEMORIA E WORKSPACE

### 15.1 Memoria

Memoria = Markdown no workspace do agente. Arquivos sao fonte de verdade.

**Estrutura:**
- `memory/YYYY-MM-DD.md`: Logs diarios (append-only)
- `MEMORY.md`: Armazenamento curado de longo prazo

**Tools:** `memory_search` (recall semantico), `memory_get` (leitura direcionada)

**Memory flush pre-compactacao:**
```json5
{
  agents: {
    defaults: {
      compaction: {
        reserveTokensFloor: 20000,
        memoryFlush: {
          enabled: true,
          softThresholdTokens: 4000,
        },
      },
    },
  },
}
```

**Vector search:** Suporta OpenAI, Gemini, Voyage, Mistral, Ollama, GGUF local + BM25 hibrido + MMR diversity + temporal decay.

### 15.2 Workspace

Diretorio do agente (default `~/.openclaw/workspace`).

**Arquivos de bootstrap auto-injetados:**
- `AGENTS.md` - Standing orders
- `SOUL.md` - Personalidade
- `TOOLS.md` - Instrucoes de ferramentas
- `IDENTITY.md` - Identidade
- `USER.md` - Informacoes do usuario
- `HEARTBEAT.md` - Checklist de heartbeat
- `MEMORY.md` - Memoria de longo prazo

---

## 16. STREAMING E CHUNKING

### 16.1 Block Streaming

```json5
{
  agents: {
    defaults: {
      blockStreamingDefault: "on",
      blockStreamingBreak: "text_end",
      blockStreamingChunk: { minChars: 200, maxChars: 4000 },
      blockStreamingCoalesce: { minChars: 500, maxChars: 4000, idleMs: 1000 },
      humanDelay: "off", // off | natural | custom
    },
  },
}
```

### 16.2 Preview Streaming

`channels.<channel>.streaming`: off | partial | block | progress

| Plataforma | off | partial | block | progress |
|-----------|-----|---------|-------|----------|
| Telegram | Sim | Sim | Sim | -> partial |
| Discord | Sim | Sim | Sim | -> partial |
| Slack | Sim | Sim | Sim | Sim |

### 16.3 Algoritmo de Chunking

`EmbeddedBlockChunker`:
- Lower constraint: nao emite ate `minChars`
- Upper constraint: split antes de `maxChars`
- Hierarquia: paragrafo > newline > sentenca > whitespace > forced
- Preservacao Markdown: code fences intactos

---

## 17. LOGGING E DIAGNOSTICO

### 17.1 Arquivo de Log

- Default: `/tmp/openclaw/openclaw-YYYY-MM-DD.log` (JSON por linha)
- Config: `logging.file`, `logging.level`

```bash
openclaw logs --follow
```

### 17.2 Redacao de Dados Sensiveis

```json5
{
  logging: {
    redactSensitive: "tools", // off | tools
    redactPatterns: ["/pattern/gi"],
    consoleLevel: "info",
    consoleStyle: "pretty", // pretty | compact | json
  },
}
```

### 17.3 Troubleshooting

**Sequencia de diagnostico:**
```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

**Status saudavel:** Gateway "Runtime: running", "RPC probe: ok", canais "connected/ready"

---

## 18. TAILSCALE

### 18.1 Modos

- `serve`: Tailnet-only via `tailscale serve` (recomendado)
- `funnel`: HTTPS publico via `tailscale funnel` (requer senha)
- `off`: Sem automacao Tailscale (padrao)

### 18.2 Configuracao

**Tailnet-only (Serve):**
```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "serve" },
  },
}
```

**Publico (Funnel + senha):**
```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "funnel" },
    auth: { mode: "password", password: "replace-me" },
  },
}
```

**CLI:**
```bash
openclaw gateway --tailscale serve
openclaw gateway --tailscale funnel --auth password
```

### 18.3 Auth Tailscale

Quando `gateway.auth.allowTailscale: true`, Control UI pode autenticar via headers de identidade Tailscale sem credenciais. Verificacao via `tailscale whois` local.

**Nota:** Endpoints HTTP API (`/v1/*`, `/tools/invoke`, `/api/channels/*`) ainda requerem token/password.

---

## 19. REFERENCIA DE CLI

### 19.1 Comandos Principais

```bash
# Gateway
openclaw gateway                    # Iniciar gateway
openclaw gateway status             # Status do gateway
openclaw gateway status --deep      # Status detalhado
openclaw gateway install            # Instalar como servico
openclaw gateway restart            # Reiniciar servico

# Onboarding
openclaw onboard                    # Setup interativo
openclaw onboard --install-daemon   # Setup + daemon
openclaw configure                  # Reconfigurar

# Dashboard
openclaw dashboard                  # Abrir Control UI

# Config
openclaw config get <path>          # Ler config
openclaw config set <path> <value>  # Definir config
openclaw config unset <path>        # Remover config

# Canais
openclaw channels login --channel <ch>          # Login em canal
openclaw channels logout --channel <ch>         # Logout
openclaw channels status                        # Status de canais
openclaw channels status --probe                # Status com probe
openclaw channels add --channel <ch>            # Adicionar canal

# Pairing
openclaw pairing list <channel>                 # Listar pendentes
openclaw pairing approve <channel> <code>       # Aprovar

# Devices
openclaw devices list                           # Listar dispositivos
openclaw devices approve <requestId>            # Aprovar device
openclaw devices reject <requestId>             # Rejeitar device

# Nodes
openclaw nodes status                           # Status de nodes
openclaw nodes describe --node <id>             # Descrever node
openclaw nodes rename --node <id> --name "X"    # Renomear
openclaw node run --host <h> --port <p>         # Node foreground
openclaw node install --host <h> --port <p>     # Node como servico

# Agentes
openclaw agents add <name>                      # Adicionar agente
openclaw agents list --bindings                 # Listar com bindings

# Sessoes
openclaw sessions --json                        # Listar sessoes
openclaw sessions cleanup --dry-run             # Preview de limpeza
openclaw sessions cleanup --enforce             # Executar limpeza

# Cron
openclaw cron list                              # Listar jobs
openclaw cron status                            # Status do scheduler
openclaw cron add --name "X" --cron "expr"      # Adicionar job
openclaw cron runs --id <jobId>                 # Historico de runs

# Browser
openclaw browser status                         # Status do browser
openclaw browser start                          # Iniciar browser
openclaw browser open <url>                     # Abrir URL
openclaw browser snapshot                       # Snapshot da pagina
openclaw browser screenshot                     # Screenshot
openclaw browser tabs                           # Listar tabs

# Logs
openclaw logs --follow                          # Tail de logs

# Doctor
openclaw doctor                                 # Diagnostico
openclaw doctor --fix                           # Reparar
openclaw doctor --deep                          # Scan profundo

# Status
openclaw status                                 # Status geral
openclaw status --all                           # Status completo

# Seguranca
openclaw security audit                         # Auditoria
openclaw security audit --deep                  # Auditoria profunda

# Hooks
openclaw hooks list                             # Listar hooks
openclaw hooks enable <hook>                    # Habilitar
openclaw hooks disable <hook>                   # Desabilitar
openclaw hooks install <spec>                   # Instalar hook pack

# Skills
openclaw plugins install <spec>                 # Instalar plugin
openclaw plugins list                           # Listar plugins

# Mensagens
openclaw message send --channel <ch> --target <id> --message "hi"
openclaw message poll --channel <ch> --target <id> --poll-question "?" --poll-option "A"

# Sistema
openclaw system event --text "Check" --mode now
openclaw system heartbeat last

# Approvals
openclaw approvals get --node <id>
openclaw approvals allowlist add --node <id> "/usr/bin/uname"

# Gateway RPC
openclaw gateway call <method> --params '{}'
```

### 19.2 Comandos de Sessao (In-Chat)

```
/new                    # Nova sessao
/new <model>            # Nova sessao com modelo
/reset                  # Reset de sessao
/stop                   # Abortar run atual
/compact                # Compactar contexto
/status                 # Status do agente
/context list           # Listar contexto
/model <alias>          # Trocar modelo
/exec host=gateway      # Override de exec
/elevated on|off|full   # Modo elevado
/queue <mode>           # Override de queue
/send on|off|inherit    # Politica de envio
/activation always|mention  # Ativacao de grupo
/reasoning stream       # Reasoning em preview
```

---

## APENDICE A: OAUTH E AUTENTICACAO

**Provedores suportados:** 35+ incluindo Anthropic, OpenAI, Google, Groq, Mistral, Ollama, vLLM, SGLang

**Storage de credenciais:**
- `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- Legacy: `~/.openclaw/agents/<agentId>/agent/auth.json`

**Anthropic setup-token:**
```bash
claude setup-token  # Externo
openclaw models auth setup-token --provider anthropic
```

**OpenAI Codex OAuth:** PKCE via `http://127.0.0.1:1455/auth/callback`

**Refresh automatico:** Runtime checa timestamps de expiracao e renova sob file lock.

---

## APENDICE B: CREDITOS

- **Fundador:** Peter Steinberger (@steipete) - "lobster whisperer"
- **Pi creator/Security:** Mario Zechner (@badlogicc)
- **Contribuidores:** Maxim Vovshin (Blogwatcher), Nacho Iacovino (location parsing), Vincent Koc (agents, telemetry, hooks, security)
- **Mascote:** Clawd (the space lobster)
- **Licenca:** MIT

---

*Documento gerado automaticamente em 2026-03-21 a partir de https://docs.openclaw.ai/*
