---
title: Claude Code Ecosystem — Guia de Instalação e Criação de Instaladores
category: Dev
tags: [instalador, setup, windows, mac, linux, cross-platform]
topic: Instalação e Distribuição
priority: high
version: 1.0.0
updated: 2026-03-20
last_updated: "2026-03-20"
---

# Claude Code Ecosystem — Guia de Instalação e Criação de Instaladores

## Visão Geral

O Claude Code Ecosystem é um conjunto de ferramentas, servidores e configurações que expande as capacidades do Claude Code CLI. Ele reside globalmente em `~/.claude/` e fornece:

- **CRM local** com API REST (porta 3847)
- **72 ferramentas modulares** via `tools-cli.js`
- **43 agentes especializados** em markdown
- **7 MCPs configurados** (Chrome DevTools, Desktop Commander, Memory, Playwright, Context7, Sequential Thinking, Fetch)
- **Knowledge Base** com 67 documentações
- **Frontend Analyzer** para validação HTML/CSS/A11y
- **Session Diary** para persistência entre sessões
- **4 hooks automáticos** de logging, sincronização e notificação

---

## Estrutura Completa do Projeto

```
~/.claude/
├── CLAUDE.md                        # Instruções globais do assistente
├── settings.json                    # Permissões do Claude Code CLI + hooks
├── settings.local.json              # Overrides locais (não versionado)
│
├── task-scheduler/                  # Servidor principal + CRM + tools
│   ├── server.js                    # Servidor unificado (porta 3847)
│   ├── chat-tools.js                # Router central (72 ferramentas, ~5800 linhas)
│   ├── tools-cli.js                 # Interface CLI (143 linhas)
│   ├── credential-vault.js          # Gerenciador de credenciais criptografadas
│   ├── web-search.js                # Busca web integrada
│   ├── chrome-tool.js               # Chrome CDP
│   ├── image-generator.js           # Gerador de imagens
│   ├── tool-utils.js                # Circuit breaker, cache, timeout
│   ├── package.json                 # Dependências Node.js
│   ├── tools/
│   │   └── media.js                 # 15 ferramentas de mídia
│   ├── crm-backend/                 # API CRM completa
│   └── python-tools/                # Scripts Python para OCR, vídeo, etc.
│       ├── color_palette.py
│       ├── contact_validator.py
│       ├── data_transform.py
│       ├── html_to_pdf.py
│       ├── ocr_extract.py
│       ├── transcribe_audio.py
│       ├── video_tools.py
│       └── data/                    # Dados dos scripts Python
│
├── frontend-analyzer/               # Validador HTML/CSS/A11y
│   ├── src/index.js                 # Entry point
│   └── package.json
│
├── knowledge-base/                  # 67 documentações + busca
│   ├── knowledge-search.js          # Motor de busca semântica
│   ├── kb-cache.js                  # Cache de resultados
│   ├── validate-frontmatter.js      # Validador de metadados
│   ├── test-relevance-debug.js      # Debug de relevância
│   ├── templates/                   # Templates de código e capturer
│   └── *.md                         # 63+ arquivos de documentação
│
├── session-diary/                   # Diário entre sessões
│   ├── session-diary.js             # CLI do diário
│   ├── diary.jsonl                  # Histórico persistente (append-only)
│   └── package.json
│
├── mcp-server/                      # Servidor MCP customizado
│   ├── index.js
│   └── package.json
│
├── config/
│   ├── mcp.json                     # Configuração dos 7 MCPs
│   └── user-preferences.json        # Preferências do usuário
│
├── agents/                          # 43 agentes especializados (.md)
│
├── hooks/                           # 4 hooks automáticos JavaScript
│   ├── sync-tasks-hook.js           # PostToolUse: sincroniza tarefas
│   ├── session-logger.js            # PostToolUse + Stop: logging de sessão
│   ├── telegram-notify-hook.js      # Stop: notifica fim de sessão via Telegram
│   └── session-end-reminder.js      # Stop: lembrete de encerramento
│
├── skills/                          # Skills customizadas do Claude Code
│   ├── nano-banana-pro/             # Geração de imagens Gemini
│   └── *.md                         # Definições de skills
│
├── commands/                        # Slash commands customizados
│   ├── auto.md                      # /auto — orquestrador paralelo
│   ├── aprender.md                  # /aprender — persiste lições na KB
│   ├── memory.md
│   ├── end-session.md
│   └── nano-banana-pro.md
│
├── tools/                           # Ferramentas CLI standalone
│   ├── motion-gen/                  # motion-gen v3 (HTML → MP4 completo)
│   ├── nano-banana-cli.js           # CLI geração imagens Gemini
│   ├── chatpro-monitor.js
│   └── fiber-daily-audit.js
│
├── contexts/                        # Contextos de carregamento sob demanda
│   ├── crm-context.md
│   ├── tools-cli-context.md
│   ├── credentials-context.md
│   ├── whatsapp-context.md
│   ├── mcp-context.md
│   ├── agents-context.md
│   └── protocols/
│       ├── chrome-protocol.md
│       └── validation-protocol.md
│
├── memory/                          # Memória persistente entre sessões
│   ├── MEMORY.md                    # Índice principal (max 200 linhas)
│   └── feedback_*.md                # Arquivos de feedback aprendido
│
├── data/                            # Dados do servidor (banco local)
│   ├── tasks.json
│   ├── executions.json
│   └── prompt-templates.json
│
├── backups/                         # Backups automáticos
├── cache/                           # Cache de operações
├── sessions/                        # Sessões ativas
├── tasks/                           # Tarefas do Claude
├── plans/                           # Planos de execução
├── logs/                            # Logs de operações
└── temp/                            # Arquivos temporários (limpar após uso)
```

---

## Componentes Principais

### 1. Servidor Unificado (task-scheduler/server.js)

Servidor Express que combina CRM API + scheduler + dashboard web na porta **3847**.

**Dependências do package.json:**

```json
{
  "name": "claude-task-scheduler",
  "version": "1.0.0",
  "dependencies": {
    "canvas": "^3.2.1",
    "chrome-remote-interface": "^0.34.0",
    "csv-parse": "^6.1.0",
    "dotenv": "^17.3.1",
    "express": "^4.18.2",
    "multer": "^2.0.2",
    "node-cron": "^3.0.3",
    "node-telegram-bot-api": "^0.67.0",
    "pdf-parse": "^2.4.5",
    "uuid": "^9.0.1",
    "ws": "^8.16.0"
  }
}
```

**Endpoints principais:**

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/` | GET | Dashboard web |
| `/api/crm/health` | GET | Health check |
| `/api/crm/leads` | GET/POST | Leads do CRM |
| `/api/crm/personal-tasks` | GET/POST | Tarefas pessoais |
| `/api/crm/messages/whatsapp` | POST | Envio WhatsApp |
| `/api/prompt-templates` | GET | Templates de prompt |

**Auth:** `Bearer local-dev-token`

### 2. Tools CLI (task-scheduler/tools-cli.js)

Interface de linha de comando para as 72 ferramentas modulares.

```bash
# Uso básico
node "~/.claude/task-scheduler/tools-cli.js" <ferramenta> [key=value ...]

# Listar todas as ferramentas
node "~/.claude/task-scheduler/tools-cli.js" --list

# Ajuda de uma ferramenta específica
node "~/.claude/task-scheduler/tools-cli.js" --help <ferramenta>
```

**16 módulos em task-scheduler/tools/ (mais tools no chat-tools.js):**

| Módulo | Ferramentas |
|--------|------------|
| credentials.js | get_credential, vault_manage |
| crm.js | call_crm |
| files.js | read_file, write_file, list_directory, delete_file, move_file, file_info, diff_files |
| search.js | search_kb, google_search, maps_search, search_in_files, find_files |
| execution.js | run_command, execute_node, process_manager, open_url, git |
| web.js | fetch_api, scrape_website, seo_check, pagespeed, landing_page_tracker, responsive_check, payment_link |
| media.js | generate_image, image_optimize, color_palette, base64_image, video_tools, topaz_enhance, ocr_extract, audio_normalize, tts_generate, image_safe_zones, screenshot_compare, favicon_generator, color_contrast, ad_creative_analyzer, transcribe_audio |
| communication.js | send_whatsapp, send_email, send_telegram, whatsapp_contacts, instagram, voice_message, sentiment_analyzer |
| infra.js | cyberpanel_site, dns_lookup, ssl_check, db_query, docker_manage, log_analyzer, whois_lookup, server_health, disk_cleanup, firewall_manager, ssl_renew, dns_propagation, nginx_config, ssh_exec, scp_transfer, vhost_list, service_restart, port_forward, db_slow_queries |
| data.js | pdf_reader, csv_processor, html_to_pdf, data_transform, json_to_sql, csv_to_sql |
| validators.js | html_validator, css_validator, csv_validator, json_validator, contact_validator, shopify_theme_check, shopify_speed_audit, dependency_audit |
| text.js | text_utils, word_counter, calculator, unit_converter, date_calculator, bio_generator |
| security.js | password_generator, hash_generator, security_scan, email_deliverability |
| meta-ads.js | meta_ads, meta_ads_audience, meta_ads_creative_upload, meta_ads_pixel_events |
| google.js | gdrive_upload, gcalendar_create, gmail_search |
| scheduler-tools.js | scheduler, orchestrate, chrome |
| fishing.js | fishing_conditions |

### 3. MCPs Configurados (config/mcp.json)

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["chrome-devtools-mcp@latest"]
    },
    "desktop-commander": {
      "command": "npx",
      "args": ["@wonderwhy-er/desktop-commander"]
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    },
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--browser", "chrome",
        "--headless", "false",
        "--viewport-size", "1920x1080",
        "--user-data-dir", "./.claude/playwright-profile"
      ]
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    },
    "fetch": {
      "command": "uvx",
      "args": ["mcp-server-fetch"]
    }
  }
}
```

**Nota Windows:** O caminho do `uvx` precisa ser o caminho completo ao Python do usuário. Exemplo:
```
"C:\\Users\\USUARIO\\AppData\\Local\\Packages\\PythonSoftwareFoundation.Python.3.12_xxx\\LocalCache\\local-packages\\Python312\\Scripts\\uvx.exe"
```

### 4. Settings.json — Permissões e Hooks

```json
{
  "permissions": {
    "allow": [
      "Edit", "Write", "Read", "Glob", "Grep", "Bash",
      "WebFetch(domain:*)", "WebSearch", "MCP", "NotebookEdit",
      "LSP", "Task", "TodoWrite", "AskUserQuestion", "KillShell",
      "ExitPlanMode", "Skill", "SlashCommand",
      "Read(//C:/Users/USUARIO/**)",
      "mcp__chrome-devtools__click",
      "mcp__chrome-devtools__close_page",
      "mcp__chrome-devtools__drag",
      "mcp__chrome-devtools__emulate",
      "mcp__chrome-devtools__evaluate_script",
      "mcp__chrome-devtools__fill",
      "mcp__chrome-devtools__fill_form",
      "mcp__chrome-devtools__get_console_message",
      "mcp__chrome-devtools__get_network_request",
      "mcp__chrome-devtools__handle_dialog",
      "mcp__chrome-devtools__hover",
      "mcp__chrome-devtools__list_console_messages",
      "mcp__chrome-devtools__list_network_requests",
      "mcp__chrome-devtools__list_pages",
      "mcp__chrome-devtools__navigate_page",
      "mcp__chrome-devtools__new_page",
      "mcp__chrome-devtools__performance_analyze_insight",
      "mcp__chrome-devtools__performance_start_trace",
      "mcp__chrome-devtools__performance_stop_trace",
      "mcp__chrome-devtools__press_key",
      "mcp__chrome-devtools__resize_page",
      "mcp__chrome-devtools__select_page",
      "mcp__chrome-devtools__take_screenshot",
      "mcp__chrome-devtools__take_snapshot",
      "mcp__chrome-devtools__upload_file",
      "mcp__chrome-devtools__wait_for",
      "mcp__desktop-commander__execute_command",
      "mcp__desktop-commander__kill_process",
      "mcp__desktop-commander__list_processes",
      "mcp__desktop-commander__read_file",
      "mcp__desktop-commander__write_file",
      "mcp__desktop-commander__create_directory",
      "mcp__desktop-commander__list_directory",
      "mcp__desktop-commander__move_file",
      "mcp__desktop-commander__search_files",
      "mcp__desktop-commander__get_file_metadata",
      "mcp__desktop-commander__execute_python",
      "mcp__desktop-commander__execute_nodejs",
      "mcp__desktop-commander__execute_r",
      "mcp__desktop-commander__search_and_replace",
      "mcp__desktop-commander__edit_file",
      "mcp__desktop-commander__get_configuration",
      "mcp__desktop-commander__set_configuration",
      "mcp__sequential-thinking__sequential_thinking",
      "mcp__memory__create_entities",
      "mcp__memory__create_relations",
      "mcp__memory__add_observations",
      "mcp__memory__delete_entities",
      "mcp__memory__delete_observations",
      "mcp__memory__delete_relations",
      "mcp__memory__read_graph",
      "mcp__memory__search_nodes",
      "mcp__memory__open_nodes",
      "mcp__context7__resolve-library-id",
      "mcp__context7__get-library-docs",
      "mcp__fetch__fetch"
    ],
    "deny": ["Read(**/.env)"]
  },
  "hooks": {
    "PostToolUse": [
      { "hooks": [{ "type": "command", "command": "node \"~/.claude/hooks/sync-tasks-hook.js\"" }] },
      { "hooks": [{ "type": "command", "command": "node \"~/.claude/hooks/session-logger.js\"" }] }
    ],
    "Stop": [
      { "hooks": [{ "type": "command", "command": "node \"~/.claude/hooks/telegram-notify-hook.js\"" }] },
      { "hooks": [{ "type": "command", "command": "node \"~/.claude/hooks/session-end-reminder.js\"" }] },
      { "hooks": [{ "type": "command", "command": "node \"~/.claude/hooks/session-logger.js\"" }] }
    ]
  },
  "language": "portuguese-br",
  "skipDangerousModePermissionPrompt": true
}
```

**Nota:** Substituir `~/.claude` pelo caminho absoluto correto para o seu SO. No Windows, use o formato de caminho do Claude Code (ex: `C:\\Users\\USUARIO\\.claude`).

---

## Pré-requisitos de Instalação

| Requisito | Versão mínima | Como verificar | Como instalar |
|-----------|--------------|----------------|---------------|
| Node.js | 20.x LTS | `node --version` | https://nodejs.org ou winget/brew |
| npm | 10.x | `npm --version` | Incluído com Node.js |
| Git | 2.x | `git --version` | https://git-scm.com |
| Python | 3.10+ | `python --version` | https://python.org |
| Claude Code CLI | latest | `claude --version` | `npm install -g @anthropic-ai/claude-code` |
| uvx (opcional) | latest | `uvx --version` | `pip install uv` |

---

## Instalação Manual — Windows

```batch
:: ============================================================
:: Executar no Prompt de Comando (CMD) como usuário normal
:: Não precisa ser Administrador
:: ============================================================

:: 1. Verificar Node.js (instalar via winget se ausente)
node --version || winget install OpenJS.NodeJS.LTS --silent --accept-source-agreements

:: 2. Verificar Git
git --version || winget install Git.Git --silent --accept-source-agreements

:: 3. Verificar Python
python --version || winget install Python.Python.3.12 --silent --accept-source-agreements

:: 4. Instalar Claude Code CLI
npm install -g @anthropic-ai/claude-code

:: 5. Criar estrutura de diretórios
for %D in (
  "%USERPROFILE%\.claude"
  "%USERPROFILE%\.claude\task-scheduler\tools"
  "%USERPROFILE%\.claude\task-scheduler\crm-backend"
  "%USERPROFILE%\.claude\task-scheduler\python-tools\data"
  "%USERPROFILE%\.claude\frontend-analyzer\src"
  "%USERPROFILE%\.claude\knowledge-base\templates"
  "%USERPROFILE%\.claude\session-diary"
  "%USERPROFILE%\.claude\mcp-server"
  "%USERPROFILE%\.claude\config"
  "%USERPROFILE%\.claude\agents"
  "%USERPROFILE%\.claude\hooks"
  "%USERPROFILE%\.claude\skills"
  "%USERPROFILE%\.claude\commands"
  "%USERPROFILE%\.claude\tools"
  "%USERPROFILE%\.claude\contexts\protocols"
  "%USERPROFILE%\.claude\memory"
  "%USERPROFILE%\.claude\temp"
  "%USERPROFILE%\.claude\backups"
  "%USERPROFILE%\.claude\cache"
  "%USERPROFILE%\.claude\sessions"
  "%USERPROFILE%\.claude\tasks"
  "%USERPROFILE%\.claude\plans"
  "%USERPROFILE%\.claude\logs"
  "%USERPROFILE%\.claude\data"
) do if not exist %D mkdir %D

:: 6. Copiar arquivos do projeto para ~/.claude
:: (ajustar SOURCE_DIR para onde os arquivos estão)
:: xcopy /E /I SOURCE_DIR %USERPROFILE%\.claude

:: 7. Instalar dependências npm
cd /d "%USERPROFILE%\.claude\task-scheduler" && npm install
cd /d "%USERPROFILE%\.claude\frontend-analyzer" && npm install
cd /d "%USERPROFILE%\.claude\mcp-server" && npm install
cd /d "%USERPROFILE%\.claude\session-diary" && npm install

:: 8. Instalar dependências Python
pip install faster-whisper pillow opencv-python pytesseract weasyprint scikit-image scipy numpy

:: 9. Criar dados iniciais
echo [] > "%USERPROFILE%\.claude\data\tasks.json"
echo [] > "%USERPROFILE%\.claude\data\executions.json"
echo [] > "%USERPROFILE%\.claude\data\prompt-templates.json"
type nul > "%USERPROFILE%\.claude\session-diary\diary.jsonl"

:: 10. Configurar auto-início
schtasks /create /tn "ClaudeEcosystem" ^
  /tr "cmd /c \"cd /d %USERPROFILE%\.claude\task-scheduler && node server.js\"" ^
  /sc ONLOGON /delay 0000:30 /ru "%USERNAME%" /f
```

## Instalação Manual — Mac/Linux

```bash
#!/usr/bin/env bash
CLAUDE_HOME="$HOME/.claude"

# 1. Instalar dependências do sistema
if [[ "$OSTYPE" == "darwin"* ]]; then
  # Mac: instalar via Homebrew
  command -v brew &>/dev/null || \
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  brew install node git python3
elif command -v apt-get &>/dev/null; then
  sudo apt-get update && sudo apt-get install -y nodejs npm git python3 python3-pip
elif command -v dnf &>/dev/null; then
  sudo dnf install -y nodejs npm git python3 python3-pip
fi

# 2. Instalar Claude Code CLI
npm install -g @anthropic-ai/claude-code

# 3. Criar estrutura de diretórios
mkdir -p "$CLAUDE_HOME"/{task-scheduler/{tools,crm-backend,python-tools/data},\
frontend-analyzer/src,knowledge-base/templates,session-diary,mcp-server,\
config,agents,hooks,skills,commands,tools,contexts/protocols,memory,temp,\
backups,cache,sessions,tasks,plans,logs,data}

# 4. Instalar dependências npm
for mod in task-scheduler frontend-analyzer mcp-server session-diary; do
  cd "$CLAUDE_HOME/$mod" && npm install
done

# 5. Instalar dependências Python
pip3 install faster-whisper pillow opencv-python pytesseract weasyprint scikit-image scipy numpy

# 6. Criar dados iniciais
echo "[]" > "$CLAUDE_HOME/data/tasks.json"
echo "[]" > "$CLAUDE_HOME/data/executions.json"
echo "[]" > "$CLAUDE_HOME/data/prompt-templates.json"
touch "$CLAUDE_HOME/session-diary/diary.jsonl"

# 7. Configurar auto-início (Mac)
if [[ "$OSTYPE" == "darwin"* ]]; then
  PLIST="$HOME/Library/LaunchAgents/com.claude.ecosystem.plist"
  mkdir -p "$(dirname "$PLIST")"
  cat > "$PLIST" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.claude.ecosystem</string>
  <key>ProgramArguments</key>
  <array>
    <string>$(which node)</string>
    <string>$CLAUDE_HOME/task-scheduler/server.js</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$CLAUDE_HOME/logs/server.log</string>
  <key>StandardErrorPath</key><string>$CLAUDE_HOME/logs/server-error.log</string>
  <key>WorkingDirectory</key><string>$CLAUDE_HOME/task-scheduler</string>
</dict>
</plist>
EOF
  launchctl load "$PLIST" 2>/dev/null || true
  echo "LaunchAgent configurado."
fi

# 7b. Auto-início Linux (systemd)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  sudo tee /etc/systemd/system/claude-ecosystem.service > /dev/null << EOF
[Unit]
Description=Claude Code Ecosystem Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$CLAUDE_HOME/task-scheduler
ExecStart=$(which node) $CLAUDE_HOME/task-scheduler/server.js
Restart=on-failure
RestartSec=10
StandardOutput=append:$CLAUDE_HOME/logs/server.log
StandardError=append:$CLAUDE_HOME/logs/server-error.log

[Install]
WantedBy=multi-user.target
EOF
  sudo systemctl daemon-reload
  sudo systemctl enable claude-ecosystem
  echo "Systemd service configurado."
fi

echo "Instalação concluída! Dashboard: http://localhost:3847"
```

---

## Scripts de Gerenciamento

### START-ALL — Windows (START-ALL.BAT)

```batch
@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

set CLAUDE_HOME=%USERPROFILE%\.claude
set LOG_DIR=%CLAUDE_HOME%\logs
set LOCK_FILE=%CLAUDE_HOME%\temp\.server.lock
set PORT=3847
set SILENT=0
set NO_BROWSER=0

:: Processar flags de linha de comando
for %%A in (%*) do (
  if /i "%%A"=="/silent" set SILENT=1
  if /i "%%A"=="/no-browser" set NO_BROWSER=1
)

:: Verificar se já está rodando via lockfile
if exist "%LOCK_FILE%" (
  set /p OLD_PID=<"%LOCK_FILE%"
  tasklist /FI "PID eq !OLD_PID!" 2>nul | find "!OLD_PID!" >nul
  if not errorlevel 1 (
    if "%SILENT%"=="0" echo Servidor ja em execucao (PID: !OLD_PID!)
    exit /b 0
  )
  del "%LOCK_FILE%"
)

:: Liberar porta 3847 se ocupada
for /f "tokens=5" %%P in ('netstat -ano 2^>nul ^| findstr ":3847 "') do (
  taskkill /PID %%P /F >nul 2>&1
)

if "%SILENT%"=="0" echo Iniciando Claude Code Ecosystem...
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

:: Iniciar servidor em background
start /B cmd /c "cd /d "%CLAUDE_HOME%\task-scheduler" && node server.js >> "%LOG_DIR%\server.log" 2>&1"

:: Aguardar inicialização (max 20s)
set /a tries=0
:wait_loop
timeout /t 1 /nobreak >nul
curl -s http://localhost:3847/api/crm/health >nul 2>&1
if not errorlevel 1 goto started
set /a tries+=1
if %tries% lss 20 goto wait_loop
if "%SILENT%"=="0" echo [WARN] Servidor demorou para responder. Verificar: %LOG_DIR%\server.log
goto done

:started
:: Salvar PID no lockfile
for /f "tokens=5" %%P in ('netstat -ano 2^>nul ^| findstr ":3847 " ^| findstr "LISTENING"') do (
  if not defined SERVER_PID set SERVER_PID=%%P
)
if defined SERVER_PID echo %SERVER_PID%>"%LOCK_FILE%"

if "%NO_BROWSER%"=="0" start "" "http://localhost:3847"
if "%SILENT%"=="0" echo Servidor iniciado em http://localhost:3847

:done
endlocal
```

### START-ALL — Mac/Linux (start-all.sh)

```bash
#!/usr/bin/env bash
CLAUDE_HOME="$HOME/.claude"
LOG_DIR="$CLAUDE_HOME/logs"
LOCK_FILE="$CLAUDE_HOME/temp/.server.pid"
PORT=3847
SILENT=0
NO_BROWSER=0

for arg in "$@"; do
  [[ "$arg" == "--silent" ]] && SILENT=1
  [[ "$arg" == "--no-browser" ]] && NO_BROWSER=1
done

# Verificar se já está rodando
if [[ -f "$LOCK_FILE" ]]; then
  OLD_PID=$(cat "$LOCK_FILE" 2>/dev/null)
  if [[ -n "$OLD_PID" ]] && kill -0 "$OLD_PID" 2>/dev/null; then
    [[ $SILENT -eq 0 ]] && echo "Servidor já em execução (PID: $OLD_PID)"
    exit 0
  fi
  rm -f "$LOCK_FILE"
fi

# Liberar porta
if command -v lsof &>/dev/null; then
  lsof -ti :$PORT | xargs kill -9 2>/dev/null || true
fi

mkdir -p "$LOG_DIR"
[[ $SILENT -eq 0 ]] && echo "Iniciando Claude Code Ecosystem..."

# Iniciar servidor em background
nohup node "$CLAUDE_HOME/task-scheduler/server.js" \
  >> "$LOG_DIR/server.log" 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > "$LOCK_FILE"

# Aguardar inicialização (max 20s)
tries=0
while ! curl -s "http://localhost:$PORT/api/crm/health" &>/dev/null; do
  sleep 1; ((tries++))
  if [[ $tries -ge 20 ]]; then
    [[ $SILENT -eq 0 ]] && echo "[WARN] Servidor demorou. Log: $LOG_DIR/server.log"
    break
  fi
done

[[ $SILENT -eq 0 ]] && echo "Servidor iniciado em http://localhost:$PORT (PID: $SERVER_PID)"

if [[ $NO_BROWSER -eq 0 ]]; then
  if [[ "$OSTYPE" == "darwin"* ]]; then
    open "http://localhost:$PORT"
  else
    xdg-open "http://localhost:$PORT" 2>/dev/null || true
  fi
fi
```

### STOP-ALL — Windows (STOP-ALL.BAT)

```batch
@echo off
setlocal
set CLAUDE_HOME=%USERPROFILE%\.claude
set LOCK_FILE=%CLAUDE_HOME%\temp\.server.lock

echo Encerrando Claude Code Ecosystem...

:: Salvar diário de sessão
node "%CLAUDE_HOME%\session-diary\session-diary.js" latest >nul 2>&1

:: Matar processo via lockfile
if exist "%LOCK_FILE%" (
  set /p PID=<"%LOCK_FILE%"
  if defined PID taskkill /PID %PID% /T /F >nul 2>&1
  del "%LOCK_FILE%"
)

:: Garantir que a porta 3847 está livre
for /f "tokens=5" %%P in ('netstat -ano 2^>nul ^| findstr ":3847 "') do (
  taskkill /PID %%P /F >nul 2>&1
)

echo Servidor encerrado.
endlocal
```

### STOP-ALL — Mac/Linux (stop-all.sh)

```bash
#!/usr/bin/env bash
CLAUDE_HOME="$HOME/.claude"
LOCK_FILE="$CLAUDE_HOME/temp/.server.pid"

echo "Encerrando Claude Code Ecosystem..."

# Salvar diário de sessão
node "$CLAUDE_HOME/session-diary/session-diary.js" latest 2>/dev/null || true

# Matar processo via lockfile
if [[ -f "$LOCK_FILE" ]]; then
  PID=$(cat "$LOCK_FILE" 2>/dev/null)
  if [[ -n "$PID" ]]; then
    kill -TERM "$PID" 2>/dev/null || kill -9 "$PID" 2>/dev/null || true
  fi
  rm -f "$LOCK_FILE"
fi

# Garantir que porta 3847 está livre
if command -v lsof &>/dev/null; then
  lsof -ti :3847 | xargs kill -9 2>/dev/null || true
fi

echo "Servidor encerrado."
```

---

## Criando Executáveis Instaladores

### Pré-requisitos para Empacotamento

```bash
# Ferramentas de build globais
npm install -g pkg

# Windows: NSIS para criar .exe com interface gráfica
winget install NSIS.NSIS

# Mac: Xcode command line tools (necessário para codesign e pkgbuild)
xcode-select --install
```

### Opção 1 — Executável Binário com `pkg`

`pkg` compila o script Node.js em um binário standalone que não requer Node.js na máquina de destino. Ideal para distribuição simples sem dependências externas visíveis.

**Estrutura do instalador:**

```
installer/
├── package.json          # Config do pkg (targets, assets)
├── install-main.js       # Script principal de instalação
└── payload/              # Arquivos a serem instalados
    ├── task-scheduler/
    ├── frontend-analyzer/
    ├── knowledge-base/
    ├── agents/
    ├── hooks/
    ├── config/
    └── ...
```

**package.json do instalador:**

```json
{
  "name": "claude-ecosystem-installer",
  "version": "1.0.0",
  "description": "Instalador do Claude Code Ecosystem",
  "bin": "install-main.js",
  "pkg": {
    "scripts": ["install-main.js"],
    "assets": [
      "payload/**/*"
    ],
    "targets": [
      "node20-win-x64",
      "node20-macos-arm64",
      "node20-macos-x64",
      "node20-linux-x64"
    ],
    "outputPath": "dist"
  }
}
```

**install-main.js:**

```javascript
#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const os = require('os');
const readline = require('readline');

const VERSION = '1.0.0';
const CLAUDE_HOME = path.join(os.homedir(), '.claude');
const IS_WIN = process.platform === 'win32';
const IS_MAC = process.platform === 'darwin';

// Snapshot do pkg — o __dirname aponta para os assets empacotados
const PAYLOAD_DIR = path.join(__dirname, 'payload');

console.log(`\nClaude Code Ecosystem — Instalador v${VERSION}`);
console.log('='.repeat(50));
console.log(`Destino: ${CLAUDE_HOME}\n`);

function step(n, total, label) {
  console.log(`[${n}/${total}] ${label}...`);
}

function run(cmd, cwd) {
  try {
    spawnSync(IS_WIN ? 'cmd' : 'bash',
      IS_WIN ? ['/c', cmd] : ['-c', cmd],
      { cwd, stdio: 'inherit', shell: false });
  } catch (e) {
    console.warn(`  Aviso: falha ao executar "${cmd}"`);
  }
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (!fs.existsSync(destPath)) {
      // Não sobrescrever arquivos existentes (preserva dados do usuário)
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// ── PASSO 1: Criar estrutura de diretórios
step(1, 8, 'Criando estrutura de diretórios');
const dirs = [
  'task-scheduler/tools', 'task-scheduler/crm-backend', 'task-scheduler/python-tools/data',
  'frontend-analyzer/src', 'knowledge-base/templates', 'session-diary',
  'mcp-server', 'config', 'agents', 'hooks', 'skills', 'commands',
  'tools', 'contexts/protocols', 'memory', 'temp', 'backups',
  'cache', 'sessions', 'tasks', 'plans', 'logs', 'data'
];
dirs.forEach(d => fs.mkdirSync(path.join(CLAUDE_HOME, d), { recursive: true }));

// ── PASSO 2: Copiar arquivos do payload
step(2, 8, 'Copiando arquivos do ecossistema');
copyDir(PAYLOAD_DIR, CLAUDE_HOME);
console.log('  Arquivos copiados (sem sobrescrever dados existentes).');

// ── PASSO 3: Verificar Node.js
step(3, 8, 'Verificando Node.js');
try {
  const v = execSync('node --version', { encoding: 'utf8' }).trim();
  const major = parseInt(v.replace('v', ''));
  if (major < 20) {
    console.warn(`  Node.js ${v} encontrado. Recomendado: v20+`);
  } else {
    console.log(`  Node.js ${v} OK.`);
  }
} catch (_) {
  console.error('  ERRO: Node.js não encontrado. Instale em https://nodejs.org');
  process.exit(1);
}

// ── PASSO 4: npm install nos subprojetos
step(4, 8, 'Instalando dependências Node.js');
const mods = ['task-scheduler', 'frontend-analyzer', 'mcp-server', 'session-diary'];
for (const mod of mods) {
  const modPath = path.join(CLAUDE_HOME, mod);
  if (fs.existsSync(path.join(modPath, 'package.json'))) {
    console.log(`  npm install em ${mod}...`);
    run('npm install --prefer-offline', modPath);
  }
}

// ── PASSO 5: Dependências Python
step(5, 8, 'Instalando dependências Python (opcional)');
const pyPkgs = 'faster-whisper pillow opencv-python pytesseract weasyprint scikit-image scipy numpy';
run(`pip3 install ${pyPkgs} 2>/dev/null || pip install ${pyPkgs}`, CLAUDE_HOME);

// ── PASSO 6: Dados iniciais
step(6, 8, 'Criando dados iniciais');
const initData = {
  'data/tasks.json': '[]',
  'data/executions.json': '[]',
  'data/prompt-templates.json': '[]'
};
for (const [file, content] of Object.entries(initData)) {
  const fp = path.join(CLAUDE_HOME, file);
  if (!fs.existsSync(fp)) {
    fs.writeFileSync(fp, content, 'utf8');
    console.log(`  Criado: ${file}`);
  }
}
const diaryPath = path.join(CLAUDE_HOME, 'session-diary', 'diary.jsonl');
if (!fs.existsSync(diaryPath)) fs.writeFileSync(diaryPath, '', 'utf8');

// ── PASSO 7: Auto-início
step(7, 8, 'Configurando auto-início');
if (IS_WIN) {
  const taskCmd = [
    'schtasks /create /tn "ClaudeEcosystem"',
    `/tr "cmd /c \\"cd /d ${CLAUDE_HOME}\\task-scheduler && node server.js\\""`,
    '/sc ONLOGON /delay 0000:30',
    `/ru "${os.userInfo().username}" /f`
  ].join(' ');
  run(taskCmd, CLAUDE_HOME);
  console.log('  Task Scheduler configurado (inicia 30s após login).');
} else if (IS_MAC) {
  const plistDir = path.join(os.homedir(), 'Library', 'LaunchAgents');
  const plistPath = path.join(plistDir, 'com.claude.ecosystem.plist');
  fs.mkdirSync(plistDir, { recursive: true });
  const nodePath = execSync('which node', { encoding: 'utf8' }).trim();
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.claude.ecosystem</string>
  <key>ProgramArguments</key>
  <array>
    <string>${nodePath}</string>
    <string>${path.join(CLAUDE_HOME, 'task-scheduler', 'server.js')}</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>${path.join(CLAUDE_HOME, 'logs', 'server.log')}</string>
  <key>WorkingDirectory</key><string>${path.join(CLAUDE_HOME, 'task-scheduler')}</string>
</dict>
</plist>`;
  fs.writeFileSync(plistPath, plist, 'utf8');
  run(`launchctl load "${plistPath}"`, CLAUDE_HOME);
  console.log('  LaunchAgent configurado.');
} else {
  console.log('  Linux: configure o systemd service manualmente (ver documentação).');
}

// ── PASSO 8: Validação
step(8, 8, 'Validando instalação');
try {
  execSync(`node "${path.join(CLAUDE_HOME, 'task-scheduler', 'tools-cli.js')}" --list`,
    { stdio: 'ignore' });
  console.log('  tools-cli.js OK.');
} catch (_) {
  console.warn('  Aviso: tools-cli.js não respondeu. Verificar dependências.');
}

console.log('\n' + '='.repeat(50));
console.log('INSTALACAO CONCLUIDA!');
console.log(`Dashboard: http://localhost:3847`);
console.log(`Iniciar servidor: node "${path.join(CLAUDE_HOME, 'task-scheduler', 'server.js')}"`);
console.log(`Tools CLI: node "${path.join(CLAUDE_HOME, 'task-scheduler', 'tools-cli.js')}" --list`);
console.log('='.repeat(50) + '\n');
```

**Compilar com pkg:**

```bash
# Preparar payload
mkdir -p installer/payload
rsync -av \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='data/' \
  --exclude='temp/' \
  --exclude='backups/' \
  --exclude='logs/' \
  --exclude='*.encrypted.json' \
  --exclude='.env' \
  ~/.claude/ installer/payload/

# Compilar para todos os alvos
cd installer
pkg package.json

# Saída em dist/:
#   claude-ecosystem-installer-win.exe      (Windows x64)
#   claude-ecosystem-installer-macos-arm64  (Mac Apple Silicon)
#   claude-ecosystem-installer-macos-x64    (Mac Intel)
#   claude-ecosystem-installer-linux        (Linux x64)
```

---

### Opção 2 — Instalador Windows Nativo com NSIS (.exe)

NSIS cria instaladores `.exe` com interface gráfica nativa (wizard), progresso, atalhos no Menu Iniciar e remoção via Painel de Controle.

**Arquivo `claude-ecosystem-installer.nsi`:**

```nsis
; ============================================================
; Claude Code Ecosystem — NSIS Installer Script
; Compilar com: makensis claude-ecosystem-installer.nsi
; ============================================================

!define PRODUCT_NAME    "Claude Code Ecosystem"
!define PRODUCT_VERSION "1.0.0"
!define PRODUCT_PUBLISHER "Riwer Labs"
!define PRODUCT_URL     "https://riwerlabs.com.br"
!define INSTALL_DIR     "$APPDATA\.claude"
!define UNINSTALL_KEY   "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"

Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"
OutFile "claude-ecosystem-setup-${PRODUCT_VERSION}.exe"
InstallDir "${INSTALL_DIR}"
RequestExecutionLevel user
Unicode True
SetCompressor /SOLID lzma

; Ícone (opcional)
; Icon "assets\icon.ico"
; UninstallIcon "assets\icon.ico"

; Páginas do assistente de instalação
!include "MUI2.nsh"
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "PortugueseBR"

; ── Seção principal de instalação
Section "Claude Code Ecosystem" SEC_MAIN
  SectionIn RO  ; Seção obrigatória (não pode ser desmarcada)
  SetOutPath "$INSTDIR"

  ; Copiar todos os arquivos do projeto (compilados no dist/)
  File /r "dist\claude\*.*"

  ; Criar atalhos no Menu Iniciar
  CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"

  CreateShortcut "$SMPROGRAMS\${PRODUCT_NAME}\Iniciar Servidor.lnk" \
    "cmd.exe" \
    '/k "cd /d "$INSTDIR\task-scheduler" && node server.js"' \
    "" 0

  CreateShortcut "$SMPROGRAMS\${PRODUCT_NAME}\Abrir Dashboard.lnk" \
    "http://localhost:3847"

  CreateShortcut "$SMPROGRAMS\${PRODUCT_NAME}\Desinstalar.lnk" \
    "$INSTDIR\uninstall.exe"

  ; Criar atalho na Área de Trabalho (opcional)
  CreateShortcut "$DESKTOP\Claude Ecosystem.lnk" \
    "http://localhost:3847" "" "" 0

  ; Registrar no Painel de Controle
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayName"      "${PRODUCT_NAME}"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayVersion"   "${PRODUCT_VERSION}"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "Publisher"        "${PRODUCT_PUBLISHER}"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "URLInfoAbout"     "${PRODUCT_URL}"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "UninstallString"  '"$INSTDIR\uninstall.exe"'
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayIcon"      "$INSTDIR\uninstall.exe"
  WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoModify"       1
  WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoRepair"       1
  WriteUninstaller "$INSTDIR\uninstall.exe"

  ; Instalar Node.js via winget se não estiver presente
  ExecWait 'cmd.exe /c "node --version >nul 2>&1 || winget install OpenJS.NodeJS.LTS --silent --accept-source-agreements"'

  ; npm install nos subprojetos
  DetailPrint "Instalando dependências Node.js..."
  ExecWait 'cmd.exe /c "cd /d "$INSTDIR\task-scheduler" && npm install --prefer-offline"'
  ExecWait 'cmd.exe /c "cd /d "$INSTDIR\frontend-analyzer" && npm install --prefer-offline"'
  ExecWait 'cmd.exe /c "cd /d "$INSTDIR\mcp-server" && npm install --prefer-offline"'
  ExecWait 'cmd.exe /c "cd /d "$INSTDIR\session-diary" && npm install --prefer-offline"'

  ; Criar dados iniciais
  FileOpen $0 "$INSTDIR\data\tasks.json" w
  FileWrite $0 "[]"
  FileClose $0

  ; Configurar Task Scheduler para auto-início
  DetailPrint "Configurando auto-início..."
  ExecWait 'schtasks /create /tn "ClaudeEcosystem" \
    /tr "cmd /c \"cd /d \"$INSTDIR\task-scheduler\" && node server.js\"" \
    /sc ONLOGON /delay 0000:30 /f'
SectionEnd

; ── Seção de desinstalação
Section "Uninstall"
  ; Parar servidor antes de remover
  ExecWait 'schtasks /delete /tn "ClaudeEcosystem" /f'
  ExecWait 'cmd.exe /c "for /f \"tokens=5\" %P in ('"'"'netstat -ano ^| findstr :3847'"'"') do taskkill /PID %P /F"'

  ; Remover node_modules (grandes, mas preservar dados do usuário)
  RMDir /r "$INSTDIR\task-scheduler\node_modules"
  RMDir /r "$INSTDIR\frontend-analyzer\node_modules"
  RMDir /r "$INSTDIR\mcp-server\node_modules"
  RMDir /r "$INSTDIR\session-diary\node_modules"

  ; Perguntar se quer remover dados do usuário
  MessageBox MB_YESNO "Remover também os dados do CRM e knowledge base?" IDNO skip_data
    RMDir /r "$INSTDIR\data"
    RMDir /r "$INSTDIR\knowledge-base"
    RMDir /r "$INSTDIR\session-diary\diary.jsonl"
  skip_data:

  ; Remover arquivos de sistema
  Delete "$INSTDIR\uninstall.exe"
  RMDir /r "$INSTDIR\task-scheduler"
  RMDir /r "$INSTDIR\frontend-analyzer"
  RMDir /r "$INSTDIR\mcp-server"
  RMDir /r "$INSTDIR\agents"
  RMDir /r "$INSTDIR\hooks"
  RMDir /r "$INSTDIR\config"
  RMDir /r "$INSTDIR\contexts"
  RMDir /r "$INSTDIR\commands"
  RMDir /r "$INSTDIR\skills"
  Delete "$INSTDIR\CLAUDE.md"
  Delete "$INSTDIR\settings.json"

  ; Remover atalhos
  RMDir /r "$SMPROGRAMS\${PRODUCT_NAME}"
  Delete "$DESKTOP\Claude Ecosystem.lnk"

  ; Remover registro
  DeleteRegKey HKCU "${UNINSTALL_KEY}"
SectionEnd
```

**Compilar:**

```bash
# Preparar o diretório dist/claude/ com os arquivos do projeto
mkdir -p dist/claude
rsync -av --exclude='node_modules' --exclude='.git' --exclude='data/' \
  ~/.claude/ dist/claude/

# Compilar o instalador
makensis claude-ecosystem-installer.nsi

# Saída: claude-ecosystem-setup-1.0.0.exe (~50-200MB dependendo dos assets)
```

---

### Opção 3 — Instalador Mac com pkgbuild (.pkg)

Cria um pacote `.pkg` nativo do macOS com instalação via assistente gráfico padrão do sistema.

**build-mac-installer.sh:**

```bash
#!/usr/bin/env bash
set -euo pipefail

APP_NAME="ClaudeCodeEcosystem"
VERSION="1.0.0"
IDENTIFIER="com.riwerlabs.claude-ecosystem"
BUILD_DIR="./build-mac"
COMPONENT_PKG="$BUILD_DIR/$APP_NAME-component.pkg"
OUTPUT_PKG="claude-ecosystem-$VERSION.pkg"

# 1. Preparar estrutura do pacote (root = /)
echo "Preparando payload..."
mkdir -p "$BUILD_DIR/root$HOME/.claude"
rsync -av \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='data/' \
  --exclude='temp/' \
  --exclude='backups/' \
  --exclude='logs/' \
  --exclude='*.encrypted.json' \
  --exclude='.env' \
  ~/.claude/ "$BUILD_DIR/root$HOME/.claude/"

# 2. Criar scripts de pré/pós instalação
mkdir -p "$BUILD_DIR/scripts"

# preinstall: verificar pré-requisitos
cat > "$BUILD_DIR/scripts/preinstall" << 'PRE'
#!/bin/bash
if ! command -v node &>/dev/null; then
  osascript -e 'display dialog "Node.js não encontrado. Instale em nodejs.org antes de continuar." buttons {"OK"} default button "OK" with icon stop'
  exit 1
fi
NODE_VER=$(node -e "process.exit(parseInt(process.versions.node) >= 20 ? 0 : 1)" 2>/dev/null; echo $?)
if [[ "$NODE_VER" != "0" ]]; then
  osascript -e 'display dialog "Node.js 20+ é necessário. Instale a versão LTS em nodejs.org." buttons {"OK"} default button "OK" with icon caution'
fi
exit 0
PRE
chmod +x "$BUILD_DIR/scripts/preinstall"

# postinstall: configurar ambiente
cat > "$BUILD_DIR/scripts/postinstall" << 'POST'
#!/bin/bash
CLAUDE_HOME="$HOME/.claude"

# Criar diretórios que possam estar faltando
mkdir -p "$CLAUDE_HOME"/{data,temp,backups,cache,sessions,tasks,plans,logs}

# npm install nos subprojetos
for mod in task-scheduler frontend-analyzer mcp-server session-diary; do
  MOD_PATH="$CLAUDE_HOME/$mod"
  if [[ -f "$MOD_PATH/package.json" ]]; then
    cd "$MOD_PATH" && npm install --prefer-offline 2>/dev/null || true
  fi
done

# Criar dados iniciais (sem sobrescrever)
[[ ! -f "$CLAUDE_HOME/data/tasks.json" ]]            && echo "[]" > "$CLAUDE_HOME/data/tasks.json"
[[ ! -f "$CLAUDE_HOME/data/executions.json" ]]       && echo "[]" > "$CLAUDE_HOME/data/executions.json"
[[ ! -f "$CLAUDE_HOME/data/prompt-templates.json" ]] && echo "[]" > "$CLAUDE_HOME/data/prompt-templates.json"
[[ ! -f "$CLAUDE_HOME/session-diary/diary.jsonl" ]]  && touch "$CLAUDE_HOME/session-diary/diary.jsonl"

# Instalar dependências Python (opcional, sem falhar)
pip3 install faster-whisper pillow opencv-python scikit-image scipy numpy 2>/dev/null || true

# Configurar LaunchAgent para auto-início
PLIST_DIR="$HOME/Library/LaunchAgents"
PLIST="$PLIST_DIR/com.claude.ecosystem.plist"
mkdir -p "$PLIST_DIR"
NODE_BIN=$(which node)
cat > "$PLIST" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.claude.ecosystem</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$CLAUDE_HOME/task-scheduler/server.js</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$CLAUDE_HOME/logs/server.log</string>
  <key>StandardErrorPath</key><string>$CLAUDE_HOME/logs/server-error.log</string>
  <key>WorkingDirectory</key><string>$CLAUDE_HOME/task-scheduler</string>
</dict>
</plist>
EOF

launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST" 2>/dev/null || true

echo "Claude Code Ecosystem configurado com sucesso!"
exit 0
POST
chmod +x "$BUILD_DIR/scripts/postinstall"

# 3. Criar recursos (welcome, readme, license)
mkdir -p "$BUILD_DIR/resources"
cat > "$BUILD_DIR/resources/welcome.html" << 'HTML'
<html><body>
<h2>Claude Code Ecosystem v1.0.0</h2>
<p>Este instalador vai configurar o Claude Code Ecosystem em <code>~/.claude/</code>.</p>
<p><strong>Pré-requisito:</strong> Node.js 20+ deve estar instalado.</p>
</body></html>
HTML

echo "Node.js 20+ requerido." > "$BUILD_DIR/resources/license.txt"

# 4. Construir componente .pkg
echo "Construindo componente pkg..."
pkgbuild \
  --root "$BUILD_DIR/root" \
  --scripts "$BUILD_DIR/scripts" \
  --identifier "$IDENTIFIER" \
  --version "$VERSION" \
  --install-location "/" \
  "$COMPONENT_PKG"

# 5. Criar distribution.xml
cat > "$BUILD_DIR/distribution.xml" << EOF
<?xml version="1.0" encoding="utf-8" standalone="no"?>
<installer-gui-script minSpecVersion="1">
  <title>Claude Code Ecosystem</title>
  <organization>com.riwerlabs</organization>
  <domains enable_localSystem="false" enable_currentUserHome="true"/>
  <options customize="never" require-scripts="true"/>
  <welcome file="welcome.html" mime-type="text/html"/>
  <license file="license.txt"/>
  <pkg-ref id="${IDENTIFIER}"/>
  <choices-outline>
    <line choice="default">
      <line choice="${IDENTIFIER}"/>
    </line>
  </choices-outline>
  <choice id="default"/>
  <choice id="${IDENTIFIER}" visible="false">
    <pkg-ref id="${IDENTIFIER}"/>
  </choice>
  <pkg-ref id="${IDENTIFIER}" version="${VERSION}" onConclusion="none">
    $(basename "$COMPONENT_PKG")
  </pkg-ref>
</installer-gui-script>
EOF

# 6. Construir produto final
echo "Construindo produto final..."
productbuild \
  --distribution "$BUILD_DIR/distribution.xml" \
  --resources "$BUILD_DIR/resources" \
  --package-path "$BUILD_DIR" \
  "$OUTPUT_PKG"

echo "Pacote Mac gerado: $OUTPUT_PKG"
ls -lh "$OUTPUT_PKG"
```

---

### Opção 4 — Cross-Platform via npm pack

Solução mais simples: distribui como pacote npm. Funciona em qualquer SO que tenha Node.js.

```bash
# Estrutura do pacote npm
mkdir claude-ecosystem-pkg && cd claude-ecosystem-pkg

cat > package.json << 'EOF'
{
  "name": "@riwerlabs/claude-ecosystem",
  "version": "1.0.0",
  "description": "Claude Code Ecosystem — ferramentas e configurações globais",
  "bin": {
    "claude-ecosystem": "./bin/install.js",
    "claude-ecosystem-start": "./bin/start.js",
    "claude-ecosystem-stop": "./bin/stop.js"
  },
  "files": ["bin/", "src/", "agents/", "hooks/", "config/", "contexts/", "commands/", "skills/"],
  "engines": { "node": ">=20.0.0" },
  "scripts": { "postinstall": "node bin/install.js --auto" }
}
EOF

mkdir bin
cat > bin/install.js << 'INSTALLJS'
#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CLAUDE_HOME = path.join(os.homedir(), '.claude');
const PKG_ROOT = path.join(__dirname, '..');
const AUTO = process.argv.includes('--auto');

console.log(`${AUTO ? '' : '\n'}Instalando Claude Code Ecosystem em ${CLAUDE_HOME}`);

// Copiar arquivos do pacote (sem sobrescrever dados existentes)
const items = ['agents', 'hooks', 'config', 'contexts', 'commands', 'skills'];
items.forEach(item => {
  const src = path.join(PKG_ROOT, item);
  const dest = path.join(CLAUDE_HOME, item);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true, force: false });
    console.log(`  Copiado: ${item}/`);
  }
});

// Instalar dependências do task-scheduler
const tsPath = path.join(CLAUDE_HOME, 'task-scheduler');
if (fs.existsSync(path.join(tsPath, 'package.json'))) {
  console.log('  npm install em task-scheduler...');
  execSync('npm install --prefer-offline', { cwd: tsPath, stdio: 'inherit' });
}

console.log('\nInstalacao concluida! Execute: claude-ecosystem-start');
INSTALLJS
chmod +x bin/install.js

# Empacotar
npm pack
# Gera: riwerlabs-claude-ecosystem-1.0.0.tgz

# Instalar em qualquer máquina com Node.js 20+
npm install -g riwerlabs-claude-ecosystem-1.0.0.tgz

# Ou publicar no registry npm e instalar via:
# npm install -g @riwerlabs/claude-ecosystem
```

---

## Assinatura de Código

A assinatura evita avisos de segurança do sistema operacional e é obrigatória para distribuição pública confiável.

### Windows — signtool

```powershell
# Pré-requisito: Certificado de assinatura de código (.pfx)
# Fontes: DigiCert, Sectigo, SSL.com (~$200-400/ano)
# Para testes: certificado auto-assinado (não remove aviso SmartScreen)

# Instalar Windows SDK (inclui signtool.exe)
winget install Microsoft.WindowsSDK.10.0.22621

# Assinar o executável .exe
signtool sign `
  /fd SHA256 `
  /f "certificado.pfx" `
  /p "SENHA_DO_CERTIFICADO" `
  /tr "http://timestamp.digicert.com" `
  /td SHA256 `
  "claude-ecosystem-setup-1.0.0.exe"

# Verificar a assinatura
signtool verify /pa "claude-ecosystem-setup-1.0.0.exe"
# Saída esperada: "Successfully verified"
```

**Certificado auto-assinado para testes:**

```powershell
# Gerar certificado de teste (PowerShell)
$cert = New-SelfSignedCertificate `
  -Type CodeSigningCert `
  -Subject "CN=Claude Ecosystem Dev" `
  -KeyUsage DigitalSignature `
  -FriendlyName "Claude Ecosystem Dev Cert" `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3", "2.5.29.19={text}")

# Exportar para .pfx
Export-PfxCertificate `
  -cert "Cert:\CurrentUser\My\$($cert.Thumbprint)" `
  -FilePath "dev-cert.pfx" `
  -Password (ConvertTo-SecureString -String "senha123" -Force -AsPlainText)
```

### Mac — codesign e notarização

```bash
# Pré-requisito: Apple Developer Account ($99/ano)
# Certificado: "Developer ID Application: Nome (TEAMID)"

# Verificar certificados disponíveis
security find-identity -v -p codesigning

# 1. Assinar o .pkg
codesign \
  --deep \
  --force \
  --options runtime \
  --sign "Developer ID Application: Seu Nome (XXXXXXXXXX)" \
  "claude-ecosystem-1.0.0.pkg"

# 2. Verificar assinatura
codesign --verify --verbose "claude-ecosystem-1.0.0.pkg"

# 3. Notarizar (obrigatório para macOS 13+ sem aviso Gatekeeper)
# Criar senha de app específica em appleid.apple.com
xcrun notarytool submit "claude-ecosystem-1.0.0.pkg" \
  --apple-id "seu@email.com" \
  --team-id "XXXXXXXXXX" \
  --password "SENHA_APP_ESPECIFICA" \
  --wait \
  --verbose

# 4. Grampar o ticket de notarização no pacote
xcrun stapler staple "claude-ecosystem-1.0.0.pkg"

# 5. Verificar resultado final
spctl --assess --type install --verbose "claude-ecosystem-1.0.0.pkg"
# Saída esperada: "accepted"
```

---

## Distribuição

### GitHub Releases

```bash
# Criar a release com todos os artefatos
gh release create v1.0.0 \
  --title "Claude Code Ecosystem v1.0.0" \
  --notes "## O que há de novo

- Instalação automatizada Windows e Mac
- 72 ferramentas modulares via tools-cli
- 7 MCPs pré-configurados
- 43 agentes especializados
- CRM local na porta 3847

## Instalação

**Windows:** Baixe e execute \`claude-ecosystem-setup-1.0.0.exe\`
**Mac:** Baixe e instale \`claude-ecosystem-1.0.0.pkg\`
**Node.js:** \`npm install -g riwerlabs-claude-ecosystem-1.0.0.tgz\`" \
  "claude-ecosystem-setup-1.0.0.exe" \
  "claude-ecosystem-1.0.0.pkg" \
  "riwerlabs-claude-ecosystem-1.0.0.tgz"

# Ver URLs de download
gh release view v1.0.0
```

### Amazon S3 + CloudFront

```bash
# Upload dos instaladores
aws s3 cp claude-ecosystem-setup-1.0.0.exe \
  s3://meu-bucket/releases/v1.0.0/ --acl public-read

aws s3 cp claude-ecosystem-1.0.0.pkg \
  s3://meu-bucket/releases/v1.0.0/ --acl public-read

# URL direta S3
# https://meu-bucket.s3.amazonaws.com/releases/v1.0.0/claude-ecosystem-setup-1.0.0.exe

# URL via CloudFront (mais rápido)
# https://d1234abcd.cloudfront.net/releases/v1.0.0/claude-ecosystem-setup-1.0.0.exe

# Criar latest redirect
aws s3 cp \
  s3://meu-bucket/releases/v1.0.0/claude-ecosystem-setup-1.0.0.exe \
  s3://meu-bucket/releases/latest/claude-ecosystem-setup-win.exe \
  --acl public-read
```

### Script de Download One-liner

**Windows (PowerShell):**

```powershell
# Criar install.ps1 hospedado no servidor
$content = @'
$url = "https://releases.riwerlabs.com.br/claude-ecosystem/latest/claude-ecosystem-setup-win.exe"
$out = "$env:TEMP\claude-ecosystem-setup.exe"
Write-Host "Baixando Claude Code Ecosystem..."
Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing
Write-Host "Iniciando instalador..."
Start-Process $out -Wait
Remove-Item $out -ErrorAction SilentlyContinue
'@

# Usuário instala com:
# irm https://releases.riwerlabs.com.br/claude-ecosystem/install.ps1 | iex
```

**Mac/Linux (bash):**

```bash
# Criar install.sh hospedado no servidor
#!/usr/bin/env bash
set -e

OS=$(uname -s)
ARCH=$(uname -m)
BASE_URL="https://releases.riwerlabs.com.br/claude-ecosystem/latest"

if [[ "$OS" == "Darwin" ]]; then
  URL="$BASE_URL/claude-ecosystem-mac.pkg"
  DEST="/tmp/claude-ecosystem.pkg"
  echo "Baixando instalador Mac..."
  curl -fsSL "$URL" -o "$DEST"
  echo "Instalando..."
  installer -pkg "$DEST" -target CurrentUserHomeDirectory
  rm -f "$DEST"
else
  # Linux: instalação via script
  URL="$BASE_URL/install-linux.sh"
  echo "Baixando instalador Linux..."
  curl -fsSL "$URL" | bash
fi

echo "Instalado! Dashboard: http://localhost:3847"

# Usuário instala com:
# curl -fsSL https://releases.riwerlabs.com.br/claude-ecosystem/install.sh | bash
```

---

## Checklist de Validação Pós-Instalação

Execute este script para verificar se a instalação está correta:

**validate-install.sh (Mac/Linux):**

```bash
#!/usr/bin/env bash
CLAUDE_HOME="$HOME/.claude"
ERRORS=0; WARNINGS=0

ok()   { echo "  [OK]   $1"; }
fail() { echo "  [ERRO] $1"; ((ERRORS++)); }
warn() { echo "  [WARN] $1"; ((WARNINGS++)); }
chk()  { eval "$2" &>/dev/null && ok "$1" || fail "$1"; }

echo "=============================="
echo " Claude Ecosystem — Validação"
echo "=============================="

echo; echo "[ Diretórios ]"
for d in task-scheduler frontend-analyzer knowledge-base agents hooks config \
          contexts session-diary memory temp data logs; do
  chk "$d/" "[[ -d '$CLAUDE_HOME/$d' ]]"
done

echo; echo "[ Arquivos Essenciais ]"
for f in CLAUDE.md settings.json "config/mcp.json" \
          "task-scheduler/server.js" "task-scheduler/tools-cli.js" \
          "task-scheduler/chat-tools.js" "task-scheduler/credential-vault.js"; do
  chk "$f" "[[ -f '$CLAUDE_HOME/$f' ]]"
done

echo; echo "[ node_modules ]"
for mod in task-scheduler frontend-analyzer session-diary mcp-server; do
  chk "$mod/node_modules" "[[ -d '$CLAUDE_HOME/$mod/node_modules' ]]"
done

echo; echo "[ Dados Iniciais ]"
for f in "data/tasks.json" "data/executions.json" "data/prompt-templates.json" \
          "session-diary/diary.jsonl"; do
  chk "$f" "[[ -f '$CLAUDE_HOME/$f' ]]"
done

echo; echo "[ Sistema ]"
chk "Node.js 20+"      "node -e 'process.exit(parseInt(process.versions.node)>=20?0:1)'"
chk "npm disponível"   "npm --version"
chk "Git disponível"   "git --version"
chk "Python disponível" "python3 --version || python --version"

node "$CLAUDE_HOME/task-scheduler/tools-cli.js" --list &>/dev/null \
  && ok "tools-cli.js responde" || warn "tools-cli.js não respondeu"

echo; echo "=============================="
if [[ $ERRORS -eq 0 && $WARNINGS -eq 0 ]]; then
  echo " RESULTADO: Instalação OK!"
elif [[ $ERRORS -eq 0 ]]; then
  echo " RESULTADO: OK com $WARNINGS aviso(s)."
else
  echo " RESULTADO: $ERRORS erro(s) e $WARNINGS aviso(s)."
  echo " Execute o instalador novamente ou corrija manualmente."
fi
echo "=============================="
exit $ERRORS
```

**validate-install.bat (Windows):**

```batch
@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
set CLAUDE_HOME=%USERPROFILE%\.claude
set ERRORS=0

echo ==============================
echo  Claude Ecosystem - Validacao
echo ==============================

echo.
echo [ Diretorios ]
for %%D in (task-scheduler frontend-analyzer knowledge-base agents hooks config contexts session-diary memory temp data logs) do (
  if exist "%CLAUDE_HOME%\%%D\" (echo   [OK]   %%D) else (echo   [ERRO] %%D & set /a ERRORS+=1)
)

echo.
echo [ Arquivos Essenciais ]
for %%F in ("CLAUDE.md" "settings.json" "config\mcp.json" "task-scheduler\server.js" "task-scheduler\tools-cli.js") do (
  if exist "%CLAUDE_HOME%\%%~F" (echo   [OK]   %%~F) else (echo   [ERRO] %%~F & set /a ERRORS+=1)
)

echo.
echo [ node_modules ]
for %%M in (task-scheduler frontend-analyzer session-diary mcp-server) do (
  if exist "%CLAUDE_HOME%\%%M\node_modules\" (echo   [OK]   %%M\node_modules) else (echo   [ERRO] %%M\node_modules & set /a ERRORS+=1)
)

echo.
echo [ Tools CLI ]
node "%CLAUDE_HOME%\task-scheduler\tools-cli.js" --list >nul 2>&1
if errorlevel 1 (echo   [WARN] tools-cli.js nao respondeu) else (echo   [OK]   tools-cli.js OK)

echo.
echo ==============================
if "%ERRORS%"=="0" (
  echo  RESULTADO: Instalacao OK!
) else (
  echo  RESULTADO: %ERRORS% erro^(s^) encontrado^(s^).
)
echo ==============================
exit /b %ERRORS%
```

---

## Variáveis de Ambiente

| Variável | Valor padrão | Descrição |
|----------|-------------|-----------|
| `CLAUDE_HOME` | `~/.claude` | Diretório raiz do ecossistema |
| `PORT` | `3847` | Porta do servidor unificado |
| `CRM_TOKEN` | `local-dev-token` | Token de autenticação da API CRM |
| `NODE_ENV` | `production` | Ambiente Node.js |

---

## Atualização do Ecossistema

```bash
# 1. Backup antes de atualizar (preservar dados)
cp -r ~/.claude/task-scheduler ~/.claude/backups/task-scheduler-$(date +%Y%m%d)
cp -r ~/.claude/knowledge-base ~/.claude/backups/knowledge-base-$(date +%Y%m%d)
cp ~/.claude/settings.json ~/.claude/backups/settings-$(date +%Y%m%d).json

# 2. Parar o servidor
bash ~/.claude/stop-all.sh

# 3. Copiar novos arquivos (sem sobrescrever data/)
rsync -av \
  --exclude='node_modules' \
  --exclude='data/' \
  --exclude='temp/' \
  --exclude='backups/' \
  --exclude='logs/' \
  --exclude='session-diary/diary.jsonl' \
  ./nova-versao/ ~/.claude/

# 4. Reinstalar dependências
cd ~/.claude/task-scheduler && npm install
cd ~/.claude/frontend-analyzer && npm install

# 5. Reiniciar servidor
bash ~/.claude/start-all.sh

# 6. Validar
bash ~/.claude/validate-install.sh
```

---

## Resolução de Problemas

### Porta 3847 em uso

```bash
# Mac/Linux
lsof -ti :3847 | xargs kill -9 2>/dev/null || true

# Windows
netstat -ano | findstr :3847
# Anotar o PID da coluna mais à direita
taskkill /PID <PID> /F
```

### npm install falha — erro de permissão

```bash
# Mac/Linux: ajustar permissões da pasta
sudo chown -R $(whoami) ~/.claude/task-scheduler
cd ~/.claude/task-scheduler && npm install

# Windows: executar o CMD como o mesmo usuário (não como Admin)
# npm install no diretório correto
cd %USERPROFILE%\.claude\task-scheduler && npm install
```

### npm install falha — dependência `canvas`

O módulo `canvas` requer ferramentas de compilação nativas.

```bash
# Mac: instalar Xcode command line tools
xcode-select --install

# Linux (Ubuntu/Debian)
sudo apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

# Windows: instalar windows-build-tools
npm install -g windows-build-tools
```

### Python tools não funcionam

```bash
# Verificar Python e pip no PATH
python3 --version || python --version
pip3 --version || pip --version

# Reinstalar dependências individualmente para identificar o problema
pip3 install pillow
pip3 install opencv-python
pip3 install faster-whisper
pip3 install pytesseract  # Requer Tesseract instalado no sistema
```

### Mac: LaunchAgent não inicia automaticamente

```bash
# Verificar se o plist está carregado
launchctl list | grep claude

# Recarregar manualmente
launchctl unload ~/Library/LaunchAgents/com.claude.ecosystem.plist 2>/dev/null || true
launchctl load ~/Library/LaunchAgents/com.claude.ecosystem.plist

# Verificar logs de erro
tail -50 ~/.claude/logs/server-error.log
```

### Windows: Task Scheduler não funciona

```powershell
# Verificar se a tarefa existe
schtasks /query /tn "ClaudeEcosystem"

# Recriar a tarefa
schtasks /delete /tn "ClaudeEcosystem" /f
schtasks /create /tn "ClaudeEcosystem" `
  /tr "cmd /c `"cd /d $env:USERPROFILE\.claude\task-scheduler && node server.js`"" `
  /sc ONLOGON /delay 0000:30 /ru $env:USERNAME /f

# Testar executando manualmente
schtasks /run /tn "ClaudeEcosystem"
```

### tools-cli.js retorna "Cannot find module"

```bash
# Identificar o módulo faltante
node ~/.claude/task-scheduler/tools-cli.js --list 2>&1 | grep -i "cannot find"

# Instalar o módulo faltante
cd ~/.claude/task-scheduler
npm install <nome-do-modulo>

# Se o problema persistir, reinstalar tudo
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

---

## Referências

| Recurso | Onde encontrar |
|---------|----------------|
| Claude Code CLI | https://claude.ai/code |
| pkg (Node.js binário) | https://github.com/vercel/pkg |
| NSIS (instalador Windows) | https://nsis.sourceforge.io |
| pkgbuild (Mac) | `man pkgbuild` no Terminal Mac |
| productbuild (Mac) | `man productbuild` no Terminal Mac |
| Apple Notarytool | https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution |
| signtool (Windows) | https://docs.microsoft.com/windows/win32/seccrypto/signtool |
| GitHub Releases (gh CLI) | https://cli.github.com |
| AWS S3 CLI | https://docs.aws.amazon.com/cli |
