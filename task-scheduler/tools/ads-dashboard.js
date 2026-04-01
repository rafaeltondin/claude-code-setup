/**
 * Tool: ADS_DASHBOARD
 * Consulta dados do Ads Dashboard (Meta Ads + Google Ads)
 * API pública em https://ads.YOUR-USER.com.br/api/public/
 */

const https = require('https');
const http = require('http');

const ADS_API_BASE = 'https://ads.YOUR-USER.com.br';
const ADS_API_KEY_NAME = 'ADS_DASHBOARD_API_KEY';
const ADS_API_KEY_FALLBACK = 'ads-public-api-2026-riwerlabs';

const definitions = [
  {
    type: 'function',
    function: {
      name: 'ads_dashboard',
      description: 'Consulta dados do Ads Dashboard (Meta Ads + Google Ads) - contas, insights, campanhas e resumo executivo',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['health', 'accounts', 'account', 'insights', 'campaigns', 'summary', 'sync', 'account_insights'],
            description: 'Ação a executar: health (status da API), accounts (todas as contas), account (uma conta), insights (insights agregados), campaigns (campanhas de uma conta), summary (resumo executivo), sync (sincronizar dados), account_insights (insights de uma conta específica)'
          },
          account_id: {
            type: 'string',
            description: 'ID da conta (obrigatório para: account, insights, campaigns, account_insights)'
          },
          days: {
            type: 'number',
            description: 'Número de dias para o período de análise. Padrão: 7'
          },
          platform: {
            type: 'string',
            enum: ['META', 'GOOGLE'],
            description: 'Filtrar por plataforma (META ou GOOGLE)'
          },
          start: {
            type: 'string',
            description: 'Data de início no formato YYYY-MM-DD (para account_insights)'
          },
          end: {
            type: 'string',
            description: 'Data de fim no formato YYYY-MM-DD (para account_insights)'
          }
        },
        required: ['action']
      }
    }
  }
];

/**
 * Faz requisição HTTPS para a API do Ads Dashboard
 */
function adsRequest(path, method, body, apiKey) {
  return new Promise((resolve, reject) => {
    const url = new URL(ADS_API_BASE + path);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const bodyStr = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: method || 'GET',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {})
      },
      timeout: 30000
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout na requisição para Ads Dashboard API'));
    });

    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

/**
 * Formata os resultados para exibição amigável
 */
function formatResult(action, data) {
  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;

    if (action === 'health') {
      const lines = ['=== ADS DASHBOARD — STATUS ==='];
      if (parsed.status) lines.push(`Status: ${parsed.status}`);
      if (parsed.version) lines.push(`Versão: ${parsed.version}`);
      if (parsed.timestamp) lines.push(`Timestamp: ${parsed.timestamp}`);
      if (parsed.services) {
        lines.push('\nServiços:');
        for (const [svc, info] of Object.entries(parsed.services)) {
          const st = typeof info === 'object' ? (info.status || JSON.stringify(info)) : info;
          lines.push(`  ${svc}: ${st}`);
        }
      }
      return lines.join('\n');
    }

    if (action === 'summary') {
      const lines = ['=== RESUMO EXECUTIVO — ADS DASHBOARD ==='];
      if (parsed.period) {
        const p = parsed.period;
        lines.push(`\nPeríodo: ${p.from || '?'} a ${p.to || '?'} (${p.days || '?'} dias)`);
      }
      if (parsed.lastDataDate) lines.push(`Último dado: ${parsed.lastDataDate}`);
      if (parsed.totalAccounts) lines.push(`Contas: ${parsed.totalAccounts}`);

      const t = parsed.overview?.current || parsed.totals;
      if (t) {
        lines.push('\n--- Período Atual ---');
        if (t.spend !== undefined) lines.push(`  Investimento: R$ ${Number(t.spend).toFixed(2)}`);
        if (t.revenue !== undefined) lines.push(`  Receita: R$ ${Number(t.revenue).toFixed(2)}`);
        if (t.impressions !== undefined) lines.push(`  Impressões: ${Number(t.impressions).toLocaleString('pt-BR')}`);
        if (t.clicks !== undefined) lines.push(`  Cliques: ${Number(t.clicks).toLocaleString('pt-BR')}`);
        if (t.conversions !== undefined) lines.push(`  Conversões: ${Number(t.conversions).toLocaleString('pt-BR')}`);
        if (t.whatsappContacts !== undefined) lines.push(`  WhatsApp Contatos: ${Number(t.whatsappContacts).toLocaleString('pt-BR')}`);
        if (t.ctr !== undefined) lines.push(`  CTR: ${Number(t.ctr).toFixed(2)}%`);
        if (t.cpc !== undefined) lines.push(`  CPC: R$ ${Number(t.cpc).toFixed(2)}`);
        if (t.cpm !== undefined) lines.push(`  CPM: R$ ${Number(t.cpm).toFixed(2)}`);
        if (t.cpa !== undefined) lines.push(`  CPA: R$ ${Number(t.cpa).toFixed(2)}`);
        if (t.roas !== undefined) lines.push(`  ROAS: ${Number(t.roas).toFixed(2)}x`);
      }

      if (parsed.overview?.changes) {
        const c = parsed.overview.changes;
        lines.push('\n--- Variação vs Período Anterior ---');
        for (const [key, val] of Object.entries(c)) {
          if (val !== null && val !== undefined) {
            const arrow = val > 0 ? '↑' : val < 0 ? '↓' : '→';
            lines.push(`  ${key}: ${arrow} ${val > 0 ? '+' : ''}${val}%`);
          }
        }
      }

      if (parsed.platforms) {
        lines.push('\n--- Por Plataforma ---');
        for (const [plat, metrics] of Object.entries(parsed.platforms)) {
          if (metrics.spend > 0) {
            lines.push(`  ${plat.toUpperCase()}:`);
            lines.push(`    Investimento: R$ ${Number(metrics.spend).toFixed(2)}`);
            if (metrics.revenue !== undefined) lines.push(`    Receita: R$ ${Number(metrics.revenue).toFixed(2)}`);
            if (metrics.roas !== undefined) lines.push(`    ROAS: ${Number(metrics.roas).toFixed(2)}x`);
            if (metrics.conversions !== undefined) lines.push(`    Conversões: ${metrics.conversions}`);
          }
        }
      }

      if (parsed.accounts && parsed.accounts.length) {
        lines.push('\n--- Por Conta ---');
        for (const acc of parsed.accounts) {
          const m = acc.metrics || {};
          lines.push(`  ${acc.name} (${acc.platform}):`);
          if (m.spend !== undefined) lines.push(`    Spend: R$ ${Number(m.spend).toFixed(2)}`);
          if (m.roas !== undefined && m.roas > 0) lines.push(`    ROAS: ${Number(m.roas).toFixed(2)}x`);
          if (m.conversions !== undefined && m.conversions > 0) lines.push(`    Conversões: ${m.conversions}`);
          if (acc.insightDays) lines.push(`    Dados: ${acc.insightDays} dias`);
        }
      }

      return lines.join('\n');
    }

    if (action === 'accounts') {
      const accounts = Array.isArray(parsed) ? parsed : (parsed.accounts || parsed.data || []);
      const period = parsed.period || '';
      const lines = [`=== CONTAS ADS DASHBOARD (${accounts.length}) — ${period} ===`];
      for (const acc of accounts) {
        lines.push(`\n[${acc.id || acc.accountId}] ${acc.name || acc.accountName}`);
        if (acc.platform) lines.push(`  Plataforma: ${acc.platform}`);
        if (acc.status) lines.push(`  Status: ${acc.status}`);
        if (acc.tokenStatus) lines.push(`  Token: ${acc.tokenStatus}`);
        if (acc.clientName) lines.push(`  Cliente: ${acc.clientName}`);
        const m = acc.metrics || {};
        if (m.spend !== undefined) lines.push(`  Investimento: R$ ${Number(m.spend).toFixed(2)}`);
        if (m.revenue !== undefined && m.revenue > 0) lines.push(`  Receita: R$ ${Number(m.revenue).toFixed(2)}`);
        if (m.impressions !== undefined) lines.push(`  Impressões: ${Number(m.impressions).toLocaleString('pt-BR')}`);
        if (m.clicks !== undefined) lines.push(`  Cliques: ${Number(m.clicks).toLocaleString('pt-BR')}`);
        if (m.conversions !== undefined && m.conversions > 0) lines.push(`  Conversões: ${m.conversions}`);
        if (m.roas !== undefined && m.roas > 0) lines.push(`  ROAS: ${Number(m.roas).toFixed(2)}x`);
        if (m.ctr !== undefined) lines.push(`  CTR: ${Number(m.ctr).toFixed(2)}%`);
        if (m.whatsappContacts !== undefined && m.whatsappContacts > 0) lines.push(`  WhatsApp: ${m.whatsappContacts}`);
        if (acc.insightDays) lines.push(`  Dados: ${acc.insightDays} dias`);
      }
      return lines.join('\n');
    }

    // Para outras ações, retornar JSON formatado
    return JSON.stringify(parsed, null, 2);

  } catch (_) {
    return data;
  }
}

const handlers = {
  ads_dashboard: async (args, ctx) => {
    const { action, account_id, days = 7, platform, start, end } = args;

    // Obter API key do vault ou usar fallback
    let apiKey = ADS_API_KEY_FALLBACK;
    if (ctx && ctx.credentialVault) {
      try {
        const cred = await ctx.credentialVault.reveal(ADS_API_KEY_NAME);
        if (cred && cred.value) apiKey = cred.value;
        else if (typeof cred === 'string') apiKey = cred;
      } catch (_) {
        // Usar fallback
      }
    }

    // Montar URL conforme a ação
    let path, method = 'GET', body = null;

    switch (action) {
      case 'health':
        path = '/api/public/health';
        break;

      case 'accounts': {
        const params = new URLSearchParams({ days: String(days) });
        if (platform) params.set('platform', platform);
        path = `/api/public/accounts?${params}`;
        break;
      }

      case 'account': {
        if (!account_id) return 'Erro: account_id é obrigatório para a ação "account"';
        const params = new URLSearchParams({ days: String(days) });
        path = `/api/public/accounts/${account_id}?${params}`;
        break;
      }

      case 'insights': {
        const params = new URLSearchParams({ days: String(days) });
        if (platform) params.set('platform', platform);
        if (account_id) params.set('accountId', account_id);
        path = `/api/public/insights?${params}`;
        break;
      }

      case 'campaigns': {
        if (!account_id) return 'Erro: account_id é obrigatório para a ação "campaigns"';
        const params = new URLSearchParams({ days: String(days) });
        path = `/api/public/accounts/${account_id}/campaigns?${params}`;
        break;
      }

      case 'summary': {
        const params = new URLSearchParams({ days: String(days) });
        if (platform) params.set('platform', platform);
        path = `/api/public/summary?${params}`;
        break;
      }

      case 'sync': {
        path = '/api/public/sync';
        method = 'POST';
        body = { days };
        break;
      }

      case 'account_insights': {
        if (!account_id) return 'Erro: account_id é obrigatório para a ação "account_insights"';
        const params = new URLSearchParams({ days: String(days) });
        if (start) params.set('start', start);
        if (end) params.set('end', end);
        path = `/api/public/accounts/${account_id}/insights?${params}`;
        break;
      }

      default:
        return `Ação "${action}" não reconhecida. Use: health, accounts, account, insights, campaigns, summary, sync, account_insights`;
    }

    try {
      const result = await adsRequest(path, method, body, apiKey);

      if (result.status >= 400) {
        let errMsg = `Erro HTTP ${result.status}`;
        try {
          const errBody = JSON.parse(result.body);
          errMsg += `: ${errBody.error || errBody.message || result.body}`;
        } catch (_) {
          errMsg += `: ${result.body}`;
        }
        return errMsg;
      }

      return formatResult(action, result.body);

    } catch (err) {
      return `Erro ao consultar Ads Dashboard: ${err.message}`;
    }
  }
};

module.exports = { definitions, handlers };
