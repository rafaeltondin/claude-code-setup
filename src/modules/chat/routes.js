/**
 * Módulo: Chat — Sessões de chat com IA
 */
const { Router } = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { JsonStore } = require('../../shared/utils/json-store');

const router = Router();
const sessionsStore = new JsonStore('chat-sessions', []);
const CHAT_DIR = path.join(__dirname, '..', '..', '..', 'data', 'chat');

function ensureChatDir() {
  if (!fs.existsSync(CHAT_DIR)) fs.mkdirSync(CHAT_DIR, { recursive: true });
}

// Listar sessões
router.get('/sessions', (req, res) => {
  res.json(sessionsStore.read());
});

// Criar sessão
router.post('/sessions', (req, res) => {
  const session = {
    id: uuidv4(),
    title: req.body.title || 'Nova conversa',
    model: req.body.model || 'claude-sonnet-4-6',
    systemPrompt: req.body.systemPrompt || '',
    createdAt: new Date().toISOString(),
    messageCount: 0
  };
  sessionsStore.update(list => [...list, session]);
  ensureChatDir();
  fs.writeFileSync(path.join(CHAT_DIR, `${session.id}.json`), JSON.stringify([], null, 2));
  res.status(201).json(session);
});

// Detalhes + mensagens de uma sessão
router.get('/sessions/:id', (req, res) => {
  const session = sessionsStore.read().find(s => s.id === req.params.id);
  if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
  ensureChatDir();
  const msgFile = path.join(CHAT_DIR, `${session.id}.json`);
  const messages = fs.existsSync(msgFile) ? JSON.parse(fs.readFileSync(msgFile, 'utf8')) : [];
  res.json({ ...session, messages });
});

// Enviar mensagem
router.post('/sessions/:id/send', async (req, res) => {
  const session = sessionsStore.read().find(s => s.id === req.params.id);
  if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

  ensureChatDir();
  const msgFile = path.join(CHAT_DIR, `${session.id}.json`);
  const messages = fs.existsSync(msgFile) ? JSON.parse(fs.readFileSync(msgFile, 'utf8')) : [];

  const userMsg = { role: 'user', content: req.body.message, timestamp: new Date().toISOString() };
  messages.push(userMsg);

  // Placeholder para resposta IA (será implementado com OpenRouter ou Claude API)
  const aiMsg = {
    role: 'assistant',
    content: '[IA response placeholder — configure OpenRouter ou Claude API]',
    timestamp: new Date().toISOString()
  };
  messages.push(aiMsg);

  fs.writeFileSync(msgFile, JSON.stringify(messages, null, 2));

  // Atualizar contador
  sessionsStore.update(list => list.map(s =>
    s.id === session.id ? { ...s, messageCount: messages.length, updatedAt: new Date().toISOString() } : s
  ));

  res.json({ userMessage: userMsg, aiMessage: aiMsg });
});

// Deletar sessão
router.delete('/sessions/:id', (req, res) => {
  sessionsStore.update(list => list.filter(s => s.id !== req.params.id));
  const msgFile = path.join(CHAT_DIR, `${req.params.id}.json`);
  if (fs.existsSync(msgFile)) fs.unlinkSync(msgFile);
  res.json({ deleted: true });
});

// Renomear sessão
router.put('/sessions/:id/title', (req, res) => {
  let found = null;
  sessionsStore.update(list => list.map(s => {
    if (s.id === req.params.id) { found = { ...s, title: req.body.title }; return found; }
    return s;
  }));
  if (!found) return res.status(404).json({ error: 'Sessão não encontrada' });
  res.json(found);
});

// Config do chat
const configStore = new JsonStore('chat-config', { model: 'claude-sonnet-4-6', systemPrompt: '' });
router.get('/config', (req, res) => res.json(configStore.read()));
router.put('/config', (req, res) => { configStore.write({ ...configStore.read(), ...req.body }); res.json(configStore.read()); });

module.exports = { prefix: '/api/chat', router };
