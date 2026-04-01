/**
 * Módulo: Memory — Sessões de memória de conversa
 */
const { Router } = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const router = Router();
const SESSIONS_DIR = path.join(__dirname, '..', '..', '..', 'data', 'memory-sessions');
const ACTIVE_FILE = path.join(__dirname, '..', '..', '..', 'data', 'active-session.json');

function ensureDir() {
  if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

function readAllSessions() {
  ensureDir();
  try {
    return fs.readdirSync(SESSIONS_DIR)
      .filter(f => f.endsWith('.json') && f.startsWith('session_'))
      .map(f => {
        try { return JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf8')); }
        catch (_) { return null; }
      })
      .filter(Boolean);
  } catch (_) { return []; }
}

router.get('/sessions', (req, res) => res.json(readAllSessions()));

router.get('/active', (req, res) => {
  try {
    if (!fs.existsSync(ACTIVE_FILE)) return res.json({ activeSessionId: null });
    res.json(JSON.parse(fs.readFileSync(ACTIVE_FILE, 'utf8')));
  } catch (_) { res.json({ activeSessionId: null }); }
});

router.post('/sessions', (req, res) => {
  ensureDir();
  const session = { id: `session_${uuidv4()}`, ...req.body, createdAt: new Date().toISOString() };
  fs.writeFileSync(path.join(SESSIONS_DIR, `${session.id}.json`), JSON.stringify(session, null, 2));
  // Set as active
  fs.writeFileSync(ACTIVE_FILE, JSON.stringify({ activeSessionId: session.id, updatedAt: new Date().toISOString() }, null, 2));
  res.status(201).json(session);
});

router.get('/sessions/:id', (req, res) => {
  const fp = path.join(SESSIONS_DIR, `${req.params.id}.json`);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Sessão não encontrada' });
  res.json(JSON.parse(fs.readFileSync(fp, 'utf8')));
});

router.patch('/sessions/:id', (req, res) => {
  const fp = path.join(SESSIONS_DIR, `${req.params.id}.json`);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Sessão não encontrada' });
  const session = { ...JSON.parse(fs.readFileSync(fp, 'utf8')), ...req.body, updatedAt: new Date().toISOString() };
  fs.writeFileSync(fp, JSON.stringify(session, null, 2));
  res.json(session);
});

router.delete('/sessions/:id', (req, res) => {
  const fp = path.join(SESSIONS_DIR, `${req.params.id}.json`);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  res.json({ deleted: true });
});

// Tasks da sessão ativa (via webhook do hook sync-tasks)
router.post('/active/tasks', (req, res) => {
  try {
    if (!fs.existsSync(ACTIVE_FILE)) return res.status(404).json({ error: 'Sem sessão ativa' });
    const { activeSessionId } = JSON.parse(fs.readFileSync(ACTIVE_FILE, 'utf8'));
    if (!activeSessionId) return res.status(404).json({ error: 'Sem sessão ativa' });
    const fp = path.join(SESSIONS_DIR, `${activeSessionId}.json`);
    if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Sessão não encontrada' });
    const session = JSON.parse(fs.readFileSync(fp, 'utf8'));
    if (!session.tasks) session.tasks = [];
    session.tasks.push({ ...req.body, timestamp: new Date().toISOString() });
    fs.writeFileSync(fp, JSON.stringify(session, null, 2));
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = { prefix: '/api/memory', router };
