#!/bin/bash
# =============================================
# INSTALL-ALL.SH — Claude Code Ecosystem
# Instalador universal e portatil.
# Detecta SO, usuario e diretorio home automaticamente.
#
# Uso: chmod +x install-all.sh && ./install-all.sh
# Funciona em: macOS, Linux, Windows (Git Bash/WSL)
# =============================================

set -e

# ── Cores ────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'

# ── Detectar ambiente ────────────────────────
detect_os() {
  case "$(uname -s)" in
    Darwin*)  echo "macos" ;;
    Linux*)
      if grep -qi microsoft /proc/version 2>/dev/null; then
        echo "wsl"
      else
        echo "linux"
      fi
      ;;
    MINGW*|MSYS*|CYGWIN*) echo "windows" ;;
    *)        echo "unknown" ;;
  esac
}

OS_TYPE=$(detect_os)
HOME_DIR="$HOME"
CLAUDE_HOME="${HOME_DIR}/.claude"

# Windows Git Bash: ajustar home se necessario
if [ "$OS_TYPE" = "windows" ] && [ -n "$USERPROFILE" ]; then
  WIN_HOME=$(cygpath "$USERPROFILE" 2>/dev/null || echo "$HOME")
  CLAUDE_HOME="${WIN_HOME}/.claude"
fi

# ── Diretorios ───────────────────────────────
BASE_DIR="${CLAUDE_HOME}"
TASK_SCHEDULER_DIR="${BASE_DIR}/task-scheduler"
FRONTEND_ANALYZER_DIR="${BASE_DIR}/frontend-analyzer"
CRM_DIR="${TASK_SCHEDULER_DIR}/crm-backend"
CONFIG_DIR="${BASE_DIR}/config"
LOG_DIR="${BASE_DIR}/logs"
TEMP_DIR="${BASE_DIR}/temp"
LOG_FILE="${LOG_DIR}/install-$(date +%Y%m%d).log"

# ── Contadores ───────────────────────────────
INSTALLED=0; SKIPPED=0; ERRORS=0; TOTAL_STEPS=11

# ── Funcoes ──────────────────────────────────
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "${LOG_FILE}" 2>/dev/null; }

step() {
  echo ""
  echo -e "  ${BLUE}────────────────────────────────────────────${NC}"
  echo -e "  ${BLUE}[$1/${TOTAL_STEPS}]${NC} $2"
  echo -e "  ${BLUE}────────────────────────────────────────────${NC}"
  log "[$1/${TOTAL_STEPS}] $2"
}

ok()   { echo -e "  ${GREEN}[OK]${NC} $1"; log "[OK] $1"; }
warn() { echo -e "  ${YELLOW}[!]${NC} $1"; log "[WARN] $1"; }
err()  { echo -e "  ${RED}[ERRO]${NC} $1"; log "[ERRO] $1"; ((ERRORS++)); }
skip() { echo -e "  ${CYAN}[SKIP]${NC} $1"; log "[SKIP] $1"; ((SKIPPED++)); }

# ── Criar diretorios essenciais ──────────────
mkdir -p "${LOG_DIR}" "${CONFIG_DIR}" "${TEMP_DIR}"
mkdir -p "${BASE_DIR}/knowledge-base"
mkdir -p "${BASE_DIR}/session-diary"
mkdir -p "${BASE_DIR}/session-analyzer"
mkdir -p "${BASE_DIR}/memory"
mkdir -p "${BASE_DIR}/agents"
mkdir -p "${BASE_DIR}/hooks"
mkdir -p "${BASE_DIR}/skills"
mkdir -p "${BASE_DIR}/commands"
[ -d "${TASK_SCHEDULER_DIR}" ] && mkdir -p "${TASK_SCHEDULER_DIR}/data" "${TASK_SCHEDULER_DIR}/output"

log "================================================================"
log "  CLAUDE CODE ECOSYSTEM — Instalacao: $(date)"
log "  OS: ${OS_TYPE} | Home: ${HOME_DIR} | Claude: ${CLAUDE_HOME}"
log "================================================================"

echo ""
echo -e "  ${GREEN}================================================================${NC}"
echo -e "     ${GREEN}CLAUDE CODE ECOSYSTEM — Instalacao Universal${NC}"
echo -e "  ${GREEN}================================================================${NC}"
echo ""
echo -e "  OS detectado:  ${CYAN}${OS_TYPE}${NC}"
echo -e "  Usuario:       ${CYAN}$(whoami)${NC}"
echo -e "  Home:          ${CYAN}${HOME_DIR}${NC}"
echo -e "  Claude Home:   ${CYAN}${CLAUDE_HOME}${NC}"
echo ""

# ══════════════════════════════════════════════
# PASSO 1: Node.js
# ══════════════════════════════════════════════
step 1 "Verificando Node.js..."

if command -v node &>/dev/null; then
  ok "Node.js $(node --version) instalado"
  ((SKIPPED++))
else
  warn "Node.js NAO encontrado. Instalando..."
  case "$OS_TYPE" in
    macos)
      if command -v brew &>/dev/null; then
        brew install node && ok "Node.js instalado via Homebrew" && ((INSTALLED++))
      else
        err "Homebrew nao encontrado. Instale: https://brew.sh"
      fi
      ;;
    linux|wsl)
      if command -v apt-get &>/dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - 2>/dev/null
        sudo apt-get install -y nodejs && ok "Node.js instalado" && ((INSTALLED++))
      elif command -v dnf &>/dev/null; then
        sudo dnf install -y nodejs && ok "Node.js instalado" && ((INSTALLED++))
      else
        err "Gerenciador de pacotes nao detectado. Instale Node.js: https://nodejs.org"
      fi
      ;;
    windows)
      if command -v winget &>/dev/null; then
        winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements 2>/dev/null
        ok "Node.js instalado via winget" && ((INSTALLED++))
      else
        err "Instale Node.js manualmente: https://nodejs.org"
      fi
      ;;
    *) err "SO nao suportado para instalacao automatica de Node.js" ;;
  esac
fi

# ══════════════════════════════════════════════
# PASSO 2: Git
# ══════════════════════════════════════════════
step 2 "Verificando Git..."

if command -v git &>/dev/null; then
  ok "Git $(git --version | awk '{print $3}') instalado"
  ((SKIPPED++))
else
  warn "Git NAO encontrado. Instalando..."
  case "$OS_TYPE" in
    macos) brew install git 2>/dev/null && ok "Git instalado" && ((INSTALLED++)) || err "Falha ao instalar Git" ;;
    linux|wsl) sudo apt-get install -y git 2>/dev/null && ok "Git instalado" && ((INSTALLED++)) || err "Falha ao instalar Git" ;;
    windows) winget install Git.Git --accept-source-agreements 2>/dev/null && ok "Git instalado" && ((INSTALLED++)) || err "Instale Git: https://git-scm.com" ;;
  esac
fi

# ══════════════════════════════════════════════
# PASSO 3: Claude Code CLI
# ══════════════════════════════════════════════
step 3 "Verificando Claude Code CLI..."

if command -v claude &>/dev/null; then
  ok "Claude Code CLI instalado"
  ((SKIPPED++))
else
  if command -v npm &>/dev/null; then
    npm install -g @anthropic-ai/claude-code 2>/dev/null && ok "Claude Code CLI instalado" && ((INSTALLED++)) || err "Falha ao instalar Claude Code CLI"
  else
    err "npm nao disponivel. Instale Node.js primeiro."
  fi
fi

# ══════════════════════════════════════════════
# PASSO 4: Task Scheduler (deps)
# ══════════════════════════════════════════════
step 4 "Task Scheduler dependencies..."

if [ -f "${TASK_SCHEDULER_DIR}/package.json" ]; then
  if [ -d "${TASK_SCHEDULER_DIR}/node_modules" ]; then
    ok "Task Scheduler deps ja instaladas"
    ((SKIPPED++))
  else
    cd "${TASK_SCHEDULER_DIR}" && npm install 2>&1 | tail -3
    ok "Task Scheduler deps instaladas" && ((INSTALLED++))
  fi
else
  skip "Task Scheduler nao encontrado (${TASK_SCHEDULER_DIR})"
fi

# ══════════════════════════════════════════════
# PASSO 5: CRM Backend
# ══════════════════════════════════════════════
step 5 "CRM Prospeccao IA..."

if [ -f "${CRM_DIR}/package.json" ]; then
  # Backend deps
  if [ ! -d "${CRM_DIR}/node_modules" ]; then
    echo "  Instalando deps do CRM backend..."
    cd "${CRM_DIR}" && npm install 2>&1 | tail -3
  fi

  # Prisma generate + db push
  echo "  Gerando Prisma Client..."
  cd "${CRM_DIR}" && npx prisma generate 2>/dev/null
  echo "  Aplicando schema no banco..."
  cd "${CRM_DIR}" && npx prisma db push --skip-generate 2>/dev/null

  # Build TypeScript
  echo "  Compilando TypeScript..."
  cd "${CRM_DIR}" && npx tsc 2>/dev/null && ok "CRM backend compilado" && ((INSTALLED++)) || err "Falha ao compilar CRM"
else
  skip "CRM backend nao encontrado"
fi

# ══════════════════════════════════════════════
# PASSO 6: Frontend Analyzer
# ══════════════════════════════════════════════
step 6 "Frontend Analyzer..."

if [ -f "${FRONTEND_ANALYZER_DIR}/package.json" ]; then
  if [ -d "${FRONTEND_ANALYZER_DIR}/node_modules" ]; then
    ok "Frontend Analyzer deps ja instaladas"
    ((SKIPPED++))
  else
    cd "${FRONTEND_ANALYZER_DIR}" && npm install 2>&1 | tail -3
    ok "Frontend Analyzer instalado" && ((INSTALLED++))
  fi
else
  skip "Frontend Analyzer nao encontrado"
fi

# ══════════════════════════════════════════════
# PASSO 7: Docker + Redis (opcional)
# ══════════════════════════════════════════════
step 7 "Docker e Redis (opcional)..."

if command -v docker &>/dev/null; then
  ok "Docker $(docker --version | awk '{print $3}' | tr -d ',')"

  # Verificar Redis
  if netstat -tlnp 2>/dev/null | grep -q ":6379" || ss -tlnp 2>/dev/null | grep -q ":6379"; then
    ok "Redis ja rodando na porta 6379"
    ((SKIPPED++))
  else
    echo "  Iniciando Redis via Docker..."
    docker start crm-redis 2>/dev/null || docker run -d --name crm-redis -p 6379:6379 --restart unless-stopped redis:7-alpine 2>/dev/null
    sleep 2
    ok "Redis iniciado" && ((INSTALLED++))
  fi
else
  warn "Docker nao encontrado. Redis e opcional mas recomendado."
  ((SKIPPED++))
fi

# ══════════════════════════════════════════════
# PASSO 8: MCPs
# ══════════════════════════════════════════════
step 8 "Configurando MCPs..."

if command -v npm &>/dev/null; then
  MCP_FILE="${CONFIG_DIR}/mcp.json"

  # Criar/atualizar mcp.json
  node -e "
    const fs=require('fs');
    let c={mcpServers:{}};
    try{c=JSON.parse(fs.readFileSync('${MCP_FILE}','utf8'))}catch(e){}
    const s=c.mcpServers||{};
    if(!s['chrome-devtools'])s['chrome-devtools']={command:'npx',args:['chrome-devtools-mcp@latest']};
    if(!s['desktop-commander'])s['desktop-commander']={command:'npx',args:['@wonderwhy-er/desktop-commander']};
    if(!s['sequential-thinking'])s['sequential-thinking']={command:'npx',args:['-y','@modelcontextprotocol/server-sequential-thinking']};
    c.mcpServers=s;
    fs.writeFileSync('${MCP_FILE}',JSON.stringify(c,null,2));
    console.log('  MCPs: '+Object.keys(s).join(', '));
  " 2>/dev/null

  ok "MCPs configurados" && ((INSTALLED++))
else
  skip "npm indisponivel para MCPs"
fi

# ══════════════════════════════════════════════
# PASSO 9: Settings e permissoes
# ══════════════════════════════════════════════
step 9 "Configuracoes..."

SETTINGS_FILE="${BASE_DIR}/settings.json"
if [ -f "${SETTINGS_FILE}" ]; then
  ok "settings.json existe"
  ((SKIPPED++))
else
  node -e "
    const fs=require('fs');
    const s={permissions:{allow:['Edit','Write','Read','Glob','Grep','Bash','WebFetch(domain:*)','WebSearch','MCP','NotebookEdit','Task','TodoWrite','AskUserQuestion','Skill','Skill(auto)'],deny:['Read(./.env)','Read(./.env.*)','Edit(./.env)','Edit(./.env.*)'],ask:[]}};
    fs.writeFileSync('${SETTINGS_FILE}',JSON.stringify(s,null,2));
  " 2>/dev/null
  ok "settings.json criado" && ((INSTALLED++))
fi

# Dados iniciais do task scheduler
if [ -d "${TASK_SCHEDULER_DIR}/data" ]; then
  [ ! -f "${TASK_SCHEDULER_DIR}/data/tasks.json" ] && echo "[]" > "${TASK_SCHEDULER_DIR}/data/tasks.json"
  [ ! -f "${TASK_SCHEDULER_DIR}/data/executions.json" ] && echo "[]" > "${TASK_SCHEDULER_DIR}/data/executions.json"
  [ ! -f "${TASK_SCHEDULER_DIR}/data/prompt-templates.json" ] && echo "[]" > "${TASK_SCHEDULER_DIR}/data/prompt-templates.json"

  if [ ! -f "${TASK_SCHEDULER_DIR}/data/config.json" ]; then
    node -e "
      const fs=require('fs');
      const c={schedulerEnabled:true,checkInterval:30000,maxConcurrentTasks:2,retryAttempts:3};
      fs.writeFileSync('${TASK_SCHEDULER_DIR}/data/config.json',JSON.stringify(c,null,2));
    " 2>/dev/null
  fi
  ok "Dados iniciais OK"
fi

# ══════════════════════════════════════════════
# PASSO 10: Auto-inicio (OS-specific)
# ══════════════════════════════════════════════
step 10 "Auto-inicio..."

case "$OS_TYPE" in
  macos)
    PLIST_FILE="$HOME/Library/LaunchAgents/com.claudecode.ecosystem.plist"
    if [ ! -f "$PLIST_FILE" ]; then
      cat > "$PLIST_FILE" << PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.claudecode.ecosystem</string>
  <key>ProgramArguments</key>
  <array><string>${BASE_DIR}/start-all.sh</string></array>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>${LOG_DIR}/autostart.log</string>
  <key>StandardErrorPath</key><string>${LOG_DIR}/autostart-error.log</string>
</dict>
</plist>
PLISTEOF
      ok "LaunchAgent criado (auto-inicio no login)"
      ((INSTALLED++))
    else
      ok "LaunchAgent ja existe"
      ((SKIPPED++))
    fi
    ;;
  linux|wsl)
    SYSTEMD_DIR="$HOME/.config/systemd/user"
    SERVICE_FILE="${SYSTEMD_DIR}/claude-ecosystem.service"
    if [ ! -f "$SERVICE_FILE" ] && command -v systemctl &>/dev/null; then
      mkdir -p "$SYSTEMD_DIR"
      cat > "$SERVICE_FILE" << SVCEOF
[Unit]
Description=Claude Code Ecosystem
After=network.target

[Service]
ExecStart=${BASE_DIR}/start-all.sh
Restart=on-failure
Environment=HOME=${HOME_DIR}

[Install]
WantedBy=default.target
SVCEOF
      systemctl --user daemon-reload 2>/dev/null
      systemctl --user enable claude-ecosystem 2>/dev/null
      ok "Systemd service criado"
      ((INSTALLED++))
    else
      skip "Auto-inicio ja configurado ou systemd indisponivel"
    fi
    ;;
  windows)
    # O install-all.bat cuida do auto-inicio no Windows via Task Scheduler
    skip "Auto-inicio configurado via install-all.bat no Windows"
    ;;
esac

# ══════════════════════════════════════════════
# PASSO 11: Verificacao final
# ══════════════════════════════════════════════
step 11 "Verificacao final..."

echo ""
check() {
  if $2 &>/dev/null; then
    echo -e "  ${GREEN}[V]${NC} $1"
  else
    echo -e "  ${RED}[X]${NC} $1"
  fi
}

check "Node.js" "command -v node"
check "npm" "command -v npm"
check "Git" "command -v git"
check "Claude Code CLI" "command -v claude"
[ -d "${TASK_SCHEDULER_DIR}/node_modules" ] && echo -e "  ${GREEN}[V]${NC} Task Scheduler deps" || echo -e "  ${YELLOW}[~]${NC} Task Scheduler deps"
[ -f "${CRM_DIR}/dist/index.js" ] && echo -e "  ${GREEN}[V]${NC} CRM Backend compilado" || echo -e "  ${YELLOW}[~]${NC} CRM Backend"
[ -f "${CONFIG_DIR}/mcp.json" ] && echo -e "  ${GREEN}[V]${NC} MCPs configurados" || echo -e "  ${RED}[X]${NC} MCPs"
[ -f "${SETTINGS_FILE}" ] && echo -e "  ${GREEN}[V]${NC} Permissoes" || echo -e "  ${RED}[X]${NC} Permissoes"
command -v docker &>/dev/null && echo -e "  ${GREEN}[V]${NC} Docker" || echo -e "  ${YELLOW}[~]${NC} Docker (opcional)"

echo ""
echo -e "  ${GREEN}================================================================${NC}"
echo -e "     Instalados: ${INSTALLED} | Existentes: ${SKIPPED} | Erros: ${ERRORS}"
echo -e "  ${GREEN}================================================================${NC}"
echo ""
echo -e "  Endpoints (apos start-all.sh):"
echo -e "    Dashboard:  ${CYAN}http://localhost:3847${NC}"
echo -e "    API CRM:    ${CYAN}http://localhost:3847/api/crm${NC}"
echo -e "    API Tasks:  ${CYAN}http://localhost:3847/api${NC}"
echo ""
echo -e "  Log: ${LOG_FILE}"
echo ""

log "Instalacao finalizada: ${INSTALLED} instalados, ${SKIPPED} existentes, ${ERRORS} erros"
exit ${ERRORS}
