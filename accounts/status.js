#!/usr/bin/env node
// ~/.claude/accounts/status.js
// v2 — Mostra status detalhado com horas restantes e alerta de expiração

const fs = require('fs');
const path = require('path');

const CLAUDE_DIR = path.join(process.env.HOME || process.env.USERPROFILE, '.claude');
const ACCOUNTS_DIR = path.join(CLAUDE_DIR, 'accounts');
const CRED_FILE = path.join(CLAUDE_DIR, '.credentials.json');
const CURRENT_FILE = path.join(ACCOUNTS_DIR, 'current.txt');

function readCurrent() {
  try { return fs.readFileSync(CURRENT_FILE, 'utf8').trim(); } catch { return '1'; }
}

function accountInfo(n) {
  const file = path.join(ACCOUNTS_DIR, `account-${n}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    const creds = JSON.parse(fs.readFileSync(file, 'utf8'));
    const oauth = creds.claudeAiOauth || {};
    const exp = oauth.expiresAt ? new Date(oauth.expiresAt) : null;
    const now = Date.now();
    const expired = exp ? exp.getTime() < now : null;
    const hoursLeft = exp ? Math.round(((exp.getTime() - now) / (1000 * 60 * 60)) * 10) / 10 : null;

    return {
      subscriptionType: oauth.subscriptionType || '?',
      rateLimitTier: oauth.rateLimitTier || '?',
      expiresAt: exp ? exp.toLocaleString('pt-BR') : '?',
      tokenExpired: expired,
      hoursLeft,
    };
  } catch { return { error: true }; }
}

function readRotateLog() {
  const logFile = path.join(ACCOUNTS_DIR, 'rotate.log');
  if (!fs.existsSync(logFile)) return [];
  try { return JSON.parse(fs.readFileSync(logFile, 'utf8')); } catch { return []; }
}

const EMAILS = {
  '1': 'gaujalab@gmail.com',
  '2': 'tondinrafael@gmail.com',
  '3': 'rafaeltondinnutricionista@gmail.com',
  '4': 'nortmarketingdigital@gmail.com',
};

// ─── Exibição ─────────────────────────────────────────────────────────────────
const current = readCurrent();

console.log('');
console.log('╔══════════════════════════════════════════════╗');
console.log('║   Claude Code — Status das Contas            ║');
console.log('╚══════════════════════════════════════════════╝');
console.log('');

let healthyCount = 0;
let warningCount = 0;

for (const n of ['1', '2', '3', '4']) {
  const info = accountInfo(n);
  const isActive = n === current;
  const email = EMAILS[n] || '?';
  const shortEmail = email.split('@')[0];

  if (!info) {
    console.log(`  ${isActive ? '▶' : ' '} Conta ${n} (${shortEmail}): ❌ não configurada`);
  } else if (info.error) {
    console.log(`  ${isActive ? '▶' : ' '} Conta ${n} (${shortEmail}): ⚠️  erro ao ler`);
  } else {
    let icon, timeStr;
    if (info.tokenExpired) {
      icon = '💀';
      timeStr = 'EXPIRADO';
    } else if (info.hoursLeft !== null && info.hoursLeft < 2) {
      icon = '⚠️';
      timeStr = `${info.hoursLeft}h restantes`;
      warningCount++;
    } else {
      icon = '✅';
      timeStr = `${info.hoursLeft}h restantes`;
      healthyCount++;
    }

    const prefix = isActive ? '▶' : ' ';
    console.log(`  ${prefix} Conta ${n} (${shortEmail}): ${icon} ${info.subscriptionType} | ${timeStr} | expira ${info.expiresAt}`);
  }
}

// Sessão ativa
try {
  const activeCreds = JSON.parse(fs.readFileSync(CRED_FILE, 'utf8'));
  const oauth = activeCreds.claudeAiOauth || {};
  const exp = oauth.expiresAt ? new Date(oauth.expiresAt) : null;
  const hoursLeft = exp ? Math.round(((exp.getTime() - Date.now()) / (1000 * 60 * 60)) * 10) / 10 : null;
  const icon = !exp || exp.getTime() < Date.now() ? '💀' : hoursLeft < 2 ? '⚠️' : '✅';
  console.log(`\n  📍 Sessão ativa: ${icon} ${oauth.subscriptionType || '?'} | ${hoursLeft}h restantes`);
} catch {
  console.log('\n  📍 Sessão ativa: ❌ sem credenciais');
}

// Saúde geral
console.log('');
if (healthyCount >= 2) {
  console.log(`  🟢 Sistema saudável: ${healthyCount} contas prontas para rotação`);
} else if (healthyCount >= 1) {
  console.log(`  🟡 Atenção: apenas ${healthyCount} conta(s) saudável(is)`);
} else {
  console.log(`  🔴 Crítico: nenhuma conta com token saudável!`);
}

// Histórico de rotações
const rotateLog = readRotateLog();
if (rotateLog.length > 0) {
  console.log('');
  console.log('  📋 Últimas rotações:');
  rotateLog.slice(-5).forEach(entry => {
    const ts = new Date(entry.timestamp).toLocaleString('pt-BR');
    const extra = entry.type ? ` (${entry.type})` : '';
    console.log(`     ${ts}: conta ${entry.from} → conta ${entry.to}${extra}`);
  });
}

console.log('');
console.log('  Comandos:');
console.log('  • node accounts/status.js            — este status');
console.log('  • node accounts/token-refresher.js    — refresh preventivo');
console.log('  • node accounts/token-refresher.js --check — health check');
console.log('  • node accounts/auth-isolated.js      — re-autenticar');
console.log('  • node accounts/rotate.js             — rotacionar agora');
console.log('  • node accounts/monitor.js            — monitor contínuo');
console.log('');
