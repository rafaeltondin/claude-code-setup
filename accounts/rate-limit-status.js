#!/usr/bin/env node
/**
 * rate-limit-status.js
 *
 * Gerencia o estado de rate limit por conta.
 * Persiste em rate-limit-status.json.
 *
 * Uso:
 *   const rls = require('./rate-limit-status');
 *   rls.markLimited('2');          // marcar conta 2 como esgotada
 *   rls.isLimited('2');            // true se ainda esgotada
 *   rls.getStatus();               // objeto completo
 *   rls.clearAccount('2');         // limpar manualmente
 *   node rate-limit-status.js      // exibir status no terminal
 */

const fs   = require('fs');
const path = require('path');

const DIR         = path.join(process.env.HOME || process.env.USERPROFILE, '.claude', 'accounts');
const STATUS_FILE = path.join(DIR, 'rate-limit-status.json');

// Janela de reset conservadora: 5 horas (Claude Pro/Max resetam por janela)
// Se a mensagem indicar reset explícito, usa esse timestamp.
const DEFAULT_RESET_MS = 5 * 60 * 60 * 1000; // 5h

function readStatus() {
  try {
    return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeStatus(data) {
  try {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2));
  } catch { /* ignorar */ }
}

/**
 * Marcar conta como esgotada.
 * @param {string} accountNum  — "1", "2", "3"
 * @param {number} [resetAtMs] — timestamp do reset (default: agora + 5h)
 */
function markLimited(accountNum, resetAtMs) {
  const status = readStatus();
  const key    = `account-${accountNum}`;
  const now    = Date.now();
  const reset  = resetAtMs || (now + DEFAULT_RESET_MS);

  status[key] = {
    hitAt:        now,
    hitAtISO:     new Date(now).toISOString(),
    resetAt:      reset,
    resetAtISO:   new Date(reset).toISOString(),
    resetInHours: Math.round((reset - now) / 3600000 * 10) / 10,
  };

  writeStatus(status);
  return status[key];
}

/**
 * Verificar se uma conta ainda está esgotada.
 * @param {string} accountNum
 * @returns {boolean}
 */
function isLimited(accountNum) {
  const status = readStatus();
  const entry  = status[`account-${accountNum}`];
  if (!entry) return false;

  // Se passou o resetAt, conta está disponível novamente
  if (Date.now() >= entry.resetAt) {
    // Auto-limpar entrada expirada
    clearAccount(accountNum);
    return false;
  }
  return true;
}

/**
 * Retornar o status completo de todas as contas.
 */
function getStatus() {
  return readStatus();
}

/**
 * Limpar o status de uma conta específica.
 */
function clearAccount(accountNum) {
  const status = readStatus();
  delete status[`account-${accountNum}`];
  writeStatus(status);
}

/**
 * Limpar todos os status expirados.
 */
function clearExpired() {
  const status = readStatus();
  const now    = Date.now();
  let changed  = false;
  for (const [key, entry] of Object.entries(status)) {
    if (entry.resetAt && now >= entry.resetAt) {
      delete status[key];
      changed = true;
    }
  }
  if (changed) writeStatus(status);
}

module.exports = { markLimited, isLimited, getStatus, clearAccount, clearExpired };

// ─── CLI: exibir status ───────────────────────────────────────────────────────
if (require.main === module) {
  clearExpired();
  const status = getStatus();
  const entries = Object.entries(status);

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  Rate Limit Status por Conta             ║');
  console.log('╚══════════════════════════════════════════╝\n');

  if (entries.length === 0) {
    console.log('  ✅ Nenhuma conta com rate limit ativo.\n');
  } else {
    for (const [key, entry] of entries) {
      const resetIn = Math.max(0, (entry.resetAt - Date.now()) / 3600000);
      console.log(`  ❌ ${key}: esgotada desde ${entry.hitAtISO}`);
      console.log(`     Reset em: ${entry.resetAtISO} (${resetIn.toFixed(1)}h restantes)\n`);
    }
  }
}
