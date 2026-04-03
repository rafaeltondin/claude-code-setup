# GOOGLE DRIVE API — DOCUMENTACAO COMPLETA

**Categoria:** APIs
**Ultima Atualizacao:** 2026-02-25
**Testado em:** tondinrafael@gmail.com
**Status:** Validado e funcional

---

## 1. VISAO GERAL

A Google Drive API v3 permite gerenciar arquivos e pastas no Google Drive de forma programatica. Com ela e possivel:

- Listar, criar, atualizar e deletar arquivos e pastas
- Fazer upload e download de arquivos
- Gerenciar permissoes e compartilhamentos
- Consultar informacoes de armazenamento e cota
- Pesquisar arquivos com filtros avancados

**Base URL:** `https://www.googleapis.com/drive/v3`
**Upload URL:** `https://www.googleapis.com/upload/drive/v3`
**Documentacao oficial:** https://developers.google.com/drive/api/v3/reference

---

## 2. AUTENTICACAO

### 2.1 Tipo de Autenticacao

A API usa OAuth 2.0 com Bearer Token. O **Access Token** expira em ~1 hora e precisa ser renovado via **Refresh Token**.

### 2.2 Credenciais Necessarias

| Credencial | Descricao | Placeholder |
|-----------|-----------|-------------|
| Client ID | ID do app no Google Cloud Console | `YOUR_CLIENT_ID` |
| Client Secret | Segredo do app | `YOUR_CLIENT_SECRET` |
| Refresh Token | Token permanente para renovar access token | `YOUR_REFRESH_TOKEN` |
| Access Token | Token temporario (expira em ~1h) | `YOUR_ACCESS_TOKEN` |

No Credential Vault do projeto, usar:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`

### 2.3 Renovar o Access Token (via Refresh Token)

Quando o Access Token expirar (erro 401), use o Refresh Token para obter um novo:

```bash
curl -X POST "https://oauth2.googleapis.com/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "refresh_token=YOUR_REFRESH_TOKEN" \
  -d "grant_type=refresh_token"
```

**Resposta de sucesso:**
```json
{
  "access_token": "ya29.a0ATkoCc4...",
  "expires_in": 3599,
  "token_type": "Bearer",
  "scope": "https://www.googleapis.com/auth/drive"
}
```

**Script Node.js para renovacao automatica:**
```javascript
const axios = require('axios');

async function renovarAccessToken(clientId, clientSecret, refreshToken) {
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

// Uso
const token = await renovarAccessToken(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REFRESH_TOKEN
);
```

---

## 3. ESCOPOS NECESSARIOS

| Escopo | Nivel de Acesso |
|--------|----------------|
| `https://www.googleapis.com/auth/drive` | Acesso total ao Drive |
| `https://www.googleapis.com/auth/drive.file` | Apenas arquivos criados pelo app |
| `https://www.googleapis.com/auth/drive.readonly` | Somente leitura |
| `https://www.googleapis.com/auth/drive.metadata.readonly` | Somente metadados |

**Recomendacao:** Para uso geral, usar `https://www.googleapis.com/auth/drive`.

---

## 4. ENDPOINTS PRINCIPAIS

### 4.1 Listar Arquivos

**Testado:** SIM | **Status:** 200 OK

```bash
curl "https://www.googleapis.com/drive/v3/files?pageSize=10&fields=files(id,name,mimeType,createdTime,size)" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Parametros de query disponiveis:**

| Parametro | Descricao | Exemplo |
|-----------|-----------|---------|
| `pageSize` | Itens por pagina (max 1000) | `pageSize=50` |
| `pageToken` | Token para proxima pagina | `pageToken=TOKEN` |
| `q` | Filtro de busca | `q=name contains 'relatorio'` |
| `fields` | Campos a retornar | `fields=files(id,name,size)` |
| `orderBy` | Ordenacao | `orderBy=modifiedTime desc` |
| `includeItemsFromAllDrives` | Incluir drives compartilhados | `true` |

**Resposta:**
```json
{
  "files": [
    {
      "id": "1AgcFVe0vB2l0DdZDBMF-Tlux4UqdMra7IyvgIQ2NuKw",
      "name": "Planilha de Marketing",
      "mimeType": "application/vnd.google-apps.spreadsheet",
      "createdTime": "2022-12-06T12:44:42.258Z",
      "size": "1663828"
    }
  ],
  "nextPageToken": "TOKEN_PARA_PROXIMA_PAGINA"
}
```

**Node.js:**
```javascript
const axios = require('axios');

async function listarArquivos(accessToken, pageSize = 10) {
  const response = await axios.get('https://www.googleapis.com/drive/v3/files', {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: {
      pageSize,
      fields: 'files(id,name,mimeType,createdTime,size),nextPageToken'
    }
  });
  return response.data;
}
```

---

### 4.2 Buscar Arquivos por Nome ou Tipo

**Testado:** SIM | **Status:** 200 OK

```bash
# Buscar por nome contendo "relatorio"
curl "https://www.googleapis.com/drive/v3/files?q=name+contains+'relatorio'&fields=files(id,name,mimeType)" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Buscar arquivos de um tipo especifico
curl "https://www.googleapis.com/drive/v3/files?q=mimeType='application/pdf'&fields=files(id,name)" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Buscar arquivos em uma pasta especifica
curl "https://www.googleapis.com/drive/v3/files?q='FOLDER_ID'+in+parents&fields=files(id,name,mimeType)" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Operadores de busca (parametro `q`):**

| Operador | Descricao | Exemplo |
|----------|-----------|---------|
| `name contains 'X'` | Nome contem X | `q=name contains 'relatorio'` |
| `name = 'X'` | Nome exato | `q=name = 'arquivo.pdf'` |
| `mimeType = 'X'` | Tipo MIME exato | `q=mimeType='text/plain'` |
| `'ID' in parents` | Dentro de uma pasta | `q='abc123' in parents` |
| `trashed = false` | Nao esta na lixeira | `q=trashed=false` |
| `modifiedTime > 'DATA'` | Modificado apos data | `q=modifiedTime > '2026-01-01'` |
| `and` | Combinar filtros | `q=name contains 'a' and trashed=false` |

**Node.js:**
```javascript
async function buscarArquivos(accessToken, nomeParcial) {
  const response = await axios.get('https://www.googleapis.com/drive/v3/files', {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: {
      q: `name contains '${nomeParcial}' and trashed = false`,
      fields: 'files(id,name,mimeType,size)'
    }
  });
  return response.data.files;
}
```

---

### 4.3 Obter Detalhes de um Arquivo

**Testado:** SIM | **Status:** 200 OK

```bash
curl "https://www.googleapis.com/drive/v3/files/FILE_ID?fields=id,name,mimeType,size,createdTime,modifiedTime,owners,shared,webViewLink,parents" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Resposta:**
```json
{
  "id": "1OatHi5CaWFBgoWJSi_MIlKB076Ckkpg6",
  "name": "planilha de treino teste.xlsx",
  "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "parents": ["0AONLz2IkHXqWUk9PVA"],
  "webViewLink": "https://docs.google.com/spreadsheets/d/...",
  "createdTime": "2025-03-21T11:36:30.176Z",
  "modifiedTime": "2025-03-21T11:36:19.000Z",
  "owners": [
    {
      "displayName": "Rafael Tondin",
      "emailAddress": "tondinrafael@gmail.com",
      "me": true
    }
  ],
  "shared": false,
  "size": "232968"
}
```

**Node.js:**
```javascript
async function obterDetalhesArquivo(accessToken, fileId) {
  const response = await axios.get(
    `https://www.googleapis.com/drive/v3/files/${fileId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        fields: 'id,name,mimeType,size,createdTime,modifiedTime,owners,shared,webViewLink,parents'
      }
    }
  );
  return response.data;
}
```

---

### 4.4 Criar Pasta

**Testado:** SIM | **Status:** 200 OK

```bash
curl -X POST "https://www.googleapis.com/drive/v3/files" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "minha-pasta",
    "mimeType": "application/vnd.google-apps.folder"
  }'
```

**Criar subpasta dentro de outra pasta:**
```bash
curl -X POST "https://www.googleapis.com/drive/v3/files" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "subpasta",
    "mimeType": "application/vnd.google-apps.folder",
    "parents": ["FOLDER_ID_PAI"]
  }'
```

**Resposta:**
```json
{
  "kind": "drive#file",
  "id": "1mI6g-qVZVD80KWEyaMe2VWlcpALu-4Xz",
  "name": "minha-pasta",
  "mimeType": "application/vnd.google-apps.folder"
}
```

**Node.js:**
```javascript
async function criarPasta(accessToken, nome, pastaParenteId = null) {
  const metadata = {
    name: nome,
    mimeType: 'application/vnd.google-apps.folder'
  };
  if (pastaParenteId) {
    metadata.parents = [pastaParenteId];
  }

  const response = await axios.post(
    'https://www.googleapis.com/drive/v3/files',
    metadata,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return response.data; // { id, name, mimeType }
}
```

---

### 4.5 Upload de Arquivo (Multipart)

**Testado:** SIM | **Status:** 200 OK

```bash
# Upload simples com conteudo de texto
curl -X POST "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "metadata={\"name\":\"arquivo.txt\",\"mimeType\":\"text/plain\",\"parents\":[\"FOLDER_ID\"]};type=application/json;charset=UTF-8" \
  -F "file=Conteudo do arquivo aqui;type=text/plain"
```

**Para arquivos locais:**
```bash
curl -X POST "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "metadata={\"name\":\"documento.pdf\",\"parents\":[\"FOLDER_ID\"]};type=application/json" \
  -F "file=@/caminho/local/documento.pdf;type=application/pdf"
```

**Resposta:**
```json
{
  "id": "1qMseFrJ63Cm-TjG_CKnQ6RlflCaBkHaH",
  "name": "arquivo.txt",
  "mimeType": "text/plain",
  "parents": ["1mI6g-qVZVD80KWEyaMe2VWlcpALu-4Xz"],
  "size": "96"
}
```

**Node.js (com FormData):**
```javascript
const FormData = require('form-data');
const fs = require('fs');

async function uploadArquivo(accessToken, caminhoLocal, nome, folderId = null) {
  const form = new FormData();

  const metadata = { name: nome };
  if (folderId) metadata.parents = [folderId];

  form.append('metadata', JSON.stringify(metadata), {
    contentType: 'application/json'
  });
  form.append('file', fs.createReadStream(caminhoLocal));

  const response = await axios.post(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size',
    form,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...form.getHeaders()
      }
    }
  );
  return response.data;
}
```

---

### 4.6 Listar Conteudo de uma Pasta

**Testado:** SIM | **Status:** 200 OK

```bash
curl "https://www.googleapis.com/drive/v3/files?q='FOLDER_ID'+in+parents&fields=files(id,name,mimeType,size,createdTime)" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Node.js:**
```javascript
async function listarConteudoPasta(accessToken, folderId) {
  const response = await axios.get('https://www.googleapis.com/drive/v3/files', {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: {
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id,name,mimeType,size,createdTime)',
      orderBy: 'name'
    }
  });
  return response.data.files;
}
```

---

### 4.7 Listar Permissoes de um Arquivo/Pasta

**Testado:** SIM | **Status:** 200 OK

```bash
curl "https://www.googleapis.com/drive/v3/files/FILE_ID/permissions?fields=permissions(id,type,role,emailAddress,displayName)" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Resposta:**
```json
{
  "permissions": [
    {
      "id": "09735119049523439250",
      "type": "user",
      "emailAddress": "tondinrafael@gmail.com",
      "role": "owner",
      "displayName": "Rafael Tondin"
    }
  ]
}
```

**Adicionar permissao (compartilhar):**
```bash
curl -X POST "https://www.googleapis.com/drive/v3/files/FILE_ID/permissions" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "user",
    "role": "reader",
    "emailAddress": "outro@email.com"
  }'
```

**Roles disponiveis:**

| Role | Descricao |
|------|-----------|
| `owner` | Proprietario completo |
| `organizer` | Organizador (Drives compartilhados) |
| `fileOrganizer` | Organizador de arquivos |
| `writer` | Pode editar |
| `commenter` | Pode comentar |
| `reader` | Somente leitura |

**Tipos disponiveis:**

| Type | Descricao |
|------|-----------|
| `user` | Usuario especifico |
| `group` | Grupo do Google |
| `domain` | Dominio inteiro |
| `anyone` | Qualquer pessoa com o link |

**Node.js — compartilhar arquivo:**
```javascript
async function compartilharArquivo(accessToken, fileId, email, role = 'reader') {
  const response = await axios.post(
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
    { type: 'user', role, emailAddress: email },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return response.data;
}

// Tornar publico (qualquer pessoa com o link)
async function tornarPublico(accessToken, fileId) {
  const response = await axios.post(
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
    { type: 'anyone', role: 'reader' },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return response.data;
}
```

---

### 4.8 Informacoes de Armazenamento e Quota

**Testado:** SIM | **Status:** 200 OK

```bash
curl "https://www.googleapis.com/drive/v3/about?fields=storageQuota,user" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Resposta real da conta tondinrafael@gmail.com:**
```json
{
  "user": {
    "displayName": "Rafael Tondin",
    "emailAddress": "tondinrafael@gmail.com",
    "me": true
  },
  "storageQuota": {
    "limit": "5604932321280",
    "usage": "67950211318",
    "usageInDrive": "18939379578",
    "usageInDriveTrash": "4199157740"
  }
}
```

**Campos de quota (em bytes):**

| Campo | Descricao |
|-------|-----------|
| `limit` | Total disponivel (~5.2 TB) |
| `usage` | Total usado em todos os servicos |
| `usageInDrive` | Usado pelo Drive |
| `usageInDriveTrash` | Na lixeira do Drive |

**Node.js:**
```javascript
async function obterQuota(accessToken) {
  const response = await axios.get('https://www.googleapis.com/drive/v3/about', {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { fields: 'storageQuota,user' }
  });

  const { storageQuota } = response.data;
  const usadoGB = (parseInt(storageQuota.usage) / 1073741824).toFixed(2);
  const totalGB = (parseInt(storageQuota.limit) / 1073741824).toFixed(2);
  const percentual = ((parseInt(storageQuota.usage) / parseInt(storageQuota.limit)) * 100).toFixed(1);

  return {
    ...response.data,
    resumo: `${usadoGB} GB de ${totalGB} GB (${percentual}%)`
  };
}
```

---

### 4.9 Deletar Arquivo ou Pasta

**Testado:** SIM | **Status:** 204 No Content

```bash
curl -X DELETE "https://www.googleapis.com/drive/v3/files/FILE_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Observacoes:**
- Retorna `204 No Content` em caso de sucesso (sem corpo na resposta)
- Move para a lixeira do Drive (nao e exclusao permanente imediata)
- Para exclusao permanente, usar: `DELETE /files/FILE_ID?supportsAllDrives=true` com parametro adicional ou esvaziar a lixeira

**Node.js:**
```javascript
async function deletarArquivo(accessToken, fileId) {
  await axios.delete(
    `https://www.googleapis.com/drive/v3/files/${fileId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  console.log(`Arquivo ${fileId} deletado com sucesso`);
}
```

---

### 4.10 Download de Arquivo

```bash
# Download de arquivo binario
curl "https://www.googleapis.com/drive/v3/files/FILE_ID?alt=media" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -o arquivo_baixado.pdf

# Exportar arquivo Google Docs como PDF
curl "https://www.googleapis.com/drive/v3/files/FILE_ID/export?mimeType=application/pdf" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -o documento.pdf
```

**Formatos de exportacao para Google Docs:**

| Tipo de Arquivo | MIME para Exportar |
|----------------|-------------------|
| Google Docs | `application/pdf`, `text/plain`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| Google Sheets | `application/pdf`, `text/csv`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| Google Slides | `application/pdf`, `application/vnd.openxmlformats-officedocument.presentationml.presentation` |

**Node.js:**
```javascript
const fs = require('fs');

async function downloadArquivo(accessToken, fileId, caminhoDestino) {
  const response = await axios.get(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      responseType: 'stream'
    }
  );

  const writer = fs.createWriteStream(caminhoDestino);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}
```

---

## 5. TIPOS MIME DO GOOGLE DRIVE

| Tipo | MIME Type |
|------|-----------|
| Pasta | `application/vnd.google-apps.folder` |
| Google Docs | `application/vnd.google-apps.document` |
| Google Sheets | `application/vnd.google-apps.spreadsheet` |
| Google Slides | `application/vnd.google-apps.presentation` |
| Google Forms | `application/vnd.google-apps.form` |
| PDF | `application/pdf` |
| Texto | `text/plain` |
| JSON | `application/json` |
| ZIP | `application/zip` |
| Imagem JPEG | `image/jpeg` |
| Imagem PNG | `image/png` |
| Video MP4 | `video/mp4` |

---

## 6. SCRIPT NODE.JS COMPLETO — CLIENTE DRIVE

```javascript
/**
 * Google Drive API Client
 * Uso: node drive-client.js
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class GoogleDriveClient {
  constructor(clientId, clientSecret, refreshToken) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.refreshToken = refreshToken;
    this.accessToken = null;
    this.tokenExpiry = null;
    this.baseUrl = 'https://www.googleapis.com/drive/v3';
    this.uploadUrl = 'https://www.googleapis.com/upload/drive/v3';
  }

  /**
   * Obtem ou renova o access token automaticamente
   */
  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const response = await axios.post('https://oauth2.googleapis.com/token', null, {
      params: {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token'
      }
    });

    this.accessToken = response.data.access_token;
    this.tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
    return this.accessToken;
  }

  /**
   * Headers padrao com autenticacao
   */
  async headers() {
    const token = await this.getAccessToken();
    return { Authorization: `Bearer ${token}` };
  }

  /**
   * Listar arquivos com filtros opcionais
   */
  async listarArquivos({ pageSize = 10, query = null, pasta = null, campos = null } = {}) {
    const params = { pageSize };
    const filtros = ['trashed = false'];

    if (query) filtros.push(`name contains '${query}'`);
    if (pasta) filtros.push(`'${pasta}' in parents`);

    params.q = filtros.join(' and ');
    params.fields = campos || 'files(id,name,mimeType,size,createdTime),nextPageToken';

    const response = await axios.get(`${this.baseUrl}/files`, {
      headers: await this.headers(),
      params
    });
    return response.data;
  }

  /**
   * Obter detalhes de arquivo
   */
  async obterArquivo(fileId) {
    const response = await axios.get(`${this.baseUrl}/files/${fileId}`, {
      headers: await this.headers(),
      params: {
        fields: 'id,name,mimeType,size,createdTime,modifiedTime,owners,shared,webViewLink,parents'
      }
    });
    return response.data;
  }

  /**
   * Criar pasta
   */
  async criarPasta(nome, parenteId = null) {
    const metadata = {
      name: nome,
      mimeType: 'application/vnd.google-apps.folder'
    };
    if (parenteId) metadata.parents = [parenteId];

    const response = await axios.post(`${this.baseUrl}/files`, metadata, {
      headers: await this.headers()
    });
    return response.data;
  }

  /**
   * Upload de arquivo
   */
  async uploadArquivo(caminhoLocal, nome, folderId = null) {
    const form = new FormData();
    const metadata = { name: nome };
    if (folderId) metadata.parents = [folderId];

    form.append('metadata', JSON.stringify(metadata), {
      contentType: 'application/json'
    });
    form.append('file', fs.createReadStream(caminhoLocal));

    const hdrs = await this.headers();
    const response = await axios.post(
      `${this.uploadUrl}/files?uploadType=multipart&fields=id,name,size`,
      form,
      { headers: { ...hdrs, ...form.getHeaders() } }
    );
    return response.data;
  }

  /**
   * Upload de texto direto (sem arquivo local)
   */
  async uploadTexto(conteudo, nome, folderId = null) {
    const form = new FormData();
    const metadata = { name: nome, mimeType: 'text/plain' };
    if (folderId) metadata.parents = [folderId];

    form.append('metadata', JSON.stringify(metadata), {
      contentType: 'application/json'
    });
    form.append('file', Buffer.from(conteudo, 'utf-8'), {
      contentType: 'text/plain',
      filename: nome
    });

    const hdrs = await this.headers();
    const response = await axios.post(
      `${this.uploadUrl}/files?uploadType=multipart&fields=id,name,size`,
      form,
      { headers: { ...hdrs, ...form.getHeaders() } }
    );
    return response.data;
  }

  /**
   * Deletar arquivo ou pasta
   */
  async deletar(fileId) {
    await axios.delete(`${this.baseUrl}/files/${fileId}`, {
      headers: await this.headers()
    });
  }

  /**
   * Compartilhar arquivo
   */
  async compartilhar(fileId, email, role = 'reader') {
    const response = await axios.post(
      `${this.baseUrl}/files/${fileId}/permissions`,
      { type: 'user', role, emailAddress: email },
      { headers: await this.headers() }
    );
    return response.data;
  }

  /**
   * Obter quota de armazenamento
   */
  async obterQuota() {
    const response = await axios.get(`${this.baseUrl}/about`, {
      headers: await this.headers(),
      params: { fields: 'storageQuota,user' }
    });
    return response.data;
  }
}

// Uso do cliente
async function main() {
  const drive = new GoogleDriveClient(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REFRESH_TOKEN
  );

  // Listar arquivos
  const { files } = await drive.listarArquivos({ pageSize: 5 });
  console.log('Arquivos:', files.map(f => f.name));

  // Criar pasta
  const pasta = await drive.criarPasta('minha-pasta-api');
  console.log('Pasta criada:', pasta.id);

  // Upload de texto
  const arquivo = await drive.uploadTexto('Conteudo do arquivo', 'teste.txt', pasta.id);
  console.log('Arquivo enviado:', arquivo.id);

  // Quota
  const quota = await drive.obterQuota();
  const usadoGB = (parseInt(quota.storageQuota.usage) / 1073741824).toFixed(2);
  console.log(`Armazenamento usado: ${usadoGB} GB`);

  // Cleanup
  await drive.deletar(arquivo.id);
  await drive.deletar(pasta.id);
  console.log('Cleanup concluido');
}

main().catch(console.error);
```

---

## 7. INTEGRACAO COM CREDENTIAL VAULT

```javascript
// Script para usar com credential-cli.js run
// Salvar em D:\temp-X\drive-script.js

const axios = require('axios');

async function main() {
  // Credenciais vem do ambiente
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  // Renovar token
  const tokenResp = await axios.post('https://oauth2.googleapis.com/token', null, {
    params: {
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    }
  });

  const accessToken = tokenResp.data.access_token;

  // Usar a API
  const response = await axios.get('https://www.googleapis.com/drive/v3/files', {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { pageSize: 5, fields: 'files(id,name)' }
  });

  console.log(JSON.stringify(response.data, null, 2));
}

main().catch(console.error);
```

**Executar via Credential Vault:**
```bash
node "C:\Users\sabola\.claude\task-scheduler\credential-cli.js" run "D:\temp-X\drive-script.js"
powershell Remove-Item 'D:\temp-X' -Recurse -Force
```

---

## 8. PAGINACAO

A API retorna `nextPageToken` quando ha mais resultados:

```javascript
async function listarTodosArquivos(drive) {
  let pageToken = null;
  const todosArquivos = [];

  do {
    const params = {
      pageSize: 100,
      fields: 'files(id,name,mimeType),nextPageToken',
      q: 'trashed = false'
    };
    if (pageToken) params.pageToken = pageToken;

    const response = await axios.get('https://www.googleapis.com/drive/v3/files', {
      headers: await drive.headers(),
      params
    });

    todosArquivos.push(...response.data.files);
    pageToken = response.data.nextPageToken;

  } while (pageToken);

  return todosArquivos;
}
```

---

## 9. TROUBLESHOOTING E ERROS COMUNS

### 401 Unauthorized — Token Expirado
```
{
  "error": {
    "code": 401,
    "message": "Invalid Credentials",
    "status": "UNAUTHENTICATED"
  }
}
```
**Solucao:** Renovar o Access Token usando o Refresh Token (secao 2.3).

---

### 403 Forbidden — Escopo Insuficiente
```
{
  "error": {
    "code": 403,
    "message": "Insufficient Permission",
    "status": "PERMISSION_DENIED"
  }
}
```
**Solucao:** O token foi criado sem o escopo necessario. Revogar o token e autenticar novamente com os escopos corretos.

---

### 404 Not Found — Arquivo Nao Existe
```
{
  "error": {
    "code": 404,
    "message": "File not found: FILE_ID",
    "status": "NOT_FOUND"
  }
}
```
**Solucao:** Verificar se o ID esta correto. O arquivo pode ter sido deletado ou nao pertencer a conta autenticada.

---

### 429 Too Many Requests — Rate Limit
```
{
  "error": {
    "code": 429,
    "message": "Rate Limit Exceeded"
  }
}
```
**Solucao:** Implementar retry com backoff exponencial:
```javascript
async function comRetry(fn, maxTentativas = 3) {
  for (let i = 0; i < maxTentativas; i++) {
    try {
      return await fn();
    } catch (err) {
      if (err.response?.status === 429 && i < maxTentativas - 1) {
        await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
      } else {
        throw err;
      }
    }
  }
}
```

---

### Upload Falhou — Arquivo Muito Grande
Para arquivos maiores que 5 MB, usar **Resumable Upload**:

```bash
# 1. Iniciar upload resumavel
curl -X POST \
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Upload-Content-Type: video/mp4" \
  -H "X-Upload-Content-Length: 123456789" \
  -d '{"name": "video-grande.mp4"}' \
  -D - | grep -i location

# 2. Enviar o arquivo para a URL retornada no header Location
curl -X PUT "RESUMABLE_UPLOAD_URL" \
  -H "Content-Type: video/mp4" \
  --upload-file /caminho/video-grande.mp4
```

---

## 10. LIMITES DA API

| Limite | Valor |
|--------|-------|
| Requisicoes por usuario por segundo | 10 |
| Requisicoes por dia (quota) | 1.000.000.000 |
| Tamanho maximo upload simples | 5 MB |
| Tamanho maximo upload resumavel | 5 TB |
| Itens por pagina (pageSize max) | 1000 |

---

## 11. CAMPOS DISPONIVEIS (fields)

### Para Arquivos (`files/*`)
```
id, name, mimeType, size, createdTime, modifiedTime, parents,
owners, shared, webViewLink, webContentLink, thumbnailLink,
description, starred, trashed, trashedTime, capabilities,
permissions, exportLinks, fullFileExtension, fileExtension,
md5Checksum, originalFilename, quotaBytesUsed, version
```

### Para About
```
user, storageQuota, maxImportSizes, maxUploadSize,
appInstalled, exportFormats, importFormats
```

---

## 12. RESULTADO DOS TESTES (2026-02-25)

| # | Endpoint | Metodo | Status | Resultado |
|---|----------|--------|--------|-----------|
| 1 | `/files` | GET | 200 | Listou 10 arquivos reais |
| 2 | `/files?q=name contains 'teste'` | GET | 200 | Encontrou 4 arquivos |
| 3 | `/files/FILE_ID` | GET | 200 | Retornou metadados completos |
| 4 | `/files` (criar pasta) | POST | 200 | Pasta criada com sucesso |
| 5 | `/upload/drive/v3/files` | POST | 200 | Upload de 96 bytes realizado |
| 6 | `/files?q='ID' in parents` | GET | 200 | Listou conteudo da pasta |
| 7 | `/files/ID/permissions` | GET | 200 | Listou permissoes corretamente |
| 8 | `/about` | GET | 200 | Quota retornada (67.9 GB usados) |
| 9 | `/files/ID` (delete) | DELETE | 204 | Arquivo e pasta deletados |

**Taxa de sucesso: 9/9 (100%)**

---

## 13. LINKS UTEIS

- [Documentacao oficial Drive API v3](https://developers.google.com/drive/api/v3/reference)
- [Google Cloud Console](https://console.cloud.google.com/)
- [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
- [Drive API Explorer](https://developers.google.com/drive/api/v3/reference/files/list#try-it)
- [Escopos de permissao](https://developers.google.com/drive/api/guides/api-specific-auth)
