/**
 * WebSocket Server — Atualizações em tempo real para o dashboard.
 * Broadcast para todos os clients conectados.
 */

const { WebSocketServer } = require('ws');
const { createLogger } = require('../shared/utils/logger');

const log = createLogger('WebSocket');
let wss = null;

function init(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    log.info('Client conectado', { total: wss.clients.size });

    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (msg) => {
      try {
        const data = JSON.parse(msg);
        if (data.type === 'ping') ws.send(JSON.stringify({ type: 'pong' }));
      } catch (_) {}
    });

    ws.on('close', () => {
      log.info('Client desconectado', { total: wss.clients.size });
    });
  });

  // Heartbeat a cada 30s
  const interval = setInterval(() => {
    wss.clients.forEach(ws => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));
  log.info('WebSocket server iniciado em /ws');
}

function broadcast(type, data) {
  if (!wss) return;
  const msg = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(msg);
  });
}

function getClientsCount() {
  return wss ? wss.clients.size : 0;
}

function closeAll() {
  if (!wss) return;
  wss.clients.forEach(client => {
    try { client.close(1001, 'Server shutting down'); } catch (_) {}
  });
  try { wss.close(); } catch (_) {}
  log.info('Todas as conexões WebSocket fechadas');
}

module.exports = { init, broadcast, getClientsCount, closeAll };
