#!/usr/bin/env node
/**
 * account-rotate-hook.js
 *
 * Registrado em DOIS eventos:
 *
 * 1. Stop — detecta se o motivo foi rate limit / usage limit.
 *    Se sim, escreve ~/.claude/accounts/rate-limited.flag e rotaciona já.
 *
 * 2. UserPromptSubmit — se a flag existir, rotaciona ANTES de enviar
 *    a próxima mensagem ao modelo. Sessão continua sem interrupção.
 */

const fs      = require('fs');
const path    = require('path');
const https   = require('https');
const { execSync } = require('child_process');

const CLAUDE_DIR   = path.join(process.env.HOME || process.env.USERPROFILE, '.claude');
const ACCOUNTS_DIR = path.join(CLAUDE_DIR, 'accounts');
const FLAG_FILE    = path.join(ACCOUNTS_DIR, 'rate-limited.flag');
const ROTATE_JS    = path.join(ACCOUNTS_DIR, 'rotate.js');
const HISTORY_FILE = path.join(CLAUDE_DIR, 'history.jsonl');
const CURRENT_FILE = path.join(ACCOUNTS_DIR, 'current.txt');

let rls;
try { rls = require(path.join(ACCOUNTS_DIR, 'rate-limit-status')); } catch { rls = null; }

// ─── Frases que indicam rate limit / usage limit ──────────────────────────────
const RATE_LIMIT_PATTERNS = [
  /usage.?limit/i,
  /rate.?limit/i,
  /quota.?exceed/i,
  /too.?many.?request/i,
  /overloaded/i,
  /try.?again.?later/i,
  /529/,
  /slow.?down/i,
  /subscription.*limit/i,
  /limit.*reached/i,
  /hit.?your.?limit/i,
  /you.?ve.?hit/i,
  /resets.*am\b/i,
  /resets.*pm\b/i,
];

// Displays do Claude Code que indicam rate limit inequivocamente
const RATE_LIMIT_DISPLAYS = new Set([
  '/rate-limit-options',
  '/extra-usage',
]);

function isRateLimitMessage(text) {
  if (!text || typeof text !== 'string') return false;
  return RATE_LIMIT_PATTERNS.some(p => p.test(text));
}

/**
 * Extrair horário de reset de mensagens como "resets 3pm (America/Bahia)"
 * Retorna timestamp em ms ou null
 */
function parseResetTime(text) {
  if (!text) return null;
  // Match: "resets 3pm", "resets 4am", "resets 10:30pm"
  const m = text.match(/resets?\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (!m) return null;

  let hours = parseInt(m[1], 10);
  const mins  = parseInt(m[2] || '0', 10);
  const ampm  = m[3].toLowerCase();

  if (ampm === 'pm' && hours < 12) hours += 12;
  if (ampm === 'am' && hours === 12) hours = 0;

  // Usar data atual no fuso America/Bahia (UTC-3)
  const now = new Date();
  // Criar data no fuso correto
  const bahiaOffset = -3; // UTC-3
  const utcNow = now.getTime() + (now.getTimezoneOffset() * 60000);
  const bahiaNow = new Date(utcNow + (bahiaOffset * 3600000));

  const resetDate = new Date(bahiaNow);
  resetDate.setHours(hours, mins, 0, 0);

  // Se o horário já passou hoje, é amanhã
  if (resetDate <= bahiaNow) {
    resetDate.setDate(resetDate.getDate() + 1);
  }

  // Converter de volta para UTC
  return resetDate.getTime() - (bahiaOffset * 3600000) - (now.getTimezoneOffset() * 60000);
}

/**
 * Checar se TODAS as contas estão esgotadas.
 * Se sim, não faz sentido rotacionar — só gasta tempo.
 */
function allAccountsLimited() {
  if (!rls) return false;
  rls.clearExpired();
  return ['1', '2', '3'].every(n => rls.isLimited(n));
}

/**
 * Obter conta atual
 */
function getCurrentAccount() {
  try { return fs.readFileSync(CURRENT_FILE, 'utf8').trim(); } catch { return '1'; }
}

// ─── Ler últimas N linhas do history.jsonl (parse JSON correto) ───────────────
function checkHistoryForRateLimit(lines = 10, maxAgeMs = 5 * 60 * 1000) {
  try {
    if (!fs.existsSync(HISTORY_FILE)) return false;
    const content = fs.readFileSync(HISTORY_FILE, 'utf8');
    const lastLines = content.split('\n').filter(Boolean).slice(-lines);
    const now = Date.now();

    return lastLines.some(line => {
      // Tentar parse JSON (formato real do history.jsonl)
      try {
        const obj = JSON.parse(line);
        const display = obj.display || '';
        const ts = obj.timestamp || 0;

        // Ignorar entradas muito antigas (mais de maxAgeMs)
        if (ts && (now - ts) > maxAgeMs) return false;

        // Display exato = rate limit definitivo
        if (RATE_LIMIT_DISPLAYS.has(display)) return true;

        // Checar padrões no display
        if (isRateLimitMessage(display)) return true;
      } catch { /* não é JSON válido */ }

      // Fallback: checar raw string
      return isRateLimitMessage(line);
    });
  } catch { return false; }
}

// ─── Aguardar history.jsonl ser atualizado (race condition) ──────────────────
async function waitForHistoryUpdate(ms = 300) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Checar stop_reason e transcript ─────────────────────────────────────────
async function detectRateLimitFromStopEvent(hookData) {
  const reason   = hookData.stop_reason || hookData.stopReason || '';
  const message  = hookData.message || hookData.error || hookData.errorMessage || '';
  const transcript = hookData.transcript_path || hookData.transcriptPath || '';

  // Checar stop_reason direto
  if (isRateLimitMessage(reason) || isRateLimitMessage(message)) return true;

  // Checar valores conhecidos de stop_reason para rate limit
  const rateLimitReasons = ['rate_limit_exceeded', 'usage_limit_exceeded', 'overloaded', 'error'];
  if (rateLimitReasons.includes(reason)) {
    if (reason === 'error') {
      // "error" é genérico — aguardar history ser atualizado e checar
      await waitForHistoryUpdate(400);
      return checkHistoryForRateLimit(5);
    }
    return true;
  }

  // Checar transcript se disponível
  if (transcript && fs.existsSync(transcript)) {
    try {
      const content = fs.readFileSync(transcript, 'utf8');
      const lastChunk = content.slice(-3000); // últimos ~3k chars
      if (isRateLimitMessage(lastChunk)) return true;
    } catch { /* ignore */ }
  }

  // Fallback: aguardar history.jsonl ser gravado pelo Claude Code e checar
  // (race condition: Stop dispara ANTES do history ser atualizado)
  await waitForHistoryUpdate(500);
  return checkHistoryForRateLimit(5, 2 * 60 * 1000); // últimas 5 entradas, max 2 min
}

// ─── Evitar rotação dupla em janela curta ─────────────────────────────────────
const LAST_ROTATE_FILE = path.join(ACCOUNTS_DIR, 'last-rotate.ts');
function shouldRotate() {
  try {
    if (!fs.existsSync(LAST_ROTATE_FILE)) return true;
    const lastTs = parseInt(fs.readFileSync(LAST_ROTATE_FILE, 'utf8').trim(), 10) || 0;
    // Não rotacionar se já rotacionou nos últimos 30 segundos
    return (Date.now() - lastTs) > 30000;
  } catch { return true; }
}
function markRotated() {
  try { fs.writeFileSync(LAST_ROTATE_FILE, String(Date.now())); } catch {}
}

// ─── Marcar conta atual como esgotada com reset time preciso ─────────────────
function markCurrentAsLimited(resetTimeMs) {
  if (!rls) return;
  const current = getCurrentAccount();
  rls.markLimited(current, resetTimeMs || undefined);
}

// ─── Rotacionar e notificar ───────────────────────────────────────────────────
function rotate(resetTimeMs) {
  if (!shouldRotate()) {
    return true; // já rotacionou recentemente, não duplicar
  }

  // Marcar conta atual como esgotada ANTES de tentar rotacionar
  markCurrentAsLimited(resetTimeMs);

  // Se TODAS as contas estão esgotadas, não tem para onde ir
  if (allAccountsLimited()) {
    const toolsCli = path.join(CLAUDE_DIR, 'task-scheduler', 'tools-cli.js');
    try {
      const msg = '🚫 Claude Code: TODAS as 3 contas atingiram o limite. Aguardando reset.';
      execSync(`node "${toolsCli}" send_telegram text="${msg.replace(/"/g, '\\"')}"`, {
        stdio: 'ignore', timeout: 8000
      });
    } catch {}
    return false;
  }

  try {
    markRotated();
    execSync(`node "${ROTATE_JS}"`, { encoding: 'utf8', timeout: 10000 });
    // Notificar via tools-cli send_telegram
    try {
      const toolsCli = path.join(CLAUDE_DIR, 'task-scheduler', 'tools-cli.js');
      const current = getCurrentAccount();
      const msg = `⚡ Claude Code: limite atingido. Trocado para conta ${current} automaticamente.`;
      execSync(`node "${toolsCli}" send_telegram text="${msg.replace(/"/g, '\\"')}"`, {
        stdio: 'ignore', timeout: 8000
      });
    } catch { /* notificação falhou — não bloquear */ }
    return true;
  } catch {
    return false;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // Ler stdin (enviado pelo Claude Code)
  let input = '';
  await new Promise(resolve => {
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => input += chunk);
    process.stdin.on('end', resolve);
    setTimeout(resolve, 1500);
  });

  let hookData = {};
  try { hookData = JSON.parse(input); } catch { /* sem dados */ }

  const event = hookData.event || '';

  // ── Evento: Stop ────────────────────────────────────────────────────────────
  if (event === 'Stop') {
    const isRateLimit = await detectRateLimitFromStopEvent(hookData);
    if (isRateLimit) {
      // Tentar extrair horário de reset da mensagem
      const message = hookData.message || hookData.error || hookData.errorMessage || '';
      let resetMs = parseResetTime(message);

      // Se não achou na mensagem do hook, tentar no history
      if (!resetMs) {
        try {
          const content = fs.readFileSync(HISTORY_FILE, 'utf8');
          const lastLines = content.split('\n').filter(Boolean).slice(-5);
          for (const line of lastLines.reverse()) {
            try {
              const obj = JSON.parse(line);
              const d = obj.display || '';
              resetMs = parseResetTime(d);
              if (resetMs) break;
            } catch {}
          }
        } catch {}
      }

      const ok = rotate(resetMs);
      if (!ok) {
        // Salvar flag para fallback no próximo UserPromptSubmit
        fs.writeFileSync(FLAG_FILE, JSON.stringify({
          detectedAt: new Date().toISOString(),
          stopReason: hookData.stop_reason || '',
          resetMs: resetMs || null,
        }));
      }
    }
    process.exit(0);
  }

  // ── Evento: UserPromptSubmit ────────────────────────────────────────────────
  if (event === 'UserPromptSubmit' || event === '') {
    // Se TODAS as contas estão esgotadas, não desperdiçar tempo tentando
    if (allAccountsLimited()) {
      process.exit(0);
    }

    // Caminho 1: flag deixada pelo Stop handler
    if (fs.existsSync(FLAG_FILE)) {
      let resetMs = null;
      try {
        const flagData = JSON.parse(fs.readFileSync(FLAG_FILE, 'utf8'));
        resetMs = flagData.resetMs || null;
      } catch {}
      try { fs.unlinkSync(FLAG_FILE); } catch {}
      rotate(resetMs);
      process.exit(0);
    }

    // Caminho 2: verificação independente do history.jsonl
    // (Stop handler pode não ter detectado por race condition)
    if (checkHistoryForRateLimit(8, 10 * 60 * 1000)) {
      // Extrair reset time do history
      let resetMs = null;
      try {
        const content = fs.readFileSync(HISTORY_FILE, 'utf8');
        const lastLines = content.split('\n').filter(Boolean).slice(-8);
        for (const line of lastLines.reverse()) {
          try {
            const obj = JSON.parse(line);
            resetMs = parseResetTime(obj.display || '');
            if (resetMs) break;
          } catch {}
        }
      } catch {}
      rotate(resetMs);
    }

    process.exit(0);
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
