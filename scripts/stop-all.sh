#!/bin/bash
# Claude Ecosystem v2 — Shutdown Script

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PID_FILE="$PROJECT_DIR/data/server.pid"

echo "[INFO] Encerrando Claude Ecosystem v2..."

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    echo "[INFO] Encerrando servidor (PID: $PID)..."
    kill "$PID" 2>/dev/null || true
    rm -f "$PID_FILE"
fi

# Via porta
if lsof -i :3847 -t &>/dev/null; then
    echo "[INFO] Encerrando processo na porta 3847..."
    kill $(lsof -i :3847 -t) 2>/dev/null || true
fi

echo "[OK] Ecosystem v2 encerrado."
