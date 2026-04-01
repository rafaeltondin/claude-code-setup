/**
 * CLAUDE TASK SCHEDULER - Entry Point
 *
 * Sistema de agendamento de tarefas para Claude Code
 * com dashboard web para monitoramento.
 */

const storage = require('./storage');
const scheduler = require('./scheduler');
const executor = require('./executor');
const telegramBot = require('./telegram-bot');
const { app, server, broadcastUpdate } = require('./server');

module.exports = {
  // Storage
  storage,

  // Scheduler
  scheduler,

  // Executor
  executor,

  // Telegram Bot
  telegramBot,

  // Server
  app,
  server,
  broadcastUpdate,

  // Quick helpers
  createTask: (taskData) => storage.addTask({
    ...taskData,
    id: require('uuid').v4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'scheduled',
    enabled: true,
    priority: taskData.priority || 2,
    successCount: 0,
    failCount: 0,
    scheduledAt: taskData.scheduledAt || new Date().toISOString()
  }),

  getTasks: () => storage.getTasks(),

  getTask: (id) => storage.getTask(id),

  runTask: (id) => scheduler.runNow(id),

  pauseTask: (id) => scheduler.pauseTask(id),

  resumeTask: (id) => scheduler.resumeTask(id),

  deleteTask: (id) => storage.deleteTask(id),

  getExecutions: (limit) => storage.getExecutions(limit),

  getStats: () => storage.getExecutionStats(),

  startScheduler: () => scheduler.start(),

  stopScheduler: () => scheduler.stop(),

  getStatus: () => scheduler.getStatus()
};

// Mensagem de inicialização quando importado
console.log(`[TaskScheduler][${new Date().toISOString()}] Módulo carregado`);
