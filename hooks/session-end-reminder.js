#!/usr/bin/env node
/**
 * Claude Code Stop Hook — Session End Reminder
 *
 * Executa quando Claude está prestes a encerrar a sessão.
 * Verifica se /end-session foi rodado e lembra o agente caso não tenha sido.
 *
 * Recebe JSON do Claude Code via stdin.
 * Saída para stderr é exibida ao usuário.
 * Exit 0 = permite encerrar | Exit 2 = bloqueia encerramento (use com cautela)
 */

const fs   = require('fs');
const path = require('path');

const SCRIPT_DIR     = __dirname;
const CLAUDE_ROOT    = path.dirname(SCRIPT_DIR);
const ANALYSES_DIR   = path.join(CLAUDE_ROOT, 'session-analyzer', 'analyses');
const SESSION_MARKER = path.join(CLAUDE_ROOT, 'session-analyzer', '.last-session-check');

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function analysisRanToday() {
  try {
    // Verificar se existe arquivo de análise criado hoje
    if (!fs.existsSync(ANALYSES_DIR)) return false;

    const today = getToday();
    const files = fs.readdirSync(ANALYSES_DIR);
    return files.some(f => f.startsWith(`analysis-${today}`));
  } catch (_) {
    return false;
  }
}

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) { resolve({}); return; }
    let buf = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', c => buf += c);
    process.stdin.on('end', () => {
      try { resolve(JSON.parse(buf.trim())); }
      catch (_) { resolve({}); }
    });
    setTimeout(() => resolve({}), 2000);
  });
}

async function main() {
  const hookData = await readStdin();

  // Se análise já foi feita hoje, não incomoda
  if (analysisRanToday()) {
    process.exit(0);
  }

  // Emite lembrete visível para o usuário/agente
  const msg = [
    '',
    '┌─────────────────────────────────────────────────────┐',
    '│  ⚠  LEMBRETE: Execute /end-session antes de fechar  │',
    '│                                                     │',
    '│  O comando /end-session analisa a conversa atual,   │',
    '│  documenta erros/insights e atualiza a knowledge    │',
    '│  base automaticamente.                              │',
    '│                                                     │',
    '│  Digite: /end-session                               │',
    '└─────────────────────────────────────────────────────┘',
    ''
  ].join('\n');

  process.stderr.write(msg);

  // Exit 0 = permite encerrar (não bloqueia o stop)
  process.exit(0);
}

main().catch(() => process.exit(0));
