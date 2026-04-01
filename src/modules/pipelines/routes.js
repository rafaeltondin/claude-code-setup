/**
 * Módulo: Pipelines — Definição e execução de pipelines
 */
const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const { JsonStore } = require('../../shared/utils/json-store');

const router = Router();
const store = new JsonStore('pipelines', []);

router.get('/', (req, res) => res.json(store.read()));

router.get('/:id', (req, res) => {
  const p = store.read().find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Pipeline não encontrado' });
  res.json(p);
});

router.post('/', (req, res) => {
  const pipeline = { id: uuidv4(), ...req.body, createdAt: new Date().toISOString() };
  store.update(list => [...list, pipeline]);
  res.status(201).json(pipeline);
});

router.put('/:id', (req, res) => {
  let found = null;
  store.update(list => list.map(p => {
    if (p.id === req.params.id) { found = { ...p, ...req.body, updatedAt: new Date().toISOString() }; return found; }
    return p;
  }));
  if (!found) return res.status(404).json({ error: 'Não encontrado' });
  res.json(found);
});

router.delete('/:id', (req, res) => {
  store.update(list => list.filter(p => p.id !== req.params.id));
  res.json({ deleted: true });
});

router.post('/:id/run', async (req, res) => {
  const p = store.read().find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Não encontrado' });
  // Placeholder — execução real via executor
  res.json({ status: 'started', pipelineId: req.params.id });
});

module.exports = { prefix: '/api/pipelines', router };
