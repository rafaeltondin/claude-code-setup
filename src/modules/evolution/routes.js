/**
 * Módulo: Evolution API — Proxy para WhatsApp via Evolution API
 */
const { Router } = require('express');
const path = require('path');
const { createLogger } = require('../../shared/utils/logger');

const log = createLogger('Evolution');
const router = Router();

// Helper: obter config da Evolution API do CRM settings
async function getConfig() {
  try {
    const CRM_DIR = path.join(__dirname, '..', 'crm-prisma');
    const settingsMod = require(path.join(CRM_DIR, 'dist', 'modules', 'settings', 'settings.service'));
    const url = await settingsMod.getSetting('evolution_api_url');
    const apiKey = await settingsMod.getSetting('evolution_api_key');
    const instance = await settingsMod.getSetting('evolution_instance');
    if (!url || !apiKey || !instance) return null;
    return { url: url.replace(/\/$/, ''), apiKey, instance };
  } catch (_) { return null; }
}

async function evolutionRequest(method, url, apiKey, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json', 'apikey': apiKey } };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);
  const resp = await fetch(url, opts);
  const text = await resp.text();
  let data;
  try { data = JSON.parse(text); } catch (_) { data = text; }
  return { status: resp.status, ok: resp.ok, data };
}

router.post('/send-text', async (req, res) => {
  const config = await getConfig();
  if (!config) return res.status(503).json({ error: 'Evolution API não configurada' });
  const { number, text } = req.body;
  if (!number || !text) return res.status(400).json({ error: 'number e text são obrigatórios' });
  const result = await evolutionRequest('POST', `${config.url}/message/sendText/${config.instance}`, config.apiKey, { number, text });
  res.status(result.status).json(result.data);
});

router.post('/send-media', async (req, res) => {
  const config = await getConfig();
  if (!config) return res.status(503).json({ error: 'Evolution API não configurada' });
  const { number, mediatype, media, caption, fileName, mimetype } = req.body;
  if (!number || !mediatype || !media) return res.status(400).json({ error: 'number, mediatype e media são obrigatórios' });
  const result = await evolutionRequest('POST', `${config.url}/message/sendMedia/${config.instance}`, config.apiKey, { number, mediatype, media, caption, fileName, mimetype });
  res.status(result.status).json(result.data);
});

router.post('/check-numbers', async (req, res) => {
  const config = await getConfig();
  if (!config) return res.status(503).json({ error: 'Evolution API não configurada' });
  const { numbers } = req.body;
  if (!numbers || !Array.isArray(numbers)) return res.status(400).json({ error: 'numbers (array) é obrigatório' });
  const result = await evolutionRequest('POST', `${config.url}/chat/whatsappNumbers/${config.instance}`, config.apiKey, { numbers });
  res.status(result.status).json(result.data);
});

router.get('/connection', async (req, res) => {
  const config = await getConfig();
  if (!config) return res.status(503).json({ error: 'Evolution API não configurada' });
  const result = await evolutionRequest('GET', `${config.url}/instance/connectionState/${config.instance}`, config.apiKey);
  res.status(result.status).json(result.data);
});

router.post('/messages', async (req, res) => {
  const config = await getConfig();
  if (!config) return res.status(503).json({ error: 'Evolution API não configurada' });
  let body = req.body;
  if (body.remoteJid && !body.where) {
    const { remoteJid, limit, page, ...rest } = body;
    body = { where: { key: { remoteJid } }, limit: limit || 20, page: page || 1, ...rest };
  }
  const result = await evolutionRequest('POST', `${config.url}/chat/findMessages/${config.instance}`, config.apiKey, body);
  res.status(result.status).json(result.data);
});

router.get('/instances', async (req, res) => {
  const config = await getConfig();
  if (!config) return res.status(503).json({ error: 'Evolution API não configurada' });
  const result = await evolutionRequest('GET', `${config.url}/instance/fetchInstances`, config.apiKey);
  res.status(result.status).json(result.data);
});

module.exports = { prefix: '/api/evolution', router };
