#!/usr/bin/env node
/**
 * Claude Code Hook - Telegram Notification on Task Completion
 *
 * Fires on:
 *   - PostToolUse (TaskCreate - salva mapeamento id->nome)
 *   - PostToolUse (TaskUpdate with status=completed - notifica)
 *   - Stop (when Claude finishes responding - sends summary)
 *
 * Reads Telegram config from task-scheduler/data/config.json
 * Sends notifications directly via Telegram Bot API (no dependency on bot running)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'task-scheduler', 'data', 'config.json');
const TASK_MAP_PATH = path.join(__dirname, '..', 'temp', 'task-name-map.json');

// ============ TASK NAME MAP ============
// Mapeamento persistente taskId -> { name, description } entre invocacoes do hook

function loadTaskMap() {
  try {
    if (fs.existsSync(TASK_MAP_PATH)) {
      return JSON.parse(fs.readFileSync(TASK_MAP_PATH, 'utf8'));
    }
  } catch { /* ignore */ }
  return {};
}

function saveTaskMap(map) {
  try {
    const dir = path.dirname(TASK_MAP_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    // Manter apenas ultimas 50 entries
    const keys = Object.keys(map);
    if (keys.length > 50) {
      const toRemove = keys.slice(0, keys.length - 50);
      toRemove.forEach(k => delete map[k]);
    }
    fs.writeFileSync(TASK_MAP_PATH, JSON.stringify(map, null, 2), 'utf8');
  } catch { /* ignore */ }
}

// ============ CONFIG ============

function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const cfg = JSON.parse(raw);
    return cfg.telegram || null;
  } catch {
    return null;
  }
}

// ============ TELEGRAM ============

function sendTelegram(botToken, chatId, text) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });

    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${botToken}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body, 'utf8')
      },
      timeout: 5000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ ok: res.statusCode === 200, data }));
    });

    req.on('error', () => resolve({ ok: false }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false }); });
    req.write(body, 'utf8');
    req.end();
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ============ MAIN ============

async function main() {
  const config = loadConfig();
  if (!config || !config.enabled || !config.botToken || !config.chatId) {
    process.exit(0);
  }

  let input = '';
  process.stdin.setEncoding('utf8');

  await new Promise((resolve) => {
    process.stdin.on('data', chunk => input += chunk);
    process.stdin.on('end', resolve);
    setTimeout(resolve, 2000);
  });

  if (!input.trim()) {
    process.exit(0);
  }

  let hookData;
  try {
    hookData = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  const toolName = hookData.tool_name || hookData.toolName || '';
  const toolInput = hookData.tool_input || hookData.toolInput || hookData.input || {};
  const toolResponse = hookData.tool_response || hookData.toolResponse || hookData.response || '';

  // --- Stop event: Claude finished responding (notificacao por SESSAO, nao por task) ---
  if (toolName === '' && hookData.event === 'Stop') {
    const reason = hookData.stop_reason || hookData.stopReason || 'end_turn';

    if (reason === 'end_turn' || reason === 'stop') {
      const sessionId = hookData.session_id || hookData.sessionId || '';
      const msg = [
        `<b>\ud83d\udd14 Claude Code finalizou</b>`,
        ``,
        sessionId ? `<b>Sess\u00e3o:</b> <code>${escapeHtml(sessionId.slice(0, 12))}</code>` : '',
        `<i>\ud83d\udcc5 ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</i>`
      ].filter(Boolean).join('\n');

      await sendTelegram(config.botToken, config.chatId, msg);
    }
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
