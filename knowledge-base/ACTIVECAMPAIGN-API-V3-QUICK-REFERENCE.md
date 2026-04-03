# ActiveCampaign API v3 — Quick Reference

**Versão API:** v3 | **Base URL:** `https://{account}.api-{region}.com/api/3` | **Rate Limit:** 5 req/sec | **Auth:** `Api-Token: KEY`

---

## ENDPOINTS RÁPIDOS

### CONTATOS

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/contacts` | Criar novo contato |
| POST | `/contact/sync` | Criar ou atualizar (upsert) |
| GET | `/contacts` | Listar contatos |
| GET | `/contacts/{id}` | Obter contato específico |
| PUT | `/contacts/{id}` | Atualizar contato |
| DELETE | `/contacts/{id}` | Deletar contato |
| GET | `/contacts/{id}/contactTags` | Listar tags do contato |

### LISTAS

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/lists` | Listar todas as listas |
| POST | `/lists` | Criar lista |
| POST | `/contactLists` | Adicionar contato à lista |
| PUT | `/contactLists/{id}` | Atualizar status (subscribe/unsubscribe) |

### TAGS

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/tags` | Listar todas as tags |
| POST | `/tags` | Criar tag |
| POST | `/contactTags` | Adicionar tag a contato |
| DELETE | `/contactTags/{id}` | Remover tag de contato |

### CAMPOS CUSTOMIZADOS

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/fields` | Listar campos customizados |
| POST | `/fields` | Criar campo customizado |
| POST | `/fieldValues` | Atualizar valor de campo |

### CAMPANHAS

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/campaigns` | Listar campanhas |
| POST | `/campaigns` | Criar campanha |

### AUTOMAÇÕES

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/automations` | Listar automações |
| POST | `/contactAutomations` | Adicionar contato a automação |
| DELETE | `/contactAutomations/{id}` | Remover contato de automação |
| GET | `/contacts/{id}/contactAutomations` | Listar automações do contato |

### DEALS (CRM)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/deals` | Listar deals |
| POST | `/deals` | Criar deal |
| PUT | `/deals/{id}` | Atualizar deal |
| GET | `/dealGroups` | Listar pipelines |
| GET | `/dealStages` | Listar stages/estágios |

### WEBHOOKS

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/webhooks` | Listar webhooks |
| POST | `/webhooks` | Criar webhook |
| DELETE | `/webhooks/{id}` | Deletar webhook |

---

## EXEMPLOS RÁPIDOS

### Criar Contato
```bash
curl -X POST "https://account.api-us1.com/api/3/contacts" \
  -H "Api-Token: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contact": {
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "5551234567"
    }
  }'
```

### Sincronizar Contato (Upsert)
```bash
curl -X POST "https://account.api-us1.com/api/3/contact/sync" \
  -H "Api-Token: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contact": {
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "fieldValues": [
        {"field": "1", "value": "Custom Value"}
      ]
    }
  }'
```

### Adicionar Contato à Lista
```bash
curl -X POST "https://account.api-us1.com/api/3/contactLists" \
  -H "Api-Token: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contactList": {
      "list": 1,
      "contact": 42,
      "status": 1
    }
  }'
```

### Adicionar Tag a Contato
```bash
curl -X POST "https://account.api-us1.com/api/3/contactTags" \
  -H "Api-Token: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contactTag": {
      "tag": 1,
      "contact": 42
    }
  }'
```

### Adicionar à Automação
```bash
curl -X POST "https://account.api-us1.com/api/3/contactAutomations" \
  -H "Api-Token: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contactAutomation": {
      "contact": 42,
      "automation": 1
    }
  }'
```

### Listar Contatos
```bash
curl "https://account.api-us1.com/api/3/contacts?limit=50&offset=0" \
  -H "Api-Token: YOUR_KEY"
```

### Buscar Contato por Email
```bash
curl "https://account.api-us1.com/api/3/contacts?email=john@example.com" \
  -H "Api-Token: YOUR_KEY"
```

### Criar Deal
```bash
curl -X POST "https://account.api-us1.com/api/3/deals" \
  -H "Api-Token: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "deal": {
      "title": "$100k Deal",
      "value": "100000.00",
      "currency": "USD",
      "stage": "1",
      "contact": 42
    }
  }'
```

### Criar Webhook
```bash
curl -X POST "https://account.api-us1.com/api/3/webhooks" \
  -H "Api-Token: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "name": "Contact Updated",
      "url": "https://yoursite.com/webhook",
      "events": ["contact.updated", "contact.added"],
      "sources": ["contact"]
    }
  }'
```

---

## STATUS CODES

| Código | Significado | Ação |
|--------|-----------|------|
| 200 | OK | Sucesso |
| 201 | Created | Recurso criado |
| 400 | Bad Request | Verificar JSON |
| 401 | Unauthorized | Verificar API Key |
| 404 | Not Found | ID inválido |
| 422 | Unprocessable | Campos obrigatórios |
| 429 | Too Many Requests | Aguardar (rate limit) |
| 500 | Server Error | Tentar novamente |

---

## CUSTOM FIELD TYPES

- `text` — Texto simples
- `textarea` — Área de texto
- `date` — Data (YYYY-MM-DD)
- `datetime` — Data e hora
- `dropdown` — Dropdown (requer opções)
- `multiselect` — Multi-seleção
- `radio` — Radio buttons
- `checkbox` — Checkbox
- `number` — Número
- `hidden` — Oculto

---

## WEBHOOK EVENTS

**Contact:** contact.added, contact.updated, contact.deleted, contact.tag.added, contact.tag.removed, contact.unsubscribed

**Deal:** deal.added, deal.updated, deal.deleted, deal.stage.changed

**Campaign:** campaign.sent, campaign.opened, campaign.clicked, campaign.bounced

---

## CONTATO FIELDS

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| email | string | SIM | Email do contato |
| firstName | string | NÃO | Primeiro nome |
| lastName | string | NÃO | Sobrenome |
| phone | string | NÃO | Telefone |
| fieldValues | array | NÃO | Valores de campos custom |

---

## DEAL FIELDS

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| title | string | SIM | Título do deal |
| value | string | SIM | Valor monetário |
| currency | string | NÃO | Moeda (USD, BRL, etc) |
| stage | integer | SIM | ID do estágio |
| contact | integer | NÃO | ID do contato |
| status | string | NÃO | open/lost/won |

---

## DICAS

1. **Upsert:** Use `/contact/sync` quando quiser criar ou atualizar
2. **Rate Limit:** 5 req/sec — aguarde `Retry-After` em 429
3. **Custom Fields:** Use field ID (não nome) em `fieldValues`
4. **Listas:** Status 1=subscribed, 2=unsubscribed
5. **Webhooks:** "At least once" delivery — implemente idempotência
6. **IDs:** Sempre use strings para IDs em JSON
7. **Paginação:** `limit` (max 100) + `offset`
8. **API URL:** Encontre em Settings > Developer (não assuma api-us1)

---

**Última atualização:** 2026-03-02 | **Versão:** 1.0
