/**
 * EXECUTOR MODULE - Executa tarefas Claude Prompt
 *
 * Responsável por executar prompts no Claude Code CLI
 * com logging detalhado e tratamento de erros.
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const storage = require('./storage');
const notifier = require('./notifier');
const credentialVault = require('./credential-vault');

// Tarefas em execução
const runningTasks = new Map();

/**
 * Executa uma tarefa (sempre como claude_prompt)
 */
async function executeTask(taskParam) {
  // Clonar task para não mutar o objeto em cache do storage
  // Bug fix: task.type = 'claude_prompt' mutava o cache, fazendo tasks claude_code
  // escaparem do filtro getPendingTasks() e serem executadas sem prompt
  const task = { ...taskParam };
  const executionId = uuidv4();
  const startTime = Date.now();

  console.log(`[Executor][${new Date().toISOString()}] INFO: Iniciando execução`, {
    executionId,
    taskId: task.id,
    name: task.name
  });

  // Registrar início da execução
  const execution = storage.addExecution({
    id: executionId,
    taskId: task.id,
    taskName: task.name,
    type: 'claude_prompt',
    status: 'running',
    startedAt: new Date().toISOString(),
    output: '',
    error: null,
    duration: 0
  });

  // Atualizar status da tarefa
  storage.updateTask(task.id, {
    status: 'running',
    lastExecutionId: executionId,
    lastRunAt: new Date().toISOString()
  });

  // Adicionar à lista de tarefas em execução
  runningTasks.set(executionId, {
    task,
    execution,
    startTime,
    process: null
  });

  // Broadcast: execução iniciada
  if (global.broadcastUpdate) {
    global.broadcastUpdate('execution:started', {
      executionId,
      taskId: task.id,
      taskName: task.name,
      type: 'claude_prompt',
      startedAt: execution.startedAt
    });
  }

  try {
    const result = await executeClaudePrompt(task, executionId);

    // Calcular duração
    const duration = Date.now() - startTime;

    // Atualizar execução com sucesso
    storage.updateExecution(executionId, {
      status: 'success',
      finishedAt: new Date().toISOString(),
      duration,
      output: result.output || '',
      exitCode: result.exitCode || 0
    });

    // Atualizar tarefa
    const nextRun = calculateNextRun(task);
    storage.updateTask(task.id, {
      status: nextRun ? 'scheduled' : 'completed',
      scheduledAt: nextRun,
      successCount: (task.successCount || 0) + 1
    });

    console.log(`[Executor][${new Date().toISOString()}] INFO: Execução concluída com sucesso`, {
      executionId,
      taskId: task.id,
      duration: `${duration}ms`
    });

    // Broadcast: execução concluída
    if (global.broadcastUpdate) {
      global.broadcastUpdate('execution:completed', {
        executionId,
        taskId: task.id,
        taskName: task.name,
        status: 'success',
        duration,
        output: (result.output || '').substring(0, 500)
      });
    }

    // Enviar notificação de sucesso
    try {
      const updatedExecution = storage.getExecutions(1).find(e => e.id === executionId);
      await notifier.notify('task:success', {
        task,
        execution: updatedExecution || execution
      });
    } catch (notifError) {
      console.error(`[Executor][${new Date().toISOString()}] WARN: Erro ao enviar notificação de sucesso`, {
        executionId,
        error: notifError.message
      });
    }

    return { success: true, executionId, duration, output: result.output };

  } catch (error) {
    const duration = Date.now() - startTime;

    console.error(`[Executor][${new Date().toISOString()}] ERROR: Execução falhou`, {
      executionId,
      taskId: task.id,
      error: error.message,
      duration: `${duration}ms`
    });

    // Atualizar execução com erro
    storage.updateExecution(executionId, {
      status: 'failed',
      finishedAt: new Date().toISOString(),
      duration,
      error: error.message,
      stack: error.stack
    });

    // Broadcast: execução falhou
    if (global.broadcastUpdate) {
      global.broadcastUpdate('execution:failed', {
        executionId,
        taskId: task.id,
        taskName: task.name,
        status: 'failed',
        duration,
        error: error.message,
        isRateLimit: error.isRateLimit || false,
        resetInfo: error.resetInfo || null
      });
    }

    // Rate limit: não incrementar failCount nem fazer retry (limite vai resetar)
    if (error.isRateLimit) {
      const nextRun = calculateNextRun(task);
      storage.updateTask(task.id, {
        status: nextRun ? 'scheduled' : 'idle',
        scheduledAt: nextRun,
        lastError: error.message
      });
    } else {
      // Verificar retry
      const failCount = (task.failCount || 0) + 1;
      const config = storage.getConfig();

      if (failCount < config.retryAttempts && task.retryEnabled !== false) {
        // Agendar retry
        const retryTime = new Date(Date.now() + config.retryDelay * failCount);
        storage.updateTask(task.id, {
          status: 'scheduled',
          scheduledAt: retryTime.toISOString(),
          failCount,
          lastError: error.message
        });

        console.log(`[Executor][${new Date().toISOString()}] INFO: Retry agendado`, {
          taskId: task.id,
          attempt: failCount + 1,
          scheduledAt: retryTime.toISOString()
        });
      } else {
        // Falha definitiva
        const nextRun = calculateNextRun(task);
        storage.updateTask(task.id, {
          status: nextRun ? 'scheduled' : 'failed',
          scheduledAt: nextRun,
          failCount,
          lastError: error.message
        });
      }
    } // fim else (não é rate limit)

    // Enviar notificação de falha
    try {
      const updatedExecution = storage.getExecutions(1).find(e => e.id === executionId);
      await notifier.notify('task:failed', {
        task,
        execution: updatedExecution || execution
      });
    } catch (notifError) {
      console.error(`[Executor][${new Date().toISOString()}] WARN: Erro ao enviar notificação de falha`, {
        executionId,
        error: notifError.message
      });
    }

    return { success: false, executionId, duration, error: error.message };

  } finally {
    runningTasks.delete(executionId);
  }
}

/**
 * Executa um comando shell (helper interno usado pelo executeClaudePrompt para KB e Memory)
 */
async function runShellCommand(command, cwd, timeout) {
  return new Promise((resolve, reject) => {
    let output = '';
    let errorOutput = '';

    const child = exec(command, {
      cwd: cwd || process.cwd(),
      timeout: timeout || 300000,
      maxBuffer: 10 * 1024 * 1024,
      shell: true
    });

    child.stdout.on('data', (data) => {
      output += data;
    });

    child.stderr.on('data', (data) => {
      errorOutput += data;
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ output, exitCode: code });
      } else {
        reject(new Error(`Comando falhou com código ${code}: ${errorOutput || output}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Executa um prompt no Claude Code
 * Usa --output-format stream-json para capturar conversa completa (tool calls, resultados, etc.)
 * Cada execução gera uma sessão única rastreável via --session-id
 */
async function executeClaudePrompt(task, executionId) {
  const userPrompt = task.prompt;

  if (!userPrompt) {
    throw new Error(`Tarefa "${task.name}" nao possui prompt definido (tipo: ${task.type || 'desconhecido'})`);
  }

  const workingDirectory = task.workingDirectory || process.cwd();
  const timeout = task.timeout || 600000; // 10 minutos padrão para prompts
  const useKnowledgeBase = task.useKnowledgeBase !== false;
  const tools = task.tools || []; // Ferramentas selecionadas pelo usuário

  console.log(`[Executor][${new Date().toISOString()}] INFO: Executando Claude Prompt`, {
    executionId,
    prompt: (userPrompt || '').substring(0, 100) + '...',
    workingDirectory,
    useKnowledgeBase,
    tools
  });

  // Criar sessão de memória para esta execução
  let memorySessionId = null;
  try {
    const memoryCliPath = path.join(__dirname, '..', 'conversation-memory', 'memory-cli.js');
    if (fs.existsSync(memoryCliPath)) {
      const memResult = await runShellCommand(
        `node "${memoryCliPath}" new`,
        path.dirname(memoryCliPath),
        10000
      );

      // Extrair session ID do output (formato: session_TIMESTAMP_HASH)
      const sessionMatch = memResult.output.match(/ID:\s*(session_[a-z0-9_]+)/i) || memResult.output.match(/(session_[a-z0-9_]+)/i);
      if (sessionMatch) {
        memorySessionId = sessionMatch[1];

        // Definir objetivo da sessão
        await runShellCommand(
          `node "${memoryCliPath}" objective "Tarefa: ${task.name} - ${(userPrompt || '').substring(0, 100)}"`,
          path.dirname(memoryCliPath),
          10000
        );
      }

      console.log(`[Executor][${new Date().toISOString()}] INFO: Sessão de memória criada`, {
        executionId,
        memorySessionId
      });
    }
  } catch (memError) {
    console.log(`[Executor][${new Date().toISOString()}] WARN: Erro ao criar sessão de memória`, {
      executionId,
      error: memError.message
    });
  }

  let kbContext = '';
  let kbSearchResults = '';

  // Consultar Knowledge Base se habilitado
  if (useKnowledgeBase) {
    try {
      const kbSearchPath = path.join(__dirname, '..', 'knowledge-base', 'knowledge-search.js');

      if (fs.existsSync(kbSearchPath)) {
        const keywords = extractKeywords(userPrompt);

        console.log(`[Executor][${new Date().toISOString()}] INFO: Consultando Knowledge Base`, {
          executionId,
          keywords
        });

        const kbResult = await runShellCommand(
          `node "${kbSearchPath}" "${keywords}"`,
          path.dirname(kbSearchPath),
          30000
        );

        if (kbResult.output) {
          kbSearchResults = kbResult.output;
          kbContext = `\n\n## CONTEXTO DA KNOWLEDGE BASE:\n${kbResult.output}\n\n---\n\n`;
        }
      }
    } catch (kbError) {
      console.log(`[Executor][${new Date().toISOString()}] WARN: Erro ao consultar KB`, {
        executionId,
        error: kbError.message
      });
    }
  }

  // Resolver credenciais apenas no prompt do usuario (nao no kbContext que contem exemplos de doc)
  let resolvedUserPrompt = userPrompt;
  const credRefCount = (resolvedUserPrompt.match(/\{\{secret:[A-Z0-9_]+\}\}/g) || []).length;
  if (credRefCount > 0) {
    resolvedUserPrompt = credentialVault.resolve(resolvedUserPrompt);
    console.log(`[Executor][${new Date().toISOString()}] INFO: Resolved ${credRefCount} credential references`);
  }
  let fullPrompt = `${kbContext}${resolvedUserPrompt}`;

  // Gerar session ID único para esta execução
  const sessionId = uuidv4();

  return new Promise((resolve, reject) => {
    // Montar argumentos do Claude CLI com stream-json para capturar conversa completa
    const args = ['-p', '--dangerously-skip-permissions', '--output-format', 'stream-json', '--verbose', '--session-id', sessionId];

    // Adicionar ferramentas se houver alguma selecionada
    if (tools.length > 0) {
      const uniqueTools = [...new Set(tools)];
      args.push('--tools', uniqueTools.join(','));
    }

    console.log(`[Executor][${new Date().toISOString()}] INFO: Executando Claude CLI (stream-json)`, {
      executionId,
      sessionId,
      workingDirectory,
      promptLength: fullPrompt.length,
      args: args.join(' '),
      toolsEnabled: tools
    });

    let rawOutput = '';
    let errorOutput = '';
    const conversationSteps = []; // Array de passos da conversa estruturados

    // Remover CLAUDECODE do env para evitar erro "cannot be launched inside another Claude Code session"
    const childEnv = { ...process.env, ...credentialVault.getEnvVars() };
    delete childEnv.CLAUDECODE;
    delete childEnv.CLAUDE_CODE;

    const child = spawn('claude', args, {
      cwd: workingDirectory || process.cwd(),
      shell: true,
      // NAO usar timeout do spawn (nao mata arvore de processos no Windows)
      env: childEnv
    });

    // Watchdog proprio: mata arvore de processos no Windows quando timeout expira
    const watchdog = setTimeout(() => {
      console.log(`[Executor][${new Date().toISOString()}] WARN: Timeout atingido (${timeout}ms), matando processo`, { executionId });
      try {
        if (process.platform === 'win32') {
          exec(`taskkill /pid ${child.pid} /T /F`, () => {});
        } else {
          child.kill('SIGTERM');
        }
      } catch (killErr) {
        console.log(`[Executor][${new Date().toISOString()}] ERROR: Falha ao matar processo`, { executionId, error: killErr.message });
      }
    }, timeout);

    const running = runningTasks.get(executionId);
    if (running) {
      running.process = child;
      running.watchdog = watchdog;
    }

    // Escrever o prompt no stdin
    child.stdin.on('error', (err) => {
      console.error('[Executor] stdin write error (pipe fechado):', err.message);
    });
    child.stdin.write(fullPrompt);
    child.stdin.end();

    child.stdout.on('data', (data) => {
      rawOutput += data.toString();

      // Parsear cada linha JSON do stream
      const lines = rawOutput.split('\n');
      rawOutput = lines.pop() || ''; // Manter a última linha incompleta no buffer

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line);
          processStreamEvent(event, conversationSteps, executionId);
        } catch (e) {
          // Linha não é JSON válido, ignorar
        }
      }

      // Atualizar output em tempo real com os passos parseados
      const liveOutput = buildConversationOutput(task, workingDirectory, useKnowledgeBase, kbSearchResults, tools, userPrompt, conversationSteps, null);
      storage.updateExecution(executionId, { output: liveOutput });
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      // Limpar watchdog de timeout
      clearTimeout(watchdog);

      // Parsear qualquer linha restante no buffer
      if (rawOutput.trim()) {
        try {
          const event = JSON.parse(rawOutput);
          processStreamEvent(event, conversationSteps, executionId);
        } catch (e) { }
      }

      // Extrair metadados do resultado final
      const resultEvent = conversationSteps.find(s => s.type === 'result');
      const metadata = {
        sessionId: resultEvent?.sessionId || sessionId,
        memorySessionId,
        totalCost: resultEvent?.totalCost || 0,
        numTurns: resultEvent?.numTurns || 0,
        duration: resultEvent?.duration || 0,
        model: resultEvent?.model || 'unknown'
      };

      // Construir output final estruturado
      const finalOutput = buildConversationOutput(task, workingDirectory, useKnowledgeBase, kbSearchResults, tools, userPrompt, conversationSteps, metadata);

      // Salvar os passos da conversa como JSON no campo conversationLog
      storage.updateExecution(executionId, {
        output: finalOutput,
        conversationLog: JSON.stringify(conversationSteps),
        claudeSessionId: metadata.sessionId,
        memorySessionId,
        costUsd: metadata.totalCost,
        numTurns: metadata.numTurns
      });

      if (code === 0 || code === null) {
        resolve({ output: finalOutput, exitCode: code || 0 });
      } else {
        // Verificar AMBOS errorOutput e finalOutput para rate limit
        // Bug fix: errorOutput pode ter conteúdo mas sem a msg de rate limit;
        // a msg pode estar apenas no finalOutput (parsed de stream-json events)
        // Bug fix 2: Claude CLI usa apóstrofo curvo \u2019 em "You\u2019ve", não o reto '
        const allOutput = (errorOutput || '') + (finalOutput || '');
        // Detectar rate limit do Claude CLI ("You've hit your limit · resets 2pm")
        if (/you[\u2019']?ve hit your limit/i.test(allOutput)) {
          const resetMatch = allOutput.match(/resets?\s+([^\n\r·•]+)/i);
          const resetInfo = resetMatch ? resetMatch[1].trim() : null;
          const rlMsg = resetInfo ? `Limite de uso atingido. Resets ${resetInfo}` : 'Limite de uso atingido';
          const rlError = new Error(`RATE_LIMIT: ${rlMsg}`);
          rlError.isRateLimit = true;
          rlError.resetInfo = resetInfo;
          reject(rlError);
        } else {
          const combinedOutput = errorOutput || finalOutput || '';
          reject(new Error(`Claude CLI retornou código ${code}: ${combinedOutput}`));
        }
      }
    });

    child.on('error', (error) => {
      if (error.message.includes('ENOENT') || error.message.includes('not found')) {
        const pendingFile = path.join(__dirname, 'data', 'pending_prompts.json');
        let pending = [];
        try {
          pending = JSON.parse(fs.readFileSync(pendingFile, 'utf8'));
        } catch (e) { }

        pending.push({
          id: executionId,
          taskId: task.id,
          taskName: task.name,
          prompt: userPrompt,
          workingDirectory,
          createdAt: new Date().toISOString()
        });

        fs.writeFileSync(pendingFile, JSON.stringify(pending, null, 2));

        resolve({
          output: `[CLAUDE CLI NÃO ENCONTRADO]\n\nO prompt foi salvo para execução manual.\n\nPrompt: ${userPrompt}`,
          exitCode: 0
        });
      } else {
        reject(error);
      }
    });
  });
}

/**
 * Processa um evento do stream-json e adiciona ao array de passos.
 * Broadcast em tempo real via WebSocket para o dashboard.
 */
function processStreamEvent(event, steps, executionId) {
  let step = null;

  switch (event.type) {
    case 'system':
      step = {
        type: 'system',
        model: event.model,
        tools: event.tools || [],
        sessionId: event.session_id,
        timestamp: new Date().toISOString()
      };
      break;

    case 'assistant':
      if (event.message?.content) {
        for (const block of event.message.content) {
          if (block.type === 'tool_use') {
            step = {
              type: 'tool_call',
              toolName: block.name,
              toolId: block.id,
              input: block.input,
              timestamp: new Date().toISOString()
            };
            steps.push(step);
            broadcastStep(executionId, step);
          } else if (block.type === 'text') {
            step = {
              type: 'assistant_text',
              text: block.text,
              timestamp: new Date().toISOString()
            };
            steps.push(step);
            broadcastStep(executionId, step);
          }
        }
        return; // Already pushed above
      }
      break;

    case 'user':
      if (event.message?.content) {
        for (const block of event.message.content) {
          if (block.type === 'tool_result') {
            const stdout = event.tool_use_result?.stdout || '';
            const stderr = event.tool_use_result?.stderr || '';
            const content = typeof block.content === 'string' ? block.content : stdout;
            step = {
              type: 'tool_result',
              toolId: block.tool_use_id,
              content: content,
              stderr: stderr,
              isError: block.is_error || false,
              timestamp: new Date().toISOString()
            };
            steps.push(step);
            broadcastStep(executionId, step);
          }
        }
        return; // Already pushed above
      }
      break;

    case 'result':
      step = {
        type: 'result',
        finalText: event.result || '',
        sessionId: event.session_id,
        totalCost: event.total_cost_usd || 0,
        numTurns: event.num_turns || 0,
        duration: event.duration_ms || 0,
        model: Object.keys(event.modelUsage || {})[0] || 'unknown',
        isError: event.is_error || false,
        timestamp: new Date().toISOString()
      };
      break;
  }

  if (step) {
    steps.push(step);
    broadcastStep(executionId, step);
  }
}

/**
 * Broadcast um step individual para o dashboard via WebSocket
 */
function broadcastStep(executionId, step) {
  if (executionId && global.broadcastUpdate) {
    global.broadcastUpdate('execution:step', {
      executionId,
      step
    });
  }
}

/**
 * Constrói output formatado a partir dos passos da conversa
 */
function buildConversationOutput(task, workingDirectory, useKB, kbResults, tools, prompt, steps, metadata) {
  let output = `[CLAUDE PROMPT EXECUTED]\n\n`;
  output += `📋 Tarefa: ${task.name}\n`;
  output += `📁 Diretório: ${workingDirectory}\n`;
  output += `🔍 Knowledge Base: ${useKB ? 'Consultada' : 'Desativada'}\n`;
  if (kbResults) output += `📚 Contexto KB: Encontrado\n`;
  output += tools.length > 0 ? `🛠️ Ferramentas: ${tools.join(', ')}\n` : '🛠️ Ferramentas: Nenhuma (modo básico)\n';

  if (metadata) {
    output += `🔗 Sessão Claude: ${metadata.sessionId}\n`;
    if (metadata.memorySessionId) output += `🧠 Sessão Memória: ${metadata.memorySessionId}\n`;
    output += `💰 Custo: $${metadata.totalCost.toFixed(4)}\n`;
    output += `🔄 Turnos: ${metadata.numTurns}\n`;
  }

  output += `\n${'═'.repeat(60)}\n`;
  output += `## PROMPT:\n${prompt}\n`;
  output += `${'═'.repeat(60)}\n\n`;

  // Renderizar cada passo da conversa
  let stepNum = 0;
  for (const step of steps) {
    switch (step.type) {
      case 'tool_call':
        stepNum++;
        output += `\n${'─'.repeat(60)}\n`;
        output += `🔧 [Passo ${stepNum}] Tool Call: ${step.toolName}\n`;
        output += `${'─'.repeat(60)}\n`;
        if (step.input) {
          // Mostrar input de forma legível
          const inputStr = typeof step.input === 'string' ? step.input : JSON.stringify(step.input, null, 2);
          // Limitar tamanho para não poluir
          output += inputStr.length > 2000 ? inputStr.substring(0, 2000) + '\n... (truncado)' : inputStr;
          output += '\n';
        }
        break;

      case 'tool_result':
        output += `\n📤 Resultado:\n`;
        const resultContent = step.content || '(sem output)';
        output += resultContent.length > 3000 ? resultContent.substring(0, 3000) + '\n... (truncado)' : resultContent;
        if (step.stderr) {
          output += `\n⚠️ Stderr: ${step.stderr.substring(0, 500)}`;
        }
        if (step.isError) {
          output += `\n❌ Erro na ferramenta`;
        }
        output += '\n';
        break;

      case 'assistant_text':
        output += `\n${'─'.repeat(60)}\n`;
        output += `💬 Resposta do Claude:\n`;
        output += `${'─'.repeat(60)}\n`;
        output += step.text + '\n';
        break;

      case 'result':
        // O resultado final já está coberto pela última assistant_text
        break;
    }
  }

  // Se não houve passos parseados, mostrar aviso
  if (steps.length === 0 || !steps.some(s => s.type === 'assistant_text' || s.type === 'tool_call')) {
    output += '\n⏳ Aguardando resposta do Claude...\n';
  }

  return output;
}

/**
 * Extrai palavras-chave relevantes de um prompt para busca na KB
 */
function extractKeywords(prompt) {
  if (!prompt) return '';
  // Remove pontuação e palavras comuns
  const stopWords = ['o', 'a', 'os', 'as', 'um', 'uma', 'de', 'da', 'do', 'em', 'no', 'na', 'para', 'por', 'com', 'que', 'e', 'ou', 'se', 'como', 'este', 'esta', 'esse', 'essa'];

  const words = prompt
    .toLowerCase()
    .replace(/[^\w\sáéíóúâêîôûãõç]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.includes(word));

  // Pegar as primeiras 5 palavras mais relevantes (mais longas tendem a ser mais específicas)
  const keywords = [...new Set(words)]
    .sort((a, b) => b.length - a.length)
    .slice(0, 5)
    .join(' ');

  return keywords || String(prompt).substring(0, 50);
}

/**
 * Calcula próxima execução para tarefas recorrentes
 * Respeita os dias da semana selecionados (weekdays)
 */
function calculateNextRun(task) {
  if (!task.recurring) {
    return null;
  }

  const now = new Date();
  const interval = task.recurringInterval || 1;
  const weekdays = task.weekdays; // Array de dias [0-6] onde 0=Dom, 1=Seg, etc.
  const recurringTime = task.recurringTime || '09:00';

  // Função auxiliar para encontrar próximo dia válido
  function findNextValidDay(startDate, allowedDays) {
    if (!allowedDays || allowedDays.length === 0) {
      return startDate;
    }

    let nextDate = new Date(startDate);
    let attempts = 0;

    // Procurar próximo dia válido (máximo 7 tentativas)
    while (attempts < 7) {
      if (allowedDays.includes(nextDate.getDay())) {
        return nextDate;
      }
      nextDate.setDate(nextDate.getDate() + 1);
      attempts++;
    }

    return startDate; // Fallback
  }

  // Função para aplicar horário específico
  function applyTime(date, timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  let nextRun;

  switch (task.recurringType) {
    case 'minutely':
      return new Date(now.getTime() + interval * 60000).toISOString();

    case 'hourly':
      return new Date(now.getTime() + interval * 3600000).toISOString();

    case 'daily':
      // Calcular próximo dia
      nextRun = new Date(now.getTime() + interval * 86400000);

      // Se há dias da semana especificados, encontrar próximo dia válido
      if (weekdays && weekdays.length > 0 && weekdays.length < 7) {
        nextRun = findNextValidDay(nextRun, weekdays);
      }

      // Aplicar horário configurado
      nextRun = applyTime(nextRun, recurringTime);

      // Se o horário calculado já passou hoje, ir para amanhã
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
        if (weekdays && weekdays.length > 0 && weekdays.length < 7) {
          nextRun = findNextValidDay(nextRun, weekdays);
        }
        nextRun = applyTime(nextRun, recurringTime);
      }

      return nextRun.toISOString();

    case 'weekly':
      nextRun = new Date(now.getTime() + interval * 604800000);

      // Se há dias da semana especificados
      if (weekdays && weekdays.length > 0) {
        nextRun = findNextValidDay(nextRun, weekdays);
      }

      nextRun = applyTime(nextRun, recurringTime);
      return nextRun.toISOString();

    case 'monthly':
      nextRun = new Date(now);
      nextRun.setMonth(nextRun.getMonth() + interval);

      // Se há dias da semana especificados
      if (weekdays && weekdays.length > 0 && weekdays.length < 7) {
        nextRun = findNextValidDay(nextRun, weekdays);
      }

      nextRun = applyTime(nextRun, recurringTime);
      return nextRun.toISOString();

    default:
      // Fallback: 1 hora
      return new Date(now.getTime() + 3600000).toISOString();
  }
}

/**
 * Cancela uma execução em andamento
 */
function cancelExecution(executionId) {
  const running = runningTasks.get(executionId);

  if (!running) {
    return false;
  }

  // Limpar watchdog se existir
  if (running.watchdog) {
    clearTimeout(running.watchdog);
  }

  if (running.process) {
    // No Windows, matar arvore de processos inteira
    if (process.platform === 'win32') {
      exec(`taskkill /pid ${running.process.pid} /T /F`, () => {});
    } else {
      running.process.kill('SIGTERM');
    }
  }

  storage.updateExecution(executionId, {
    status: 'cancelled',
    finishedAt: new Date().toISOString(),
    duration: Date.now() - running.startTime
  });

  storage.updateTask(running.task.id, {
    status: 'scheduled'
  });

  runningTasks.delete(executionId);

  // Broadcast: execução cancelada
  if (global.broadcastUpdate) {
    global.broadcastUpdate('execution:cancelled', { id: executionId, taskId: running.task.id });
  }

  console.log(`[Executor][${new Date().toISOString()}] INFO: Execução cancelada`, { executionId });

  return true;
}

/**
 * Obtém tarefas em execução
 */
function getRunningTasks() {
  return Array.from(runningTasks.entries()).map(([id, data]) => ({
    executionId: id,
    taskId: data.task.id,
    taskName: data.task.name,
    startTime: data.startTime,
    duration: Date.now() - data.startTime
  }));
}

/**
 * Resume a completed Claude session with a follow-up message.
 * Uses claude --resume <sessionId> to continue the conversation.
 */
async function resumeClaudeSession(executionId, newPrompt, workingDirectory) {
  const execution = storage.getExecution(executionId);
  if (!execution) {
    throw new Error(`Execution not found: ${executionId}`);
  }

  if (!execution.claudeSessionId) {
    throw new Error(`Execution ${executionId} has no Claude session ID`);
  }

  // Check if already running
  if (runningTasks.has(executionId)) {
    throw new Error(`Execution ${executionId} is already running`);
  }

  const claudeSessionId = execution.claudeSessionId;
  const cwd = workingDirectory || process.cwd();

  console.log(`[Executor][${new Date().toISOString()}] INFO: Resuming Claude session`, {
    executionId,
    claudeSessionId,
    prompt: (newPrompt || '').substring(0, 100) + '...',
    cwd
  });

  // Set status to resuming
  storage.updateExecution(executionId, { status: 'resuming' });

  // Parse existing conversation log
  let existingSteps = [];
  if (execution.conversationLog) {
    try {
      existingSteps = JSON.parse(execution.conversationLog);
    } catch (e) {
      existingSteps = [];
    }
  }

  // Insert user_message marker into the conversation
  existingSteps.push({
    type: 'user_message',
    text: newPrompt,
    timestamp: new Date().toISOString()
  });

  // Save immediately with the user message
  storage.updateExecution(executionId, {
    conversationLog: JSON.stringify(existingSteps)
  });

  // Broadcast resuming event
  if (global.broadcastUpdate) {
    global.broadcastUpdate('execution:resuming', { executionId, claudeSessionId });
  }

  const startTime = Date.now();

  // Track this as a running task
  runningTasks.set(executionId, {
    task: { id: execution.taskId, name: execution.taskName },
    execution,
    startTime,
    process: null
  });

  return new Promise((resolve, reject) => {
    const args = [
      '--resume', claudeSessionId,
      '-p',
      '--dangerously-skip-permissions',
      '--output-format', 'stream-json',
      '--verbose'
    ];

    let rawOutput = '';
    const newSteps = [];

    const resumeTimeout = 600000;
    // Remover CLAUDECODE do env para evitar erro "cannot be launched inside another Claude Code session"
    const resumeChildEnv = { ...process.env, ...credentialVault.getEnvVars() };
    delete resumeChildEnv.CLAUDECODE;
    delete resumeChildEnv.CLAUDE_CODE;

    const child = spawn('claude', args, {
      cwd,
      shell: true,
      // NAO usar timeout do spawn (nao mata arvore de processos no Windows)
      env: resumeChildEnv
    });

    // Watchdog proprio para matar arvore de processos no Windows
    const watchdog = setTimeout(() => {
      console.log(`[Executor][${new Date().toISOString()}] WARN: Resume timeout atingido (${resumeTimeout}ms), matando processo`, { executionId });
      try {
        if (process.platform === 'win32') {
          exec(`taskkill /pid ${child.pid} /T /F`, () => {});
        } else {
          child.kill('SIGTERM');
        }
      } catch (killErr) {
        console.log(`[Executor][${new Date().toISOString()}] ERROR: Falha ao matar processo resume`, { executionId, error: killErr.message });
      }
    }, resumeTimeout);

    const running = runningTasks.get(executionId);
    if (running) {
      running.process = child;
      running.watchdog = watchdog;
    }

    // Write the follow-up prompt to stdin (resolve credential refs)
    const resolvedPrompt = credentialVault.resolve(newPrompt);
    child.stdin.on('error', (err) => {
      console.error('[Executor] follow-up stdin write error (pipe fechado):', err.message);
    });
    child.stdin.write(resolvedPrompt);
    child.stdin.end();

    child.stdout.on('data', (data) => {
      rawOutput += data.toString();

      const lines = rawOutput.split('\n');
      rawOutput = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line);
          processStreamEvent(event, newSteps, executionId);
        } catch (e) {
          // Not valid JSON, skip
        }
      }

      // Merge new steps with existing and update in real time
      const mergedSteps = [...existingSteps, ...newSteps];
      storage.updateExecution(executionId, {
        conversationLog: JSON.stringify(mergedSteps)
      });
    });

    child.stderr.on('data', () => {
      // Ignore stderr during resume
    });

    child.on('close', (code) => {
      // Limpar watchdog de timeout
      clearTimeout(watchdog);

      // Parse remaining buffer
      if (rawOutput.trim()) {
        try {
          const event = JSON.parse(rawOutput);
          processStreamEvent(event, newSteps, executionId);
        } catch (e) { }
      }

      // Extract metadata from result event in new steps
      const resultEvent = newSteps.find(s => s.type === 'result');
      const addedCost = resultEvent?.totalCost || 0;
      const addedTurns = resultEvent?.numTurns || 0;

      // Accumulate cost and turns
      const totalCost = (Number(execution.costUsd) || 0) + addedCost;
      const totalTurns = (Number(execution.numTurns) || 0) + addedTurns;

      // Final merge
      const finalSteps = [...existingSteps, ...newSteps];
      const finalStatus = (code === 0 || code === null) ? 'success' : 'failed';

      storage.updateExecution(executionId, {
        status: finalStatus,
        conversationLog: JSON.stringify(finalSteps),
        costUsd: totalCost,
        numTurns: totalTurns,
        resumedAt: new Date().toISOString()
      });

      runningTasks.delete(executionId);

      // Broadcast resumed event
      if (global.broadcastUpdate) {
        global.broadcastUpdate('execution:resumed', {
          executionId,
          taskId: execution.taskId,
          claudeSessionId,
          status: finalStatus,
          addedCost,
          addedTurns
        });
      }

      console.log(`[Executor][${new Date().toISOString()}] INFO: Claude session resumed`, {
        executionId,
        claudeSessionId,
        status: finalStatus,
        addedCost,
        addedTurns,
        duration: Date.now() - startTime
      });

      if (finalStatus === 'success') {
        resolve({ success: true, executionId, addedCost, addedTurns });
      } else {
        reject(new Error(`Resume failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      runningTasks.delete(executionId);

      storage.updateExecution(executionId, {
        status: 'failed',
        conversationLog: JSON.stringify([...existingSteps, ...newSteps])
      });

      if (global.broadcastUpdate) {
        global.broadcastUpdate('execution:resume_failed', {
          executionId,
          claudeSessionId,
          error: error.message
        });
      }

      reject(error);
    });
  });
}

module.exports = {
  executeTask,
  cancelExecution,
  getRunningTasks,
  resumeClaudeSession
};
