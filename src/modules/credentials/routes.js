/**
 * Módulo: Credentials — CRUD do vault criptografado
 */
const { Router } = require('express');
const vault = require('../../shared/credential-vault');

const router = Router();

router.get('/', (req, res) => {
  res.json(vault.getAll());
});

router.get('/:id', (req, res) => {
  const cred = vault.getById(req.params.id);
  if (!cred) return res.status(404).json({ error: 'Credencial não encontrada' });
  res.json(cred);
});

router.post('/', (req, res) => {
  try {
    const result = vault.create(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const result = vault.update(req.params.id, req.body);
    if (!result) return res.status(404).json({ error: 'Credencial não encontrada' });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  const ok = vault.remove(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Credencial não encontrada' });
  res.json({ success: true });
});

router.post('/:id/reveal', (req, res) => {
  const result = vault.reveal(req.params.id);
  if (!result) return res.status(404).json({ error: 'Credencial não encontrada' });
  res.json(result);
});

router.post('/import-kb', (req, res) => {
  // Import from KB não é mais necessário no v2, mas mantém compatibilidade
  res.json({ message: 'Use o vault diretamente para gerenciar credenciais' });
});

module.exports = { prefix: '/api/credentials', router };
