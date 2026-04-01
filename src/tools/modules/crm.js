/**
 * Tools: CRM — call_crm
 */
const http = require('http');

// Definições das ferramentas (para TOOLS_DEF)
const definitions = [
  {
    type: 'function',
    function: {
      name: 'call_crm',
      description: 'Chamada autenticada ao CRM local. Recursos: GET/POST /leads, /leads/:id/notes, /messages/whatsapp, /messages/email, /campaigns, /personal-tasks, /finance, /notes, /templates, /settings.',
      parameters: {
        type: 'object',
        properties: {
          endpoint: { type: 'string', description: 'Endpoint sem o prefixo /api/crm. Ex: /leads, /personal-tasks, /finance' },
          method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], description: 'Método HTTP. Padrão: GET' },
          body: { type: 'object', description: 'Body da requisição como objeto JSON (para POST/PUT)' },
          query: { type: 'string', description: 'Query string. Ex: status=pending&priority=high' }
        },
        required: ['endpoint']
      }
    }
  }
];

// Implementações (handlers)
const handlers = {
  async call_crm(args, ctx) {
    return new Promise((resolve) => {
      const { endpoint, method = 'GET', body, query } = args;
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;

      // Suporta query como string ("limit=100&page=1") ou objeto ({limit:100,page:1})
      let queryStr = '';
      if (query) {
        if (typeof query === 'string') {
          queryStr = '?' + query;
        } else if (typeof query === 'object') {
          queryStr = '?' + new URLSearchParams(query).toString();
        }
      }

      // encodeURI garante que o path não tenha caracteres inválidos (Node http rejeita)
      const rawPath = `/api/crm${cleanEndpoint}${queryStr}`;
      const fullPath = encodeURI(rawPath).replace(/%2F/g, '/').replace(/%3D/g, '=').replace(/%26/g, '&').replace(/%3F/g, '?');
      const bodyBuf = body ? Buffer.from(JSON.stringify(body), 'utf8') : null;

      const crmUrl = new URL(ctx.CRM_BASE);
      const opts = {
        hostname: crmUrl.hostname,
        port: parseInt(crmUrl.port) || 80,
        path: fullPath,
        method: method.toUpperCase(),
        headers: {
          'Authorization': `Bearer ${ctx.CRM_TOKEN}`,
          'Content-Type': 'application/json; charset=utf-8',
          ...(bodyBuf ? { 'Content-Length': bodyBuf.length } : {})
        }
      };

      const req = http.request(opts, res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          const truncated = data.length > 8000 ? data.substring(0, 8000) + '\n...[truncado]' : data;
          resolve(`HTTP ${res.statusCode}\n${truncated}`);
        });
      });
      req.setTimeout(15000, () => { req.destroy(); resolve('Erro CRM: timeout de 15s excedido'); });
      req.on('error', e => resolve(`Erro CRM: ${e.message}`));
      if (bodyBuf) req.write(bodyBuf);
      req.end();
    });
  }
};

module.exports = { definitions, handlers };
