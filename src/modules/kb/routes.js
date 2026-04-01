/**
 * Módulo: Knowledge Base — Busca, CRUD e upload de documentos
 */
const { Router } = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const router = Router();
const KB_DIR = path.join(__dirname, '..', '..', '..', 'knowledge-base');

// Multer para upload de PDFs
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Apenas PDFs'), false);
  }
});

// KB Search engine (lazy load)
let kbSearch = null;
function getKB() {
  if (!kbSearch) {
    try { kbSearch = require(path.join(KB_DIR, 'knowledge-search')); }
    catch (_) { kbSearch = null; }
  }
  return kbSearch;
}

// Listar documentos
router.get('/documents', (req, res) => {
  try {
    if (!fs.existsSync(KB_DIR)) return res.json([]);
    const files = fs.readdirSync(KB_DIR).filter(f => f.endsWith('.md'));
    const docs = files.map(f => {
      const content = fs.readFileSync(path.join(KB_DIR, f), 'utf8');
      const titleMatch = content.match(/^#\s+(.+)/m);
      return {
        filename: f,
        title: titleMatch ? titleMatch[1] : f.replace('.md', ''),
        size: fs.statSync(path.join(KB_DIR, f)).size,
        modified: fs.statSync(path.join(KB_DIR, f)).mtime
      };
    });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buscar na KB
router.get('/search', (req, res) => {
  const { q, limit } = req.query;
  if (!q) return res.status(400).json({ error: 'Parâmetro q é obrigatório' });

  const kb = getKB();
  if (!kb) return res.status(503).json({ error: 'KB search engine não disponível' });

  try {
    const results = kb.search(q, parseInt(limit) || 5);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Estatísticas da KB
router.get('/stats', (req, res) => {
  try {
    if (!fs.existsSync(KB_DIR)) return res.json({ total: 0, totalSize: 0 });
    const files = fs.readdirSync(KB_DIR).filter(f => f.endsWith('.md'));
    const totalSize = files.reduce((sum, f) => sum + fs.statSync(path.join(KB_DIR, f)).size, 0);
    res.json({ total: files.length, totalSize, categories: {} });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ler documento específico
router.get('/documents/:filename', (req, res) => {
  const filePath = path.join(KB_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Documento não encontrado' });
  const content = fs.readFileSync(filePath, 'utf8');
  res.json({ filename: req.params.filename, content });
});

// Criar/atualizar documento
router.post('/documents', (req, res) => {
  const { filename, content } = req.body;
  if (!filename || !content) return res.status(400).json({ error: 'filename e content são obrigatórios' });
  if (!fs.existsSync(KB_DIR)) fs.mkdirSync(KB_DIR, { recursive: true });
  fs.writeFileSync(path.join(KB_DIR, filename), content, 'utf8');
  res.status(201).json({ filename, size: Buffer.byteLength(content, 'utf8') });
});

// Atualizar documento
router.put('/documents/:filename', (req, res) => {
  const filePath = path.join(KB_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Não encontrado' });
  fs.writeFileSync(filePath, req.body.content, 'utf8');
  res.json({ filename: req.params.filename, updated: true });
});

// Deletar documento
router.delete('/documents/:filename', (req, res) => {
  const filePath = path.join(KB_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Não encontrado' });
  fs.unlinkSync(filePath);
  res.json({ deleted: true });
});

// Upload PDF
router.post('/upload-pdf', pdfUpload.single('pdf'), async (req, res) => {
  try {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(req.file.buffer);
    const filename = (req.body.filename || req.file.originalname.replace('.pdf', '')) + '.md';
    const content = `# ${filename.replace('.md', '')}\n\n${data.text}`;
    if (!fs.existsSync(KB_DIR)) fs.mkdirSync(KB_DIR, { recursive: true });
    fs.writeFileSync(path.join(KB_DIR, filename), content, 'utf8');
    res.status(201).json({ filename, pages: data.numpages, chars: data.text.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { prefix: '/api/kb', router };
