/**
 * HTTP Helper — Requisições HTTP/HTTPS sem dependências externas.
 * Usado pelo sistema de ferramentas e integrações.
 */

const https = require('https');
const http = require('http');

const MAX_RESPONSE_SIZE = 8000;

function httpRequest(opts, bodyBuf) {
  return new Promise((resolve) => {
    const lib = (opts.port === 443 || opts._isHttps) ? https : http;
    const req = lib.request(opts, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        const truncated = data.length > MAX_RESPONSE_SIZE
          ? data.substring(0, MAX_RESPONSE_SIZE) + '\n...[truncado]'
          : data;
        resolve(`HTTP ${res.statusCode}\n${truncated}`);
      });
    });
    req.on('error', e => resolve(`Erro HTTP: ${e.message}`));
    req.setTimeout(30000, () => { req.destroy(); resolve('Erro HTTP: timeout 30s'); });
    if (bodyBuf) req.write(bodyBuf);
    req.end();
  });
}

module.exports = { httpRequest };
