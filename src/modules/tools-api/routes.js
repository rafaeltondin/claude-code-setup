/**
 * Módulo: Tools API — Expõe ferramentas CLI via REST
 */
const { Router } = require('express');
const { TOOLS_DEF, executeTool, reload } = require('../../tools/registry');
const vault = require('../../shared/credential-vault');

const router = Router();

// Listar todas as ferramentas disponíveis
router.get('/', (req, res) => {
  res.json({
    total: TOOLS_DEF.length,
    tools: TOOLS_DEF.map(t => ({
      name: t.function?.name || t.name,
      description: t.function?.description || t.description || ''
    }))
  });
});

// Definição completa de uma ferramenta
router.get('/:name', (req, res) => {
  const tool = TOOLS_DEF.find(t => (t.function?.name || t.name) === req.params.name);
  if (!tool) return res.status(404).json({ error: 'Ferramenta não encontrada' });
  res.json(tool);
});

// Executar ferramenta
router.post('/:name/execute', async (req, res) => {
  const toolName = req.params.name;
  try {
    const result = await executeTool(toolName, req.body, vault);
    res.json({ tool: toolName, result });
  } catch (err) {
    res.status(500).json({ tool: toolName, error: err.message });
  }
});

// Reload módulos (dev)
router.post('/reload', (req, res) => {
  const stats = reload();
  res.json({ reloaded: true, ...stats });
});

module.exports = { prefix: '/api/tools', router };
