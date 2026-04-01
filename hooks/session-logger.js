#!/usr/bin/env node
/**
 * Claude Code Session Logger
 *
 * Captura TODOS os eventos da sessao e salva em arquivo TXT legivel.
 *
 * Hooks suportados:
 * - UserPromptSubmit: mensagens do usuario
 * - PostToolUse: todas as ferramentas executadas + resultados
 * - Stop: finalizacao da sessao
 *
 * Saida: ~/.claude/session-logs/session-YYYY-MM-DD_HH-MM-SS.txt
 *
 * Formato do TXT:
 * =====================================
 * SESSAO CLAUDE CODE - 2026-03-13 14:30:00
 * =====================================
 * [14:30:01] USUARIO:
 * mensagem do usuario aqui
 *
 * [14:30:02] TOOL: Read
 * Input: { file_path: "..." }
 * Response: (primeiros 500 chars)
 *
 * [14:35:00] FIM DA SESSAO
 * =====================================
 */

const fs   = require('fs');
const path = require('path');

// === CONFIG ===
const LOGS_DIR      = path.join(__dirname, '..', 'session-logs');
const MAX_RESPONSE  = 2000;   // chars max da resposta de tool no log
const MAX_INPUT     = 1000;   // chars max do input de tool no log
const MAX_USER_MSG  = 5000;   // chars max da mensagem do usuario
const MAX_LOG_FILES = 100;    // max arquivos de log mantidos (rotacao)

// === HELPERS ===

function timestamp() {
  return new Date().toLocaleTimeString('pt-BR', { hour12: false });
}

function datestamp() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function datetimeForFilename() {
  const d = new Date();
  const date = datestamp();
  const time = `${String(d.getHours()).padStart(2,'0')}-${String(d.getMinutes()).padStart(2,'0')}-${String(d.getSeconds()).padStart(2,'0')}`;
  return `${date}_${time}`;
}

function truncate(str, max) {
  if (!str) return '';
  const s = typeof str === 'string' ? str : JSON.stringify(str, null, 2);
  if (s.length <= max) return s;
  return s.substring(0, max) + `\n... [TRUNCADO - ${s.length} chars total]`;
}

function sanitize(obj, maxLen) {
  if (!obj) return '(vazio)';
  if (typeof obj === 'string') return truncate(obj, maxLen);
  try {
    return truncate(JSON.stringify(obj, null, 2), maxLen);
  } catch {
    return '(nao serializavel)';
  }
}

/**
 * Identifica o arquivo de log da sessao atual.
 * Usa session_id do hook data para agrupar, ou cria novo baseado em timestamp.
 */
function getLogFile(sessionId) {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }

  // Mapa session_id -> arquivo de log
  const mapFile = path.join(LOGS_DIR, '.session-map.json');
  let sessionMap = {};

  try {
    if (fs.existsSync(mapFile)) {
      sessionMap = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
    }
  } catch { sessionMap = {}; }

  // Limpar sessoes com mais de 24h
  const now = Date.now();
  for (const [key, val] of Object.entries(sessionMap)) {
    if (now - (val.createdAt || 0) > 24 * 60 * 60 * 1000) {
      delete sessionMap[key];
    }
  }

  const mapKey = sessionId || 'unknown';

  if (sessionMap[mapKey]) {
    return sessionMap[mapKey].file;
  }

  // Nova sessao
  const filename = `session-${datetimeForFilename()}.txt`;
  const filePath = path.join(LOGS_DIR, filename);

  sessionMap[mapKey] = { file: filePath, createdAt: now };

  try {
    fs.writeFileSync(mapFile, JSON.stringify(sessionMap, null, 2), 'utf8');
  } catch {}

  // Escrever header do arquivo
  const header = [
    '='.repeat(70),
    `SESSAO CLAUDE CODE - ${new Date().toLocaleString('pt-BR')}`,
    `Session ID: ${sessionId || 'N/A'}`,
    `Diretorio: ${process.cwd()}`,
    '='.repeat(70),
    ''
  ].join('\n');

  try {
    fs.writeFileSync(filePath, header, 'utf8');
  } catch {}

  return filePath;
}

function appendLog(logFile, text) {
  try {
    fs.appendFileSync(logFile, text + '\n', 'utf8');
  } catch {}
}

/**
 * Rotacao: mantém apenas os ultimos MAX_LOG_FILES arquivos
 */
function rotateOldLogs() {
  try {
    const files = fs.readdirSync(LOGS_DIR)
      .filter(f => f.startsWith('session-') && f.endsWith('.txt'))
      .sort();

    if (files.length > MAX_LOG_FILES) {
      const toDelete = files.slice(0, files.length - MAX_LOG_FILES);
      for (const f of toDelete) {
        fs.unlinkSync(path.join(LOGS_DIR, f));
      }
    }
  } catch {}
}

// === HOOK HANDLERS ===

function handleUserPrompt(hookData, logFile) {
  const userMessage = hookData.user_message
    || hookData.message
    || hookData.prompt
    || hookData.content
    || '(mensagem nao capturada)';

  const entry = [
    `[${timestamp()}] ════════ USUARIO ════════`,
    sanitize(userMessage, MAX_USER_MSG),
    ''
  ].join('\n');

  appendLog(logFile, entry);
}

function handlePostToolUse(hookData, logFile) {
  const toolName     = hookData.tool_name || hookData.toolName || 'Unknown';
  const toolInput    = hookData.tool_input || hookData.toolInput || hookData.input || {};
  const toolResponse = hookData.tool_response || hookData.toolResponse || '';

  // Resumo do input baseado no tipo de ferramenta
  let inputSummary;
  if (toolName === 'Read' && toolInput.file_path) {
    inputSummary = `file: ${toolInput.file_path}`;
  } else if (toolName === 'Write' && toolInput.file_path) {
    const contentLen = (toolInput.content || '').length;
    inputSummary = `file: ${toolInput.file_path} (${contentLen} chars)`;
  } else if (toolName === 'Edit' && toolInput.file_path) {
    inputSummary = `file: ${toolInput.file_path}\n  old: ${truncate(toolInput.old_string, 100)}\n  new: ${truncate(toolInput.new_string, 100)}`;
  } else if (toolName === 'Bash') {
    inputSummary = `cmd: ${truncate(toolInput.command, 500)}`;
  } else if (toolName === 'Glob') {
    inputSummary = `pattern: ${toolInput.pattern}${toolInput.path ? ' in ' + toolInput.path : ''}`;
  } else if (toolName === 'Grep') {
    inputSummary = `pattern: "${toolInput.pattern}"${toolInput.path ? ' in ' + toolInput.path : ''}`;
  } else if (toolName === 'Agent') {
    inputSummary = `type: ${toolInput.subagent_type || 'general'} | ${truncate(toolInput.description || toolInput.prompt, 200)}`;
  } else if (toolName === 'WebSearch') {
    inputSummary = `query: "${toolInput.query}"`;
  } else if (toolName === 'WebFetch') {
    inputSummary = `url: ${toolInput.url}`;
  } else {
    inputSummary = sanitize(toolInput, MAX_INPUT);
  }

  const entry = [
    `[${timestamp()}] TOOL: ${toolName}`,
    `  Input: ${inputSummary}`,
    `  Response: ${sanitize(toolResponse, MAX_RESPONSE)}`,
    ''
  ].join('\n');

  appendLog(logFile, entry);
}

function handleStop(hookData, logFile) {
  const reason = hookData.stop_reason || hookData.reason || 'encerramento normal';

  // Calcular estatisticas do log
  let stats = '';
  try {
    const content = fs.readFileSync(logFile, 'utf8');
    const toolCount = (content.match(/\] TOOL:/g) || []).length;
    const userCount = (content.match(/════ USUARIO ════/g) || []).length;
    const lines = content.split('\n').length;
    stats = `\nEstatisticas: ${userCount} mensagens usuario, ${toolCount} tool calls, ${lines} linhas`;
  } catch {}

  const entry = [
    '',
    '='.repeat(70),
    `[${timestamp()}] FIM DA SESSAO`,
    `Motivo: ${reason}`,
    stats,
    '='.repeat(70),
    ''
  ].join('\n');

  appendLog(logFile, entry);

  // Rotacao de logs antigos
  rotateOldLogs();
}

// === STDIN READER ===

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) { resolve({}); return; }
    let buf = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', c => buf += c);
    process.stdin.on('end', () => {
      try { resolve(JSON.parse(buf.trim())); }
      catch { resolve({}); }
    });
    setTimeout(() => resolve({}), 3000);
  });
}

// === MAIN ===

async function main() {
  const hookData = await readStdin();

  if (!hookData || Object.keys(hookData).length === 0) {
    process.exit(0);
  }

  const sessionId = hookData.session_id || hookData.sessionId || process.env.CLAUDE_SESSION_ID || 'unknown';
  const hookType  = hookData.hook_type || hookData.hookType || process.env.CLAUDE_HOOK_TYPE || '';
  const toolName  = hookData.tool_name || hookData.toolName || '';

  const logFile = getLogFile(sessionId);

  // Detectar tipo de evento
  if (hookType === 'UserPromptSubmit' || hookData.user_message || hookData.prompt) {
    handleUserPrompt(hookData, logFile);
  } else if (hookType === 'Stop' || hookData.stop_reason) {
    handleStop(hookData, logFile);
  } else if (toolName || hookType === 'PostToolUse') {
    handlePostToolUse(hookData, logFile);
  } else {
    // Evento desconhecido — logar generico
    appendLog(logFile, `[${timestamp()}] EVENTO: ${sanitize(hookData, 500)}\n`);
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
