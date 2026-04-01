/**
 * Módulo: Scheduler — Controle do agendador de tarefas
 */
const { Router } = require('express');

const router = Router();
let schedulerRunning = false;

router.post('/start', (req, res) => {
  schedulerRunning = true;
  res.json({ status: 'started' });
});

router.post('/stop', (req, res) => {
  schedulerRunning = false;
  res.json({ status: 'stopped' });
});

router.get('/status', (req, res) => {
  res.json({ running: schedulerRunning });
});

module.exports = { prefix: '/api/scheduler', router };
