#!/usr/bin/env node
/**
 * Claude Code PostToolUse Hook - Sync Tasks to Dashboard
 *
 * Receives TaskCreate/TaskUpdate data from Claude Code via stdin
 * and sends it to the task-scheduler dashboard API.
 * Sincroniza tanto com a Memória (/api/memory) quanto com o Kanban (/api/tasks/claude-sync).
 */

const http = require('http');

const API_BASE = 'http://localhost:3847';

function apiRequest(method, path, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: 3847,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 3000
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve({ success: false, raw: body });
        }
      });
    });

    req.on('error', () => resolve({ success: false, error: 'API unreachable' }));
    req.on('timeout', () => { req.destroy(); resolve({ success: false, error: 'timeout' }); });
    req.write(postData);
    req.end();
  });
}

async function main() {
  let input = '';

  // Read stdin (Claude Code passes hook data here)
  process.stdin.setEncoding('utf8');

  await new Promise((resolve) => {
    process.stdin.on('data', chunk => input += chunk);
    process.stdin.on('end', resolve);
    // Timeout after 2 seconds if no stdin
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
  const toolResponse = hookData.tool_response || hookData.toolResponse || '';

  if (toolName === 'TaskCreate') {
    const content = toolInput.subject || toolInput.description || '';
    const activeForm = toolInput.activeForm || content;

    // Extrair ID da task do Claude com múltiplas estratégias
    let claudeTaskId = null;

    // Estratégia 1: resposta como string com "Task #N"
    if (typeof toolResponse === 'string') {
      const match = toolResponse.match(/(?:Task|task)\s*#(\d+)/);
      if (match) claudeTaskId = match[1];
    }
    // Estratégia 2: resposta como objeto com taskId ou id
    if (!claudeTaskId && toolResponse && typeof toolResponse === 'object') {
      if (toolResponse.taskId) claudeTaskId = String(toolResponse.taskId);
      else if (toolResponse.id) claudeTaskId = String(toolResponse.id);
    }
    // Estratégia 3: extrair de qualquer string que contenha o ID
    if (!claudeTaskId && typeof toolResponse === 'string') {
      const match2 = toolResponse.match(/#(\d+)\s*(created|criada)/i);
      if (match2) claudeTaskId = match2[1];
    }
    // Estratégia 4: fallback com timestamp (garante que SEMPRE sincroniza)
    if (!claudeTaskId) {
      claudeTaskId = `auto_${Date.now()}`;
    }

    if (content) {
      // 1. Sincronizar com Memória (comportamento original)
      await apiRequest('POST', '/api/memory/active/tasks', {
        content,
        status: 'pending',
        activeForm
      });

      // 2. Sincronizar com Kanban (SEMPRE — não depende mais de claudeTaskId)
      await apiRequest('POST', '/api/tasks/claude-sync', {
        claudeTaskId,
        name: content,
        description: toolInput.description || activeForm || '',
        status: 'pending'
      });
    }
  } else if (toolName === 'TaskUpdate') {
    const taskId = toolInput.taskId || '';
    const status = toolInput.status || '';
    const subject = toolInput.subject || '';

    if (status) {
      // Map Claude Code task status para memory e Kanban
      const memoryStatusMap = {
        'pending':     'pending',
        'in_progress': 'in_progress',
        'completed':   'completed',
        'deleted':     'completed'
      };

      // Extrair nome do toolResponse se disponivel (ex: "Updated task #2 status\n\nSubject: ...")
      let resolvedName = subject;
      if (!resolvedName && typeof toolResponse === 'string') {
        // Extrair subject da resposta se presente
        const subMatch = toolResponse.match(/subject[:\s]+["']?([^"'\n]+)/i);
        if (subMatch) resolvedName = subMatch[1].trim();
      }

      // 1. Sincronizar com Memória (comportamento original)
      await apiRequest('PUT', '/api/memory/active/tasks/sync', {
        claudeTaskId: taskId,
        status: memoryStatusMap[status] || status,
        content: resolvedName || undefined
      });

      // 2. Sincronizar com Kanban — buscar task existente pelo claudeTaskId original
      // e atualizar, ou criar com o taskId como claudeTaskId
      const syncId = taskId || `auto_${Date.now()}`;

      // Tentar buscar a task original com claudeTaskId do TaskCreate (que usa toolResponse #N)
      // O TaskCreate extrai o ID como "2" do "Task #2 created", entao claudeTaskId deve ser "2"
      await apiRequest('POST', '/api/tasks/claude-sync', {
        claudeTaskId: syncId,
        name: resolvedName || undefined,
        description: undefined,
        status
      });
    }
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
