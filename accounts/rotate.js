#!/usr/bin/env node
// ~/.claude/accounts/rotate.js
// v2 — Rotaciona para a próxima conta válida, tenta refresh antes de pular
//
// Melhorias v2:
//   - Verifica se token está válido antes de rotacionar
//   - Tenta refresh de token expirado antes de pular
//   - Pula contas com token morto (expirado + refresh falhou)
//   - Sync: atualiza account-N.json da conta que acabou de sair
//   - Log detalhado

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const CLAUDE_DIR = path.join(process.env.HOME || process.env.USERPROFILE, '.claude');
const ACCOUNTS_DIR = path.join(CLAUDE_DIR, 'accounts');
const CRED_FILE = path.join(CLAUDE_DIR, '.credentials.json');
const CURRENT_FILE = path.join(ACCOUNTS_DIR, 'current.txt');
const LOG_FILE = path.join(ACCOUNTS_DIR, 'rotate.log');

const rls = require('./rate-limit-status');

function readCurrent() {
  try { return fs.readFileSync(CURRENT_FILE, 'utf8').trim(); } catch { return '1'; }
}

function accountFile(n) {
  return path.join(ACCOUNTS_DIR, `account-${n}.json`);
}

function readCreds(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function isTokenValid(creds) {
  if (!creds || !creds.claudeAiOauth) return false;
  return (creds.claudeAiOauth.expiresAt || 0) > Date.now();
}

function tokenHoursLeft(creds) {
  if (!creds || !creds.claudeAiOauth) return -1;
  return Math.round(((creds.claudeAiOauth.expiresAt || 0) - Date.now()) / (1000 * 60 * 60) * 10) / 10;
}

function tryRefreshAccount(n) {
  // Tentar refresh via token-refresher se disponível
  const refresherPath = path.join(ACCOUNTS_DIR, 'token-refresher.js');
  if (!fs.existsSync(refresherPath)) return false;

  try {
    const result = spawnSync('node', [refresherPath, n], {
      timeout: 45000,
      encoding: 'utf8',
      stdio: 'pipe',
    });

    // Verificar se o refresh funcionou
    const creds = readCreds(accountFile(n));
    return isTokenValid(creds);
  } catch {
    return false;
  }
}

function appendLog(entry) {
  let log = [];
  if (fs.existsSync(LOG_FILE)) {
    try { log = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')); } catch {}
  }
  log.push(entry);
  // Manter só últimas 50 entradas
  if (log.length > 50) log = log.slice(-50);
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}

function rotate() {
  const current = readCurrent();
  const all = ['1', '2', '3'];
  const candidates = all.filter(n => n !== current);

  // Marcar conta atual como esgotada (se ainda não foi marcada pelo hook)
  if (!rls.isLimited(current)) {
    rls.markLimited(current);
  }
  console.log(`  📌 Conta ${current} marcada como esgotada (rate limit).`);

  // Antes de sair da conta atual, salvar credenciais atualizadas
  const activeCreds = readCreds(CRED_FILE);
  if (activeCreds && isTokenValid(activeCreds)) {
    const currentFile = accountFile(current);
    if (fs.existsSync(currentFile)) {
      fs.copyFileSync(CRED_FILE, currentFile);
    }
  }

  // Limpar entradas expiradas antes de checar
  rls.clearExpired();

  // Tentar cada candidata em ordem
  for (const next of candidates) {
    const file = accountFile(next);
    if (!fs.existsSync(file)) {
      console.log(`  ⏭️  Conta ${next}: arquivo não encontrado — pulando`);
      continue;
    }

    // Checar se conta ainda está em rate limit
    if (rls.isLimited(next)) {
      const rlStatus = rls.getStatus()[`account-${next}`];
      const resetIn  = rlStatus ? Math.max(0, (rlStatus.resetAt - Date.now()) / 3600000).toFixed(1) : '?';
      console.log(`  ⏸️  Conta ${next}: esgotada — reset em ${resetIn}h — pulando`);
      continue;
    }

    let creds = readCreds(file);

    // Verificar token válido (não expirado)
    if (!isTokenValid(creds)) {
      console.log(`  ⚠️  Conta ${next}: token expirado (${tokenHoursLeft(creds)}h). Tentando refresh...`);

      if (tryRefreshAccount(next)) {
        creds = readCreds(file);
        console.log(`  ✅ Conta ${next}: refresh OK! (${tokenHoursLeft(creds)}h restantes)`);
      } else {
        console.log(`  ❌ Conta ${next}: refresh falhou — pulando`);
        continue;
      }
    }

    // Rotacionar para esta conta
    fs.copyFileSync(file, CRED_FILE);
    fs.writeFileSync(CURRENT_FILE, next);

    const entry = {
      timestamp: new Date().toISOString(),
      from: current,
      to: next,
      reason: 'rate-limit',
      hoursLeft: tokenHoursLeft(creds),
      type: creds.claudeAiOauth.subscriptionType || '?',
    };
    appendLog(entry);

    console.log('');
    console.log(`  ⚡ Conta ${current} atingiu o limite.`);
    console.log(`  ✅ Trocado para conta ${next} (${entry.type}, ${entry.hoursLeft}h restantes).`);
    console.log('');
    process.exit(0);
  }

  // Nenhuma conta disponível (todas esgotadas ou tokens inválidos)
  const rlStatus = rls.getStatus();
  const allLimited = ['1', '2', '3'].filter(n => rls.isLimited(n));
  let earliestReset = Infinity;
  for (const n of allLimited) {
    const entry = rlStatus[`account-${n}`];
    if (entry && entry.resetAt < earliestReset) earliestReset = entry.resetAt;
  }

  console.log('');
  console.log('  ❌ Todas as contas atingiram o limite de uso.');
  if (earliestReset < Infinity) {
    const resetIn  = Math.max(0, (earliestReset - Date.now()) / 3600000);
    const resetISO = new Date(earliestReset).toLocaleTimeString('pt-BR', { timeZone: 'America/Bahia' });
    console.log(`  ⏱️  Próximo reset: ~${resetIn.toFixed(1)}h (${resetISO} Bahia)`);
  }
  console.log(`  📌 Permanecendo na conta: ${current}`);
  console.log(`  💡 Status: node "${path.join(ACCOUNTS_DIR, 'rate-limit-status.js')}"`);
  console.log('');
  process.exit(1);
}

rotate();
