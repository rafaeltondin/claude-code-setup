/**
 * Módulo: Analytics — Métricas e custos
 */
const { Router } = require('express');
const { JsonStore } = require('../../shared/utils/json-store');

const router = Router();
const executionsStore = new JsonStore('executions', []);

router.get('/cost', (req, res) => {
  const execs = executionsStore.read();
  const costs = execs.reduce((acc, e) => {
    if (e.cost) acc.total += e.cost;
    if (e.tokens) acc.totalTokens += e.tokens;
    return acc;
  }, { total: 0, totalTokens: 0 });
  res.json(costs);
});

router.get('/overview', (req, res) => {
  const execs = executionsStore.read();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  res.json({
    total: execs.length,
    today: execs.filter(e => new Date(e.startedAt) >= today).length,
    thisWeek: execs.filter(e => new Date(e.startedAt) >= weekAgo).length,
    successRate: execs.length > 0
      ? Math.round((execs.filter(e => e.status === 'success').length / execs.length) * 100)
      : 0
  });
});

module.exports = { prefix: '/api/analytics', router };
