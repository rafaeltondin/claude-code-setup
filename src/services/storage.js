/**
 * STORAGE MODULE - Persistência de dados em JSON
 *
 * Gerencia o armazenamento de tarefas, execuções e configurações
 * com cache em memória e sincronização com disco.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const EXECUTIONS_FILE = path.join(DATA_DIR, 'executions.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// Cache em memória
let tasksCache = null;
let executionsCache = null;
let configCache = null;

/**
 * Garante que o diretório de dados existe
 */
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`[Storage][${new Date().toISOString()}] INFO: Diretório de dados criado`);
  }
}

/**
 * Lê arquivo JSON com tratamento de erros
 */
function readJsonFile(filePath, defaultValue = []) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
    return defaultValue;
  } catch (error) {
    console.error(`[Storage][${new Date().toISOString()}] ERROR: Falha ao ler ${filePath}`, error.message);
    return defaultValue;
  }
}

/**
 * Escreve arquivo JSON com backup
 */
function writeJsonFile(filePath, data) {
  try {
    ensureDataDir();

    // Backup antes de sobrescrever
    if (fs.existsSync(filePath)) {
      const backupPath = filePath + '.backup';
      fs.copyFileSync(filePath, backupPath);
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`[Storage][${new Date().toISOString()}] ERROR: Falha ao escrever ${filePath}`, error.message);
    return false;
  }
}

// ============ TASKS ============

/**
 * Obtém todas as tarefas
 */
function getTasks() {
  if (tasksCache === null) {
    tasksCache = readJsonFile(TASKS_FILE, []);
  }
  return tasksCache;
}

/**
 * Obtém uma tarefa por ID
 */
function getTask(taskId) {
  const tasks = getTasks();
  return tasks.find(t => t.id === taskId) || null;
}

/**
 * Adiciona uma nova tarefa
 */
function addTask(task) {
  const tasks = getTasks();
  tasks.push(task);
  tasksCache = tasks;
  writeJsonFile(TASKS_FILE, tasks);
  console.log(`[Storage][${new Date().toISOString()}] INFO: Tarefa adicionada`, { id: task.id });
  return task;
}

/**
 * Atualiza uma tarefa existente
 */
function updateTask(taskId, updates) {
  const tasks = getTasks();
  const index = tasks.findIndex(t => t.id === taskId);

  if (index === -1) {
    console.error(`[Storage][${new Date().toISOString()}] ERROR: Tarefa não encontrada`, { taskId });
    return null;
  }

  tasks[index] = { ...tasks[index], ...updates, updatedAt: new Date().toISOString() };
  tasksCache = tasks;
  writeJsonFile(TASKS_FILE, tasks);
  console.log(`[Storage][${new Date().toISOString()}] INFO: Tarefa atualizada`, { id: taskId });
  return tasks[index];
}

/**
 * Remove uma tarefa
 */
function deleteTask(taskId) {
  const tasks = getTasks();
  const index = tasks.findIndex(t => t.id === taskId);

  if (index === -1) {
    return false;
  }

  tasks.splice(index, 1);
  tasksCache = tasks;
  writeJsonFile(TASKS_FILE, tasks);
  console.log(`[Storage][${new Date().toISOString()}] INFO: Tarefa removida`, { id: taskId });
  return true;
}

/**
 * Obtém tarefas pendentes para execução
 */
function getPendingTasks() {
  const tasks = getTasks();
  const now = new Date();

  return tasks.filter(task => {
    if (task.status !== 'scheduled') return false;
    if (!task.enabled) return false;
    // Tarefas claude_code sao apenas para visualizacao — nao executar
    if (task.type === 'claude_code' || task.source === 'claude-code') return false;

    const scheduledTime = new Date(task.scheduledAt);
    return scheduledTime <= now;
  });
}

/**
 * Obtém tarefas agendadas (futuras)
 */
function getScheduledTasks() {
  const tasks = getTasks();
  return tasks.filter(t => t.status === 'scheduled' && t.enabled);
}

// ============ EXECUTIONS ============

/**
 * Obtém uma execução por ID
 */
function getExecution(executionId) {
  const executions = getExecutions(10000);
  return executions.find(e => e.id === executionId) || null;
}

/**
 * Obtém todas as execuções
 */
function getExecutions(limit = 100) {
  if (executionsCache === null) {
    executionsCache = readJsonFile(EXECUTIONS_FILE, []);
  }

  // Retorna as mais recentes primeiro
  return executionsCache
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
    .slice(0, limit);
}

/**
 * Obtém execuções de uma tarefa específica
 */
function getTaskExecutions(taskId, limit = 50) {
  const executions = getExecutions(1000);
  return executions
    .filter(e => e.taskId === taskId)
    .slice(0, limit);
}

/**
 * Adiciona uma nova execução
 */
function addExecution(execution) {
  const executions = getExecutions(10000);
  executions.unshift(execution);

  // Mantém apenas as últimas 10000 execuções
  if (executions.length > 10000) {
    executions.length = 10000;
  }

  executionsCache = executions;
  writeJsonFile(EXECUTIONS_FILE, executions);
  console.log(`[Storage][${new Date().toISOString()}] INFO: Execução registrada`, {
    id: execution.id,
    taskId: execution.taskId,
    status: execution.status
  });
  return execution;
}

/**
 * Atualiza uma execução
 */
function updateExecution(executionId, updates) {
  const executions = getExecutions(10000);
  const index = executions.findIndex(e => e.id === executionId);

  if (index === -1) {
    return null;
  }

  executions[index] = { ...executions[index], ...updates };
  executionsCache = executions;
  writeJsonFile(EXECUTIONS_FILE, executions);
  return executions[index];
}

/**
 * Obtém estatísticas de execuções
 */
function getExecutionStats() {
  const executions = getExecutions(10000);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const todayExecutions = executions.filter(e => new Date(e.startedAt) >= today);
  const weekExecutions = executions.filter(e => new Date(e.startedAt) >= weekAgo);

  return {
    total: executions.length,
    today: {
      total: todayExecutions.length,
      success: todayExecutions.filter(e => e.status === 'success').length,
      failed: todayExecutions.filter(e => e.status === 'failed').length,
      running: todayExecutions.filter(e => e.status === 'running').length
    },
    week: {
      total: weekExecutions.length,
      success: weekExecutions.filter(e => e.status === 'success').length,
      failed: weekExecutions.filter(e => e.status === 'failed').length
    },
    successRate: executions.length > 0
      ? Math.round((executions.filter(e => e.status === 'success').length / executions.length) * 100)
      : 0,
    avgDuration: executions.length > 0
      ? Math.round(executions.reduce((sum, e) => sum + (e.duration || 0), 0) / executions.length)
      : 0
  };
}

// ============ CONFIG ============

/**
 * Obtém configuração
 */
function getConfig() {
  if (configCache === null) {
    configCache = readJsonFile(CONFIG_FILE, {
      schedulerEnabled: true,
      checkInterval: 60000, // 1 minuto
      maxConcurrentTasks: 3,
      retryAttempts: 3,
      retryDelay: 5000,
      notifications: {
        enabled: false,
        onSuccess: false,
        onFailure: true,
        webhook: null
      }
    });
  }
  return configCache;
}

/**
 * Atualiza configuração
 */
function updateConfig(updates) {
  const config = getConfig();
  const newConfig = { ...config, ...updates };
  configCache = newConfig;
  writeJsonFile(CONFIG_FILE, newConfig);
  console.log(`[Storage][${new Date().toISOString()}] INFO: Configuração atualizada`);
  return newConfig;
}

// ============ UTILITIES ============

/**
 * Limpa cache em memória
 */
function clearCache() {
  tasksCache = null;
  executionsCache = null;
  configCache = null;
  console.log(`[Storage][${new Date().toISOString()}] INFO: Cache limpo`);
}

/**
 * Apaga todas as execuções
 */
function purgeExecutions() {
  executionsCache = [];
  writeJsonFile(EXECUTIONS_FILE, []);
  console.log(`[Storage][${new Date().toISOString()}] INFO: Todas as execuções foram apagadas`);
  return true;
}

/**
 * Apaga todas as tarefas que não estão running
 */
function purgeTasks() {
  const tasks = getTasks();
  const running = tasks.filter(t => t.status === 'running');
  tasksCache = running;
  writeJsonFile(TASKS_FILE, running);
  console.log(`[Storage][${new Date().toISOString()}] INFO: Tarefas limpas (mantidas ${running.length} em execução)`);
  return tasks.length - running.length;
}

/**
 * Exporta todos os dados
 */
function exportData() {
  return {
    tasks: getTasks(),
    executions: getExecutions(10000),
    config: getConfig(),
    exportedAt: new Date().toISOString()
  };
}

/**
 * Importa dados
 */
function importData(data) {
  if (data.tasks) {
    tasksCache = data.tasks;
    writeJsonFile(TASKS_FILE, data.tasks);
  }
  if (data.executions) {
    executionsCache = data.executions;
    writeJsonFile(EXECUTIONS_FILE, data.executions);
  }
  if (data.config) {
    configCache = data.config;
    writeJsonFile(CONFIG_FILE, data.config);
  }
  console.log(`[Storage][${new Date().toISOString()}] INFO: Dados importados`);
  return true;
}

module.exports = {
  // Tasks
  getTasks,
  getTask,
  addTask,
  updateTask,
  deleteTask,
  getPendingTasks,
  getScheduledTasks,

  // Executions
  getExecution,
  getExecutions,
  getTaskExecutions,
  addExecution,
  updateExecution,
  getExecutionStats,

  // Config
  getConfig,
  updateConfig,

  // Utilities
  clearCache,
  exportData,
  importData,
  purgeExecutions,
  purgeTasks
};
