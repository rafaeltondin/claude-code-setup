#!/bin/bash
# =============================================
# INSTALL-ALL.SH — Claude Code Ecosystem
# Instalador universal para macOS/Linux.
# Detecta automaticamente o usuario e diretorio.
#
# Uso: chmod +x install-all.sh && ./install-all.sh
# =============================================
set -e

# ── Cores ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# ── Detectar diretorio ──
CLAUDE_HOME="$HOME/.claude"
TASK_SCHEDULER_DIR="$CLAUDE_HOME/task-scheduler"
FRONTEND_ANALYZER_DIR="$CLAUDE_HOME/frontend-analyzer"
CRM_DIR="$CLAUDE_HOME/task-scheduler/crm-backend"
CRM_FRONTEND_DIR="$CLAUDE_HOME/task-scheduler/frontend"
MCP_SERVER_DIR="$CLAUDE_HOME/mcp-server"
CONFIG_DIR="$CLAUDE_HOME/config"
LOG_DIR="$CLAUDE_HOME/logs"
TEMP_DIR="$CLAUDE_HOME/temp"
LOG_FILE="$LOG_DIR/install-$(date +%Y%m%d).log"

# ── Contadores ──
INSTALLED=0
SKIPPED=0
ERRORS=0
TOTAL_STEPS=12

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE" 2>/dev/null; }
step() {
  echo ""
  echo "  ----------------------------------------------------------------"
  echo "  [${1}/${TOTAL_STEPS}] ${2}"
  echo "  ----------------------------------------------------------------"
  log "[$1/$TOTAL_STEPS] $2"
}

# ── Criar diretorios essenciais ──
mkdir -p "$LOG_DIR" "$CONFIG_DIR" "$TEMP_DIR" \
  "$CLAUDE_HOME"/{knowledge-base,session-diary,memory,agents,hooks,skills,commands,backups,cache,sessions,tasks,plans,data,session-logs,session-env,shell-snapshots,file-history,paste-cache,telemetry,statsig} 2>/dev/null

[ -d "$TASK_SCHEDULER_DIR" ] && mkdir -p "$TASK_SCHEDULER_DIR"/{data,output} 2>/dev/null

echo ""
echo "  ================================================================"
echo "     CLAUDE CODE ECOSYSTEM — Instalacao Universal (macOS/Linux)"
echo "  ================================================================"
echo ""
echo "  Usuario:     $(whoami)"
echo "  Home:        $HOME"
echo "  Claude Home: $CLAUDE_HOME"
echo ""
log "Instalacao iniciada | Usuario: $(whoami) | Claude Home: $CLAUDE_HOME"

# ═══════ PASSO 0: Parar instancias existentes ═══════
echo "  [PRE] Parando instancias existentes..."
if [ -f "$CLAUDE_HOME/scripts/stop-all.sh" ]; then
  bash "$CLAUDE_HOME/scripts/stop-all.sh" > /dev/null 2>&1 || true
  echo "  [OK] Instancias encerradas"
else
  lsof -ti :3847 2>/dev/null | xargs kill -9 2>/dev/null || true
  rm -f "$TASK_SCHEDULER_DIR/data/server.pid" 2>/dev/null
  echo "  [OK] Portas liberadas"
fi
sleep 2

# ═══════ PASSO 1: Node.js ═══════
step 1 "Verificando Node.js..."
if command -v node &>/dev/null; then
  echo "  [OK] Node.js $(node --version)"
  ((SKIPPED++)) || true
else
  echo "  [!] Node.js NAO encontrado. Tentando instalar..."
  if [[ "$(uname)" == "Darwin" ]]; then
    if command -v brew &>/dev/null; then
      brew install node && ((INSTALLED++)) || ((ERRORS++))
    else
      echo -e "  ${RED}[ERRO] Instale Homebrew primeiro:${NC}"
      echo '  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
      ((ERRORS++)) || true
    fi
  else
    if command -v apt-get &>/dev/null; then
      curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs && ((INSTALLED++)) || ((ERRORS++))
    else
      echo -e "  ${RED}[ERRO] Instale Node.js: https://nodejs.org${NC}"
      ((ERRORS++)) || true
    fi
  fi
fi

# ═══════ PASSO 2: Git ═══════
step 2 "Verificando Git..."
if command -v git &>/dev/null; then
  echo "  [OK] Git $(git --version | awk '{print $3}')"
  ((SKIPPED++)) || true
else
  if [[ "$(uname)" == "Darwin" ]]; then
    xcode-select --install 2>/dev/null || true
  else
    sudo apt-get install -y git 2>/dev/null || sudo dnf install -y git 2>/dev/null
  fi
  ((INSTALLED++)) || true
fi

# ── Verificar npm ──
if ! command -v npm &>/dev/null; then
  echo -e "  ${RED}[ERRO CRITICO] npm nao disponivel! Instale Node.js${NC}"
  ((ERRORS++)) || true
  exit 1
fi
echo ""
echo "  [OK] npm disponivel — continuando..."
echo ""

# ═══════ PASSO 3: Claude Code CLI ═══════
step 3 "Verificando Claude Code CLI..."
if command -v claude &>/dev/null; then
  echo "  [OK] Claude Code CLI ja instalado"
  ((SKIPPED++)) || true
else
  echo "  [..] Instalando Claude Code CLI..."
  npm install -g @anthropic-ai/claude-code 2>&1 && ((INSTALLED++)) || ((ERRORS++))
fi

# ═══════ PASSO 4: Task Scheduler deps ═══════
step 4 "Task Scheduler dependencies..."
if [ ! -f "$TASK_SCHEDULER_DIR/package.json" ]; then
  echo "  [SKIP] Task Scheduler nao encontrado"; ((SKIPPED++)) || true
elif [ ! -d "$TASK_SCHEDULER_DIR/node_modules" ]; then
  echo "  [..] Instalando..."
  (cd "$TASK_SCHEDULER_DIR" && npm install 2>&1) && { echo "  [OK] Instalado"; ((INSTALLED++)) || true; } || ((ERRORS++))
else
  echo "  [OK] Ja instalado"; ((SKIPPED++)) || true
fi

# ═══════ PASSO 5: CRM Backend ═══════
step 5 "CRM Prospeccao IA..."
if [ -f "$CRM_DIR/package.json" ]; then
  [ ! -d "$CRM_DIR/node_modules" ] && (cd "$CRM_DIR" && npm install 2>&1)
  [ ! -f "$CRM_DIR/.env" ] && [ -f "$CRM_DIR/.env.example" ] && cp "$CRM_DIR/.env.example" "$CRM_DIR/.env"
  (cd "$CRM_DIR" && npx prisma generate >/dev/null 2>&1) && echo "  [OK] Prisma gerado" || echo -e "  ${YELLOW}[AVISO] Prisma falhou${NC}"
  (cd "$CRM_DIR" && npx prisma db push --skip-generate >/dev/null 2>&1) || true
  (cd "$CRM_DIR" && npx tsc 2>&1) && { echo "  [OK] CRM compilado"; ((INSTALLED++)) || true; } || { echo -e "  ${RED}[ERRO] Build falhou${NC}"; ((ERRORS++)) || true; }
  [ -f "$CRM_FRONTEND_DIR/package.json" ] && {
    [ ! -d "$CRM_FRONTEND_DIR/node_modules" ] && (cd "$CRM_FRONTEND_DIR" && npm install 2>&1)
    (cd "$CRM_FRONTEND_DIR" && npm run build 2>&1) && echo "  [OK] Frontend compilado" || true
  }
else
  echo "  [SKIP] CRM nao encontrado"; ((SKIPPED++)) || true
fi

# ═══════ PASSO 6: Frontend Analyzer ═══════
step 6 "Frontend Analyzer..."
if [ ! -f "$FRONTEND_ANALYZER_DIR/package.json" ]; then
  echo "  [SKIP]"; ((SKIPPED++)) || true
elif [ ! -d "$FRONTEND_ANALYZER_DIR/node_modules" ]; then
  (cd "$FRONTEND_ANALYZER_DIR" && npm install 2>&1) && { echo "  [OK] Instalado"; ((INSTALLED++)) || true; } || ((ERRORS++))
else
  echo "  [OK] Ja instalado"; ((SKIPPED++)) || true
fi

# ═══════ PASSO 7: MCP Server ═══════
step 7 "MCP Server local..."
if [ ! -f "$MCP_SERVER_DIR/package.json" ]; then
  echo "  [SKIP]"; ((SKIPPED++)) || true
elif [ ! -d "$MCP_SERVER_DIR/node_modules" ]; then
  (cd "$MCP_SERVER_DIR" && npm install 2>&1) && { echo "  [OK] Instalado"; ((INSTALLED++)) || true; } || ((ERRORS++))
else
  echo "  [OK] Ja instalado"; ((SKIPPED++)) || true
fi

# ═══════ PASSO 8: Docker + Redis (opcional) ═══════
step 8 "Docker e Redis (opcional)..."
if ! command -v docker &>/dev/null; then
  echo "  [~] Docker nao encontrado (opcional)"; ((SKIPPED++)) || true
else
  echo "  [OK] Docker encontrado"
  if ! lsof -i :6379 &>/dev/null; then
    docker start crm-redis >/dev/null 2>&1 || docker run -d --name crm-redis -p 6379:6379 --restart unless-stopped redis:7-alpine >/dev/null 2>&1
    sleep 3; echo "  [OK] Redis iniciado"; ((INSTALLED++)) || true
  else
    echo "  [OK] Redis ja rodando"; ((SKIPPED++)) || true
  fi
fi

# ═══════ PASSO 9: MCPs config ═══════
step 9 "Configurando MCPs..."
if [ -f "$CONFIG_DIR/mcp.json" ]; then
  echo "  [OK] MCPs ja configurados"; ((SKIPPED++)) || true
else
  node -e "const fs=require('fs');const c={mcpServers:{'chrome-devtools':{command:'npx',args:['chrome-devtools-mcp@latest']},'desktop-commander':{command:'npx',args:['@wonderwhy-er/desktop-commander']},'sequential-thinking':{command:'npx',args:['-y','@modelcontextprotocol/server-sequential-thinking']},'memory':{command:'npx',args:['-y','@modelcontextprotocol/server-memory']},'context7':{command:'npx',args:['-y','@upstash/context7-mcp@latest']}}};fs.writeFileSync('$CONFIG_DIR/mcp.json',JSON.stringify(c,null,2));console.log('  [OK] MCPs: '+Object.keys(c.mcpServers).join(', '))" 2>/dev/null && ((INSTALLED++)) || ((ERRORS++))
fi

# ═══════ PASSO 10: Settings ═══════
step 10 "Configuracoes..."
if [ -f "$CLAUDE_HOME/settings.json" ]; then
  echo "  [OK] settings.json existe"; ((SKIPPED++)) || true
else
  node -e "const fs=require('fs');const s={permissions:{allow:['Edit','Write','Read','Glob','Grep','Bash','WebFetch(domain:*)','WebSearch','MCP','NotebookEdit','Task','TodoWrite','AskUserQuestion','Skill','Skill(auto)'],deny:['Read(./.env)','Read(./.env.*)','Edit(./.env)','Edit(./.env.*)'],ask:[]},language:'portuguese-br'};fs.writeFileSync('$CLAUDE_HOME/settings.json',JSON.stringify(s,null,2))" 2>/dev/null
  echo "  [OK] settings.json criado"; ((INSTALLED++)) || true
fi

# Dados iniciais
if [ -d "$TASK_SCHEDULER_DIR/data" ]; then
  for f in tasks.json executions.json prompt-templates.json scheduled-tasks.json; do
    [ ! -f "$TASK_SCHEDULER_DIR/data/$f" ] && echo "[]" > "$TASK_SCHEDULER_DIR/data/$f"
  done
  echo "  [OK] Dados iniciais criados"
fi

# ═══════ PASSO 11: Auto-inicio ═══════
step 11 "Auto-inicio..."
if [[ "$(uname)" == "Darwin" ]]; then
  PLIST_DIR="$HOME/Library/LaunchAgents"
  PLIST_FILE="$PLIST_DIR/com.claude-code-ecosystem.plist"
  mkdir -p "$PLIST_DIR"
  cat > "$PLIST_FILE" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.claude-code-ecosystem</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${CLAUDE_HOME}/scripts/start-all.sh</string>
    <string>--no-browser</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${CLAUDE_HOME}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <false/>
  <key>StandardOutPath</key>
  <string>${LOG_DIR}/autostart.log</string>
  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/autostart-err.log</string>
</dict>
</plist>
PLIST
  launchctl load "$PLIST_FILE" 2>/dev/null && echo "  [OK] LaunchAgent criado" || echo -e "  ${YELLOW}[AVISO] launchctl falhou${NC}"
  ((INSTALLED++)) || true
else
  SYSTEMD_DIR="$HOME/.config/systemd/user"
  mkdir -p "$SYSTEMD_DIR"
  cat > "$SYSTEMD_DIR/claude-code-ecosystem.service" << SERVICE
[Unit]
Description=Claude Code Ecosystem
After=network.target
[Service]
Type=simple
WorkingDirectory=${CLAUDE_HOME}
ExecStart=/bin/bash ${CLAUDE_HOME}/scripts/start-all.sh --no-browser
Restart=on-failure
[Install]
WantedBy=default.target
SERVICE
  systemctl --user daemon-reload 2>/dev/null
  systemctl --user enable claude-code-ecosystem 2>/dev/null && echo "  [OK] Systemd service criado" || echo -e "  ${YELLOW}[AVISO] systemd falhou${NC}"
  ((INSTALLED++)) || true
fi

# ═══════ PASSO 12: Verificacao final ═══════
step 12 "Verificacao final..."
echo ""

check() { command -v "$1" &>/dev/null && echo "  [V] $2" || echo "  [~] $2"; }
check node "Node.js $(node --version 2>/dev/null || echo 'N/A')"
check npm "npm v$(npm --version 2>/dev/null || echo 'N/A')"
check git "Git $(git --version 2>/dev/null | awk '{print $3}' || echo 'N/A')"
check claude "Claude Code CLI"
check docker "Docker (opcional)"

[ -d "$TASK_SCHEDULER_DIR/node_modules" ] && echo "  [V] Task Scheduler" || echo "  [~] Task Scheduler"
[ -f "$CRM_DIR/dist/index.js" ] 2>/dev/null && echo "  [V] CRM Backend" || echo "  [~] CRM Backend"
[ -d "$FRONTEND_ANALYZER_DIR/node_modules" ] && echo "  [V] Frontend Analyzer" || echo "  [~] Frontend Analyzer"
[ -f "$CONFIG_DIR/mcp.json" ] && echo "  [V] MCPs" || echo "  [~] MCPs"
[ -f "$CLAUDE_HOME/settings.json" ] && echo "  [V] Permissoes" || echo "  [~] Permissoes"

echo ""
echo "  ================================================================"
echo "     Instalados: $INSTALLED | Existentes: $SKIPPED | Erros: $ERRORS"
echo "  ================================================================"
echo ""
echo "  Endpoints (apos start-all.sh):"
echo "    Dashboard:  http://localhost:3847"
echo "    API CRM:    http://localhost:3847/api/crm"
echo "    API Tasks:  http://localhost:3847/api"
echo ""
echo "  Claude Home: $CLAUDE_HOME"
echo "  Log: $LOG_FILE"
echo ""

log "Finalizado: $INSTALLED instalados, $SKIPPED existentes, $ERRORS erros"
[ $ERRORS -gt 0 ] && echo -e "  ${RED}[!] $ERRORS erro(s). Verifique o log.${NC}"
exit $ERRORS
