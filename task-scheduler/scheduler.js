/**
 * SCHEDULER MODULE - Gerencia o agendamento e execução de tarefas
 *
 * Verifica periodicamente tarefas pendentes e as executa.
 * Suporta cron expressions e intervalos simples.
 */

const cron = require('node-cron');
const storage = require('./storage');
const executor = require('./executor');

let schedulerInterval = null;
let cronJobs = new Map();
let isRunning = false;

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

  // Configurar tarefas cron
  setupCronJobs();

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

  // Parar todos os cron jobs
  cronJobs.forEach((job, taskId) => {
    job.stop();
    console.log(`[Scheduler][${new Date().toISOString()}] INFO: Cron job parado`, { taskId });
  });
  cronJobs.clear();

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
  checkPendingTasks
};
