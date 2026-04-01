#!/usr/bin/env node
// ~/.claude/accounts/auth-isolated.js
// Autentica contas usando HOME override — NUNCA toca no .credentials.json real
// v2 — Fix: usa PowerShell para abrir Chrome (evita IE), suporta --account N

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const CLAUDE_DIR = path.join(process.env.HOME || process.env.USERPROFILE, '.claude');
const ACCOUNTS_DIR = path.join(CLAUDE_DIR, 'accounts');
const TEMP_BASE = path.join(CLAUDE_DIR, 'temp', 'auth-isolated');

// Perfis do Chrome mapeados por conta
const ACCOUNTS = [
  { num: '1', email: 'gaujalab@gmail.com', profile: 'Profile 18' },
  { num: '2', email: 'tondinrafael@gmail.com', profile: 'Default' },
  { num: '3', email: 'your-email@example.com', profile: 'Profile 16' },
  { num: '4', email: 'nortmarketingdigital@gmail.com', profile: 'Profile 26' },
];

const CHROME_PATH = process.platform === 'darwin'
  ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  : process.platform === 'win32'
    ? 'C:\Program Files\Google\Chrome\Application\chrome.exe'
    : '/usr/bin/google-chrome';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function cleanTempDir(tempHome) {
  try { fs.rmSync(tempHome, { recursive: true, force: true }); } catch {}
}

function openChromeProfile(profile, url) {
  // Usar PowerShell Start-Process para evitar IE
  try {
    const args = `--profile-directory="${profile}"`;
    if (process.platform === 'darwin') {
      execSync(`open -a "Google Chrome" --args ${args} "${url}"`, { stdio: 'ignore', timeout: 10000 });
    } else if (process.platform === 'win32') {
      execSync(`powershell.exe -Command "Start-Process '${CHROME_PATH}' -ArgumentList '${args}','${url}'"`, { stdio: 'ignore', timeout: 10000 });
    } else {
      execSync(`"${CHROME_PATH}" ${args} "${url}"`, { stdio: 'ignore', timeout: 10000 });
    }
    return true;
  } catch (err) {
    console.log(`  Erro ao abrir Chrome: ${err.message}`);
    return false;
  }
}

async function authAccount(account) {
  const tempHome = path.join(TEMP_BASE, `account-${account.num}`);
  const tempClaudeDir = path.join(tempHome, '.claude');

  // Limpar e criar temp dir
  cleanTempDir(tempHome);
  ensureDir(tempClaudeDir);

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  CONTA ${account.num}: ${account.email}`);
  console.log(`  Chrome Profile: ${account.profile}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  return new Promise((resolve) => {
    const env = { ...process.env, HOME: tempHome, USERPROFILE: tempHome };
    const child = spawn('claude', ['auth', 'login', '--email', account.email], {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });

    let output = '';
    let url = null;
    let resolved = false;

    const handleOutput = (data) => {
      const text = data.toString();
      output += text;

      // Capturar URL OAuth (suporta claude.ai e claude.com)
      const urlMatch = text.match(/(https:\/\/claude\.(?:ai|com)\/(?:oauth\/authorize|cai\/oauth\/authorize)[^\s]+)/);
      if (urlMatch && !url) {
        url = urlMatch[1];
        console.log(`\n  URL capturada!`);

        if (openChromeProfile(account.profile, url)) {
          console.log(`  Chrome aberto (${account.profile}). Aguardando autenticação...`);
          console.log(`  (Autorize no browser e espere voltar aqui)\n`);
        } else {
          console.log(`  Abra manualmente no Chrome (${account.profile}):`);
          console.log(`  ${url}\n`);
        }
      }
    };

    child.stdout.on('data', handleOutput);
    child.stderr.on('data', handleOutput);

    // Timeout de 180s (3 min)
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        child.kill();
        console.log(`  Timeout (180s) — autenticação não completada.`);
        if (url) {
          console.log(`  URL que foi gerada: ${url}`);
        }
        resolve({ success: false, account });
      }
    }, 180000);

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (resolved) return;
      resolved = true;

      // Credencial pode estar em path aninhado (Windows HOME quirk)
      const possiblePaths = [
        path.join(tempClaudeDir, '.credentials.json'),
        path.join(tempClaudeDir, 'temp', 'auth-isolated', `account-${account.num}`, '.claude', '.credentials.json'),
      ];

      let tempCred = null;
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) { tempCred = p; break; }
      }

      if (tempCred) {
        const destFile = path.join(ACCOUNTS_DIR, `account-${account.num}.json`);
        fs.copyFileSync(tempCred, destFile);
        console.log(`  ✅ Credencial salva em account-${account.num}.json`);

        try {
          const creds = JSON.parse(fs.readFileSync(tempCred, 'utf8'));
          const oauth = creds.claudeAiOauth || {};
          console.log(`  Tipo: ${oauth.subscriptionType || '?'} | Tier: ${oauth.rateLimitTier || '?'}`);
          console.log(`  Expira: ${oauth.expiresAt ? new Date(oauth.expiresAt).toLocaleString('pt-BR') : '?'}`);
        } catch {}

        cleanTempDir(tempHome);
        resolve({ success: true, account });
      } else {
        console.log(`  ❌ Credencial não encontrada (exit code: ${code})`);
        console.log(`  Output: ${output.substring(0, 300)}`);
        cleanTempDir(tempHome);
        resolve({ success: false, account });
      }
    });
  });
}

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  Autenticação Isolada — SEM tocar na sessão ativa   ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');
  console.log('  Cada conta será autenticada usando HOME override.');
  console.log('  Sua sessão atual NÃO será afetada.');

  ensureDir(TEMP_BASE);

  const target = process.argv[2];
  const accounts = target
    ? ACCOUNTS.filter(a => a.num === target)
    : ACCOUNTS.filter(a => ['1','2','3'].includes(a.num)); // Só 1-3 por padrão

  if (accounts.length === 0) {
    console.log(`  Conta ${target} não encontrada.`);
    process.exit(1);
  }

  const results = [];
  for (const account of accounts) {
    const result = await authAccount(account);
    results.push(result);
  }

  // Resumo
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  RESUMO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  results.forEach(r => {
    const icon = r.success ? '✅' : '❌';
    console.log(`  ${icon} Conta ${r.account.num}: ${r.account.email}`);
  });

  console.log('\n  Sessão atual: INTACTA');

  // Limpar temp base
  try { fs.rmSync(TEMP_BASE, { recursive: true, force: true }); } catch {}
}

main().catch(err => {
  console.error('Erro:', err.message);
  process.exit(1);
});
