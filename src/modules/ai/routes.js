/**
 * Módulo: AI — Auto-tag, Chain Planner, Debate, Analyze Intent
 */
const { Router } = require('express');
const path = require('path');

const router = Router();

// Lazy load dos serviços AI
function loadService(name) {
  try { return require(path.join(__dirname, '..', '..', 'services', name)); }
  catch (_) { return null; }
}

// Auto-tag
router.post('/auto-tag', async (req, res) => {
  const tagger = loadService('auto-tagger');
  if (!tagger) return res.status(503).json({ error: 'Auto-tagger não disponível' });
  try {
    const result = await tagger.autoTag(req.body);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/auto-tag/batch', async (req, res) => {
  const tagger = loadService('auto-tagger');
  if (!tagger) return res.status(503).json({ error: 'Auto-tagger não disponível' });
  try {
    const results = await Promise.all(req.body.items.map(i => tagger.autoTag(i)));
    res.json(results);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Chain Planner
router.post('/chain/plan', async (req, res) => {
  const planner = loadService('chain-planner');
  if (!planner) return res.status(503).json({ error: 'Chain planner não disponível' });
  try {
    const result = await planner.plan(req.body);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/chain/:id/execute', async (req, res) => {
  const planner = loadService('chain-planner');
  if (!planner) return res.status(503).json({ error: 'Chain planner não disponível' });
  try {
    const result = await planner.execute(req.params.id, req.body);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/chains', (req, res) => {
  const { JsonStore } = require('../../shared/utils/json-store');
  const store = new JsonStore('chains', []);
  res.json(store.read());
});

router.get('/plans', (req, res) => {
  const { JsonStore } = require('../../shared/utils/json-store');
  const store = new JsonStore('plans', []);
  res.json(store.read());
});

// Debate
router.post('/debate', async (req, res) => {
  const debate = loadService('multi-debate');
  if (!debate) return res.status(503).json({ error: 'Multi-debate não disponível' });
  try {
    const result = await debate.run(req.body);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/debates', (req, res) => {
  const { JsonStore } = require('../../shared/utils/json-store');
  const store = new JsonStore('debates', []);
  res.json(store.read());
});

router.post('/debate/perspectives', async (req, res) => {
  const debate = loadService('multi-debate');
  if (!debate?.getPerspectives) return res.status(503).json({ error: 'Não disponível' });
  try {
    const result = await debate.getPerspectives(req.body);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Analyze Intent
router.post('/analyze-intent', async (req, res) => {
  const tagger = loadService('auto-tagger');
  if (!tagger?.analyzeIntent) return res.status(503).json({ error: 'Não disponível' });
  try {
    const result = await tagger.analyzeIntent(req.body);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = { prefix: '/api/ai', router };
