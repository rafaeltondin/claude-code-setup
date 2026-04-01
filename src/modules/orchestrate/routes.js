/**
 * Módulo: Orchestrate — Execução de agentes orquestrados
 */
const { Router } = require('express');
const path = require('path');

const router = Router();

router.post('/', async (req, res) => {
  try {
    const orchestrator = require(path.join(__dirname, '..', '..', 'tools', 'orchestrator'));
    const result = await orchestrator.run(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { prefix: '/api/orchestrate', router };
