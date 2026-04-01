#!/usr/bin/env node
// ~/.claude/accounts/token-refresher.js
// Refresh preventivo de tokens — roda periodicamente para manter tokens vivos
//
// Como funciona:
//   Para cada account-N.json, copia as credenciais para um HOME isolado,
//   roda `claude auth status` (que força auto-refresh se token expirou),
//   e salva as credenciais atualizadas de volta.
//
// Uso:
//   node token-refresher.js              — refresh todas as contas (1-3)
//   node token-refresher.js 2            — refresh apenas conta 2
//   node token-refresher.js --daemon     — rodar em loop (a cada 6h)
//   node token-refresher.js --check      — apenas verificar, sem refresh
//
// Agendar no cron/scheduler: a cada 6 horas é ideal (tokens expiram em ~8h)

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const CLAUDE_DIR = path.join(process.env.HOME || process.env.USERPROFILE, '.claude');
const ACCOUNTS_DIR = path.join(CLAUDE_DIR, 'accounts');
const CRED_FILE = path.join(CLAUDE_DIR, '.credentials.json');
const TEMP_BASE = path.join(CLAUDE_DIR, 'temp', 'token-refresh');
const LOG_FILE = path.join(ACCOUNTS_DIR, 'refresher.log');

const REFRESH_INTERVAL = 6 * 60 * 60 * 1000; // 6 horas
const TOKEN_WARNING_HOURS = 2; // alertar se expira em menos de 2h

function log(msg) {
  const ts = new Date().toLocaleString('pt-BR');
  const line = `[${ts}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch {}
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function accountFile(n) {
  return path.join(ACCOUNTS_DIR, `account-${n}.json`);
}

function readAccountCreds(n) {
  const file = accountFile(n);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch { return null; }
}

function tokenStatus(creds) {
  if (!creds || !creds.claudeAiOauth) return { valid: false, reason: 'no-creds' };
  const oauth = creds.claudeAiOauth;
  const now = Date.now();
  const expiresAt = oauth.expiresAt || 0;
  const hoursLeft = (expiresAt - now) / (1000 * 60 * 60);

  return {
    valid: expiresAt > now,
    expired: expiresAt <= now,
    hoursLeft: Math.round(hoursLeft * 10) / 10,
    warning: hoursLeft > 0 && hoursLeft < TOKEN_WARNING_HOURS,
    expiresAt: new Date(expiresAt).toLocaleString('pt-BR'),
    type: oauth.subscriptionType || '?',
    tier: oauth.rateLimitTier || '?',
  };
}

function refreshAccount(n) {
  const creds = readAccountCreds(n);
  if (!creds) {
    log(`  Conta ${n}: não configurada — pulando`);
    return { account: n, success: false, reason: 'not-configured' };
  }

  const status = tokenStatus(creds);
  log(`  Conta ${n}: ${status.type} | ${status.valid ? 'válido' : 'EXPIRADO'} | expira ${status.expiresAt} (${status.hoursLeft}h restantes)`);

  // Se ainda tem mais de 2h, não precisa refresh
  if (status.valid && !status.warning) {
    log(`  Conta ${n}: token saudável (${status.hoursLeft}h) — skip`);
    return { account: n, success: true, reason: 'healthy', status };
  }

  // Precisa refresh — usar HOME isolado
  log(`  Conta ${n}: ${status.expired ? 'EXPIRADO' : 'expirando em breve'} — tentando refresh...`);

  const tempHome = path.join(TEMP_BASE, `account-${n}`);
  const tempClaudeDir = path.join(tempHome, '.claude');

  try {
    // Limpar e preparar temp
    try { fs.rmSync(tempHome, { recursive: true, force: true }); } catch {}
    ensureDir(tempClaudeDir);

    // Copiar credenciais para temp
    fs.writeFileSync(path.join(tempClaudeDir, '.credentials.json'), JSON.stringify(creds));

    // Rodar claude auth status — isso força auto-refresh do token
    const env = { ...process.env, HOME: tempHome, USERPROFILE: tempHome };
    const result = spawnSync('claude', ['auth', 'status', '--json'], {
      env,
      shell: true,
      timeout: 30000,
      encoding: 'utf8',
    });

    const output = (result.stdout || '') + (result.stderr || '');

    // Buscar credencial atualizada (pode estar em path aninhado no Windows)
    const possiblePaths = [
      path.join(tempClaudeDir, '.credentials.json'),
      path.join(tempClaudeDir, 'temp', 'token-refresh', `account-${n}`, '.claude', '.credentials.json'),
    ];

    let newCredPath = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        const newCreds = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (newCreds.claudeAiOauth && newCreds.claudeAiOauth.expiresAt > (creds.claudeAiOauth.expiresAt || 0)) {
          newCredPath = p;
          break;
        }
      }
    }

    if (newCredPath) {
      // Token foi refreshed — salvar de volta
      fs.copyFileSync(newCredPath, accountFile(n));
      const newCreds = JSON.parse(fs.readFileSync(newCredPath, 'utf8'));
      const newStatus = tokenStatus(newCreds);
      log(`  Conta ${n}: ✅ REFRESHED! Nova expiração: ${newStatus.expiresAt} (${newStatus.hoursLeft}h)`);

      try { fs.rmSync(tempHome, { recursive: true, force: true }); } catch {}
      return { account: n, success: true, reason: 'refreshed', status: newStatus };
    }

    // Token não foi refreshed — verificar se auth status reportou loggedIn
    let authStatus;
    try { authStatus = JSON.parse(output); } catch {}

    if (authStatus && authStatus.loggedIn) {
      // Está logado mas token não mudou — copiar de volta mesmo assim
      const existingCred = possiblePaths.find(p => fs.existsSync(p));
      if (existingCred) {
        fs.copyFileSync(existingCred, accountFile(n));
        log(`  Conta ${n}: ✅ token confirmado válido pelo CLI`);
        try { fs.rmSync(tempHome, { recursive: true, force: true }); } catch {}
        return { account: n, success: true, reason: 'confirmed' };
      }
    }

    log(`  Conta ${n}: ❌ refresh falhou — token pode estar morto (necessário re-auth)`);
    log(`  Output: ${output.substring(0, 200)}`);
    try { fs.rmSync(tempHome, { recursive: true, force: true }); } catch {}
    return { account: n, success: false, reason: 'refresh-failed' };

  } catch (err) {
    log(`  Conta ${n}: ❌ erro: ${err.message}`);
    try { fs.rmSync(tempHome, { recursive: true, force: true }); } catch {}
    return { account: n, success: false, reason: 'error', error: err.message };
  }
}

function refreshAll(target) {
  const accounts = target ? [target] : ['1', '2', '3'];

  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('Token Refresher — início');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  ensureDir(TEMP_BASE);

  const results = [];
  for (const n of accounts) {
    results.push(refreshAccount(n));
  }

  // Resumo
  log('');
  log('RESUMO:');
  const failed = [];
  for (const r of results) {
    const icon = r.success ? '✅' : '❌';
    log(`  ${icon} Conta ${r.account}: ${r.reason}`);
    if (!r.success && r.reason !== 'not-configured') failed.push(r.account);
  }

  if (failed.length > 0) {
    log(`\n⚠️  Contas que precisam re-autenticação manual: ${failed.join(', ')}`);
    log(`  Comando: node "${path.join(ACCOUNTS_DIR, 'auth-isolated.js')}" ${failed[0]}`);

    // Notificar via Telegram
    try {
      const toolsCli = path.join(CLAUDE_DIR, 'task-scheduler', 'tools-cli.js');
      if (fs.existsSync(toolsCli)) {
        execSync(`node "${toolsCli}" send_telegram text="⚠️ Claude Code: contas ${failed.join(',')} precisam re-auth manual"`,
          { stdio: 'ignore', timeout: 10000 });
      }
    } catch {}
  }

  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Limpar temp base
  try { fs.rmSync(TEMP_BASE, { recursive: true, force: true }); } catch {}

  return results;
}

function checkOnly() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   Token Health Check                         ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  for (const n of ['1', '2', '3']) {
    const creds = readAccountCreds(n);
    if (!creds) {
      console.log(`  Conta ${n}: ❌ não configurada`);
      continue;
    }
    const s = tokenStatus(creds);
    const icon = s.expired ? '💀' : s.warning ? '⚠️' : '✅';
    console.log(`  Conta ${n}: ${icon} ${s.type} | ${s.valid ? 'válido' : 'EXPIRADO'} | ${s.hoursLeft}h restantes | expira ${s.expiresAt}`);
  }

  // Sessão ativa
  try {
    const activeCreds = JSON.parse(fs.readFileSync(CRED_FILE, 'utf8'));
    const s = tokenStatus(activeCreds);
    console.log(`\n  Sessão ativa: ${s.valid ? '✅' : '❌'} ${s.type} | ${s.hoursLeft}h restantes | expira ${s.expiresAt}`);
  } catch {
    console.log('\n  Sessão ativa: ❌ sem credenciais');
  }
  console.log('');
}

// ─── CLI ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);

if (args.includes('--check')) {
  checkOnly();
} else if (args.includes('--daemon')) {
  log('🔄 Daemon iniciado — refresh a cada 6h');
  refreshAll();
  setInterval(() => refreshAll(), REFRESH_INTERVAL);
  process.on('SIGINT', () => { log('Daemon encerrado.'); process.exit(0); });
} else {
  const target = args.find(a => !a.startsWith('-'));
  refreshAll(target);
}
