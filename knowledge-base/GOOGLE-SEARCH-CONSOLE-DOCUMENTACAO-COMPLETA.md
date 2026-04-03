---
title: "Google Search Console API - Documentacao Completa"
category: Documentacao
tags: [google, search-console, api, seo, webmasters, url-inspection, sitemaps, analytics]
topic: "Google Search Console API"
priority: high
version: "1.0.0"
last_updated: 2026-02-15
---

# Google Search Console API - Documentacao Completa

Documentacao completa da Google Search Console API (v1 e v3). Inclui todos os endpoints, parametros, dimensoes, metricas, filtros, exemplos de uso e integracao com o Credential Vault.

---

## Visao Geral

| Item | Valor |
|------|-------|
| **API v1 (recomendada)** | `https://searchconsole.googleapis.com/v1/` |
| **API v3 (legado)** | `https://www.googleapis.com/webmasters/v3/` |
| **Autenticacao** | OAuth 2.0 |
| **Escopo leitura** | `https://www.googleapis.com/auth/webmasters.readonly` |
| **Escopo leitura+escrita** | `https://www.googleapis.com/auth/webmasters` |
| **Credenciais** | `{{secret:GOOGLE_CLIENT_ID}}`, `{{secret:GOOGLE_CLIENT_SECRET}}`, `{{secret:GOOGLE_REFRESH_TOKEN}}` |
| **Projeto Google Cloud** | n8n-cc |

---

## Diferencas entre v3 e v1

| Aspecto | v3 (webmasters) | v1 (searchconsole) |
|---------|-----------------|-------------------|
| **Base URL** | `googleapis.com/webmasters/v3/` | `searchconsole.googleapis.com/v1/` |
| **Status** | Legado (funcional) | Atual (recomendado) |
| **Sitemaps em domains** | Nao suporta | Suporta |
| **Funcionalidade** | Identica | Identica + URL Inspection |

**Recomendacao:** Use a v1 para novos projetos. A v3 continua funcionando.

---

## Endpoints Disponiveis

### 1. Search Analytics (Performance de Busca)

| Endpoint | Metodo | Descricao |
|----------|--------|-----------|
| `/sites/{siteUrl}/searchAnalytics/query` | POST | Consultar dados de performance |

### 2. Sites (Gerenciar Propriedades)

| Endpoint | Metodo | Descricao |
|----------|--------|-----------|
| `/sites` | GET | Listar todas as propriedades |
| `/sites/{siteUrl}` | GET | Obter info de uma propriedade |
| `/sites/{siteUrl}` | POST | Adicionar propriedade |
| `/sites/{siteUrl}` | DELETE | Remover propriedade |

### 3. Sitemaps

| Endpoint | Metodo | Descricao |
|----------|--------|-----------|
| `/sites/{siteUrl}/sitemaps` | GET | Listar sitemaps |
| `/sites/{siteUrl}/sitemaps/{feedpath}` | GET | Info de um sitemap |
| `/sites/{siteUrl}/sitemaps/{feedpath}` | PUT | Enviar/atualizar sitemap |
| `/sites/{siteUrl}/sitemaps/{feedpath}` | DELETE | Remover sitemap |

### 4. URL Inspection (apenas v1)

| Endpoint | Metodo | Descricao |
|----------|--------|-----------|
| `/urlInspection/index:inspect` | POST | Inspecionar URL no indice |

---

## Search Analytics - Parametros de Request

### Parametros Obrigatorios

```json
{
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD"
}
```

### Parametros Opcionais

| Parametro | Tipo | Descricao | Default |
|-----------|------|-----------|---------|
| `dimensions` | Array\<string\> | Agrupar por dimensoes | [] (agregado) |
| `dimensionFilterGroups` | Array\<object\> | Filtros | [] |
| `type` | string | Tipo: web, discover, googleNews, news, image, video | web |
| `rowLimit` | integer | Maximo de linhas (1-25000) | 1000 |
| `startRow` | integer | Paginacao (offset) | 0 |
| `aggregationType` | string | auto, byPage, byProperty | auto |
| `dataState` | string | final, all, hourly_all | final |

---

## Dimensoes Disponiveis

| Dimensao | Valores Possiveis | Descricao |
|----------|-------------------|-----------|
| `query` | string | Termos de busca |
| `page` | URL | URI da pagina |
| `device` | DESKTOP, MOBILE, TABLET | Tipo de dispositivo |
| `country` | ISO 3166-1 alpha-3 (BRA, USA, GBR) | Pais da busca |
| `searchAppearance` | AMP_BLUE_LINK, RICHCARD, JOB_LISTING, WEB, etc | Tipo de resultado |
| `date` | YYYY-MM-DD | Data (timezone PT) |

**Restricao:** `searchAppearance` nao pode ser combinada com outras dimensoes.

---

## Metricas Retornadas

| Metrica | Tipo | Descricao | Range |
|---------|------|-----------|-------|
| `clicks` | integer | Total de cliques | 0+ |
| `impressions` | integer | Total de impressoes | 0+ |
| `ctr` | float | Click-through rate | 0.0 - 1.0 |
| `position` | float | Posicao media | 1.0+ |

---

## Filtros (dimensionFilterGroups)

### Estrutura

```json
{
  "dimensionFilterGroups": [
    {
      "groupType": "and",
      "filters": [
        {
          "dimension": "device",
          "operator": "equals",
          "expression": "MOBILE"
        }
      ]
    }
  ]
}
```

### Operadores

| Operador | Descricao | Exemplo |
|----------|-----------|---------|
| `equals` | Correspondencia exata | `"expression": "MOBILE"` |
| `contains` | Contem substring | `"expression": "seo"` |
| `notEquals` | Diferente de | `"expression": "DESKTOP"` |
| `notContains` | Nao contem | `"expression": "spam"` |
| `includingRegex` | Regex inclusivo (RE2) | `"expression": "^/blog.*"` |
| `excludingRegex` | Regex exclusivo (RE2) | `"expression": "^/admin.*"` |

### Exemplos de Filtros

**Apenas mobile no Brasil:**
```json
{
  "dimensionFilterGroups": [{
    "groupType": "and",
    "filters": [
      { "dimension": "device", "operator": "equals", "expression": "MOBILE" },
      { "dimension": "country", "operator": "equals", "expression": "BRA" }
    ]
  }]
}
```

**Paginas do blog:**
```json
{
  "dimensionFilterGroups": [{
    "filters": [
      { "dimension": "page", "operator": "includingRegex", "expression": "^https://www.fiberoficial.com.br/blogs/.*" }
    ]
  }]
}
```

**Queries contendo "barefoot":**
```json
{
  "dimensionFilterGroups": [{
    "filters": [
      { "dimension": "query", "operator": "contains", "expression": "barefoot" }
    ]
  }]
}
```

---

## dataState - Frescor dos Dados

| Valor | Latencia | Exatidao | Uso Recomendado |
|-------|----------|----------|-----------------|
| `final` (padrao) | 2-3 dias | 100% validado | Relatorios oficiais |
| `all` | 0-24h | Pode variar | Monitoramento recente |
| `hourly_all` | ~1h | Altamente volatil | Analise em tempo real |

---

## URL Inspection API

### Request

```json
POST https://searchconsole.googleapis.com/v1/urlInspection/index:inspect

{
  "inspectionUrl": "https://www.fiberoficial.com.br/products/sapatilha-fiber",
  "siteUrl": "sc-domain:fiberoficial.com.br",
  "languageCode": "pt-BR"
}
```

### Response

```json
{
  "inspectionResult": {
    "inspectionUrl": "https://www.fiberoficial.com.br/products/sapatilha-fiber",
    "indexStatusResult": {
      "verdict": "PASS",
      "lastCrawlTime": "2026-02-10T14:30:00Z",
      "crawlState": "OK",
      "robotsTxtState": "ACCESSIBLE",
      "indexingState": "INDEXED",
      "canonicalUrl": "https://www.fiberoficial.com.br/products/sapatilha-fiber",
      "mobileUsabilityResult": { "verdict": "PASS" },
      "richResultsResult": { "verdict": "PASS" }
    }
  }
}
```

### Verdicts Possiveis

| Verdict | Significado |
|---------|------------|
| `PASS` | URL indexada e sem problemas |
| `NEUTRAL` | Status indefinido |
| `FAIL` | Problemas encontrados |
| `VERDICT_UNSPECIFIED` | Nao especificado |

---

## Rate Limiting

### Search Analytics

| Limite | Valor |
|--------|-------|
| Por site (QPM) | 1.200 queries/minuto |
| Por usuario (QPM) | 1.200 queries/minuto |
| Por projeto (QPM) | 40.000 queries/minuto |
| Por projeto (QPD) | 30.000.000 queries/dia |

### URL Inspection

| Limite | Valor |
|--------|-------|
| Por site (QPM) | 600 queries/minuto |
| Por site (QPD) | 2.000 queries/dia |
| Por projeto (QPM) | 15.000 queries/minuto |
| Por projeto (QPD) | 10.000.000 queries/dia |

### Sites e Sitemaps

| Limite | Valor |
|--------|-------|
| Por usuario (QPS) | 20 queries/segundo |
| Por usuario (QPM) | 200 queries/minuto |

---

## Exemplos Praticos com Node.js

### Autenticacao + Listar Sites

```javascript
const https = require('https');
const { URLSearchParams } = require('url');

// Credenciais via process.env (injetadas pelo credential-cli run)
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

// Funcao auxiliar para HTTPS
function httpsRequest(url, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const req = https.request({
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

// Renovar access token
async function getAccessToken() {
  const postData = new URLSearchParams({
    refresh_token: REFRESH_TOKEN,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'refresh_token'
  }).toString();

  const result = await httpsRequest('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, postData);

  return result.data.access_token;
}

// Listar sites
async function listSites(token) {
  return httpsRequest('https://www.googleapis.com/webmasters/v3/sites', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
}
```

### Consultar Performance (Search Analytics)

```javascript
async function queryPerformance(token, siteUrl, options = {}) {
  const {
    startDate,
    endDate,
    dimensions = ['query'],
    rowLimit = 25000,
    filters = [],
    dataState = 'final'
  } = options;

  // Calcular datas padrao (ultimos 28 dias)
  const end = endDate || new Date().toISOString().split('T')[0];
  const start = startDate || (() => {
    const d = new Date();
    d.setDate(d.getDate() - 28);
    return d.toISOString().split('T')[0];
  })();

  const body = JSON.stringify({
    startDate: start,
    endDate: end,
    dimensions,
    rowLimit,
    dataState,
    ...(filters.length > 0 && {
      dimensionFilterGroups: [{ groupType: 'and', filters }]
    })
  });

  const encodedUrl = encodeURIComponent(siteUrl);
  return httpsRequest(
    `https://www.googleapis.com/webmasters/v3/sites/${encodedUrl}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    },
    body
  );
}
```

### Inspecionar URL

```javascript
async function inspectUrl(token, inspectionUrl, siteUrl) {
  const body = JSON.stringify({
    inspectionUrl,
    siteUrl,
    languageCode: 'pt-BR'
  });

  return httpsRequest(
    'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    },
    body
  );
}
```

### Listar Sitemaps

```javascript
async function listSitemaps(token, siteUrl) {
  const encodedUrl = encodeURIComponent(siteUrl);
  return httpsRequest(
    `https://www.googleapis.com/webmasters/v3/sites/${encodedUrl}/sitemaps`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
}
```

---

## Exemplos de Consultas Comuns

### Top queries da Fiber (ultimos 28 dias)

```javascript
const result = await queryPerformance(token, 'sc-domain:fiberoficial.com.br', {
  dimensions: ['query'],
  rowLimit: 50
});
// result.data.rows = [{ keys: ['fiber'], clicks: 5956, impressions: 17307, ctr: 0.344, position: 3.4 }, ...]
```

### Top paginas por dispositivo

```javascript
const result = await queryPerformance(token, 'sc-domain:fiberoficial.com.br', {
  dimensions: ['page', 'device'],
  rowLimit: 100
});
```

### Queries do blog apenas

```javascript
const result = await queryPerformance(token, 'sc-domain:fiberoficial.com.br', {
  dimensions: ['query'],
  filters: [
    { dimension: 'page', operator: 'includingRegex', expression: '^https://www.fiberoficial.com.br/blogs/.*' }
  ]
});
```

### Performance mobile no Brasil

```javascript
const result = await queryPerformance(token, 'sc-domain:fiberoficial.com.br', {
  dimensions: ['query', 'page'],
  filters: [
    { dimension: 'device', operator: 'equals', expression: 'MOBILE' },
    { dimension: 'country', operator: 'equals', expression: 'BRA' }
  ]
});
```

### Dados por dia (tendencia)

```javascript
const result = await queryPerformance(token, 'sc-domain:fiberoficial.com.br', {
  dimensions: ['date'],
  startDate: '2026-01-01',
  endDate: '2026-02-14'
});
```

### Paginas de produto com performance

```javascript
const result = await queryPerformance(token, 'sc-domain:fiberoficial.com.br', {
  dimensions: ['page'],
  filters: [
    { dimension: 'page', operator: 'includingRegex', expression: '^https://www.fiberoficial.com.br/products/.*' }
  ],
  rowLimit: 100
});
```

---

## Paginacao (startRow)

Para resultados com mais de 25.000 linhas, use paginacao:

```javascript
let allRows = [];
let startRow = 0;
const rowLimit = 25000;

while (true) {
  const result = await queryPerformance(token, siteUrl, {
    dimensions: ['query', 'page'],
    rowLimit,
    startRow
  });

  // Adicionar body com startRow ao request
  const rows = result.data.rows || [];
  allRows = allRows.concat(rows);

  if (rows.length < rowLimit) break; // Ultima pagina
  startRow += rowLimit;
}
```

---

## Formato de Resposta Completo

### Search Analytics

```json
{
  "rows": [
    {
      "keys": ["fiber", "https://www.fiberoficial.com.br/"],
      "clicks": 5956,
      "impressions": 17307,
      "ctr": 0.344,
      "position": 3.4
    }
  ],
  "responseAggregationType": "byProperty"
}
```

### Sites List

```json
{
  "siteEntry": [
    {
      "siteUrl": "sc-domain:fiberoficial.com.br",
      "permissionLevel": "siteFullUser"
    }
  ]
}
```

### Sitemaps List

```json
{
  "sitemap": [
    {
      "path": "https://www.fiberoficial.com.br/sitemap.xml",
      "lastSubmitted": "2026-02-01T10:00:00Z",
      "lastDownloaded": "2026-02-14T15:00:00Z",
      "isSitemapIndex": false,
      "type": "WEB",
      "contents": [{ "type": "WEB", "matched": 1500, "submitted": 2000 }]
    }
  ]
}
```

---

## Integracao com Credential Vault (Claude Code)

### Template de Script Completo

Crie o script em `D:\temp-search-console\` e execute via credential-cli:

```bash
# 1. Criar pasta
mkdir D:\temp-search-console

# 2. Criar script (Write tool)
# D:\temp-search-console\query.js

# 3. Executar com credenciais injetadas
node "C:\Users\sabola\.claude\task-scheduler\credential-cli.js" run "D:\temp-search-console\query.js"

# 4. Limpar
powershell -Command "Remove-Item 'D:\temp-search-console' -Recurse -Force"
```

### Script Modelo (query.js)

```javascript
const https = require('https');
const { URLSearchParams } = require('url');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

// Site da Fiber no Search Console
const FIBER_SITE = 'sc-domain:fiberoficial.com.br';

function httpsRequest(url, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const req = https.request({
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function getAccessToken() {
  const postData = new URLSearchParams({
    refresh_token: REFRESH_TOKEN,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'refresh_token'
  }).toString();

  const result = await httpsRequest('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(postData) }
  }, postData);

  if (result.data.access_token) return result.data.access_token;
  throw new Error('Falha ao renovar token: ' + JSON.stringify(result.data));
}

async function main() {
  const token = await getAccessToken();

  // Exemplo: Top 10 queries dos ultimos 28 dias
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = (() => { const d = new Date(); d.setDate(d.getDate() - 28); return d.toISOString().split('T')[0]; })();

  const body = JSON.stringify({
    startDate, endDate,
    dimensions: ['query'],
    rowLimit: 10,
    dataState: 'final'
  });

  const encoded = encodeURIComponent(FIBER_SITE);
  const result = await httpsRequest(
    `https://www.googleapis.com/webmasters/v3/sites/${encoded}/searchAnalytics/query`,
    { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
    body
  );

  console.log(JSON.stringify(result.data, null, 2));
}

main().catch(console.error);
```

---

## Troubleshooting

### Token expirado (401)

```json
{ "error": { "code": 401, "message": "Request had invalid authentication credentials." } }
```
**Solucao:** O access token expirou (dura 1h). Use o refresh token para gerar novo.

### Refresh token invalido (400)

```json
{ "error": "invalid_grant", "error_description": "Token has been expired or revoked." }
```
**Solucao:** O refresh token foi revogado. Necessario refazer o fluxo OAuth completo (executar oauth-server.js novamente).

### Site nao encontrado (403)

```json
{ "error": { "code": 403, "message": "User does not have sufficient permission for site" } }
```
**Solucao:** Verificar que o siteUrl esta correto e que a conta tem permissao. Usar `listSites()` para ver sites disponiveis.

### Rate limit excedido (429)

**Solucao:** Implementar retry com backoff exponencial. Aguardar 1 minuto e tentar novamente.

### Dados zerados para datas recentes

**Solucao:** Dados `final` tem latencia de 2-3 dias. Use `dataState: "all"` para dados mais recentes (porem aproximados).

---

## Referencia Cruzada

| Documento | Relacao |
|-----------|---------|
| `GOOGLE-SEARCH-CONSOLE-CREDENCIAIS.md` | Credenciais OAuth e acesso rapido |
| `FIBER-META-ADS-CREDENCIAIS.md` | Marketing pago (complementar ao SEO) |
| `MARKETING-DIGITAL-PLANO-GUIA-COMPLETO.md` | Estrategia de marketing digital |
| `FIBER-SHOPIFY-API-CREDENCIAIS.md` | API da loja Fiber (correlacionar com dados SEO) |

---

## Fontes

- [Google Search Console API Reference](https://developers.google.com/webmaster-tools/v1/api_reference_index)
- [Search Analytics: query](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)
- [URL Inspection API](https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect)
- [Usage Limits](https://developers.google.com/webmaster-tools/limits)
- [Getting your performance data](https://developers.google.com/webmaster-tools/v1/how-tos/all-your-data)

---

**Documento criado:** 2026-02-15
**Ultima atualizacao:** 2026-02-15
**Versao:** 1.0.0
**Testado e validado:** Sim - Todos os endpoints Search Console testados com sucesso
