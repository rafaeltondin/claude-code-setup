/**
 * Módulo: Prompts — Templates de prompt + variable profiles
 */
const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const { JsonStore } = require('../../shared/utils/json-store');

const router = Router();
const promptsStore = new JsonStore('prompt-templates', []);
const profilesStore = new JsonStore('variable-profiles', []);

// ─── Prompt Templates ───────────────────────────────────────────

router.get('/', (req, res) => res.json(promptsStore.read()));

router.get('/:id', (req, res) => {
  const prompt = promptsStore.read().find(p => p.id === req.params.id);
  if (!prompt) return res.status(404).json({ error: 'Não encontrado' });
  res.json(prompt);
});

router.post('/', (req, res) => {
  const prompt = { id: uuidv4(), ...req.body, createdAt: new Date().toISOString(), version: 1, versions: [] };
  promptsStore.update(list => [...list, prompt]);
  res.status(201).json(prompt);
});

router.put('/:id', (req, res) => {
  let found = null;
  promptsStore.update(list => list.map(p => {
    if (p.id === req.params.id) {
      // Versionar antes de atualizar
      const versions = p.versions || [];
      versions.push({ content: p.content, variables: p.variables, updatedAt: p.updatedAt, version: p.version });
      found = { ...p, ...req.body, version: (p.version || 1) + 1, versions, updatedAt: new Date().toISOString() };
      return found;
    }
    return p;
  }));
  if (!found) return res.status(404).json({ error: 'Não encontrado' });
  res.json(found);
});

router.delete('/:id', (req, res) => {
  promptsStore.update(list => list.filter(p => p.id !== req.params.id));
  res.json({ deleted: true });
});

router.get('/:id/versions', (req, res) => {
  const prompt = promptsStore.read().find(p => p.id === req.params.id);
  if (!prompt) return res.status(404).json({ error: 'Não encontrado' });
  res.json(prompt.versions || []);
});

// ─── Variable Profiles ──────────────────────────────────────────

router.get('/profiles/list', (req, res) => res.json(profilesStore.read()));

router.post('/profiles', (req, res) => {
  const profile = { id: uuidv4(), ...req.body, createdAt: new Date().toISOString() };
  profilesStore.update(list => [...list, profile]);
  res.status(201).json(profile);
});

router.put('/profiles/:id', (req, res) => {
  let found = null;
  profilesStore.update(list => list.map(p => {
    if (p.id === req.params.id) { found = { ...p, ...req.body }; return found; }
    return p;
  }));
  if (!found) return res.status(404).json({ error: 'Não encontrado' });
  res.json(found);
});

router.delete('/profiles/:id', (req, res) => {
  profilesStore.update(list => list.filter(p => p.id !== req.params.id));
  res.json({ deleted: true });
});

module.exports = { prefix: '/api/prompt-templates', router };
