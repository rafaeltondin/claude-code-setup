/**
 * Módulo: Compat — Rotas de compatibilidade com o frontend compilado.
 * O frontend foi compilado apontando para rotas do server.js antigo.
 * Este módulo cria aliases para as rotas novas.
 */
const { Router } = require('express');
const { JsonStore } = require('../../shared/utils/json-store');

const router = Router();
const tasksStore = new JsonStore('tasks', []);
const executionsStore = new JsonStore('executions', []);
const configStore = new JsonStore('config', {});

// /api/executions → alias de /api/tasks/executions/list
router.get('/executions', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const execs = executionsStore.read()
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
    .slice(0, limit);
  res.json(execs);
});

router.get('/executions/stats', (req, res) => {
  const execs = executionsStore.read();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayExecs = execs.filter(e => new Date(e.startedAt) >= today);
  res.json({
    total: execs.length,
    today: { total: todayExecs.length, success: todayExecs.filter(e => e.status === 'success').length,
      failed: todayExecs.filter(e => e.status === 'failed').length, running: todayExecs.filter(e => e.status === 'running').length },
    successRate: execs.length > 0 ? Math.round((execs.filter(e => e.status === 'success').length / execs.length) * 100) : 0
  });
});

router.get('/executions/running', (req, res) => {
  const running = executionsStore.read().filter(e => e.status === 'running');
  res.json(running);
});

// /api/notifications/config → alias para config de notificações
router.get('/notifications/config', (req, res) => {
  const config = configStore.read();
  res.json(config.notifications || {});
});

router.put('/notifications/config', (req, res) => {
  const config = configStore.read();
  config.notifications = { ...config.notifications, ...req.body };
  configStore.write(config);
  res.json(config.notifications);
});

// /api/scheduled-tasks → Prisma persistent queue (com fallback JsonStore)
const scheduledStore = new JsonStore('scheduled-tasks', []);
let _prisma = null;
function getDb() {
  if (!_prisma) {
    try { _prisma = require('../../modules/crm-prisma/dist/config/database').prisma; } catch (_) {}
  }
  return _prisma;
}
function parseApiConfig(t) { return { ...t, apiConfig: t.apiConfig ? JSON.parse(t.apiConfig) : null, api_config: t.apiConfig ? JSON.parse(t.apiConfig) : null }; }

router.get('/scheduled-tasks', async (req, res) => {
  const db = getDb();
  if (db) {
    try {
      const tasks = await db.scheduledTask.findMany({ orderBy: { createdAt: 'desc' } });
      return res.json(tasks.map(parseApiConfig));
    } catch (_) {}
  }
  res.json(scheduledStore.read());
});

router.post('/scheduled-tasks', async (req, res) => {
  const db = getDb();
  if (db) {
    try {
      const task = await db.scheduledTask.create({
        data: {
          name: req.body.name || 'Tarefa sem nome',
          cron: req.body.cron,
          command: req.body.command || '',
          type: req.body.type || 'shell',
          apiConfig: req.body.api_config ? JSON.stringify(req.body.api_config) : null,
          status: req.body.status || 'active'
        }
      });
      return res.status(201).json(parseApiConfig(task));
    } catch (_) {}
  }
  const task = { id: require('uuid').v4(), ...req.body, createdAt: new Date().toISOString() };
  scheduledStore.update(tasks => [...tasks, task]);
  res.status(201).json(task);
});

router.put('/scheduled-tasks/:id', async (req, res) => {
  const db = getDb();
  if (db) {
    try {
      const data = { ...req.body };
      if (data.api_config) { data.apiConfig = JSON.stringify(data.api_config); delete data.api_config; }
      delete data.id; delete data.createdAt;
      const task = await db.scheduledTask.update({ where: { id: req.params.id }, data });
      return res.json(parseApiConfig(task));
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'Não encontrada' });
    }
  }
  res.status(404).json({ error: 'Não encontrada' });
});

router.delete('/scheduled-tasks/:id', async (req, res) => {
  const db = getDb();
  if (db) {
    try {
      await db.scheduledTask.delete({ where: { id: req.params.id } });
      return res.json({ ok: true, deleted: req.params.id });
    } catch (err) {
      if (err.code === 'P2025') return res.json({ ok: false, error: 'Não encontrada' });
    }
  }
  scheduledStore.update(tasks => tasks.filter(t => t.id !== req.params.id));
  res.json({ ok: true, deleted: req.params.id });
});

router.delete('/scheduled-tasks', async (req, res) => {
  const db = getDb();
  if (db) {
    try {
      const { count } = await db.scheduledTask.deleteMany({});
      return res.json({ ok: true, message: `${count} scheduled tasks deleted` });
    } catch (_) {}
  }
  scheduledStore.write([]);
  res.json({ ok: true, message: 'All scheduled tasks deleted' });
});

// /api/export e /api/import
router.get('/export', (req, res) => {
  res.json({
    tasks: tasksStore.read(),
    executions: executionsStore.read(),
    config: configStore.read(),
    exportedAt: new Date().toISOString()
  });
});

router.post('/import', (req, res) => {
  const { tasks, executions, config } = req.body;
  if (tasks) tasksStore.write(tasks);
  if (executions) executionsStore.write(executions);
  if (config) configStore.write(config);
  res.json({ imported: true });
});

// /api/integrations/status
router.get('/integrations/status', async (req, res) => {
  res.json({
    telegram: { configured: true },
    whatsapp: { configured: true },
    email: { configured: false },
  });
});

module.exports = { prefix: '/api', router };
