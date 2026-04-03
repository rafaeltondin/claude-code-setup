# GMAIL API — DOCUMENTACAO COMPLETA

**Categoria:** APIs
**Conta:** tondinrafael@gmail.com
**Testado em:** 2026-02-25
**Status:** Todos os endpoints testados e funcionando

---

## Visao Geral

A Gmail API permite ler, enviar, gerenciar e organizar emails programaticamente. Usa OAuth 2.0 para autenticacao e segue o padrao REST com respostas JSON.

- **Base URL:** `https://gmail.googleapis.com/gmail/v1/users/me`
- **Documentacao oficial:** https://developers.google.com/gmail/api
- **Console GCP:** https://console.cloud.google.com

---

## Credenciais Necessarias

| Campo | Placeholder | Descricao |
|-------|-------------|-----------|
| Access Token | `YOUR_ACCESS_TOKEN` | Token OAuth valido (expira em ~1h) |
| Refresh Token | `YOUR_REFRESH_TOKEN` | Token para renovar o access token |
| Client ID | `YOUR_CLIENT_ID` | ID do app no Google Cloud Console |
| Client Secret | `YOUR_CLIENT_SECRET` | Segredo do app no Google Cloud Console |
| Email | `YOUR_EMAIL` | Conta Gmail autorizada |

---

## Escopos OAuth (Scopes)

| Escopo | Permissao |
|--------|-----------|
| `https://www.googleapis.com/auth/gmail.readonly` | Leitura de emails e metadata |
| `https://www.googleapis.com/auth/gmail.send` | Envio de emails |
| `https://www.googleapis.com/auth/gmail.modify` | Leitura + modificacao (nao deleta) |
| `https://www.googleapis.com/auth/gmail.compose` | Criacao e envio de rascunhos |
| `https://www.googleapis.com/auth/gmail.labels` | Gerenciamento de labels |
| `https://mail.google.com/` | Acesso completo (nao recomendado) |

Para uso geral, usar: `gmail.modify` + `gmail.send`

---

## Como Renovar o Access Token via Refresh Token

O access token expira em aproximadamente 1 hora. Use o refresh token para obter um novo:

```bash
curl -X POST "https://oauth2.googleapis.com/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "refresh_token=YOUR_REFRESH_TOKEN" \
  -d "grant_type=refresh_token"
```

**Resposta:**
```json
{
  "access_token": "ya29.NOVO_TOKEN_AQUI",
  "expires_in": 3599,
  "token_type": "Bearer",
  "scope": "https://www.googleapis.com/auth/gmail.modify"
}
```

**Script Node.js para renovacao automatica:**
```javascript
const axios = require('axios');

async function renovarToken(refreshToken, clientId, clientSecret) {
  const response = await axios.post('https://oauth2.googleapis.com/token', {
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  }, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  return response.data.access_token;
}
```

---

## Endpoints Principais

### 1. Perfil do Usuario

Retorna informacoes basicas da conta, total de mensagens e threads.

```bash
curl -s "https://gmail.googleapis.com/gmail/v1/users/me/profile" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Resposta testada (200 OK):**
```json
{
  "emailAddress": "tondinrafael@gmail.com",
  "messagesTotal": 18228,
  "threadsTotal": 13360,
  "historyId": "2139900"
}
```

---

### 2. Listar Labels (Pastas)

Retorna todas as labels do sistema e criadas pelo usuario.

```bash
curl -s "https://gmail.googleapis.com/gmail/v1/users/me/labels" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Labels do sistema disponiveis:**
| ID | Nome | Descricao |
|----|------|-----------|
| `INBOX` | Caixa de entrada | Emails recebidos |
| `SENT` | Enviados | Emails enviados |
| `DRAFT` | Rascunhos | Rascunhos salvos |
| `TRASH` | Lixeira | Emails deletados |
| `SPAM` | Spam | Emails marcados como spam |
| `STARRED` | Marcados | Emails com estrela |
| `UNREAD` | Nao lidos | Emails sem leitura |
| `IMPORTANT` | Importantes | Marcados como importantes |
| `CATEGORY_PERSONAL` | Pessoal | Categoria pessoal |
| `CATEGORY_PROMOTIONS` | Promocoes | Emails promocionais |
| `CATEGORY_UPDATES` | Atualizacoes | Alertas e atualizacoes |
| `CATEGORY_SOCIAL` | Social | Redes sociais |
| `CATEGORY_FORUMS` | Forums | Grupos e listas |

---

### 3. Listar Mensagens

```bash
# Ultimas 10 mensagens
curl -s "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Com filtro de label
curl -s "https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=INBOX&maxResults=20" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Proxima pagina (usar nextPageToken da resposta anterior)
curl -s "https://gmail.googleapis.com/gmail/v1/users/me/messages?pageToken=PAGE_TOKEN" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Parametros de query:**
| Param | Tipo | Descricao |
|-------|------|-----------|
| `maxResults` | int | Max de resultados (1-500, padrao 100) |
| `pageToken` | string | Token para proxima pagina |
| `q` | string | Query de busca (ver secao de busca) |
| `labelIds` | string | Filtrar por label (ex: INBOX, SENT) |
| `includeSpamTrash` | bool | Incluir spam e lixeira |

**Resposta:**
```json
{
  "messages": [
    { "id": "19c94ed281857059", "threadId": "19c94ed281857059" },
    { "id": "19c94df5f625dd0e", "threadId": "19c94df5f625dd0e" }
  ],
  "nextPageToken": "16275800105015770991",
  "resultSizeEstimate": 201
}
```

---

### 4. Ler Detalhes de uma Mensagem

```bash
# Formato completo
curl -s "https://gmail.googleapis.com/gmail/v1/users/me/messages/MESSAGE_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Apenas metadata (mais rapido)
curl -s "https://gmail.googleapis.com/gmail/v1/users/me/messages/MESSAGE_ID?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Apenas snippet
curl -s "https://gmail.googleapis.com/gmail/v1/users/me/messages/MESSAGE_ID?format=minimal" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Formatos disponiveis:**
| Format | Descricao |
|--------|-----------|
| `full` | Payload completo com corpo (padrao) |
| `metadata` | Apenas headers selecionados |
| `minimal` | Apenas ID, labels e snippet |
| `raw` | Mensagem RFC 2822 em base64url |

**Resposta metadata (testada):**
```json
{
  "id": "19c94ed281857059",
  "threadId": "19c94ed281857059",
  "labelIds": ["UNREAD", "CATEGORY_UPDATES", "INBOX"],
  "snippet": "Alerta de seguranca...",
  "payload": {
    "mimeType": "multipart/alternative",
    "headers": [
      { "name": "Date", "value": "Wed, 25 Feb 2026 13:11:35 GMT" },
      { "name": "Subject", "value": "Alerta de seguranca" },
      { "name": "From", "value": "Google <no-reply@accounts.google.com>" },
      { "name": "To", "value": "tondinrafael@gmail.com" }
    ]
  },
  "sizeEstimate": 14055,
  "historyId": "2139766",
  "internalDate": "1772025095000"
}
```

---

### 5. Buscar Mensagens com Query

```bash
# Busca simples
curl -s "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=from:google&maxResults=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Busca complexa (URL encode os espacos e especiais)
curl -s "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=subject:fatura+after:2026/01/01" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Query Operators para Busca Avancada

| Operador | Exemplo | Descricao |
|----------|---------|-----------|
| `from:` | `from:google.com` | Emails de remetente |
| `to:` | `to:rafael@email.com` | Emails para destinatario |
| `subject:` | `subject:fatura` | Busca no assunto |
| `after:` | `after:2026/01/01` | Apos data (YYYY/MM/DD) |
| `before:` | `before:2026/12/31` | Antes da data |
| `newer_than:` | `newer_than:7d` | Mais recente que (d=dias, m=meses) |
| `older_than:` | `older_than:1y` | Mais antigo que |
| `has:attachment` | `has:attachment` | Tem anexo |
| `filename:` | `filename:pdf` | Nome do anexo |
| `in:` | `in:inbox` | Em label especifica |
| `is:unread` | `is:unread` | Nao lido |
| `is:starred` | `is:starred` | Marcado com estrela |
| `is:important` | `is:important` | Marcado como importante |
| `label:` | `label:promos` | Com label especifica |
| `larger:` | `larger:5mb` | Maior que tamanho |
| `smaller:` | `smaller:1mb` | Menor que tamanho |
| `category:` | `category:promotions` | Em categoria |
| `-` (NOT) | `-from:spam.com` | Exclui resultado |
| `OR` | `from:a OR from:b` | Operador OU |
| `""` (aspas) | `"texto exato"` | Frase exata |

**Exemplos combinados:**
```
from:google subject:alerta after:2026/01/01
has:attachment filename:pdf newer_than:30d
in:inbox is:unread from:cliente@empresa.com
```

---

### 6. Listar Threads (Conversas)

```bash
curl -s "https://gmail.googleapis.com/gmail/v1/users/me/threads?maxResults=5" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Resposta (testada):**
```json
{
  "threads": [
    {
      "id": "19c94ed281857059",
      "snippet": "Voce permitiu que o app N8n-Analytics...",
      "historyId": "2139766"
    }
  ],
  "nextPageToken": "04010745602255323086",
  "resultSizeEstimate": 201
}
```

**Detalhes de uma thread:**
```bash
curl -s "https://gmail.googleapis.com/gmail/v1/users/me/threads/THREAD_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### 7. Enviar Email

#### Processo de Encoding Base64url

O corpo do email deve seguir o formato RFC 2822 e ser codificado em base64url (sem padding `=`, `+` vira `-`, `/` vira `_`).

**Passo a passo com cURL:**

```bash
# Passo 1: Montar a mensagem RFC 2822
# Passo 2: Codificar em base64url
ENCODED=$(printf "From: YOUR_EMAIL@gmail.com\r\nTo: DESTINATARIO@email.com\r\nSubject: Assunto do Email\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nCorpo do email aqui." | base64 -w 0 | tr '+/' '-_' | tr -d '=')

# Passo 3: Enviar via API
curl -s -X POST \
  "https://gmail.googleapis.com/gmail/v1/users/me/messages/send" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"raw\": \"$ENCODED\"}"
```

**Envio com HTML:**
```bash
ENCODED=$(printf "From: YOUR_EMAIL@gmail.com\r\nTo: DESTINATARIO@email.com\r\nSubject: Email HTML\r\nContent-Type: text/html; charset=utf-8\r\n\r\n<h1>Titulo</h1><p>Corpo em HTML.</p>" | base64 -w 0 | tr '+/' '-_' | tr -d '=')

curl -s -X POST \
  "https://gmail.googleapis.com/gmail/v1/users/me/messages/send" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"raw\": \"$ENCODED\"}"
```

**Resposta de sucesso (testada — HTTP 200):**
```json
{
  "id": "19c94efc2fb6cf99",
  "threadId": "19c94efc2fb6cf99",
  "labelIds": ["UNREAD", "SENT", "INBOX"]
}
```

---

### 8. Gerenciar Drafts (Rascunhos)

```bash
# Listar drafts
curl -s "https://gmail.googleapis.com/gmail/v1/users/me/drafts" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Criar draft
ENCODED=$(printf "From: YOUR_EMAIL@gmail.com\r\nTo: DEST@email.com\r\nSubject: Rascunho\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nConteudo do rascunho." | base64 -w 0 | tr '+/' '-_' | tr -d '=')

curl -s -X POST \
  "https://gmail.googleapis.com/gmail/v1/users/me/drafts" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"message\": {\"raw\": \"$ENCODED\"}}"

# Enviar draft existente
curl -s -X POST \
  "https://gmail.googleapis.com/gmail/v1/users/me/drafts/send" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"id\": \"DRAFT_ID\"}"

# Deletar draft
curl -s -X DELETE \
  "https://gmail.googleapis.com/gmail/v1/users/me/drafts/DRAFT_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### 9. Storage e Quota

```bash
# Quota do Google Drive (inclui Gmail e Fotos)
curl -s "https://www.googleapis.com/drive/v3/about?fields=storageQuota" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Resposta testada:**
```json
{
  "storageQuota": {
    "limit": "5604932321280",
    "usage": "67950211318",
    "usageInDrive": "18939379578",
    "usageInDriveTrash": "4199157740"
  }
}
```

Calcular em GB: dividir por `1073741824` (1024^3).
- Limite: ~5.22 TB (Google One ativo)
- Uso total: ~63.26 GB

---

## Exemplos de Scripts Node.js

### Configuracao Base

```javascript
const https = require('https');
const { URLSearchParams } = require('url');

const CONFIG = {
  accessToken: process.env.GMAIL_ACCESS_TOKEN,
  refreshToken: process.env.GMAIL_REFRESH_TOKEN,
  clientId: process.env.GMAIL_CLIENT_ID,
  clientSecret: process.env.GMAIL_CLIENT_SECRET,
  baseUrl: 'https://gmail.googleapis.com/gmail/v1/users/me'
};

// Funcao base para requests
async function gmailRequest(path, options = {}) {
  const url = `${CONFIG.baseUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${CONFIG.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gmail API Error ${response.status}: ${JSON.stringify(error)}`);
  }

  return response.json();
}
```

---

### Script: Renovar Token Automaticamente

```javascript
async function renovarAccessToken() {
  const params = new URLSearchParams({
    client_id: CONFIG.clientId,
    client_secret: CONFIG.clientSecret,
    refresh_token: CONFIG.refreshToken,
    grant_type: 'refresh_token'
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  const data = await response.json();

  if (data.access_token) {
    CONFIG.accessToken = data.access_token;
    console.log('Token renovado. Expira em:', data.expires_in, 'segundos');
    return data.access_token;
  }

  throw new Error('Falha ao renovar token: ' + JSON.stringify(data));
}
```

---

### Script: Listar Emails

```javascript
async function listarEmails({ maxResults = 10, query = '', labelIds = [] } = {}) {
  const params = new URLSearchParams({ maxResults });
  if (query) params.set('q', query);
  if (labelIds.length > 0) params.set('labelIds', labelIds.join(','));

  const lista = await gmailRequest(`/messages?${params}`);

  console.log(`Total estimado: ${lista.resultSizeEstimate}`);
  console.log(`Mensagens retornadas: ${lista.messages?.length || 0}`);

  return lista;
}

// Exemplos de uso:
// await listarEmails({ maxResults: 20 });
// await listarEmails({ query: 'from:google is:unread' });
// await listarEmails({ labelIds: ['INBOX'], maxResults: 5 });
```

---

### Script: Ler Email Completo

```javascript
async function lerEmail(messageId, formato = 'full') {
  const params = new URLSearchParams({ format: formato });

  if (formato === 'metadata') {
    ['Subject', 'From', 'To', 'Date', 'Cc'].forEach(h => {
      params.append('metadataHeaders', h);
    });
  }

  const mensagem = await gmailRequest(`/messages/${messageId}?${params}`);

  // Extrair headers facilmente
  const headers = {};
  (mensagem.payload?.headers || []).forEach(h => {
    headers[h.name.toLowerCase()] = h.value;
  });

  // Decodificar corpo (base64url -> texto)
  let corpo = '';
  const parts = mensagem.payload?.parts || [mensagem.payload];
  for (const part of parts) {
    if (part?.mimeType === 'text/plain' && part.body?.data) {
      corpo = Buffer.from(part.body.data, 'base64').toString('utf-8');
      break;
    }
  }

  return {
    id: mensagem.id,
    assunto: headers['subject'],
    de: headers['from'],
    para: headers['to'],
    data: headers['date'],
    snippet: mensagem.snippet,
    corpo,
    labels: mensagem.labelIds
  };
}

// Exemplo de uso:
// const email = await lerEmail('19c94ed281857059');
// console.log(email.assunto, email.de);
```

---

### Script: Enviar Email

```javascript
async function enviarEmail({ para, assunto, corpo, corpoHtml = null, cc = null, bcc = null }) {
  // Montar cabecalhos RFC 2822
  const linhas = [
    `From: ${CONFIG.email}`,
    `To: ${para}`,
    cc ? `Cc: ${cc}` : null,
    bcc ? `Bcc: ${bcc}` : null,
    `Subject: ${assunto}`,
    `Content-Type: ${corpoHtml ? 'text/html' : 'text/plain'}; charset=utf-8`,
    '',  // linha em branco obrigatoria
    corpoHtml || corpo
  ].filter(Boolean);

  const mensagemRfc = linhas.join('\r\n');

  // Codificar em base64url
  const encoded = Buffer.from(mensagemRfc)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const resultado = await gmailRequest('/messages/send', {
    method: 'POST',
    body: JSON.stringify({ raw: encoded })
  });

  console.log('Email enviado! ID:', resultado.id);
  return resultado;
}

// Exemplos de uso:
// Texto simples:
// await enviarEmail({
//   para: 'destino@email.com',
//   assunto: 'Teste',
//   corpo: 'Ola, tudo bem?'
// });

// HTML:
// await enviarEmail({
//   para: 'destino@email.com',
//   assunto: 'Email Formatado',
//   corpoHtml: '<h1>Ola!</h1><p>Email em <b>HTML</b>.</p>'
// });
```

---

### Script: Buscar Emails

```javascript
async function buscarEmails(query, maxResults = 10) {
  console.log(`Buscando: "${query}"`);

  const lista = await gmailRequest(
    `/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`
  );

  if (!lista.messages || lista.messages.length === 0) {
    console.log('Nenhuma mensagem encontrada.');
    return [];
  }

  // Buscar detalhes em paralelo (lotes de 5)
  const detalhes = [];
  for (let i = 0; i < lista.messages.length; i += 5) {
    const lote = lista.messages.slice(i, i + 5);
    const resultados = await Promise.all(
      lote.map(m => lerEmail(m.id, 'metadata'))
    );
    detalhes.push(...resultados);
  }

  return detalhes;
}

// Exemplos:
// const emails = await buscarEmails('from:google is:unread');
// const faturas = await buscarEmails('subject:fatura has:attachment newer_than:30d');
// const importantes = await buscarEmails('is:important in:inbox');
```

---

### Script: Marcar Email como Lido

```javascript
async function marcarComoLido(messageId) {
  return gmailRequest(`/messages/${messageId}/modify`, {
    method: 'POST',
    body: JSON.stringify({
      removeLabelIds: ['UNREAD']
    })
  });
}

async function arquivarEmail(messageId) {
  return gmailRequest(`/messages/${messageId}/modify`, {
    method: 'POST',
    body: JSON.stringify({
      removeLabelIds: ['INBOX']
    })
  });
}

async function moverParaLixeira(messageId) {
  return gmailRequest(`/messages/${messageId}/trash`, {
    method: 'POST'
  });
}
```

---

### Script: Completo com Renovacao Automatica de Token

```javascript
class GmailClient {
  constructor({ accessToken, refreshToken, clientId, clientSecret, email }) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.email = email;
    this.baseUrl = 'https://gmail.googleapis.com/gmail/v1/users/me';
  }

  async request(path, options = {}, tentativa = 1) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    // Token expirado — renovar automaticamente
    if (response.status === 401 && tentativa === 1) {
      console.log('[Gmail] Token expirado, renovando...');
      await this.renovarToken();
      return this.request(path, options, 2);
    }

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`[Gmail ${response.status}] ${err.error?.message || JSON.stringify(err)}`);
    }

    return response.json();
  }

  async renovarToken() {
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: this.refreshToken,
      grant_type: 'refresh_token'
    });

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    const data = await res.json();
    if (!data.access_token) throw new Error('Falha ao renovar token');

    this.accessToken = data.access_token;
    return data.access_token;
  }

  async perfil() {
    return this.request('/profile');
  }

  async listarEmails(opcoes = {}) {
    const params = new URLSearchParams({
      maxResults: opcoes.maxResults || 10,
      ...(opcoes.query && { q: opcoes.query }),
      ...(opcoes.labelIds && { labelIds: opcoes.labelIds })
    });
    return this.request(`/messages?${params}`);
  }

  async lerEmail(id, formato = 'metadata') {
    const params = new URLSearchParams({ format: formato });
    if (formato === 'metadata') {
      ['Subject', 'From', 'To', 'Date'].forEach(h => params.append('metadataHeaders', h));
    }
    return this.request(`/messages/${id}?${params}`);
  }

  async enviarEmail({ para, assunto, corpo, corpoHtml }) {
    const linhas = [
      `From: ${this.email}`,
      `To: ${para}`,
      `Subject: ${assunto}`,
      `Content-Type: ${corpoHtml ? 'text/html' : 'text/plain'}; charset=utf-8`,
      '',
      corpoHtml || corpo
    ];
    const encoded = Buffer.from(linhas.join('\r\n'))
      .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    return this.request('/messages/send', {
      method: 'POST',
      body: JSON.stringify({ raw: encoded })
    });
  }
}

// Exemplo de uso:
// const gmail = new GmailClient({
//   accessToken: process.env.GMAIL_ACCESS_TOKEN,
//   refreshToken: process.env.GMAIL_REFRESH_TOKEN,
//   clientId: process.env.GMAIL_CLIENT_ID,
//   clientSecret: process.env.GMAIL_CLIENT_SECRET,
//   email: 'tondinrafael@gmail.com'
// });
//
// const perfil = await gmail.perfil();
// const emails = await gmail.listarEmails({ query: 'is:unread', maxResults: 5 });
// await gmail.enviarEmail({ para: 'dest@email.com', assunto: 'Teste', corpo: 'Ola!' });
```

---

## Limites de Rate / Quota

| Recurso | Limite |
|---------|--------|
| Requisicoes por segundo (por usuario) | 250 req/s |
| Unidades de quota por dia | 1.000.000.000 |
| Emails enviados por dia (conta gratuita) | 500 |
| Emails enviados por dia (Google Workspace) | 2.000 |
| Tamanho maximo por mensagem | 25 MB |
| Tamanho maximo de anexo | 25 MB |
| Resultados por pagina | Ate 500 |

**Custo de quota por operacao:**
| Operacao | Custo |
|----------|-------|
| `messages.list` | 5 unidades |
| `messages.get` (full) | 5 unidades |
| `messages.get` (metadata) | 1 unidade |
| `messages.send` | 100 unidades |
| `messages.modify` | 5 unidades |
| `threads.list` | 10 unidades |
| `labels.list` | 1 unidade |
| `drafts.list` | 5 unidades |

---

## Troubleshooting e Erros Comuns

### 401 Unauthorized — Token Invalido ou Expirado
```json
{
  "error": {
    "code": 401,
    "message": "Invalid Credentials",
    "status": "UNAUTHENTICATED"
  }
}
```
**Solucao:** Renovar o access token usando o refresh token (ver secao acima).

---

### 403 Forbidden — Scope Insuficiente
```json
{
  "error": {
    "code": 403,
    "message": "Request had insufficient authentication scopes.",
    "status": "PERMISSION_DENIED"
  }
}
```
**Solucao:** O token nao tem o escopo necessario. Gerar novo token com escopos corretos no Google Cloud Console.

---

### 403 Forbidden — Quota Excedida
```json
{
  "error": {
    "code": 403,
    "message": "User Rate Limit Exceeded",
    "status": "RESOURCE_EXHAUSTED"
  }
}
```
**Solucao:** Implementar exponential backoff. Aguardar e tentar novamente. Reduzir frequencia de requisicoes.

---

### 404 Not Found — Mensagem Nao Existe
```json
{
  "error": {
    "code": 404,
    "message": "Not Found",
    "status": "NOT_FOUND"
  }
}
```
**Solucao:** Verificar se o ID da mensagem esta correto. A mensagem pode ter sido deletada.

---

### 400 Bad Request — Email Malformado
**Causa:** Encoding base64url incorreto ou cabecalhos RFC 2822 mal formatados.
**Solucao:** Garantir que:
1. Os cabecalhos usam `\r\n` (nao apenas `\n`)
2. Ha uma linha em branco entre cabecalhos e corpo
3. O encoding usa `-` em vez de `+` e `_` em vez de `/`
4. O padding `=` foi removido

---

### Problema: Corpo do Email Aparece Vazio
**Causa:** O conteudo esta em `parts` aninhados, nao diretamente em `payload.body`.
**Solucao:**
```javascript
function extrairCorpo(payload) {
  // Verificar body direto
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }

  // Buscar em parts
  for (const part of (payload.parts || [])) {
    if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
      if (part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
    }
    // Recursivo para multipart aninhado
    if (part.parts) {
      const resultado = extrairCorpo(part);
      if (resultado) return resultado;
    }
  }
  return '';
}
```

---

## Outros Endpoints Uteis

```bash
# Detalhes de uma thread
GET /threads/{threadId}

# Modificar mensagem (adicionar/remover labels)
POST /messages/{id}/modify
Body: { "addLabelIds": ["STARRED"], "removeLabelIds": ["UNREAD"] }

# Mover para lixeira
POST /messages/{id}/trash

# Restaurar da lixeira
POST /messages/{id}/untrash

# Deletar permanentemente
DELETE /messages/{id}

# Batch delete
POST /messages/batchDelete
Body: { "ids": ["id1", "id2", "id3"] }

# Batch modify
POST /messages/batchModify
Body: { "ids": ["id1", "id2"], "addLabelIds": ["STARRED"], "removeLabelIds": [] }

# Historico de mudancas
GET /history?startHistoryId=HISTORY_ID

# Criar label customizada
POST /labels
Body: { "name": "Minha Label" }

# Watch (push notifications via Pub/Sub)
POST /watch
Body: { "topicName": "projects/PROJECT/topics/TOPIC", "labelIds": ["INBOX"] }
```

---

## Variaveis de Ambiente Recomendadas

```bash
# .env
GMAIL_ACCESS_TOKEN=ya29.xxxxx
GMAIL_REFRESH_TOKEN=1//xxxxx
GMAIL_CLIENT_ID=xxxxx.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=GOCSPX-xxxxx
GMAIL_EMAIL=tondinrafael@gmail.com
```

```javascript
// Carregar no Node.js
require('dotenv').config();

const gmail = new GmailClient({
  accessToken: process.env.GMAIL_ACCESS_TOKEN,
  refreshToken: process.env.GMAIL_REFRESH_TOKEN,
  clientId: process.env.GMAIL_CLIENT_ID,
  clientSecret: process.env.GMAIL_CLIENT_SECRET,
  email: process.env.GMAIL_EMAIL
});
```

---

## Referencia Rapida — cURL Completo

```bash
# Definir token
export TOKEN="YOUR_ACCESS_TOKEN"

# Perfil
curl -s "https://gmail.googleapis.com/gmail/v1/users/me/profile" -H "Authorization: Bearer $TOKEN"

# Labels
curl -s "https://gmail.googleapis.com/gmail/v1/users/me/labels" -H "Authorization: Bearer $TOKEN"

# Listar inbox
curl -s "https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=INBOX&maxResults=10" -H "Authorization: Bearer $TOKEN"

# Buscar
curl -s "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=from:google+is:unread" -H "Authorization: Bearer $TOKEN"

# Ler mensagem
curl -s "https://gmail.googleapis.com/gmail/v1/users/me/messages/MESSAGE_ID?format=metadata&metadataHeaders=Subject&metadataHeaders=From" -H "Authorization: Bearer $TOKEN"

# Threads
curl -s "https://gmail.googleapis.com/gmail/v1/users/me/threads?maxResults=5" -H "Authorization: Bearer $TOKEN"

# Drafts
curl -s "https://gmail.googleapis.com/gmail/v1/users/me/drafts" -H "Authorization: Bearer $TOKEN"

# Enviar email
ENCODED=$(printf "From: SEU_EMAIL\r\nTo: DEST\r\nSubject: ASSUNTO\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nCORPO" | base64 -w 0 | tr '+/' '-_' | tr -d '=')
curl -s -X POST "https://gmail.googleapis.com/gmail/v1/users/me/messages/send" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"raw\":\"$ENCODED\"}"

# Renovar token
curl -s -X POST "https://oauth2.googleapis.com/token" -d "client_id=CLIENT_ID&client_secret=SECRET&refresh_token=REFRESH&grant_type=refresh_token"
```

---

*Documentacao gerada em 2026-02-25 | Testado com conta tondinrafael@gmail.com*
