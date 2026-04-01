#!/usr/bin/env node
// ~/.claude/accounts/monitor.js
// Monitor em background: detecta rate limit e rotaciona automaticamente
//
// Uso: node ~/.claude/accounts/monitor.js [--interval 60]
// Manter rodando em background: node ~/.claude/accounts/monitor.js &

const fs      = require('fs');
const path    = require('path');
const https   = require('https');
const http    = require('http');
const { execSync } = require('child_process');

// ─── Config ──────────────────────────────────────────────────────────────────
const CLAUDE_DIR   = path.join(process.env.HOME || process.env.USERPROFILE, '.claude');
const ACCOUNTS_DIR = path.join(CLAUDE_DIR, 'accounts');
const CRED_FILE    = path.join(CLAUDE_DIR, '.credentials.json');
const CURRENT_FILE = path.join(ACCOUNTS_DIR, 'current.txt');
const ROTATE_JS    = path.join(ACCOUNTS_DIR, 'rotate.js');

const args     = process.argv.slice(2);
const interval = parseInt(args[args.indexOf('--interval') + 1] || '60', 10) * 1000;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function readCreds() {
  try { return JSON.parse(fs.readFileSync(CRED_FILE, 'utf8')); } catch { return null; }
}

function readCurrent() {
  try { return fs.readFileSync(CURRENT_FILE, 'utf8').trim(); } catch { return '1'; }
}

function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}`;
  console.log(line);
  const logFile = path.join(ACCOUNTS_DIR, 'monitor.log');
  fs.appendFileSync(logFile, line + '\n');
}

function sendTelegram(text) {
  try {
    const credsPath = path.join(CLAUDE_DIR, 'task-scheduler', 'tools-cli.js');
    if (fs.existsSync(credsPath)) {
      execSync(`node "${credsPath}" send_telegram text="${text.replace(/"/g, '\\"')}"`,
        { stdio: 'ignore', timeout: 10000 });
    }
  } catch { /* silencioso */ }
}

// ─── Teste de rate limit via API claude.ai ───────────────────────────────────
function checkRateLimit(accessToken) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.claude.ai',
      path: '/v1/organizations',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      timeout: 8000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 429) {
          resolve({ limited: true, status: 429, body: data });
        } else if (res.statusCode === 200 || res.statusCode === 403) {
          // 200 = ok, 403 = token válido mas sem permissão (não é rate limit)
          resolve({ limited: false, status: res.statusCode });
        } else if (res.statusCode === 401) {
          // Token expirado — tentar refresh
          resolve({ limited: false, expired: true, status: 401 });
        } else {
          // Verificar body por mensagens de rate limit
          const isLimited = data.includes('usage limit') ||
                            data.includes('rate limit') ||
                            data.includes('quota exceeded') ||
                            data.includes('too many requests');
          resolve({ limited: isLimited, status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', () => resolve({ limited: false, error: true }));
    req.on('timeout', () => { req.destroy(); resolve({ limited: false, timeout: true }); });
    req.end();
  });
}

// ─── Refresh preventivo ───────────────────────────────────────────────────────
const REFRESHER_JS = path.join(ACCOUNTS_DIR, 'token-refresher.js');
let lastRefreshRun = 0;
const REFRESH_EVERY = 6 * 60 * 60 * 1000; // 6 horas

function preventiveRefresh() {
  const now = Date.now();
  if (now - lastRefreshRun < REFRESH_EVERY) return;
  lastRefreshRun = now;

  if (!fs.existsSync(REFRESHER_JS)) return;

  log('🔄 Rodando refresh preventivo...');
  try {
    execSync(`node "${REFRESHER_JS}"`, { stdio: 'ignore', timeout: 120000 });
    log('🔄 Refresh preventivo concluído.');
  } catch (e) {
    log(`🔄 Refresh preventivo falhou: ${e.message}`);
  }
}

// ─── Sync credenciais da sessão ativa para account-N.json ─────────────────────
function syncActiveCreds() {
  const current = readCurrent();
  const creds = readCreds();
  if (!creds || !creds.claudeAiOauth) return;

  const file = path.join(ACCOUNTS_DIR, `account-${current}.json`);
  if (!fs.existsSync(file)) return;

  try {
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    // Se a sessão ativa tem token mais novo, salvar
    if (creds.claudeAiOauth.expiresAt > (saved.claudeAiOauth?.expiresAt || 0)) {
      fs.writeFileSync(file, JSON.stringify(creds));
    }
  } catch {}
}

// ─── Loop principal ───────────────────────────────────────────────────────────
async function check() {
  const creds = readCreds();
  if (!creds || !creds.claudeAiOauth) return;

  const { accessToken } = creds.claudeAiOauth;
  const current = readCurrent();

  // Sync credenciais atualizadas pelo CLI para o account file
  syncActiveCreds();

  // Refresh preventivo a cada 6h
  preventiveRefresh();

  const result = await checkRateLimit(accessToken);

  if (result.error || result.timeout) {
    return;
  }

  if (result.limited) {
    log(`⚡ Conta ${current} atingiu o limite (HTTP ${result.status}). Rotacionando...`);

    try {
      execSync(`node "${ROTATE_JS}"`, { stdio: 'inherit' });
      const newAccount = readCurrent();
      const msg = `Claude Code: conta ${current} atingiu o limite. Trocado para conta ${newAccount}.`;
      log(`✅ Rotacionado para conta ${newAccount}.`);
      sendTelegram(msg);
    } catch (e) {
      log(`❌ Falha ao rotacionar: ${e.message}`);
    }
  } else {
    log(`✓ Conta ${current} ativa (HTTP ${result.status})`);
  }
}

// ─── Start ────────────────────────────────────────────────────────────────────
log(`🚀 Monitor iniciado. Verificando a cada ${interval / 1000}s`);
log(`📁 Contas configuradas: ${['1','2','3'].filter(n =>
  fs.existsSync(path.join(ACCOUNTS_DIR, `account-${n}.json`))).join(', ')}`);
log(`🔄 Refresh preventivo a cada ${REFRESH_EVERY / (60*60*1000)}h`);

check(); // verificação imediata
setInterval(check, interval);

// Manter processo vivo
process.on('SIGINT', () => { log('Monitor encerrado.'); process.exit(0); });
