/**
 * Módulo: Telegram — Config, controle e bot bidirecional
 */
const { Router } = require('express');
const path = require('path');
const { JsonStore } = require('../../shared/utils/json-store');
const { createLogger } = require('../../shared/utils/logger');

const log = createLogger('Telegram');
const router = Router();
const configStore = new JsonStore('config', {});

// Referência ao bot (lazy loaded)
let telegramBot = null;

function getBotModule() {
  if (!telegramBot) {
    try {
      telegramBot = require(path.join(__dirname, '..', '..', 'services', 'telegram-bot'));
    } catch (err) {
      log.error('telegram-bot.js não disponível', { error: err.message });
    }
  }
  return telegramBot;
}

router.get('/config', (req, res) => {
  const config = configStore.read();
  res.json(config.telegram || { enabled: false, botToken: '', chatId: '' });
});

router.put('/config', (req, res) => {
  const config = configStore.read();
  config.telegram = { ...config.telegram, ...req.body };
  configStore.write(config);
  res.json(config.telegram);
});

router.post('/start', (req, res) => {
  const bot = getBotModule();
  if (!bot) return res.status(503).json({ error: 'Módulo telegram-bot não disponível' });
  try {
    bot.start();
    res.json({ status: 'Bot iniciado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/stop', (req, res) => {
  const bot = getBotModule();
  if (!bot) return res.status(503).json({ error: 'Módulo telegram-bot não disponível' });
  try {
    bot.stop();
    res.json({ status: 'Bot parado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/send', (req, res) => {
  const config = configStore.read();
  const tg = config.telegram;
  if (!tg?.enabled || !tg?.botToken || !tg?.chatId) {
    return res.status(400).json({ error: 'Telegram não configurado' });
  }
  // Enviar via API do Telegram
  const https = require('https');
  const body = JSON.stringify({ chat_id: tg.chatId, text: req.body.text, parse_mode: 'HTML' });
  const opts = {
    hostname: 'api.telegram.org', path: `/bot${tg.botToken}/sendMessage`,
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  };
  const tgReq = https.request(opts, tgRes => {
    let data = '';
    tgRes.on('data', c => data += c);
    tgRes.on('end', () => res.json(JSON.parse(data)));
  });
  tgReq.on('error', e => res.status(500).json({ error: e.message }));
  tgReq.write(body);
  tgReq.end();
});

// Status do bot
router.get('/status', (req, res) => {
  const config = configStore.read();
  const tg = config.telegram || {};
  const bot = getBotModule();
  const botStatus = bot ? bot.getStatus() : null;
  res.json({
    configured: !!(tg.botToken && tg.chatId),
    enabled: !!tg.enabled,
    isRunning: botStatus?.isRunning ?? false,
    uptime: botStatus?.uptime ?? 0,
    startedAt: botStatus?.startedAt ?? null
  });
});

router.get('/settings', (req, res) => {
  const config = configStore.read();
  res.json(config.telegram || {});
});

// Envio de mídia genérico
function sendTelegramMedia(type) {
  return (req, res) => {
    const config = configStore.read();
    const tg = config.telegram;
    if (!tg?.botToken || !tg?.chatId) return res.status(400).json({ error: 'Telegram não configurado' });

    const methodMap = {
      photo: 'sendPhoto', video: 'sendVideo', audio: 'sendAudio',
      document: 'sendDocument', file: 'sendDocument'
    };
    const fieldMap = {
      photo: 'photo', video: 'video', audio: 'audio',
      document: 'document', file: 'document'
    };

    const method = methodMap[type] || 'sendDocument';
    const field = fieldMap[type] || 'document';

    const payload = {
      chat_id: tg.chatId,
      [field]: req.body.url || req.body[field],
      caption: req.body.caption || '',
      parse_mode: 'HTML'
    };

    const https = require('https');
    const body = JSON.stringify(payload);
    const opts = {
      hostname: 'api.telegram.org', path: `/bot${tg.botToken}/${method}`,
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const tgReq = https.request(opts, tgRes => {
      let data = '';
      tgRes.on('data', c => data += c);
      tgRes.on('end', () => { try { res.json(JSON.parse(data)); } catch (_) { res.json({ raw: data }); } });
    });
    tgReq.on('error', e => res.status(500).json({ error: e.message }));
    tgReq.write(body);
    tgReq.end();
  };
}

router.post('/send-photo', sendTelegramMedia('photo'));
router.post('/send-video', sendTelegramMedia('video'));
router.post('/send-audio', sendTelegramMedia('audio'));
router.post('/send-document', sendTelegramMedia('document'));
router.post('/send-file', sendTelegramMedia('file'));
router.post('/send-media', sendTelegramMedia('document'));

// Auto-iniciar bot quando o módulo carrega
async function init() {
  const config = configStore.read();
  const tg = config.telegram;
  if (tg?.enabled && tg?.botToken) {
    log.info('Auto-iniciando Telegram Bot...');
    const bot = getBotModule();
    if (bot) {
      try {
        bot.start(tg.botToken);
        log.info('Telegram Bot ativo');
      } catch (err) {
        log.error('Falha ao iniciar bot', { error: err.message });
      }
    }
  } else {
    log.info('Telegram Bot desabilitado ou sem token');
  }
}

module.exports = { prefix: '/api/telegram', router, init };
