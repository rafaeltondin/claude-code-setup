#!/usr/bin/env node
/**
 * Error Monitor Hook — Monitoramento Continuo de Erros
 *
 * Hook PostToolUse que detecta erros em tempo real e acumula
 * em um arquivo JSON para analise e documentacao automatica.
 *
 * Detecta:
 * - Bash commands com exit code != 0
 * - Tool responses com padroes de erro (Error, ENOENT, failed, etc.)
 * - Tentativas repetidas (mesmo tool + input similar)
 * - Caminhos errados (file not found, permission denied)
 *
 * Saida: ~/.claude/temp/error-monitor/errors-current.jsonl
 *        ~/.claude/temp/error-monitor/error-summary.json
 */

const fs   = require('fs');
const path = require('path');

// === CONFIG ===
const MONITOR_DIR  = path.join(__dirname, '..', 'temp', 'error-monitor');
const ERRORS_FILE  = path.join(MONITOR_DIR, 'errors-current.jsonl');
const SUMMARY_FILE = path.join(MONITOR_DIR, 'error-summary.json');
const MAX_ERRORS   = 200;  // max erros acumulados antes de rotacao
const MAX_RESPONSE = 1500; // chars max da resposta no log de erro

// Padroes de erro em respostas de tools
const ERROR_PATTERNS = [
  /\bError\b/i,
  /\bERROR\b/,
  /\bfailed\b/i,
  /\bFAILED\b/,
  /\bENOENT\b/,
  /\bENOTDIR\b/,
  /\bEACCES\b/,
  /\bEPERM\b/,
  /\bcommand not found\b/i,
  /\bNo such file or directory\b/i,
  /\bPermission denied\b/i,
  /\bsyntax error\b/i,
  /\bSyntaxError\b/,
  /\bTypeError\b/,
  /\bReferenceError\b/,
  /\bModuleNotFoundError\b/,
  /\bImportError\b/,
  /\bConnectionRefused\b/i,
  /\bECONNREFUSED\b/,
  /\btimeout\b/i,
  /\bTIMEDOUT\b/,
  /\b404\b.*\b[Nn]ot [Ff]ound\b/,
  /\b500\b.*\b[Ii]nternal [Ss]erver/,
  /\b403\b.*\b[Ff]orbidden\b/,
  /\bfatal:/i,
  /\bpanic:/i,
  /\bTraceback\b/,
  /\bException\b/,
  /\bnot found\b/i,
  /\bcannot find\b/i,
  /\bunable to\b/i,
  /\brejected\b/i,
  /\bdoes not exist\b/i,
  /\bis not recognized\b/i,
  /\bnot a valid\b/i,
  /\binvalid\b/i
];

// Padroes a IGNORAR (falsos positivos comuns)
const IGNORE_PATTERNS = [
  /No files found/i,          // Glob sem resultados nao e erro
  /No results found/i,        // Grep sem resultados nao e erro
  /0 matches/i,
  /no changes/i,
  /nothing to commit/i,
  /Already up to date/i,
  /error-monitor/i,           // Evitar recursao com proprios arquivos
  /error-learner/i,           // Evitar recursao com error-learner
  /errors-current\.jsonl/i,   // Evitar captura ao ler log de erros
  /error-summary\.json/i,     // Evitar captura ao ler summary
  /ErrorBoundary/i,           // Nomes de componentes React
  /handleError/i,             // Nomes de funcoes
  /onError/i,
  /errorHandler/i,
  /error\.log/i,              // Referencia a arquivos de log
  /error_log/i,
  /\.error\(/,                // Chamadas de metodo .error()
  /console\.error/,
  /ERROR MONITOR STATUS/,     // Output do proprio status
  /Total de erros/i,          // Output do proprio relatorio
  /Licoes geradas/i,          // Output do error-learner
  /"type":"file_not_found"/,  // JSON de erros sendo lido (nao novo erro)
  /"resolved":/,              // JSON de erros sendo lido
  /erros acumulados/i,        // Output do status
  /session-logger/i,          // Logs da propria sessao
  /WARN|WARNING/i,            // Warnings nao sao erros
  /DeprecationWarning/i,      // Deprecation nao e erro
  /ExperimentalWarning/i,     // Experimental nao e erro
  /npm warn/i,                // npm warnings
];

// === HELPERS ===

function ensureDir() {
  if (!fs.existsSync(MONITOR_DIR)) {
    fs.mkdirSync(MONITOR_DIR, { recursive: true });
  }
}

function truncate(str, max) {
  if (!str) return '';
  const s = typeof str === 'string' ? str : JSON.stringify(str);
  return s.length <= max ? s : s.substring(0, max) + '...[truncado]';
}

function isRealError(response) {
  const text = typeof response === 'string' ? response : JSON.stringify(response || '');

  // Verificar se algum padrao de ignore bate
  for (const pattern of IGNORE_PATTERNS) {
    if (pattern.test(text)) return false;
  }

  // Verificar se algum padrao de erro bate
  for (const pattern of ERROR_PATTERNS) {
    if (pattern.test(text)) return true;
  }

  return false;
}

function classifyError(toolName, toolInput, response) {
  const text = typeof response === 'string' ? response : JSON.stringify(response || '');

  if (/ENOENT|No such file|not found|does not exist/i.test(text)) return 'file_not_found';
  if (/EACCES|EPERM|Permission denied|Forbidden/i.test(text)) return 'permission';
  if (/SyntaxError|syntax error/i.test(text)) return 'syntax';
  if (/TypeError|ReferenceError/i.test(text)) return 'runtime';
  if (/ECONNREFUSED|timeout|TIMEDOUT|ConnectionRefused/i.test(text)) return 'connection';
  if (/500|Internal Server/i.test(text)) return 'server_error';
  if (/404|Not Found/i.test(text) && !/file/i.test(text)) return 'api_not_found';
  if (/failed|FAILED/i.test(text)) return 'execution_failed';
  if (/command not found|is not recognized/i.test(text)) return 'command_not_found';
  if (/Traceback|Exception|fatal|panic/i.test(text)) return 'crash';
  if (/invalid|not a valid/i.test(text)) return 'validation';

  return 'unknown';
}

function extractContext(toolName, toolInput) {
  if (toolName === 'Bash') return { command: truncate(toolInput?.command, 300) };
  if (toolName === 'Read') return { file: toolInput?.file_path };
  if (toolName === 'Write') return { file: toolInput?.file_path };
  if (toolName === 'Edit') return { file: toolInput?.file_path, old: truncate(toolInput?.old_string, 100) };
  if (toolName === 'Glob') return { pattern: toolInput?.pattern, path: toolInput?.path };
  if (toolName === 'Grep') return { pattern: toolInput?.pattern, path: toolInput?.path };
  if (toolName === 'Agent') return { type: toolInput?.subagent_type, desc: truncate(toolInput?.description, 150) };
  if (toolName === 'WebFetch') return { url: toolInput?.url };
  return { input: truncate(JSON.stringify(toolInput), 200) };
}

function loadSummary() {
  try {
    if (fs.existsSync(SUMMARY_FILE)) {
      return JSON.parse(fs.readFileSync(SUMMARY_FILE, 'utf8'));
    }
  } catch {}
  return {
    sessionStart: new Date().toISOString(),
    totalErrors: 0,
    errorsByType: {},
    errorsByTool: {},
    consecutiveErrors: 0,
    lastErrorTime: null,
    needsAnalysis: false,
    analysisThreshold: 5 // analisar a cada 5 erros
  };
}

function saveSummary(summary) {
  try {
    fs.writeFileSync(SUMMARY_FILE, JSON.stringify(summary, null, 2), 'utf8');
  } catch {}
}

function appendError(errorEntry) {
  try {
    fs.appendFileSync(ERRORS_FILE, JSON.stringify(errorEntry) + '\n', 'utf8');
  } catch {}
}

function countErrors() {
  try {
    if (!fs.existsSync(ERRORS_FILE)) return 0;
    const content = fs.readFileSync(ERRORS_FILE, 'utf8').trim();
    return content ? content.split('\n').length : 0;
  } catch { return 0; }
}

function rotateIfNeeded() {
  const count = countErrors();
  if (count > MAX_ERRORS) {
    try {
      const archive = path.join(MONITOR_DIR, `errors-${Date.now()}.jsonl`);
      fs.renameSync(ERRORS_FILE, archive);
      // Manter apenas 3 arquivos de arquivo
      const archives = fs.readdirSync(MONITOR_DIR)
        .filter(f => f.startsWith('errors-') && f !== 'errors-current.jsonl')
        .sort();
      while (archives.length > 3) {
        fs.unlinkSync(path.join(MONITOR_DIR, archives.shift()));
      }
    } catch {}
  }
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

  const toolName     = hookData.tool_name || hookData.toolName || '';
  const toolInput    = hookData.tool_input || hookData.toolInput || hookData.input || {};
  const toolResponse = hookData.tool_response || hookData.toolResponse || '';
  const sessionId    = hookData.session_id || hookData.sessionId || process.env.CLAUDE_SESSION_ID || 'unknown';

  // Ignorar tools que nao geram erros relevantes
  if (!toolName || ['TaskCreate', 'TaskUpdate', 'TaskList', 'TaskGet'].includes(toolName)) {
    process.exit(0);
  }

  // Para Bash: extrair stderr e exitCode do response JSON se disponivel
  let responseText;
  if (toolName === 'Bash') {
    if (typeof toolResponse === 'object' && toolResponse !== null) {
      // Response estruturado do Bash: priorizar stderr e exitCode
      const exitCode = toolResponse.exitCode || toolResponse.exit_code || 0;
      const stderr = toolResponse.stderr || '';
      const stdout = toolResponse.stdout || '';
      // Se exitCode == 0 e sem stderr significativo, nao e erro
      if (exitCode === 0 && !stderr.trim()) {
        process.exit(0);
      }
      // Usar stderr se disponivel, senao stdout (apenas se exitCode != 0)
      responseText = stderr.trim() ? stderr : (exitCode !== 0 ? stdout : '');
    } else {
      responseText = typeof toolResponse === 'string' ? toolResponse : JSON.stringify(toolResponse || '');
    }
  } else {
    responseText = typeof toolResponse === 'string' ? toolResponse : JSON.stringify(toolResponse || '');
  }

  if (!responseText || !isRealError(responseText)) {
    // Nao e erro — resetar contador de erros consecutivos
    ensureDir();
    const summary = loadSummary();
    if (summary.consecutiveErrors > 0) {
      summary.consecutiveErrors = 0;
      saveSummary(summary);
    }
    process.exit(0);
  }

  // === ERRO DETECTADO ===
  ensureDir();

  const errorType = classifyError(toolName, toolInput, responseText);
  const context   = extractContext(toolName, toolInput);

  const errorEntry = {
    timestamp: new Date().toISOString(),
    sessionId,
    tool: toolName,
    type: errorType,
    context,
    response: truncate(responseText, MAX_RESPONSE),
    resolved: false
  };

  // Salvar erro
  appendError(errorEntry);

  // Atualizar summary
  const summary = loadSummary();
  summary.totalErrors++;
  summary.errorsByType[errorType] = (summary.errorsByType[errorType] || 0) + 1;
  summary.errorsByTool[toolName]  = (summary.errorsByTool[toolName] || 0) + 1;
  summary.consecutiveErrors++;
  summary.lastErrorTime = errorEntry.timestamp;

  // Marcar para analise se atingiu threshold
  if (summary.totalErrors % summary.analysisThreshold === 0) {
    summary.needsAnalysis = true;
  }

  // Erros consecutivos indicam caminho errado
  if (summary.consecutiveErrors >= 3) {
    summary.needsAnalysis = true;
    summary.urgentAnalysis = true;
  }

  saveSummary(summary);
  rotateIfNeeded();

  // Output para o hook system (mensagem que Claude Code pode ver)
  if (summary.consecutiveErrors >= 3) {
    // Stdout feedback para Claude Code
    const msg = `[ERROR-MONITOR] ${summary.consecutiveErrors} erros consecutivos detectados (tipo: ${errorType}). ` +
      `Total da sessao: ${summary.totalErrors}. ` +
      `Considere mudar de abordagem. Detalhes em ~/.claude/temp/error-monitor/`;
    process.stdout.write(msg);
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
