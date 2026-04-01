/**
 * Módulo: Config — Configuração global do servidor + export/import
 */
const { Router } = require('express');
const { JsonStore } = require('../../shared/utils/json-store');

const router = Router();

const configStore = new JsonStore('config', {
  schedulerEnabled: true,
  checkInterval: 60000,
  maxConcurrentTasks: 3,
  retryAttempts: 3,
  retryDelay: 5000,
  notifications: { enabled: false, onSuccess: false, onFailure: true, webhook: null }
});

router.get('/', (req, res) => res.json(configStore.read()));

router.put('/', (req, res) => {
  const updated = { ...configStore.read(), ...req.body };
  configStore.write(updated);
  res.json(updated);
});

// Notifications config (sub-recurso)
router.get('/notifications', (req, res) => {
  const config = configStore.read();
  res.json(config.notifications || {});
});

router.put('/notifications', (req, res) => {
  const config = configStore.read();
  config.notifications = { ...config.notifications, ...req.body };
  configStore.write(config);
  res.json(config.notifications);
});

// Export/Import completo
router.get('/export', (req, res) => {
  const tasksStore = new JsonStore('tasks', []);
  const execsStore = new JsonStore('executions', []);
  res.json({
    tasks: tasksStore.read(),
    executions: execsStore.read(),
    config: configStore.read(),
    exportedAt: new Date().toISOString()
  });
});

router.post('/import', (req, res) => {
  const { tasks, executions, config } = req.body;
  if (tasks) new JsonStore('tasks', []).write(tasks);
  if (executions) new JsonStore('executions', []).write(executions);
  if (config) configStore.write(config);
  res.json({ imported: true });
});

module.exports = { prefix: '/api/config', router };
