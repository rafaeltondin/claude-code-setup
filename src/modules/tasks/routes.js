/**
 * Módulo: Tasks — CRUD de tarefas EcoTasks + scheduled tasks
 */
const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const { JsonStore } = require('../../shared/utils/json-store');

const router = Router();
const tasksStore = new JsonStore('tasks', []);
const executionsStore = new JsonStore('executions', []);
const scheduledStore = new JsonStore('scheduled-tasks', []);

// ─── EcoTasks ───────────────────────────────────────────────────

router.get('/', (req, res) => {
  res.json(tasksStore.read());
});

// ─── Rotas fixas ANTES de /:id ──────────────────────────

// Sync de tasks do Claude Code (recebe via hook)
router.post('/claude-sync', (req, res) => {
  const { taskId, subject, status, description } = req.body;
  tasksStore.update(tasks => {
    const idx = tasks.findIndex(t => t.claudeTaskId === taskId);
    const entry = {
      claudeTaskId: taskId, subject, status, description,
      type: 'claude_code', source: 'claude-code',
      updatedAt: new Date().toISOString()
    };
    if (idx >= 0) {
      tasks[idx] = { ...tasks[idx], ...entry };
    } else {
      tasks.push({ id: uuidv4(), ...entry, createdAt: new Date().toISOString() });
    }
    return tasks;
  });
  res.json({ ok: true });
});

// Executions
router.get('/executions/list', (req, res) => {
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
    today: {
      total: todayExecs.length,
      success: todayExecs.filter(e => e.status === 'success').length,
      failed: todayExecs.filter(e => e.status === 'failed').length,
      running: todayExecs.filter(e => e.status === 'running').length
    },
    successRate: execs.length > 0
      ? Math.round((execs.filter(e => e.status === 'success').length / execs.length) * 100)
      : 0
  });
});

router.delete('/executions/purge', (req, res) => {
  executionsStore.write([]);
  res.json({ success: true });
});

// Scheduled Tasks — Prisma/SQLite persistent queue
let prisma = null;
function getPrisma() {
  if (!prisma) {
    try {
      prisma = require('../../modules/crm-prisma/dist/config/database').prisma;
    } catch (err) {
      console.error('[Tasks] Prisma não disponível, fallback para JsonStore:', err.message);
    }
  }
  return prisma;
}

router.get('/scheduled', async (req, res) => {
  const db = getPrisma();
  if (db) {
    try {
      const tasks = await db.scheduledTask.findMany({ orderBy: { createdAt: 'desc' } });
      // Converter apiConfig de string para objeto para compatibilidade
      return res.json(tasks.map(t => ({ ...t, apiConfig: t.apiConfig ? JSON.parse(t.apiConfig) : null })));
    } catch (err) {
      console.error('[Tasks] Prisma findMany error:', err.message);
    }
  }
  res.json(scheduledStore.read());
});

router.post('/scheduled', async (req, res) => {
  const db = getPrisma();
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
      return res.status(201).json({ ...task, apiConfig: task.apiConfig ? JSON.parse(task.apiConfig) : null });
    } catch (err) {
      console.error('[Tasks] Prisma create error:', err.message);
    }
  }
  // Fallback JsonStore
  const task = { id: uuidv4(), ...req.body, createdAt: new Date().toISOString() };
  scheduledStore.update(tasks => [...tasks, task]);
  res.status(201).json(task);
});

router.put('/scheduled/:id', async (req, res) => {
  const db = getPrisma();
  if (db) {
    try {
      const data = { ...req.body };
      if (data.api_config) { data.apiConfig = JSON.stringify(data.api_config); delete data.api_config; }
      const task = await db.scheduledTask.update({ where: { id: req.params.id }, data });
      return res.json({ ...task, apiConfig: task.apiConfig ? JSON.parse(task.apiConfig) : null });
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'Não encontrada' });
      console.error('[Tasks] Prisma update error:', err.message);
    }
  }
  let found = null;
  scheduledStore.update(tasks => tasks.map(t => {
    if (t.id === req.params.id) { found = { ...t, ...req.body }; return found; }
    return t;
  }));
  if (!found) return res.status(404).json({ error: 'Não encontrada' });
  res.json(found);
});

router.delete('/scheduled/:id', async (req, res) => {
  const db = getPrisma();
  if (db) {
    try {
      await db.scheduledTask.delete({ where: { id: req.params.id } });
      return res.json({ success: true, deleted: req.params.id });
    } catch (err) {
      if (err.code === 'P2025') return res.json({ success: false });
      console.error('[Tasks] Prisma delete error:', err.message);
    }
  }
  let deleted = false;
  scheduledStore.update(tasks => {
    const f = tasks.filter(t => t.id !== req.params.id);
    deleted = f.length < tasks.length;
    return f;
  });
  res.json({ success: deleted });
});

// ─── Rotas com parâmetro (DEPOIS das fixas) ─────────────

router.get('/:id', (req, res) => {
  const task = tasksStore.read().find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });
  res.json(task);
});

router.post('/', (req, res) => {
  const task = {
    id: uuidv4(),
    ...req.body,
    status: req.body.status || 'scheduled',
    enabled: req.body.enabled !== false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  tasksStore.update(tasks => [...tasks, task]);
  res.status(201).json(task);
});

router.put('/:id', (req, res) => {
  let found = null;
  tasksStore.update(tasks => tasks.map(t => {
    if (t.id === req.params.id) {
      found = { ...t, ...req.body, updatedAt: new Date().toISOString() };
      return found;
    }
    return t;
  }));
  if (!found) return res.status(404).json({ error: 'Tarefa não encontrada' });
  res.json(found);
});

router.delete('/:id', (req, res) => {
  let deleted = false;
  tasksStore.update(tasks => {
    const filtered = tasks.filter(t => t.id !== req.params.id);
    deleted = filtered.length < tasks.length;
    return filtered;
  });
  res.json({ success: deleted });
});

module.exports = { prefix: '/api/tasks', router };
