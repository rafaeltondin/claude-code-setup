# ActiveCampaign API v3 — Documentação Completa

**Data de Atualização:** 2026-03-02
**Versão API:** v3
**Status:** Documentado com 12 categorias principais e exemplos cURL

---

## 1. AUTENTICAÇÃO

### API Key - Onde Encontrar

1. Acesse sua conta ActiveCampaign
2. Vá para **Settings** (Configurações)
3. Clique na aba **Developer** (Desenvolvedor)
4. Encontre seu **API Key** e **API URL**

Cada usuário na conta tem uma chave API única e pessoal.

### Header de Autenticação

Todas as requisições precisam incluir o header `Api-Token` com sua chave:

```
Api-Token: YOUR_API_KEY
```

### Exemplos de Requisição

**cURL:**
```bash
curl -H "Api-Token: 123abc-def-ghi" https://youraccountname.api-us1.com/api/3/users/me
```

**JavaScript (Fetch):**
```javascript
const headers = {
  "Api-Token": "YOUR_API_KEY"
};
fetch(url, {
  method: "GET",
  headers: headers
});
```

**Python (Requests):**
```python
import requests

headers = {
    "Api-Token": "YOUR_API_KEY"
}
response = requests.get(url, headers=headers)
```

### Segurança

- **NUNCA** compartilhe sua API Key publicamente
- **NUNCA** exponha em código client-side
- Mantenha segura em variáveis de ambiente ou credential vault
- Cada usuário tem suas próprias credenciais para auditoria

---

## 2. BASE URL E ESTRUTURA

### Formato de Base URL

```
https://{ACCOUNT_NAME}.api-{REGION}.com/api/3/{RESOURCE}
```

### Exemplos

- **US (Padrão):** `https://myaccount.api-us1.com/api/3/contacts`
- **Canada:** `https://myaccount.api-ca1.com/api/3/contacts`
- **Europa:** `https://myaccount.api-eu1.com/api/3/contacts`

### IMPORTANTE: Encontre SUA URL Base

**NÃO assuma que api-us1 é sempre correto para sua conta!**

A URL base correta SEMPRE está em: **Settings > Developer > API URL**

---

## 3. RATE LIMITS

### Limite de Taxa

- **Limite:** 5 requisições por segundo por conta
- **Resposta ao Exceder:** HTTP 429 (Too Many Requests)

### Headers da Resposta

```
HTTP/1.1 429 Too Many Requests
Retry-After: 30
RateLimit-Limit: 5
RateLimit-Remaining: 0
```

### Best Practices

1. Monitore o header `RateLimit-Remaining`
2. Implemente backoff exponencial
3. Aguarde a duração em `Retry-After` antes de tentar novamente
4. Para operações em massa, use batch imports em vez de requisições individuais

### Exemplo de Tratamento em JavaScript

```javascript
async function apiCall(url, options = {}) {
  const response = await fetch(url, options);

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    console.log(`Rate limited. Waiting ${retryAfter} seconds...`);
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    return apiCall(url, options); // Retry
  }

  return response.json();
}
```

---

## 4. ENDPOINTS DE CONTATOS

### 4.1 - Criar Contato

**Endpoint:** `POST /api/3/contacts`

**URL Completa:**
```
https://{account}.api-us1.com/api/3/contacts
```

**Request Headers:**
```
Content-Type: application/json
Api-Token: YOUR_API_KEY
```

**Request Body:**
```json
{
  "contact": {
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "5551234567"
  }
}
```

**Response (201 Created):**
```json
{
  "contact": {
    "id": "1",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "5551234567",
    "dateAdded": "2026-03-02T10:30:00-06:00",
    "dateUpdated": "2026-03-02T10:30:00-06:00"
  }
}
```

**cURL:**
```bash
curl -X POST "https://myaccount.api-us1.com/api/3/contacts" \
  -H "Content-Type: application/json" \
  -H "Api-Token: YOUR_API_KEY" \
  -d '{
    "contact": {
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "5551234567"
    }
  }'
```

---

### 4.2 - Sincronizar Contato (Create or Update)

**Endpoint:** `POST /api/3/contact/sync`

**Descrição:** Cria um novo contato OU atualiza se já existir (baseado no email)

**Request Body:**
```json
{
  "contact": {
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "5551234567",
    "fieldValues": [
      {
        "field": "1",
        "value": "Custom Value 1"
      },
      {
        "field": "2",
        "value": "Custom Value 2"
      }
    ]
  }
}
```

**Response (200 OK):**
```json
{
  "contact": {
    "id": "1",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "5551234567",
    "dateAdded": "2026-03-02T10:30:00-06:00",
    "dateUpdated": "2026-03-02T10:30:00-06:00"
  }
}
```

**cURL:**
```bash
curl -X POST "https://myaccount.api-us1.com/api/3/contact/sync" \
  -H "Content-Type: application/json" \
  -H "Api-Token: YOUR_API_KEY" \
  -d '{
    "contact": {
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "5551234567",
      "fieldValues": [
        {"field": "1", "value": "Valor Customizado"}
      ]
    }
  }'
```

---

### 4.3 - Listar Contatos

**Endpoint:** `GET /api/3/contacts`

**Query Parameters:**
- `email` - Filtrar por email
- `search` - Busca genérica
- `listid` - Filtrar por lista (ID)
- `status` - Status do contato
- `limit` - Itens por página (padrão: 20, máx: 100)
- `offset` - Página (para paginação)

**URL Exemplo:**
```
https://myaccount.api-us1.com/api/3/contacts?limit=50&offset=0
```

**Response (200 OK):**
```json
{
  "contacts": [
    {
      "id": "1",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "5551234567",
      "dateAdded": "2026-03-02T10:30:00-06:00"
    },
    {
      "id": "2",
      "email": "jane@example.com",
      "firstName": "Jane",
      "lastName": "Smith",
      "phone": "5559876543",
      "dateAdded": "2026-03-01T08:15:00-06:00"
    }
  ],
  "meta": {
    "total": 127
  }
}
```

**cURL:**
```bash
curl -X GET "https://myaccount.api-us1.com/api/3/contacts?limit=50" \
  -H "Api-Token: YOUR_API_KEY"
```

---

### 4.4 - Buscar Contato por ID

**Endpoint:** `GET /api/3/contacts/{contactId}`

**URL Exemplo:**
```
https://myaccount.api-us1.com/api/3/contacts/1
```

**Response (200 OK):**
```json
{
  "contact": {
    "id": "1",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "5551234567",
    "dateAdded": "2026-03-02T10:30:00-06:00",
    "dateUpdated": "2026-03-02T10:30:00-06:00"
  }
}
```

**cURL:**
```bash
curl -X GET "https://myaccount.api-us1.com/api/3/contacts/1" \
  -H "Api-Token: YOUR_API_KEY"
```

---

### 4.5 - Atualizar Contato

**Endpoint:** `PUT /api/3/contacts/{contactId}`

**Request Body:**
```json
{
  "contact": {
    "firstName": "Johnny",
    "phone": "5551111111"
  }
}
```

**Response (200 OK):**
```json
{
  "contact": {
    "id": "1",
    "email": "john@example.com",
    "firstName": "Johnny",
    "lastName": "Doe",
    "phone": "5551111111",
    "dateUpdated": "2026-03-02T10:45:00-06:00"
  }
}
```

**cURL:**
```bash
curl -X PUT "https://myaccount.api-us1.com/api/3/contacts/1" \
  -H "Content-Type: application/json" \
  -H "Api-Token: YOUR_API_KEY" \
  -d '{
    "contact": {
      "firstName": "Johnny",
      "phone": "5551111111"
    }
  }'
```

---

### 4.6 - Deletar Contato

**Endpoint:** `DELETE /api/3/contacts/{contactId}`

**Response (200 OK):**
```json
{
  "message": "Contact deleted"
}
```

**cURL:**
```bash
curl -X DELETE "https://myaccount.api-us1.com/api/3/contacts/1" \
  -H "Api-Token: YOUR_API_KEY"
```

---

## 5. ENDPOINTS DE LISTAS

### 5.1 - Listar Todas as Listas

**Endpoint:** `GET /api/3/lists`

**Query Parameters:**
- `limit` - Itens por página (padrão: 20)
- `offset` - Para paginação

**Response (200 OK):**
```json
{
  "lists": [
    {
      "id": "1",
      "name": "Newsletter Subscribers",
      "description": "Main newsletter list",
      "subscriber_count": 1250,
      "cdate": "2025-01-15T10:30:00-06:00"
    },
    {
      "id": "2",
      "name": "Customers",
      "description": "Active customers",
      "subscriber_count": 450,
      "cdate": "2025-02-01T14:20:00-06:00"
    }
  ],
  "meta": {
    "total": 5
  }
}
```

**cURL:**
```bash
curl -X GET "https://myaccount.api-us1.com/api/3/lists?limit=50" \
  -H "Api-Token: YOUR_API_KEY"
```

---

### 5.2 - Criar Lista

**Endpoint:** `POST /api/3/lists`

**Request Body:**
```json
{
  "list": {
    "name": "Premium Customers",
    "description": "VIP customer list"
  }
}
```

**Response (201 Created):**
```json
{
  "list": {
    "id": "3",
    "name": "Premium Customers",
    "description": "VIP customer list",
    "subscriber_count": 0,
    "cdate": "2026-03-02T10:30:00-06:00"
  }
}
```

**cURL:**
```bash
curl -X POST "https://myaccount.api-us1.com/api/3/lists" \
  -H "Content-Type: application/json" \
  -H "Api-Token: YOUR_API_KEY" \
  -d '{
    "list": {
      "name": "Premium Customers",
      "description": "VIP customer list"
    }
  }'
```

---

### 5.3 - Adicionar Contato à Lista

**Endpoint:** `POST /api/3/contactLists`

**Status Codes:**
- `1` = Subscribed/Active
- `2` = Unsubscribed

**Request Body:**
```json
{
  "contactList": {
    "list": 1,
    "contact": 42,
    "status": 1
  }
}
```

**Response (201 Created):**
```json
{
  "contactList": {
    "id": "123",
    "contact": "42",
    "list": "1",
    "status": "1",
    "cdate": "2026-03-02T10:30:00-06:00"
  }
}
```

**cURL:**
```bash
curl -X POST "https://myaccount.api-us1.com/api/3/contactLists" \
  -H "Content-Type: application/json" \
  -H "Api-Token: YOUR_API_KEY" \
  -d '{
    "contactList": {
      "list": 1,
      "contact": 42,
      "status": 1
    }
  }'
```

---

### 5.4 - Atualizar Status de Lista para Contato

**Endpoint:** `PUT /api/3/contactLists/{contactListId}`

**Request Body:**
```json
{
  "contactList": {
    "status": 2
  }
}
```

---

## 6. ENDPOINTS DE TAGS

### 6.1 - Listar Todas as Tags

**Endpoint:** `GET /api/3/tags`

**Query Parameters:**
- `limit` - Itens por página
- `offset` - Para paginação

**Response (200 OK):**
```json
{
  "tags": [
    {
      "id": "1",
      "tag": "vip-customer",
      "tagType": "contact",
      "description": "VIP Customer Tag"
    },
    {
      "id": "2",
      "tag": "hot-lead",
      "tagType": "contact",
      "description": "Hot Sales Lead"
    }
  ],
  "meta": {
    "total": 15
  }
}
```

**cURL:**
```bash
curl -X GET "https://myaccount.api-us1.com/api/3/tags" \
  -H "Api-Token: YOUR_API_KEY"
```

---

### 6.2 - Criar Tag

**Endpoint:** `POST /api/3/tags`

**Request Body:**
```json
{
  "tag": {
    "tag": "early-adopter",
    "tagType": "contact"
  }
}
```

**Response (201 Created):**
```json
{
  "tag": {
    "id": "3",
    "tag": "early-adopter",
    "tagType": "contact"
  }
}
```

**cURL:**
```bash
curl -X POST "https://myaccount.api-us1.com/api/3/tags" \
  -H "Content-Type: application/json" \
  -H "Api-Token: YOUR_API_KEY" \
  -d '{
    "tag": {
      "tag": "early-adopter",
      "tagType": "contact"
    }
  }'
```

---

### 6.3 - Adicionar Tag a Contato

**Endpoint:** `POST /api/3/contactTags`

**Request Body:**
```json
{
  "contactTag": {
    "tag": 1,
    "contact": 42
  }
}
```

**Response (201 Created):**
```json
{
  "contactTag": {
    "id": "456",
    "contact": "42",
    "tag": "1"
  }
}
```

**cURL:**
```bash
curl -X POST "https://myaccount.api-us1.com/api/3/contactTags" \
  -H "Content-Type: application/json" \
  -H "Api-Token: YOUR_API_KEY" \
  -d '{
    "contactTag": {
      "tag": 1,
      "contact": 42
    }
  }'
```

---

### 6.4 - Remover Tag de Contato

**Endpoint:** `DELETE /api/3/contactTags/{contactTagId}`

**Descrição:** Deleta a associação entre a tag e o contato. A tag não é deletada, apenas removida do contato.

**Response (200 OK):**
```json
{
  "message": "Contact tag removed"
}
```

**cURL:**
```bash
curl -X DELETE "https://myaccount.api-us1.com/api/3/contactTags/456" \
  -H "Api-Token: YOUR_API_KEY"
```

---

## 7. ENDPOINTS DE CAMPOS CUSTOMIZADOS

### 7.1 - Listar Campos Customizados

**Endpoint:** `GET /api/3/fields`

**Query Parameters:**
- `limit` - Itens por página
- `offset` - Para paginação

**Response (200 OK):**
```json
{
  "fields": [
    {
      "id": "1",
      "title": "Company Size",
      "type": "text",
      "description": "Number of employees",
      "visible": true
    },
    {
      "id": "2",
      "title": "Industry",
      "type": "dropdown",
      "description": "Customer industry",
      "visible": true
    }
  ],
  "meta": {
    "total": 8
  }
}
```

**cURL:**
```bash
curl -X GET "https://myaccount.api-us1.com/api/3/fields" \
  -H "Api-Token: YOUR_API_KEY"
```

---

### 7.2 - Criar Campo Customizado

**Endpoint:** `POST /api/3/fields`

**Request Body:**
```json
{
  "field": {
    "title": "Department",
    "type": "text",
    "description": "Contact department",
    "visible": true
  }
}
```

**Field Types (tipo):**
- `text` - Texto simples
- `textarea` - Área de texto
- `date` - Data
- `datetime` - Data e hora
- `dropdown` - Dropdown (requer opções)
- `multiselect` - Multi-seleção
- `radio` - Radio buttons
- `checkbox` - Checkbox
- `number` - Número
- `hidden` - Campo oculto

**Response (201 Created):**
```json
{
  "field": {
    "id": "3",
    "title": "Department",
    "type": "text",
    "description": "Contact department",
    "visible": true
  }
}
```

**cURL:**
```bash
curl -X POST "https://myaccount.api-us1.com/api/3/fields" \
  -H "Content-Type: application/json" \
  -H "Api-Token: YOUR_API_KEY" \
  -d '{
    "field": {
      "title": "Department",
      "type": "text",
      "description": "Contact department",
      "visible": true
    }
  }'
```

---

### 7.3 - Atualizar Valor de Campo em Contato

**Endpoint:** `POST /api/3/fieldValues`

**Request Body:**
```json
{
  "fieldValue": {
    "field": "1",
    "value": "Engineering",
    "contact": "42"
  }
}
```

**Response (201 Created):**
```json
{
  "fieldValue": {
    "id": "789",
    "contact": "42",
    "field": "1",
    "value": "Engineering"
  }
}
```

**cURL:**
```bash
curl -X POST "https://myaccount.api-us1.com/api/3/fieldValues" \
  -H "Content-Type: application/json" \
  -H "Api-Token: YOUR_API_KEY" \
  -d '{
    "fieldValue": {
      "field": "1",
      "value": "Engineering",
      "contact": "42"
    }
  }'
```

---

## 8. ENDPOINTS DE CAMPANHAS

### 8.1 - Listar Campanhas

**Endpoint:** `GET /api/3/campaigns`

**Query Parameters:**
- `limit` - Itens por página
- `offset` - Para paginação
- `status` - Status da campanha

**Response (200 OK):**
```json
{
  "campaigns": [
    {
      "id": "1",
      "name": "Spring Sale 2026",
      "description": "Main spring campaign",
      "status": "sent",
      "cdate": "2026-02-01T10:00:00-06:00"
    },
    {
      "id": "2",
      "name": "Newsletter #12",
      "description": "Monthly newsletter",
      "status": "draft",
      "cdate": "2026-03-01T14:00:00-06:00"
    }
  ],
  "meta": {
    "total": 24
  }
}
```

**cURL:**
```bash
curl -X GET "https://myaccount.api-us1.com/api/3/campaigns" \
  -H "Api-Token: YOUR_API_KEY"
```

---

### 8.2 - Criar Campanha

**Endpoint:** `POST /api/3/campaigns`

**Request Body:**
```json
{
  "campaign": {
    "name": "Q2 Marketing Push",
    "description": "Second quarter marketing campaign",
    "type": "email"
  }
}
```

**Response (201 Created):**
```json
{
  "campaign": {
    "id": "3",
    "name": "Q2 Marketing Push",
    "description": "Second quarter marketing campaign",
    "type": "email",
    "status": "draft",
    "cdate": "2026-03-02T10:30:00-06:00"
  }
}
```

**cURL:**
```bash
curl -X POST "https://myaccount.api-us1.com/api/3/campaigns" \
  -H "Content-Type: application/json" \
  -H "Api-Token: YOUR_API_KEY" \
  -d '{
    "campaign": {
      "name": "Q2 Marketing Push",
      "description": "Second quarter marketing campaign",
      "type": "email"
    }
  }'
```

**NOTA IMPORTANTE:** A API v3 permite criar e editar campanhas e mensagens, mas não há um endpoint direto para conectar uma mensagem a uma campanha via API. Isso geralmente é feito na interface UI.

---

## 9. ENDPOINTS DE AUTOMAÇÕES

### 9.1 - Listar Automações

**Endpoint:** `GET /api/3/automations`

**Query Parameters:**
- `limit` - Itens por página
- `offset` - Para paginação

**Response (200 OK):**
```json
{
  "automations": [
    {
      "id": "1",
      "name": "Welcome Series",
      "description": "3-email welcome sequence",
      "status": "published"
    },
    {
      "id": "2",
      "name": "Abandoned Cart",
      "description": "Cart abandonment follow-up",
      "status": "published"
    }
  ],
  "meta": {
    "total": 7
  }
}
```

**cURL:**
```bash
curl -X GET "https://myaccount.api-us1.com/api/3/automations" \
  -H "Api-Token: YOUR_API_KEY"
```

---

### 9.2 - Adicionar Contato à Automação

**Endpoint:** `POST /api/3/contactAutomations`

**Request Body:**
```json
{
  "contactAutomation": {
    "contact": "42",
    "automation": "1"
  }
}
```

**Response (201 Created):**
```json
{
  "contactAutomation": {
    "id": "999",
    "contact": "42",
    "automation": "1",
    "cdate": "2026-03-02T10:30:00-06:00"
  }
}
```

**cURL:**
```bash
curl -X POST "https://myaccount.api-us1.com/api/3/contactAutomations" \
  -H "Content-Type: application/json" \
  -H "Api-Token: YOUR_API_KEY" \
  -d '{
    "contactAutomation": {
      "contact": "42",
      "automation": "1"
    }
  }'
```

---

### 9.3 - Remover Contato de Automação

**Endpoint:** `DELETE /api/3/contactAutomations/{contactAutomationId}`

**Response (200 OK):**
```json
{
  "message": "Contact removed from automation"
}
```

**cURL:**
```bash
curl -X DELETE "https://myaccount.api-us1.com/api/3/contactAutomations/999" \
  -H "Api-Token: YOUR_API_KEY"
```

---

### 9.4 - Listar Automações de um Contato

**Endpoint:** `GET /api/3/contacts/{contactId}/contactAutomations`

**Response (200 OK):**
```json
{
  "contactAutomations": [
    {
      "id": "999",
      "contact": "42",
      "automation": "1",
      "cdate": "2026-03-02T10:30:00-06:00"
    }
  ],
  "meta": {
    "total": 1
  }
}
```

---

## 10. ENDPOINTS DE DEALS (CRM)

### 10.1 - Listar Deals

**Endpoint:** `GET /api/3/deals`

**Query Parameters:**
- `limit` - Itens por página
- `offset` - Para paginação
- `stage` - Filtrar por stage ID
- `status` - Filtrar por status

**Response (200 OK):**
```json
{
  "deals": [
    {
      "id": "1",
      "title": "Acme Corp Enterprise Deal",
      "value": "150000.00",
      "currency": "USD",
      "stage": "1",
      "status": "open",
      "cdate": "2026-02-15T10:30:00-06:00"
    },
    {
      "id": "2",
      "title": "Tech Startup Investment",
      "value": "50000.00",
      "currency": "USD",
      "stage": "2",
      "status": "open",
      "cdate": "2026-03-01T14:20:00-06:00"
    }
  ],
  "meta": {
    "total": 14
  }
}
```

**cURL:**
```bash
curl -X GET "https://myaccount.api-us1.com/api/3/deals?limit=50" \
  -H "Api-Token: YOUR_API_KEY"
```

---

### 10.2 - Criar Deal

**Endpoint:** `POST /api/3/deals`

**Request Body:**
```json
{
  "deal": {
    "title": "New Enterprise Deal",
    "value": "250000.00",
    "currency": "USD",
    "stage": "1",
    "contact": "42"
  }
}
```

**Response (201 Created):**
```json
{
  "deal": {
    "id": "3",
    "title": "New Enterprise Deal",
    "value": "250000.00",
    "currency": "USD",
    "stage": "1",
    "contact": "42",
    "status": "open",
    "cdate": "2026-03-02T10:30:00-06:00"
  }
}
```

**cURL:**
```bash
curl -X POST "https://myaccount.api-us1.com/api/3/deals" \
  -H "Content-Type: application/json" \
  -H "Api-Token: YOUR_API_KEY" \
  -d '{
    "deal": {
      "title": "New Enterprise Deal",
      "value": "250000.00",
      "currency": "USD",
      "stage": "1",
      "contact": "42"
    }
  }'
```

---

### 10.3 - Atualizar Deal

**Endpoint:** `PUT /api/3/deals/{dealId}`

**Request Body:**
```json
{
  "deal": {
    "stage": "2",
    "value": "300000.00"
  }
}
```

**Response (200 OK):**
```json
{
  "deal": {
    "id": "3",
    "title": "New Enterprise Deal",
    "value": "300000.00",
    "currency": "USD",
    "stage": "2",
    "contact": "42",
    "status": "open"
  }
}
```

**cURL:**
```bash
curl -X PUT "https://myaccount.api-us1.com/api/3/deals/3" \
  -H "Content-Type: application/json" \
  -H "Api-Token: YOUR_API_KEY" \
  -d '{
    "deal": {
      "stage": "2",
      "value": "300000.00"
    }
  }'
```

---

### 10.4 - Listar Pipelines

**Endpoint:** `GET /api/3/dealGroups` (Pipelines)

**Response (200 OK):**
```json
{
  "dealGroups": [
    {
      "id": "1",
      "title": "Sales Pipeline",
      "currency": "USD"
    },
    {
      "id": "2",
      "title": "Partnership Pipeline",
      "currency": "USD"
    }
  ]
}
```

---

### 10.5 - Listar Stages (Estágios)

**Endpoint:** `GET /api/3/dealStages`

**Query Parameters:**
- `group` - Filtrar por Pipeline ID (group)

**Response (200 OK):**
```json
{
  "dealStages": [
    {
      "id": "1",
      "title": "To Contact",
      "group": "1",
      "order": "1"
    },
    {
      "id": "2",
      "title": "In Contact",
      "group": "1",
      "order": "2"
    },
    {
      "id": "3",
      "title": "Follow Up",
      "group": "1",
      "order": "3"
    }
  ]
}
```

**cURL:**
```bash
curl -X GET "https://myaccount.api-us1.com/api/3/dealStages?group=1" \
  -H "Api-Token: YOUR_API_KEY"
```

---

## 11. ENDPOINTS DE WEBHOOKS

### 11.1 - Criar Webhook

**Endpoint:** `POST /api/3/webhooks`

**Request Body:**
```json
{
  "webhook": {
    "name": "Contact Updated Webhook",
    "url": "https://yoursite.com/webhooks/contact-updated",
    "events": [
      "contact.updated",
      "contact.added"
    ],
    "sources": [
      "contact"
    ]
  }
}
```

**Response (201 Created):**
```json
{
  "webhook": {
    "id": "1",
    "name": "Contact Updated Webhook",
    "url": "https://yoursite.com/webhooks/contact-updated",
    "events": [
      "contact.updated",
      "contact.added"
    ],
    "sources": [
      "contact"
    ],
    "cdate": "2026-03-02T10:30:00-06:00"
  }
}
```

**cURL:**
```bash
curl -X POST "https://myaccount.api-us1.com/api/3/webhooks" \
  -H "Content-Type: application/json" \
  -H "Api-Token: YOUR_API_KEY" \
  -d '{
    "webhook": {
      "name": "Contact Updated Webhook",
      "url": "https://yoursite.com/webhooks/contact-updated",
      "events": ["contact.updated", "contact.added"],
      "sources": ["contact"]
    }
  }'
```

---

### 11.2 - Eventos Disponíveis

**Eventos de Contato (Contact):**
- `contact.added` - Contato adicionado
- `contact.updated` - Contato atualizado
- `contact.deleted` - Contato deletado
- `contact.note.added` - Nota adicionada
- `contact.tag.added` - Tag adicionada
- `contact.tag.removed` - Tag removida
- `contact.unsubscribed` - Contato desinscrever
- `contact.task.added` - Tarefa adicionada
- `contact.campaign.bounced` - Email devolvido
- `contact.campaign.complained` - Reclamação de spam

**Eventos de Deal:**
- `deal.added` - Deal adicionado
- `deal.updated` - Deal atualizado
- `deal.deleted` - Deal deletado
- `deal.note.added` - Nota adicionada
- `deal.stage.changed` - Stage alterado
- `deal.task.added` - Tarefa adicionada
- `deal.task.completed` - Tarefa completada

**Eventos de Campanha:**
- `campaign.sent` - Campanha enviada
- `campaign.bounced` - Email devolvido
- `campaign.opened` - Email aberto
- `campaign.clicked` - Link clicado
- `campaign.complained` - Reclamação de spam

---

### 11.3 - Payload de Webhook (Exemplo)

Quando um webhook é disparado, a ActiveCampaign envia um POST request com a seguinte estrutura:

```json
{
  "timestamp": 1646217000,
  "event": "contact.added",
  "eventid": "e123456",
  "data": {
    "contact": {
      "id": "42",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "5551234567",
      "dateAdded": "2026-03-02T10:30:00-06:00"
    }
  }
}
```

---

### 11.4 - Listar Webhooks

**Endpoint:** `GET /api/3/webhooks`

**Response (200 OK):**
```json
{
  "webhooks": [
    {
      "id": "1",
      "name": "Contact Updated Webhook",
      "url": "https://yoursite.com/webhooks/contact-updated",
      "events": ["contact.updated", "contact.added"],
      "sources": ["contact"],
      "cdate": "2026-03-02T10:30:00-06:00"
    }
  ],
  "meta": {
    "total": 1
  }
}
```

---

### 11.5 - Deletar Webhook

**Endpoint:** `DELETE /api/3/webhooks/{webhookId}`

**Response (200 OK):**
```json
{
  "message": "Webhook deleted"
}
```

**cURL:**
```bash
curl -X DELETE "https://myaccount.api-us1.com/api/3/webhooks/1" \
  -H "Api-Token: YOUR_API_KEY"
```

---

## 12. EXEMPLOS PRÁTICOS

### Exemplo 1: Fluxo Completo de Contato

```bash
#!/bin/bash
API_KEY="YOUR_API_KEY"
ACCOUNT="myaccount"
BASE_URL="https://${ACCOUNT}.api-us1.com/api/3"

# 1. Criar contato
CONTACT=$(curl -s -X POST "$BASE_URL/contacts" \
  -H "Content-Type: application/json" \
  -H "Api-Token: $API_KEY" \
  -d '{
    "contact": {
      "email": "prospect@example.com",
      "firstName": "John",
      "lastName": "Prospect",
      "phone": "5551234567"
    }
  }')

CONTACT_ID=$(echo $CONTACT | jq -r '.contact.id')
echo "Contato criado: $CONTACT_ID"

# 2. Adicionar à lista
curl -s -X POST "$BASE_URL/contactLists" \
  -H "Content-Type: application/json" \
  -H "Api-Token: $API_KEY" \
  -d "{
    \"contactList\": {
      \"list\": 1,
      \"contact\": $CONTACT_ID,
      \"status\": 1
    }
  }"

# 3. Adicionar tag
curl -s -X POST "$BASE_URL/contactTags" \
  -H "Content-Type: application/json" \
  -H "Api-Token: $API_KEY" \
  -d "{
    \"contactTag\": {
      \"tag\": 1,
      \"contact\": $CONTACT_ID
    }
  }"

# 4. Adicionar à automação
curl -s -X POST "$BASE_URL/contactAutomations" \
  -H "Content-Type: application/json" \
  -H "Api-Token: $API_KEY" \
  -d "{
    \"contactAutomation\": {
      \"contact\": $CONTACT_ID,
      \"automation\": 1
    }
  }"

echo "Fluxo completo executado!"
```

---

### Exemplo 2: Sincronizar Contato com Custom Fields

```bash
curl -X POST "https://myaccount.api-us1.com/api/3/contact/sync" \
  -H "Content-Type: application/json" \
  -H "Api-Token: YOUR_API_KEY" \
  -d '{
    "contact": {
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "5551234567",
      "fieldValues": [
        {
          "field": "1",
          "value": "Engineering"
        },
        {
          "field": "2",
          "value": "2025-12-31"
        },
        {
          "field": "3",
          "value": "Enterprise"
        }
      ]
    }
  }'
```

---

### Exemplo 3: Criar Deal e Associar a Contato

```bash
curl -X POST "https://myaccount.api-us1.com/api/3/deals" \
  -H "Content-Type: application/json" \
  -H "Api-Token: YOUR_API_KEY" \
  -d '{
    "deal": {
      "title": "$250k Enterprise Contract",
      "value": "250000.00",
      "currency": "USD",
      "stage": "1",
      "contact": "42",
      "description": "New enterprise customer signing"
    }
  }'
```

---

### Exemplo 4: Listar Contatos com Filtro

```bash
# Listar contatos em uma lista específica (ID: 5) com paginação
curl -X GET "https://myaccount.api-us1.com/api/3/contacts?listid=5&limit=100&offset=0" \
  -H "Api-Token: YOUR_API_KEY"

# Buscar por email específico
curl -X GET "https://myaccount.api-us1.com/api/3/contacts?email=john@example.com" \
  -H "Api-Token: YOUR_API_KEY"

# Busca genérica
curl -X GET "https://myaccount.api-us1.com/api/3/contacts?search=john" \
  -H "Api-Token: YOUR_API_KEY"
```

---

## 13. TRATAMENTO DE ERROS

### Status Codes Comuns

| Código | Significado | Ação |
|--------|-------------|------|
| 200 | OK - Requisição bem-sucedida | Continue |
| 201 | Created - Recurso criado | Continue |
| 400 | Bad Request - Dados inválidos | Verifique o formato JSON |
| 401 | Unauthorized - API Key inválida | Verifique sua API Key |
| 403 | Forbidden - Acesso negado | Verifique permissões |
| 404 | Not Found - Recurso não existe | Verifique o ID do recurso |
| 422 | Unprocessable Entity - Validação falhou | Verifique campos obrigatórios |
| 429 | Too Many Requests - Rate limit excedido | Aguarde segundo (Retry-After) |
| 500 | Server Error - Erro no servidor | Tente novamente em alguns segundos |

---

### Exemplo de Tratamento de Erro em JavaScript

```javascript
async function apiRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Api-Token': 'YOUR_API_KEY',
        ...options.headers
      }
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      console.log(`Rate limited. Waiting ${retryAfter} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return apiRequest(url, options);
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API Error ${response.status}: ${error.message}`);
    }

    return response.json();
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
}
```

---

## 14. BEST PRACTICES

### 1. Segurança

- Nunca hardcode API Keys em código fonte
- Use variáveis de ambiente ou credential vault
- Revoke API Keys quando mudar colaboradores
- Monitore atividades da API nos logs

### 2. Performance

- Use batch imports para operações em massa
- Implemente rate limit handling com backoff
- Pagine resultados com `limit` e `offset`
- Cache dados quando possível
- Use webhooks em vez de polling quando disponível

### 3. Confiabilidade

- Implemente retry logic com backoff exponencial
- Valide dados antes de enviar
- Log todas as requisições para debugging
- Trate erros 429, 500, 503 com retry
- Use checksums/IDs para evitar duplicatas

### 4. Integração

- Sempre use o endpoint `/contact/sync` para upsert
- Mapeie campos customizados corretamente (use IDs)
- Use webhooks para real-time updates
- Implemente validação de email
- Sincronize regularmente (mas respeite rate limits)

---

## 15. REFERÊNCIAS

- **Documentação Oficial:** https://developers.activecampaign.com/
- **API Reference:** https://developers.activecampaign.com/reference
- **Support:** https://help.activecampaign.com/
- **Status Page:** https://status.activecampaign.com/

---

**Documento preparado:** 2026-03-02
**Última atualização:** 2026-03-02
**Versão:** 1.0
