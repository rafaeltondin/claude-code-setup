#!/usr/bin/env node
/**
 * Chrome Debug Manager — Gerenciamento de perfis e multi-instancia
 *
 * Uso:
 *   node chrome-manager.js profiles          → Lista perfis disponiveis
 *   node chrome-manager.js status            → Mostra portas debug ativas
 *   node chrome-manager.js open [URL]        → Abre Chrome (pergunta perfil e porta)
 *   node chrome-manager.js open --profile "Default" --port 9333 [URL]
 *   node chrome-manager.js open --profile "Profile 5" --port 9444 [URL]
 *   node chrome-manager.js close [PORT]      → Fecha instancia debug na porta
 *   node chrome-manager.js navigate PORT URL → Navega aba existente para URL
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync, spawn } = require('child_process');

// ─── CONFIGURACAO ────────────────────────────────────────────────────────────

const os = require('os');

function getChromePath() {
  switch (process.platform) {
    case 'darwin': return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    case 'win32':  return 'C:/Program Files/Google/Chrome/Application/chrome.exe';
    default:       return '/usr/bin/google-chrome';
  }
}

function getUserDataDir() {
  switch (process.platform) {
    case 'darwin': return path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome');
    case 'win32':  return path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'User Data');
    default:       return path.join(os.homedir(), '.config', 'google-chrome');
  }
}

const CHROME_PATH = getChromePath();
const USER_DATA_DIR = getUserDataDir();
const DEBUG_PROFILES_DIR = path.join(os.homedir(), '.claude', 'chrome-debug-profiles');
const PORT_RANGE = { min: 9333, max: 9399 };
const LOCAL_STATE_PATH = path.join(USER_DATA_DIR, 'Local State');

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, { timeout: 2000 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(null));
  });
}

function getProfiles() {
  try {
    const localState = JSON.parse(fs.readFileSync(LOCAL_STATE_PATH, 'utf8'));
    const cache = localState.profile?.info_cache || {};
    return Object.entries(cache).map(([dir, info]) => ({
      dir,
      name: info.name || dir,
      email: info.user_name || '',
      gaia: info.gaia_name || '',
    })).sort((a, b) => a.name.localeCompare(b.name));
  } catch (e) {
    console.error('[ERRO] Nao foi possivel ler perfis:', e.message);
    return [];
  }
}

async function getActiveDebugPorts() {
  const active = [];
  for (let port = PORT_RANGE.min; port <= PORT_RANGE.max; port++) {
    const data = await httpGet(`http://localhost:${port}/json/version`);
    if (data) {
      try {
        const info = JSON.parse(data);
        active.push({ port, browser: info.Browser || '?', wsUrl: info.webSocketDebuggerUrl });
      } catch {
        active.push({ port, browser: '?', wsUrl: null });
      }
    }
  }
  return active;
}

function findFreePort(activePorts) {
  const usedPorts = new Set(activePorts.map(p => p.port));
  for (let port = PORT_RANGE.min; port <= PORT_RANGE.max; port++) {
    if (!usedPorts.has(port)) return port;
  }
  return null;
}

function getDebugProfileDir(profileName) {
  // Cada perfil do Chrome real tem seu proprio diretorio de debug isolado
  const safeName = profileName.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
  const dir = path.join(DEBUG_PROFILES_DIR, safeName);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function openChrome(profileDir, port, url) {
  const debugDataDir = getDebugProfileDir(path.basename(profileDir));

  // Copiar cookies e login state do perfil real para o debug (se ainda nao existir)
  const debugCookies = path.join(debugDataDir, 'Default', 'Cookies');
  const realCookies = path.join(USER_DATA_DIR, profileDir, 'Cookies');

  if (!fs.existsSync(debugCookies) && fs.existsSync(realCookies)) {
    const defaultDir = path.join(debugDataDir, 'Default');
    if (!fs.existsSync(defaultDir)) fs.mkdirSync(defaultDir, { recursive: true });
    // Nota: cookies sao criptografados com DPAPI, nao funcionam entre perfis.
    // O usuario precisara logar uma vez no perfil debug.
  }

  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${debugDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
  ];
  if (url) args.push(url);

  const child = spawn(CHROME_PATH, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: false,
  });
  child.unref();

  return { port, debugDataDir, pid: child.pid };
}

async function closeDebugInstance(port) {
  const data = await httpGet(`http://localhost:${port}/json/version`);
  if (!data) {
    console.log(`[AVISO] Nenhuma instancia na porta ${port}`);
    return false;
  }

  try {
    const info = JSON.parse(data);
    const wsUrl = info.webSocketDebuggerUrl;
    if (wsUrl) {
      // Envia Browser.close via CDP
      const WebSocket = require('ws');
      const ws = new WebSocket(wsUrl);
      await new Promise((resolve) => {
        ws.on('open', () => {
          ws.send(JSON.stringify({ id: 1, method: 'Browser.close' }));
          setTimeout(resolve, 1000);
        });
        ws.on('error', resolve);
      });
      console.log(`[OK] Instancia na porta ${port} fechada via CDP`);
      return true;
    }
  } catch (e) {
    console.log(`[ERRO] Falha ao fechar: ${e.message}`);
  }
  return false;
}

async function navigateTo(port, url) {
  const tabsData = await httpGet(`http://localhost:${port}/json`);
  if (!tabsData) {
    console.log(`[ERRO] Nenhuma instancia na porta ${port}`);
    return false;
  }
  const tabs = JSON.parse(tabsData);
  const page = tabs.find(t => t.type === 'page');
  if (!page) {
    // Criar nova aba
    await httpGet(`http://localhost:${port}/json/new?${encodeURIComponent(url)}`);
    console.log(`[OK] Nova aba aberta: ${url}`);
    return true;
  }
  // Navegar na aba existente
  await httpGet(`http://localhost:${port}/json/activate/${page.id}`);

  const WebSocket = require('ws');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve) => {
    ws.on('open', () => {
      ws.send(JSON.stringify({ id: 1, method: 'Page.navigate', params: { url } }));
      setTimeout(resolve, 500);
    });
    ws.on('error', resolve);
  });
  ws.close();
  console.log(`[OK] Navegou para: ${url}`);
  return true;
}

// ─── JUNCTION (PERFIL REAL) ──────────────────────────────────────────────────

const JUNCTION_PATH = path.join(DEBUG_PROFILES_DIR, 'chrome-real-link');

function ensureJunction() {
  // Verificar se junction ja existe e aponta para o lugar certo
  try {
    const stat = fs.lstatSync(JUNCTION_PATH);
    if (stat.isSymbolicLink() || stat.isDirectory()) {
      // Junction existe, verificar se resolve para o user data dir
      const resolved = fs.realpathSync(JUNCTION_PATH);
      if (resolved.replace(/\\/g, '/').toLowerCase() === USER_DATA_DIR.replace(/\\/g, '/').toLowerCase()) {
        return JUNCTION_PATH;
      }
    }
  } catch (e) {
    // Junction nao existe, criar
  }

  // Criar symlink (ln -s no macOS/Linux, junction via PowerShell no Windows)
  try {
    if (process.platform === 'win32') {
      execSync(
        `powershell -Command "Remove-Item '${JUNCTION_PATH}' -Force -ErrorAction SilentlyContinue; New-Item -ItemType Junction -Path '${JUNCTION_PATH}' -Target '${USER_DATA_DIR}' -Force | Out-Null"`,
        { stdio: 'pipe' }
      );
    } else {
      execSync(`rm -f "${JUNCTION_PATH}" && ln -s "${USER_DATA_DIR}" "${JUNCTION_PATH}"`, { stdio: 'pipe' });
    }
    console.log(`[OK] Link criado: ${JUNCTION_PATH} -> ${USER_DATA_DIR}`);
    return JUNCTION_PATH;
  } catch (e) {
    console.log(`[ERRO] Falha ao criar link: ${e.message}`);
    return null;
  }
}

function isChromeRunning() {
  try {
    let result;
    if (process.platform === 'win32') {
      result = execSync(
        'powershell -Command "(Get-Process chrome -ErrorAction SilentlyContinue | Measure-Object).Count"',
        { encoding: 'utf8', stdio: 'pipe' }
      ).trim();
      return parseInt(result) > 0;
    } else {
      // macOS/Linux: pgrep -c returns count, exit code 1 if none found
      try {
        result = execSync('pgrep -c -i "Google Chrome|chrome"', { encoding: 'utf8', stdio: 'pipe' }).trim();
        return parseInt(result) > 0;
      } catch {
        return false; // pgrep exits 1 when no processes found
      }
    }
  } catch {
    return false;
  }
}

function killChrome() {
  try {
    if (process.platform === 'win32') {
      execSync(
        'powershell -Command "Get-Process chrome -ErrorAction SilentlyContinue | ForEach-Object { $_.CloseMainWindow() | Out-Null }; Start-Sleep -Seconds 3; Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue"',
        { stdio: 'pipe', timeout: 15000 }
      );
      execSync('powershell -Command "Start-Sleep -Seconds 2"', { stdio: 'pipe' });
    } else {
      // macOS/Linux: graceful quit first, then force kill
      try { execSync('pkill -SIGTERM -i "Google Chrome"', { stdio: 'pipe' }); } catch {}
      // Wait up to 3s for graceful exit
      execSync('sleep 3', { stdio: 'pipe' });
      try { execSync('pkill -SIGKILL -i "Google Chrome"', { stdio: 'pipe' }); } catch {}
    }
    return true;
  } catch (e) {
    console.log(`[AVISO] Falha ao fechar Chrome: ${e.message}`);
    return false;
  }
}

function openChromeReal(profileDir, port, url) {
  const junctionPath = ensureJunction();
  if (!junctionPath) return null;

  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${junctionPath}`,
    `--profile-directory=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
  ];
  if (url) args.push(url);

  const child = spawn(CHROME_PATH, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: false,
  });
  child.unref();

  return { port, junctionPath, profileDir, pid: child.pid };
}

// ─── COMANDOS ────────────────────────────────────────────────────────────────

async function cmdProfiles() {
  const profiles = getProfiles();
  console.log('\n=== PERFIS DO CHROME ===\n');
  console.log(' #  | Diretorio    | Nome                           | Email');
  console.log('----|--------------|--------------------------------|----------------------------------');
  profiles.forEach((p, i) => {
    const num = String(i + 1).padStart(2);
    const dir = p.dir.padEnd(12);
    const name = p.name.padEnd(30);
    console.log(` ${num} | ${dir} | ${name} | ${p.email}`);
  });
  console.log(`\nTotal: ${profiles.length} perfis\n`);
  return profiles;
}

async function cmdStatus() {
  console.log('\n=== PORTAS DEBUG ATIVAS ===\n');
  const active = await getActiveDebugPorts();
  if (active.length === 0) {
    console.log('Nenhuma instancia debug ativa (range 9333-9399)\n');
    return active;
  }
  active.forEach(p => {
    console.log(` Porta ${p.port}: ${p.browser}`);
  });
  console.log(`\nTotal: ${active.length} instancia(s) ativa(s)\n`);
  return active;
}

async function cmdOpen(args) {
  let profileDir = null;
  let port = null;
  let url = null;

  // Parse args
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--profile' && args[i + 1]) {
      profileDir = args[++i];
    } else if (args[i] === '--port' && args[i + 1]) {
      port = parseInt(args[++i]);
    } else if (!url && !args[i].startsWith('--')) {
      url = args[i];
    }
  }

  const profiles = getProfiles();
  const active = await getActiveDebugPorts();

  // Se nao especificou perfil, listar para escolha
  if (!profileDir) {
    console.log('\n=== PERFIS DISPONIVEIS ===\n');
    console.log(' 0  | (Debug limpo) — perfil sem cookies/login');
    profiles.forEach((p, i) => {
      const num = String(i + 1).padStart(2);
      console.log(` ${num} | ${p.name}${p.email ? ' — ' + p.email : ''}`);
    });
    console.log('\nUse: node chrome-manager.js open --profile "NOME_OU_DIR" [URL]');
    console.log('Exemplo: node chrome-manager.js open --profile "Profile 5" http://localhost:3847\n');
    return;
  }

  // Resolver perfil por nome ou diretorio
  const profile = profiles.find(p =>
    p.dir === profileDir ||
    p.name.toLowerCase() === profileDir.toLowerCase() ||
    p.dir.toLowerCase() === profileDir.toLowerCase()
  );

  const resolvedDir = profile ? profile.dir : profileDir;
  const displayName = profile ? profile.name : profileDir;

  // Se nao especificou porta, encontrar livre
  if (!port) {
    port = findFreePort(active);
    if (!port) {
      console.log('[ERRO] Todas as portas debug estao em uso (9333-9399)');
      return;
    }
  }

  // Verificar se porta ja esta em uso
  const portInUse = active.find(p => p.port === port);
  if (portInUse) {
    console.log(`[AVISO] Porta ${port} ja em uso. Reutilizando instancia existente.`);
    if (url) await navigateTo(port, url);
    return;
  }

  console.log(`\n[ABRINDO] Perfil: ${displayName} | Porta: ${port}${url ? ' | URL: ' + url : ''}`);
  const result = openChrome(resolvedDir, port, url);

  // Aguardar Chrome iniciar
  console.log('[AGUARDANDO] Chrome iniciando...');
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const check = await httpGet(`http://localhost:${port}/json/version`);
    if (check) {
      const info = JSON.parse(check);
      console.log(`[OK] Chrome debug ativo!`);
      console.log(`  Porta: ${port}`);
      console.log(`  Browser: ${info.Browser}`);
      console.log(`  Perfil: ${displayName}`);
      console.log(`  Debug dir: ${result.debugDataDir}`);
      console.log(`  WS: ${info.webSocketDebuggerUrl}\n`);

      // Nota sobre primeiro uso
      console.log(`[INFO] Primeiro uso deste perfil debug? O usuario precisara logar`);
      console.log(`       nos sites desejados UMA VEZ. Depois a sessao persiste.\n`);
      return;
    }
  }
  console.log('[AVISO] Chrome nao respondeu em 10s. Verifique manualmente.');
}

async function cmdOpenReal(args) {
  let profileDir = null;
  let port = null;
  let url = null;
  let forceClose = false;

  // Parse args
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--profile' && args[i + 1]) {
      profileDir = args[++i];
    } else if (args[i] === '--port' && args[i + 1]) {
      port = parseInt(args[++i]);
    } else if (args[i] === '--force' || args[i] === '-f') {
      forceClose = true;
    } else if (!url && !args[i].startsWith('--')) {
      url = args[i];
    }
  }

  const profiles = getProfiles();

  // Se nao especificou perfil, listar para escolha
  if (!profileDir) {
    console.log('\n=== PERFIS DISPONIVEIS (open-real) ===\n');
    profiles.forEach((p, i) => {
      const num = String(i + 1).padStart(2);
      console.log(` ${num} | ${p.dir.padEnd(12)} | ${p.name}${p.email ? ' — ' + p.email : ''}`);
    });
    console.log('\nUse: node chrome-manager.js open-real --profile "Profile 18" [URL]');
    console.log('Adicione --force para fechar Chrome automaticamente.\n');
    return;
  }

  // Resolver perfil por nome ou diretorio
  const profile = profiles.find(p =>
    p.dir === profileDir ||
    p.name.toLowerCase() === profileDir.toLowerCase() ||
    p.dir.toLowerCase() === profileDir.toLowerCase()
  );

  const resolvedDir = profile ? profile.dir : profileDir;
  const displayName = profile ? `${profile.name}${profile.email ? ' (' + profile.email + ')' : ''}` : profileDir;

  // Verificar se Chrome esta rodando
  if (isChromeRunning()) {
    if (!forceClose) {
      console.log('[ERRO] Chrome esta rodando. O modo open-real exige que o Chrome esteja fechado.');
      console.log('       Use --force para fechar automaticamente, ou feche manualmente.');
      console.log('       ATENCAO: Fechar o Chrome ira encerrar todas as abas abertas!\n');
      return;
    }
    console.log('[FECHANDO] Chrome em execucao, encerrando...');
    killChrome();
    if (isChromeRunning()) {
      console.log('[ERRO] Nao foi possivel fechar o Chrome. Feche manualmente.');
      return;
    }
    console.log('[OK] Chrome fechado.');
  }

  // Encontrar porta livre
  const active = await getActiveDebugPorts();
  if (!port) {
    port = findFreePort(active);
    if (!port) {
      console.log('[ERRO] Todas as portas debug estao em uso (9333-9399)');
      return;
    }
  }

  console.log(`\n[ABRINDO REAL] Perfil: ${displayName} | Dir: ${resolvedDir} | Porta: ${port}`);
  const result = openChromeReal(resolvedDir, port, url);
  if (!result) return;

  // Aguardar Chrome iniciar
  console.log('[AGUARDANDO] Chrome iniciando com perfil real...');
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const check = await httpGet(`http://localhost:${port}/json/version`);
    if (check) {
      const info = JSON.parse(check);
      console.log(`[OK] Chrome debug ativo com perfil REAL!`);
      console.log(`  Porta: ${port}`);
      console.log(`  Browser: ${info.Browser}`);
      console.log(`  Perfil: ${displayName}`);
      console.log(`  Profile Dir: ${resolvedDir}`);
      console.log(`  Junction: ${result.junctionPath}`);
      console.log(`  WS: ${info.webSocketDebuggerUrl}\n`);
      console.log(`[INFO] Login e cookies do perfil original estao preservados!`);
      console.log(`       Para fechar: node chrome-manager.js close ${port}\n`);
      return;
    }
  }
  console.log('[AVISO] Chrome nao respondeu em 15s. Verifique manualmente.');
}

async function cmdClose(port) {
  if (!port) {
    const active = await getActiveDebugPorts();
    if (active.length === 0) {
      console.log('Nenhuma instancia para fechar.');
      return;
    }
    console.log('Instancias ativas:');
    active.forEach(p => console.log(`  Porta ${p.port}: ${p.browser}`));
    console.log('\nUse: node chrome-manager.js close PORTA');
    return;
  }
  await closeDebugInstance(parseInt(port));
}

async function cmdNavigate(port, url) {
  if (!port || !url) {
    console.log('Uso: node chrome-manager.js navigate PORTA URL');
    return;
  }
  await navigateTo(parseInt(port), url);
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  const [,, cmd, ...args] = process.argv;

  switch (cmd) {
    case 'profiles':
    case 'perfis':
      await cmdProfiles();
      break;
    case 'status':
      await cmdStatus();
      break;
    case 'open':
    case 'abrir':
      await cmdOpen(args);
      break;
    case 'open-real':
    case 'abrir-real':
      await cmdOpenReal(args);
      break;
    case 'close':
    case 'fechar':
      await cmdClose(args[0]);
      break;
    case 'navigate':
    case 'navegar':
      await cmdNavigate(args[0], args[1]);
      break;
    default:
      console.log(`
Chrome Debug Manager — Gerenciamento de perfis e multi-instancia

COMANDOS:
  profiles              Lista todos os perfis do Chrome
  status                Mostra portas debug ativas (9333-9399)
  open [URL]            Abre Chrome debug (perfil isolado, sem login)
  open --profile "X" --port 9333 [URL]  Abre com perfil isolado
  open-real --profile "X" [URL]         Abre com perfil REAL (login preservado!)
  open-real --profile "X" --force [URL] Fecha Chrome e abre com perfil real
  close [PORTA]         Fecha instancia debug
  navigate PORTA URL    Navega aba existente para nova URL

EXEMPLOS:
  node chrome-manager.js profiles
  node chrome-manager.js status
  node chrome-manager.js open --profile "Pinha" http://localhost:3847
  node chrome-manager.js open-real --profile "Gauja" --force https://google.com
  node chrome-manager.js open-real --profile "Profile 18" --port 9333 URL
  node chrome-manager.js close 9333
  node chrome-manager.js navigate 9333 http://localhost:3000

OPEN vs OPEN-REAL:
  open      → Cria perfil debug isolado. Login NAO persiste. Multi-instancia OK.
  open-real → Usa perfil real via junction. Login PRESERVADO. Chrome deve estar fechado.

MULTI-INSTANCIA:
  Cada janela do Claude Code deve usar uma porta DIFERENTE.
  O range e 9333-9399 (67 portas disponiveis).
  Use 'status' para ver quais portas ja estao em uso.
`);
  }
}

main().catch(e => console.error('[ERRO]', e.message));
