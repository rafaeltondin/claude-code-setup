#!/bin/bash
# Claude Ecosystem v2 — Startup Script (macOS/Linux)

set -e

echo "============================================"
echo "  Claude Ecosystem v2 — Inicialização"
echo "============================================"
echo ""

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "[ERRO] Node.js não encontrado!"
    exit 1
fi
echo "[OK] Node.js: $(node --version)"

# Diretório do projeto
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

# Instalar deps se necessário
if [ ! -d "node_modules" ]; then
    echo "[INFO] Instalando dependências..."
    npm install
fi

# Verificar se já está rodando
PID_FILE="$PROJECT_DIR/data/server.pid"
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        echo "[INFO] Encerrando servidor anterior (PID: $OLD_PID)..."
        kill "$OLD_PID" 2>/dev/null || true
        sleep 2
    fi
    rm -f "$PID_FILE"
fi

# Verificar porta 3847
if lsof -i :3847 -t &>/dev/null; then
    echo "[WARN] Porta 3847 em uso. Encerrando..."
    kill $(lsof -i :3847 -t) 2>/dev/null || true
    sleep 2
fi

# Redis (opcional)
echo "[INFO] Verificando Redis..."
if redis-cli ping &>/dev/null 2>&1; then
    echo "[OK] Redis disponível"
else
    echo "[WARN] Redis offline — CRM workers não estarão disponíveis"
fi

# Iniciar servidor
echo ""
echo "[INFO] Iniciando servidor na porta 3847..."
nohup node src/server/index.js > data/logs/server.log 2>&1 &
echo $! > "$PID_FILE"

sleep 3

# Verificar
if lsof -i :3847 -t &>/dev/null; then
    echo "[OK] Servidor rodando na porta 3847 (PID: $(cat $PID_FILE))"
else
    echo "[ERRO] Servidor não iniciou!"
    exit 1
fi

# Abrir browser (se não for silent)
if [ "$1" != "--silent" ] && [ "$1" != "--no-browser" ]; then
    if command -v open &>/dev/null; then
        open "http://localhost:3847"
    elif command -v xdg-open &>/dev/null; then
        xdg-open "http://localhost:3847"
    fi
fi

echo ""
echo "============================================"
echo "  Ecosystem v2 rodando em http://localhost:3847"
echo "============================================"
