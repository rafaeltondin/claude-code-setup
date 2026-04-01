/**
 * SCHEDULER MODULE - Gerencia o agendamento e execução de tarefas
 *
 * Verifica periodicamente tarefas pendentes e as executa.
 * Suporta cron expressions e intervalos simples.
 */

const cron = require('node-cron');
const storage = require('./storage');
const executor = require('./executor');
const { execSync } = require('child_process');
const http = require('http');

let schedulerInterval = null;
let cronJobs = new Map();
let prismaScheduledJobs = new Map(); // Cron jobs das tarefas Prisma
let isRunning = false;
let orphanCheckInterval = null;

// Prisma client (lazy loaded)
let _prisma = null;
function getPrisma() {
  if (!_prisma) {
    try {
      _prisma = require('../modules/crm-prisma/dist/config/database').prisma;
    } catch (_) {}
  }
  return _prisma;
}

const ORPHAN_THRESHOLD_MS = 3600000; // 1 hora
const LOCK_ID = `scheduler-${process.pid}`;

/**
 * Inicia o scheduler
 */
function start() {
  if (isRunning) {
    console.log(`[Scheduler][${new Date().toISOString()}] WARN: Scheduler já está rodando`);
    return;
  }

  const config = storage.getConfig();

  if (!config.schedulerEnabled) {
    console.log(`[Scheduler][${new Date().toISOString()}] INFO: Scheduler desabilitado na configuração`);
    return;
  }

  isRunning = true;

  console.log(`[Scheduler][${new Date().toISOString()}] INFO: Iniciando scheduler`, {
    checkInterval: `${config.checkInterval}ms`,
    maxConcurrent: config.maxConcurrentTasks
  });

  // Verificação periódica de tarefas pendentes
  schedulerInterval = setInterval(() => {
    checkPendingTasks();
  }, config.checkInterval);

  // Verificação inicial
  checkPendingTasks();

  // Configurar tarefas cron (EcoTasks legado)
  setupCronJobs();

  // Configurar tarefas agendadas do Prisma (persistent queue)
  setupPrismaScheduledTasks().catch(err => {
    console.error(`[Scheduler][${new Date().toISOString()}] ERROR: Falha ao setup Prisma tasks`, { error: err.message });
  });

  // Verificar tarefas órfãs a cada 15min
  orphanCheckInterval = setInterval(() => checkOrphanTasks(), 900000);
  // Check inicial após 30s
  setTimeout(() => checkOrphanTasks(), 30000);

  console.log(`[Scheduler][${new Date().toISOString()}] INFO: Scheduler iniciado com sucesso`);
}

/**
 * Para o scheduler
 */
function stop() {
  if (!isRunning) {
    return;
  }

  isRunning = false;

  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }

  // Parar todos os cron jobs (EcoTasks)
  cronJobs.forEach((job, taskId) => {
    job.stop();
    console.log(`[Scheduler][${new Date().toISOString()}] INFO: Cron job parado`, { taskId });
  });
  cronJobs.clear();

  // Parar cron jobs Prisma
  prismaScheduledJobs.forEach((job, taskId) => {
    job.stop();
  });
  prismaScheduledJobs.clear();

  // Parar verificação de tarefas órfãs
  if (orphanCheckInterval) {
    clearInterval(orphanCheckInterval);
    orphanCheckInterval = null;
  }

  console.log(`[Scheduler][${new Date().toISOString()}] INFO: Scheduler parado`);
}

/**
 * Verifica e executa tarefas pendentes
 */
async function checkPendingTasks() {
  if (!isRunning) return;

  const config = storage.getConfig();
  const pendingTasks = storage.getPendingTasks();
  const runningTasks = executor.getRunningTasks();

  if (pendingTasks.length === 0) {
    return;
  }

  console.log(`[Scheduler][${new Date().toISOString()}] INFO: Verificando tarefas pendentes`, {
    pending: pendingTasks.length,
    running: runningTasks.length,
    maxConcurrent: config.maxConcurrentTasks
  });

  // Calcular quantas tarefas podem ser executadas
  const availableSlots = config.maxConcurrentTasks - runningTasks.length;

  if (availableSlots <= 0) {
    console.log(`[Scheduler][${new Date().toISOString()}] INFO: Slots de execução cheios, aguardando`);
    return;
  }

  // Ordenar por prioridade e data de agendamento
  const sortedTasks = pendingTasks.sort((a, b) => {
    // Prioridade primeiro (1 = alta, 3 = baixa)
    const priorityDiff = (a.priority || 2) - (b.priority || 2);
    if (priorityDiff !== 0) return priorityDiff;

    // Data de agendamento
    return new Date(a.scheduledAt) - new Date(b.scheduledAt);
  });

  // Executar tarefas disponíveis
  const tasksToRun = sortedTasks.slice(0, availableSlots);

  for (const task of tasksToRun) {
    try {
      // Não aguardar - executar em paralelo
      executor.executeTask(task).catch(error => {
        console.error(`[Scheduler][${new Date().toISOString()}] ERROR: Falha na execução`, {
          taskId: task.id,
          error: error.message
        });
      });
    } catch (error) {
      console.error(`[Scheduler][${new Date().toISOString()}] ERROR: Erro ao iniciar tarefa`, {
        taskId: task.id,
        error: error.message
      });
    }
  }
}

/**
 * Configura cron jobs para tarefas recorrentes
 */
function setupCronJobs() {
  const tasks = storage.getTasks();
  const cronTasks = tasks.filter(t =>
    t.enabled &&
    t.recurring &&
    t.cronExpression &&
    cron.validate(t.cronExpression)
  );

  for (const task of cronTasks) {
    setupCronJob(task);
  }

  console.log(`[Scheduler][${new Date().toISOString()}] INFO: Cron jobs configurados`, {
    count: cronTasks.length
  });
}

/**
 * Configura um cron job individual
 */
function setupCronJob(task) {
  // Remover job existente se houver
  if (cronJobs.has(task.id)) {
    cronJobs.get(task.id).stop();
    cronJobs.delete(task.id);
  }

  if (!cron.validate(task.cronExpression)) {
    console.error(`[Scheduler][${new Date().toISOString()}] ERROR: Cron expression inválida`, {
      taskId: task.id,
      expression: task.cronExpression
    });
    return;
  }

  const job = cron.schedule(task.cronExpression, () => {
    console.log(`[Scheduler][${new Date().toISOString()}] INFO: Cron trigger`, { taskId: task.id });

    // Atualizar tarefa para execução imediata
    storage.updateTask(task.id, {
      scheduledAt: new Date().toISOString(),
      status: 'scheduled'
    });

    // Verificar tarefas pendentes
    checkPendingTasks();
  }, {
    scheduled: true,
    timezone: 'America/Sao_Paulo'
  });

  cronJobs.set(task.id, job);

  console.log(`[Scheduler][${new Date().toISOString()}] INFO: Cron job configurado`, {
    taskId: task.id,
    expression: task.cronExpression
  });
}

/**
 * Remove um cron job
 */
function removeCronJob(taskId) {
  if (cronJobs.has(taskId)) {
    cronJobs.get(taskId).stop();
    cronJobs.delete(taskId);
    console.log(`[Scheduler][${new Date().toISOString()}] INFO: Cron job removido`, { taskId });
    return true;
  }
  return false;
}

/**
 * Atualiza um cron job
 */
function updateCronJob(task) {
  if (task.recurring && task.cronExpression) {
    setupCronJob(task);
  } else {
    removeCronJob(task.id);
  }
}

/**
 * Obtém status do scheduler
 */
function getStatus() {
  const config = storage.getConfig();
  const pendingTasks = storage.getPendingTasks();
  const scheduledTasks = storage.getScheduledTasks();
  const runningTasks = executor.getRunningTasks();
  const stats = storage.getExecutionStats();

  return {
    isRunning,
    config: {
      enabled: config.schedulerEnabled,
      checkInterval: config.checkInterval,
      maxConcurrentTasks: config.maxConcurrentTasks
    },
    tasks: {
      total: storage.getTasks().length,
      pending: pendingTasks.length,
      scheduled: scheduledTasks.length,
      running: runningTasks.length,
      cronJobs: cronJobs.size
    },
    executions: stats,
    runningTasks: runningTasks
  };
}

/**
 * Força execução imediata de uma tarefa
 */
async function runNow(taskId) {
  const task = storage.getTask(taskId);

  if (!task) {
    throw new Error(`Tarefa não encontrada: ${taskId}`);
  }

  console.log(`[Scheduler][${new Date().toISOString()}] INFO: Execução forçada`, { taskId });

  return executor.executeTask(task);
}

/**
 * Pausa uma tarefa
 */
function pauseTask(taskId) {
  const task = storage.getTask(taskId);

  if (!task) {
    throw new Error(`Tarefa não encontrada: ${taskId}`);
  }

  storage.updateTask(taskId, {
    enabled: false,
    status: 'paused'
  });

  removeCronJob(taskId);

  console.log(`[Scheduler][${new Date().toISOString()}] INFO: Tarefa pausada`, { taskId });

  return true;
}

/**
 * Resume uma tarefa pausada
 */
function resumeTask(taskId) {
  const task = storage.getTask(taskId);

  if (!task) {
    throw new Error(`Tarefa não encontrada: ${taskId}`);
  }

  storage.updateTask(taskId, {
    enabled: true,
    status: 'scheduled',
    scheduledAt: new Date().toISOString()
  });

  if (task.recurring && task.cronExpression) {
    setupCronJob({ ...task, enabled: true });
  }

  console.log(`[Scheduler][${new Date().toISOString()}] INFO: Tarefa resumida`, { taskId });

  return true;
}

// ─── Prisma Scheduled Tasks — Persistent Queue ──────────────────

/**
 * Carrega tarefas agendadas do Prisma e configura cron jobs
 */
async function setupPrismaScheduledTasks() {
  const db = getPrisma();
  if (!db) {
    console.log(`[Scheduler][${new Date().toISOString()}] WARN: Prisma não disponível para scheduled tasks`);
    return;
  }

  try {
    const tasks = await db.scheduledTask.findMany({ where: { status: 'active' } });
    console.log(`[Scheduler][${new Date().toISOString()}] INFO: Carregando ${tasks.length} scheduled tasks do Prisma`);

    for (const task of tasks) {
      setupPrismaJob(task);
    }
  } catch (err) {
    console.error(`[Scheduler][${new Date().toISOString()}] ERROR: Falha ao carregar scheduled tasks`, { error: err.message });
  }
}

/**
 * Configura cron job para uma tarefa Prisma
 */
function setupPrismaJob(task) {
  // Remover job existente
  if (prismaScheduledJobs.has(task.id)) {
    prismaScheduledJobs.get(task.id).stop();
    prismaScheduledJobs.delete(task.id);
  }

  if (!cron.validate(task.cron)) {
    console.error(`[Scheduler][${new Date().toISOString()}] ERROR: Cron inválida para tarefa Prisma`, { id: task.id, cron: task.cron });
    return;
  }

  const job = cron.schedule(task.cron, () => executePrismaTask(task), {
    scheduled: true,
    timezone: 'America/Sao_Paulo'
  });

  prismaScheduledJobs.set(task.id, job);
}

/**
 * Executa uma tarefa do Prisma com lock pessimista
 */
async function executePrismaTask(task) {
  const db = getPrisma();
  if (!db) return;

  const startTime = Date.now();

  try {
    // Lock pessimista: marcar como locked via transação
    const locked = await db.$transaction(async (tx) => {
      const current = await tx.scheduledTask.findUnique({ where: { id: task.id } });
      if (!current || current.status !== 'active') return null;
      if (current.lockedBy && current.lockedAt) {
        // Verificar se lock não é órfão
        const lockAge = Date.now() - new Date(current.lockedAt).getTime();
        if (lockAge < ORPHAN_THRESHOLD_MS) return null; // Outra instância está executando
      }
      return tx.scheduledTask.update({
        where: { id: task.id },
        data: { lockedBy: LOCK_ID, lockedAt: new Date() }
      });
    });

    if (!locked) {
      console.log(`[Scheduler][${new Date().toISOString()}] INFO: Tarefa ${task.id} já está locked, pulando`);
      return;
    }

    console.log(`[Scheduler][${new Date().toISOString()}] INFO: Executando tarefa Prisma`, { id: task.id, name: task.name, type: task.type });

    let output = '';
    if (task.type === 'shell') {
      output = execSync(task.command, { timeout: 120000, encoding: 'utf-8', cwd: process.env.HOME || process.env.USERPROFILE }).substring(0, 5000);
    } else if (task.type === 'node') {
      output = execSync(`node "${task.command}"`, { timeout: 120000, encoding: 'utf-8' }).substring(0, 5000);
    } else if (task.type === 'api' && task.apiConfig) {
      const config = JSON.parse(task.apiConfig);
      output = await httpRequest(config);
    }

    // Sucesso: atualizar estado
    await db.scheduledTask.update({
      where: { id: task.id },
      data: {
        lastRunAt: new Date(),
        lastResult: (output || 'OK').substring(0, 2000),
        lastError: null,
        retryCount: 0,
        lockedBy: null,
        lockedAt: null
      }
    });

    console.log(`[Scheduler][${new Date().toISOString()}] INFO: Tarefa ${task.name} concluída em ${Date.now() - startTime}ms`);

  } catch (err) {
    console.error(`[Scheduler][${new Date().toISOString()}] ERROR: Tarefa ${task.name} falhou`, { error: err.message });

    try {
      await db.scheduledTask.update({
        where: { id: task.id },
        data: {
          lastRunAt: new Date(),
          lastError: err.message.substring(0, 2000),
          retryCount: { increment: 1 },
          lockedBy: null,
          lockedAt: null
        }
      });
    } catch (_) {}
  }
}

/**
 * HTTP request helper para tarefas tipo API
 */
function httpRequest(config) {
  return new Promise((resolve, reject) => {
    const url = new URL(config.url);
    const lib = url.protocol === 'https:' ? require('https') : http;
    const body = config.body ? JSON.stringify(config.body) : null;
    const opts = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: config.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...(config.headers || {}) },
      timeout: 60000
    };
    if (body) opts.headers['Content-Length'] = Buffer.byteLength(body);

    const req = lib.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data.substring(0, 5000)));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('HTTP request timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

/**
 * Detecta e libera tarefas órfãs (locked há mais de 1h sem update)
 */
async function checkOrphanTasks() {
  const db = getPrisma();
  if (!db) return;

  try {
    const threshold = new Date(Date.now() - ORPHAN_THRESHOLD_MS);
    const orphans = await db.scheduledTask.findMany({
      where: { lockedBy: { not: null }, lockedAt: { lt: threshold } }
    });

    for (const orphan of orphans) {
      console.log(`[Scheduler][${new Date().toISOString()}] WARN: Liberando tarefa órfã`, { id: orphan.id, name: orphan.name, lockedBy: orphan.lockedBy });
      await db.scheduledTask.update({
        where: { id: orphan.id },
        data: { lockedBy: null, lockedAt: null, lastError: `Orphan lock released (was: ${orphan.lockedBy})` }
      });
    }
  } catch (err) {
    console.error(`[Scheduler][${new Date().toISOString()}] ERROR: Falha ao verificar tarefas órfãs`, { error: err.message });
  }
}

// Iniciar se executado diretamente
if (require.main === module) {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║           CLAUDE TASK SCHEDULER - Modo Standalone              ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  start();

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n[Scheduler] Recebido SIGINT, encerrando...');
    stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n[Scheduler] Recebido SIGTERM, encerrando...');
    stop();
    process.exit(0);
  });
}

module.exports = {
  start,
  stop,
  getStatus,
  runNow,
  pauseTask,
  resumeTask,
  setupCronJob,
  removeCronJob,
  updateCronJob,
  checkPendingTasks,
  // Prisma scheduled tasks
  setupPrismaScheduledTasks,
  executePrismaTask,
  checkOrphanTasks,
  setupPrismaJob
};
