#!/usr/bin/env node
/**
 * Chrome DevTools MCP Launcher — Multi-Instance Support
 *
 * Problema: O chrome-devtools-mcp usa um userDataDir fixo por padrao.
 * Quando duas sessoes do Claude Code rodam simultaneamente, a segunda
 * falha porque Chrome impoe lock exclusivo no profile directory.
 *
 * Solucao: Este wrapper gera um userDataDir unico por instancia MCP,
 * permitindo que multiplas sessoes coexistam sem conflitos.
 *
 * Uso no mcp.json:
 *   "chrome-devtools": {
 *     "command": "node",
 *     "args": ["~/.claude/src/integrations/chrome/chrome-mcp-launcher.js"]
 *   }
 *
 * Variaveis de ambiente opcionais:
 *   CHROME_MCP_PORT=9334        → Conectar a Chrome pre-lancado nesta porta
 *   CHROME_MCP_INSTANCE=2       → Usar slot fixo (1-5) para persistencia
 *   CHROME_MCP_ISOLATED=true    → Perfil temporario (sem persistencia)
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// ─── CONFIG ─────────────────────────────────────────────────────────────────

const HOME = os.homedir();
const PROFILES_BASE = path.join(HOME, '.claude', 'chrome-mcp-profiles');
const LOCK_DIR = path.join(HOME, '.claude', 'chrome-mcp-locks');
const MAX_SLOTS = 5;

// ─── HELPERS ────────────────────────────────────────────────────────────────

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function acquireLock(slot) {
  ensureDir(LOCK_DIR);
  const lockFile = path.join(LOCK_DIR, `slot-${slot}.lock`);

  try {
    // Check if lock exists and if the process is still alive
    if (fs.existsSync(lockFile)) {
      const lockData = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
      try {
        // Check if process is still running (signal 0 doesn't kill, just checks)
        process.kill(lockData.pid, 0);
        return false; // Process alive, slot taken
      } catch {
        // Process dead, stale lock — remove it
        fs.unlinkSync(lockFile);
      }
    }

    // Write lock with our PID
    fs.writeFileSync(lockFile, JSON.stringify({
      pid: process.pid,
      startedAt: new Date().toISOString(),
      slot
    }));
    return true;
  } catch {
    return false;
  }
}

function releaseLock(slot) {
  const lockFile = path.join(LOCK_DIR, `slot-${slot}.lock`);
  try { fs.unlinkSync(lockFile); } catch {}
}

function findFreeSlot() {
  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (acquireLock(i)) return i;
  }
  return null;
}

function getActiveLocks() {
  ensureDir(LOCK_DIR);
  const locks = [];
  for (let i = 1; i <= MAX_SLOTS; i++) {
    const lockFile = path.join(LOCK_DIR, `slot-${i}.lock`);
    if (fs.existsSync(lockFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
        try {
          process.kill(data.pid, 0);
          locks.push({ slot: i, ...data, alive: true });
        } catch {
          // Stale lock
          fs.unlinkSync(lockFile);
        }
      } catch {}
    }
  }
  return locks;
}

// ─── MAIN ───────────────────────────────────────────────────────────────────

function main() {
  const envPort = process.env.CHROME_MCP_PORT;
  const envInstance = process.env.CHROME_MCP_INSTANCE;
  const envIsolated = process.env.CHROME_MCP_ISOLATED === 'true';

  // Build args for chrome-devtools-mcp
  const args = ['chrome-devtools-mcp@latest'];

  // Mode 1: Connect to pre-launched Chrome on specific port
  if (envPort) {
    args.push('--browserUrl', `http://127.0.0.1:${envPort}`);
    process.stderr.write(`[chrome-mcp-launcher] Connecting to existing Chrome on port ${envPort}\n`);
    launchMcp(args, null);
    return;
  }

  // Mode 2: Isolated (temporary) profile — no persistence
  if (envIsolated) {
    args.push('--isolated');
    process.stderr.write(`[chrome-mcp-launcher] Using isolated (temporary) profile\n`);
    launchMcp(args, null);
    return;
  }

  // Mode 3: Fixed slot (user-specified)
  if (envInstance) {
    const slot = parseInt(envInstance);
    if (slot < 1 || slot > MAX_SLOTS) {
      process.stderr.write(`[chrome-mcp-launcher] ERROR: CHROME_MCP_INSTANCE must be 1-${MAX_SLOTS}\n`);
      process.exit(1);
    }
    if (!acquireLock(slot)) {
      process.stderr.write(`[chrome-mcp-launcher] ERROR: Slot ${slot} is already in use by another session\n`);
      process.stderr.write(`[chrome-mcp-launcher] Active slots: ${JSON.stringify(getActiveLocks())}\n`);
      process.exit(1);
    }
    const userDataDir = path.join(PROFILES_BASE, `slot-${slot}`);
    ensureDir(userDataDir);
    args.push('--userDataDir', userDataDir);
    process.stderr.write(`[chrome-mcp-launcher] Using fixed slot ${slot} → ${userDataDir}\n`);
    launchMcp(args, slot);
    return;
  }

  // Mode 4: Auto-allocate a free slot (DEFAULT)
  const slot = findFreeSlot();
  if (!slot) {
    process.stderr.write(`[chrome-mcp-launcher] ERROR: All ${MAX_SLOTS} slots are in use!\n`);
    process.stderr.write(`[chrome-mcp-launcher] Active: ${JSON.stringify(getActiveLocks())}\n`);
    process.stderr.write(`[chrome-mcp-launcher] Falling back to isolated mode...\n`);
    args.push('--isolated');
    launchMcp(args, null);
    return;
  }

  const userDataDir = path.join(PROFILES_BASE, `slot-${slot}`);
  ensureDir(userDataDir);
  args.push('--userDataDir', userDataDir);
  process.stderr.write(`[chrome-mcp-launcher] Auto-allocated slot ${slot} → ${userDataDir}\n`);
  launchMcp(args, slot);
}

function launchMcp(args, slot) {
  // Pass through any extra CLI args
  const extraArgs = process.argv.slice(2);
  args.push(...extraArgs);

  const child = spawn('npx', args, {
    stdio: ['inherit', 'inherit', 'inherit'],
    shell: true,
    windowsHide: true,
  });

  // Cleanup on exit
  const cleanup = () => {
    if (slot) releaseLock(slot);
  };

  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(0); });
  process.on('SIGTERM', () => { cleanup(); process.exit(0); });

  child.on('exit', (code) => {
    cleanup();
    process.exit(code || 0);
  });

  child.on('error', (err) => {
    process.stderr.write(`[chrome-mcp-launcher] Failed to start MCP: ${err.message}\n`);
    cleanup();
    process.exit(1);
  });
}

main();
