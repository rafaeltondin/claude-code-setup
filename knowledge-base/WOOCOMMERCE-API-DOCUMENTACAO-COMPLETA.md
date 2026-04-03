# WooCommerce REST API v3 — Documentação Completa

> **Última atualização:** 2026-02-27
> **Versão API:** v3 (WooCommerce 3.5+)
> **Docs oficial:** https://woocommerce.github.io/woocommerce-rest-api-docs/

---

## CLIENTES CONFIGURADOS

| Cliente | URL | Prefixo Vault | Status |
|---------|-----|---------------|--------|
| Sul Etiquetas | https://suletiquetas.com.br | SULETIQUETAS_WC_ | Testado OK |

### Credenciais no Vault

```bash
# Sul Etiquetas
node credential-cli.js get SULETIQUETAS_WC_CONSUMER_KEY
node credential-cli.js get SULETIQUETAS_WC_CONSUMER_SECRET
node credential-cli.js get SULETIQUETAS_WC_STORE_URL
```

### Script de Acesso Padrão

```javascript
// Usar SEMPRE via credential-cli.js run
const key = process.env.SULETIQUETAS_WC_CONSUMER_KEY;
const secret = process.env.SULETIQUETAS_WC_CONSUMER_SECRET;
const storeUrl = process.env.SULETIQUETAS_WC_STORE_URL;
const auth = Buffer.from(key + ':' + secret).toString('base64');

// Headers padrão
const headers = {
  'Authorization': 'Basic ' + auth,
  'Content-Type': 'application/json'
};
```

---

## VISÃO GERAL

- **Base URL:** `{store_url}/wp-json/wc/v3/`
- **Formato:** JSON
- **Métodos:** GET, POST, PUT, PATCH, DELETE
- **Requisitos:** WooCommerce 3.5+, WordPress 4.4+, Pretty Permalinks ativados

---

## AUTENTICAÇÃO

### 1. HTTP Basic Auth (HTTPS — Recomendado)

```bash
curl https://loja.com/wp-json/wc/v3/products \
  -u consumer_key:consumer_secret
```

### 2. Query String (alternativa)

```bash
curl "https://loja.com/wp-json/wc/v3/products?consumer_key=ck_xxx&consumer_secret=cs_xxx"
```

### 3. OAuth 1.0a (apenas HTTP — não recomendado)

Parâmetros obrigatórios: `oauth_consumer_key`, `oauth_timestamp`, `oauth_nonce`, `oauth_signature`, `oauth_signature_method` (HMAC-SHA1 ou HMAC-SHA256). Janela de 15 minutos.

### Gerar Chaves

1. WordPress Admin → WooCommerce → Configurações → Avançado → REST API
2. Adicionar chave → Descrição + Usuário + Permissões (Read/Write/Read-Write)
3. Gerar → Copiar Consumer Key e Consumer Secret (Secret só aparece 1x)

---

## PAGINAÇÃO

| Parâmetro | Descrição | Padrão |
|-----------|-----------|--------|
| `page` | Página atual | 1 |
| `per_page` | Itens por página | 10 (max 100) |
| `offset` | Pular N itens | 0 |

**Headers de resposta:**
- `X-WP-Total` — Total de recursos
- `X-WP-TotalPages` — Total de páginas
- `Link` — URLs de navegação (next, prev, first, last)

---

## CÓDIGOS DE ERRO

| HTTP | Significado | Causa comum |
|------|-------------|-------------|
| 400 | Bad Request | Requisição malformada |
| 401 | Unauthorized | Chaves inválidas ou ausentes |
| 403 | Forbidden | Sem permissão (chave Read tentando Write) |
| 404 | Not Found | Recurso não existe |
| 500 | Server Error | Erro interno do WordPress/WooCommerce |

```json
{
  "code": "woocommerce_rest_product_invalid_id",
  "message": "ID inválido.",
  "data": { "status": 404 }
}
```

---

## ENDPOINTS — PRODUTOS

### Listar Produtos

```
GET /wc/v3/products
```

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `page` | int | Página |
| `per_page` | int | Itens por página (max 100) |
| `search` | string | Busca por texto |
| `category` | string | ID da categoria |
| `tag` | string | ID da tag |
| `status` | string | publish, draft, pending, private |
| `type` | string | simple, variable, grouped, external |
| `sku` | string | Busca por SKU |
| `featured` | bool | Apenas destaques |
| `on_sale` | bool | Apenas em promoção |
| `min_price` | string | Preço mínimo |
| `max_price` | string | Preço máximo |
| `stock_status` | string | instock, outofstock, onbackorder |
| `orderby` | string | date, id, title, slug, price, popularity, rating |
| `order` | string | asc, desc |

### Criar Produto

```
POST /wc/v3/products
```

```json
{
  "name": "Etiqueta 100x50",
  "type": "simple",
  "regular_price": "29.90",
  "description": "Etiqueta adesiva 100x50mm",
  "short_description": "Etiqueta térmica",
  "sku": "ETQ-100x50",
  "stock_quantity": 500,
  "manage_stock": true,
  "categories": [{ "id": 15 }],
  "images": [{ "src": "https://example.com/image.jpg" }]
}
```

### Atualizar Produto

```
PUT /wc/v3/products/{id}
```

```json
{
  "regular_price": "35.90",
  "sale_price": "29.90",
  "stock_quantity": 300
}
```

### Deletar Produto

```
DELETE /wc/v3/products/{id}?force=true
```

### Batch (Bulk) de Produtos

```
POST /wc/v3/products/batch
```

```json
{
  "create": [{ "name": "Novo Produto", "regular_price": "10.00" }],
  "update": [{ "id": 123, "regular_price": "15.00" }],
  "delete": [456]
}
```

### Propriedades do Produto

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | int | ID (readonly) |
| `name` | string | Nome do produto |
| `slug` | string | URL slug |
| `type` | string | simple, variable, grouped, external |
| `status` | string | publish, draft, pending, private |
| `description` | string | Descrição completa (HTML) |
| `short_description` | string | Descrição curta (HTML) |
| `sku` | string | Código SKU |
| `price` | string | Preço atual (readonly) |
| `regular_price` | string | Preço regular |
| `sale_price` | string | Preço promocional |
| `on_sale` | bool | Em promoção (readonly) |
| `total_sales` | int | Total vendido (readonly) |
| `stock_quantity` | int | Quantidade em estoque |
| `stock_status` | string | instock, outofstock, onbackorder |
| `manage_stock` | bool | Gerenciar estoque |
| `weight` | string | Peso |
| `dimensions` | object | { length, width, height } |
| `categories` | array | [{ id, name, slug }] |
| `tags` | array | [{ id, name, slug }] |
| `images` | array | [{ id, src, name, alt }] |
| `attributes` | array | [{ id, name, options }] |
| `variations` | array | IDs das variações (readonly) |
| `meta_data` | array | [{ key, value }] |

---

## ENDPOINTS — VARIAÇÕES DE PRODUTO

```
GET    /wc/v3/products/{product_id}/variations
POST   /wc/v3/products/{product_id}/variations
GET    /wc/v3/products/{product_id}/variations/{id}
PUT    /wc/v3/products/{product_id}/variations/{id}
DELETE /wc/v3/products/{product_id}/variations/{id}
POST   /wc/v3/products/{product_id}/variations/batch
```

```json
{
  "regular_price": "19.90",
  "sku": "ETQ-100x50-BR",
  "stock_quantity": 100,
  "attributes": [{ "id": 1, "option": "Branca" }]
}
```

---

## ENDPOINTS — CATEGORIAS DE PRODUTO

```
GET    /wc/v3/products/categories
POST   /wc/v3/products/categories
GET    /wc/v3/products/categories/{id}
PUT    /wc/v3/products/categories/{id}
DELETE /wc/v3/products/categories/{id}
POST   /wc/v3/products/categories/batch
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `name` | string | Nome (obrigatório) |
| `slug` | string | URL slug |
| `parent` | int | ID da categoria pai |
| `description` | string | Descrição |
| `image` | object | { src, name, alt } |
| `count` | int | Qtd produtos (readonly) |

---

## ENDPOINTS — TAGS DE PRODUTO

```
GET    /wc/v3/products/tags
POST   /wc/v3/products/tags
GET    /wc/v3/products/tags/{id}
PUT    /wc/v3/products/tags/{id}
DELETE /wc/v3/products/tags/{id}
POST   /wc/v3/products/tags/batch
```

---

## ENDPOINTS — ATRIBUTOS DE PRODUTO

```
GET    /wc/v3/products/attributes
POST   /wc/v3/products/attributes
GET    /wc/v3/products/attributes/{id}
PUT    /wc/v3/products/attributes/{id}
DELETE /wc/v3/products/attributes/{id}
POST   /wc/v3/products/attributes/batch
```

### Termos de Atributo

```
GET    /wc/v3/products/attributes/{attr_id}/terms
POST   /wc/v3/products/attributes/{attr_id}/terms
GET    /wc/v3/products/attributes/{attr_id}/terms/{id}
PUT    /wc/v3/products/attributes/{attr_id}/terms/{id}
DELETE /wc/v3/products/attributes/{attr_id}/terms/{id}
POST   /wc/v3/products/attributes/{attr_id}/terms/batch
```

---

## ENDPOINTS — AVALIAÇÕES DE PRODUTO

```
GET    /wc/v3/products/reviews
POST   /wc/v3/products/reviews
GET    /wc/v3/products/reviews/{id}
PUT    /wc/v3/products/reviews/{id}
DELETE /wc/v3/products/reviews/{id}
POST   /wc/v3/products/reviews/batch
```

---

## ENDPOINTS — PEDIDOS (ORDERS)

### Listar Pedidos

```
GET /wc/v3/orders
```

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `page` | int | Página |
| `per_page` | int | Itens por página |
| `status` | string | pending, processing, on-hold, completed, cancelled, refunded, failed |
| `customer` | int | ID do cliente |
| `product` | int | ID do produto |
| `after` | string | Data mínima (ISO8601) |
| `before` | string | Data máxima (ISO8601) |
| `orderby` | string | date, id, include, title, slug |
| `order` | string | asc, desc |

### Criar Pedido

```
POST /wc/v3/orders
```

```json
{
  "payment_method": "pix",
  "payment_method_title": "PIX",
  "set_paid": true,
  "billing": {
    "first_name": "João",
    "last_name": "Silva",
    "address_1": "Rua Exemplo, 123",
    "city": "Porto Alegre",
    "state": "RS",
    "postcode": "90000-000",
    "country": "BR",
    "email": "joao@email.com",
    "phone": "(51) 99999-9999"
  },
  "shipping": {
    "first_name": "João",
    "last_name": "Silva",
    "address_1": "Rua Exemplo, 123",
    "city": "Porto Alegre",
    "state": "RS",
    "postcode": "90000-000",
    "country": "BR"
  },
  "line_items": [
    { "product_id": 9417, "quantity": 2 }
  ],
  "shipping_lines": [
    { "method_id": "flat_rate", "method_title": "Frete Fixo", "total": "25.00" }
  ]
}
```

### Atualizar Status do Pedido

```
PUT /wc/v3/orders/{id}
```

```json
{
  "status": "completed"
}
```

### Propriedades do Pedido

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | int | ID (readonly) |
| `status` | string | Status do pedido |
| `currency` | string | Moeda (BRL) |
| `total` | string | Total (readonly) |
| `subtotal` | string | Subtotal |
| `total_tax` | string | Total impostos |
| `shipping_total` | string | Total frete |
| `discount_total` | string | Total desconto |
| `customer_id` | int | ID do cliente (0 = guest) |
| `billing` | object | Dados de faturamento |
| `shipping` | object | Dados de entrega |
| `line_items` | array | Itens do pedido |
| `shipping_lines` | array | Linhas de frete |
| `fee_lines` | array | Taxas extras |
| `coupon_lines` | array | Cupons aplicados |
| `payment_method` | string | Método de pagamento |
| `transaction_id` | string | ID da transação |
| `date_created` | string | Data criação |
| `date_completed` | string | Data conclusão |
| `meta_data` | array | [{ key, value }] |

### Status do Pedido (Ciclo de Vida)

```
pending → processing → on-hold → completed
                    ↘ cancelled
                    ↘ refunded
                    ↘ failed
```

---

## ENDPOINTS — NOTAS DO PEDIDO

```
GET    /wc/v3/orders/{order_id}/notes
POST   /wc/v3/orders/{order_id}/notes
GET    /wc/v3/orders/{order_id}/notes/{id}
DELETE /wc/v3/orders/{order_id}/notes/{id}
```

```json
{
  "note": "Pagamento confirmado via PIX",
  "customer_note": false
}
```

---

## ENDPOINTS — REEMBOLSOS

```
GET    /wc/v3/orders/{order_id}/refunds
POST   /wc/v3/orders/{order_id}/refunds
GET    /wc/v3/orders/{order_id}/refunds/{id}
DELETE /wc/v3/orders/{order_id}/refunds/{id}
```

```json
{
  "amount": "50.00",
  "reason": "Produto com defeito",
  "api_refund": true
}
```

---

## ENDPOINTS — CLIENTES (CUSTOMERS)

### Listar Clientes

```
GET /wc/v3/customers
```

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `search` | string | Busca por nome/email |
| `email` | string | Email exato |
| `role` | string | all, administrator, customer, etc. |
| `orderby` | string | id, include, name, registered_date |

### Criar Cliente

```
POST /wc/v3/customers
```

```json
{
  "email": "cliente@email.com",
  "first_name": "Maria",
  "last_name": "Santos",
  "billing": {
    "first_name": "Maria",
    "last_name": "Santos",
    "company": "Empresa Ltda",
    "address_1": "Rua Teste, 456",
    "city": "São Paulo",
    "state": "SP",
    "postcode": "01000-000",
    "country": "BR",
    "email": "cliente@email.com",
    "phone": "(11) 99999-9999"
  }
}
```

### Propriedades do Cliente

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | int | ID (readonly) |
| `email` | string | Email (obrigatório) |
| `first_name` | string | Nome |
| `last_name` | string | Sobrenome |
| `username` | string | Login |
| `billing` | object | Endereço de faturamento |
| `shipping` | object | Endereço de entrega |
| `orders_count` | int | Total pedidos (readonly) |
| `total_spent` | string | Total gasto (readonly) |
| `avatar_url` | string | URL do avatar (readonly) |
| `meta_data` | array | [{ key, value }] |

```
GET    /wc/v3/customers
POST   /wc/v3/customers
GET    /wc/v3/customers/{id}
PUT    /wc/v3/customers/{id}
DELETE /wc/v3/customers/{id}
POST   /wc/v3/customers/batch
GET    /wc/v3/customers/{id}/downloads
```

---

## ENDPOINTS — CUPONS (COUPONS)

```
GET    /wc/v3/coupons
POST   /wc/v3/coupons
GET    /wc/v3/coupons/{id}
PUT    /wc/v3/coupons/{id}
DELETE /wc/v3/coupons/{id}
POST   /wc/v3/coupons/batch
```

```json
{
  "code": "BEMVINDO10",
  "discount_type": "percent",
  "amount": "10",
  "description": "10% de desconto para novos clientes",
  "usage_limit": 100,
  "usage_limit_per_user": 1,
  "date_expires": "2026-12-31",
  "minimum_amount": "50.00",
  "free_shipping": false,
  "product_ids": [],
  "excluded_product_ids": [],
  "email_restrictions": []
}
```

| Tipo de Desconto | Descrição |
|------------------|-----------|
| `percent` | Porcentagem |
| `fixed_cart` | Valor fixo no carrinho |
| `fixed_product` | Valor fixo por produto |

---

## ENDPOINTS — IMPOSTOS (TAXES)

```
GET    /wc/v3/taxes
POST   /wc/v3/taxes
GET    /wc/v3/taxes/{id}
PUT    /wc/v3/taxes/{id}
DELETE /wc/v3/taxes/{id}
POST   /wc/v3/taxes/batch
```

### Classes de Impostos

```
GET    /wc/v3/taxes/classes
POST   /wc/v3/taxes/classes
DELETE /wc/v3/taxes/classes/{slug}
```

---

## ENDPOINTS — FRETE (SHIPPING)

### Zonas de Frete

```
GET    /wc/v3/shipping/zones
POST   /wc/v3/shipping/zones
GET    /wc/v3/shipping/zones/{id}
PUT    /wc/v3/shipping/zones/{id}
DELETE /wc/v3/shipping/zones/{id}
```

### Localizações da Zona

```
GET    /wc/v3/shipping/zones/{zone_id}/locations
PUT    /wc/v3/shipping/zones/{zone_id}/locations
```

### Métodos da Zona

```
GET    /wc/v3/shipping/zones/{zone_id}/methods
POST   /wc/v3/shipping/zones/{zone_id}/methods
GET    /wc/v3/shipping/zones/{zone_id}/methods/{id}
PUT    /wc/v3/shipping/zones/{zone_id}/methods/{id}
DELETE /wc/v3/shipping/zones/{zone_id}/methods/{id}
```

### Métodos de Envio

```
GET    /wc/v3/shipping_methods
GET    /wc/v3/shipping_methods/{id}
```

### Classes de Envio

```
GET    /wc/v3/products/shipping_classes
POST   /wc/v3/products/shipping_classes
GET    /wc/v3/products/shipping_classes/{id}
PUT    /wc/v3/products/shipping_classes/{id}
DELETE /wc/v3/products/shipping_classes/{id}
POST   /wc/v3/products/shipping_classes/batch
```

---

## ENDPOINTS — GATEWAYS DE PAGAMENTO

```
GET    /wc/v3/payment_gateways
GET    /wc/v3/payment_gateways/{id}
PUT    /wc/v3/payment_gateways/{id}
```

---

## ENDPOINTS — WEBHOOKS

```
GET    /wc/v3/webhooks
POST   /wc/v3/webhooks
GET    /wc/v3/webhooks/{id}
PUT    /wc/v3/webhooks/{id}
DELETE /wc/v3/webhooks/{id}
POST   /wc/v3/webhooks/batch
```

```json
{
  "name": "Novo Pedido",
  "topic": "order.created",
  "delivery_url": "https://meusite.com/webhook/novo-pedido",
  "secret": "webhook-secret-123",
  "status": "active"
}
```

### Tópicos Disponíveis

| Tópico | Quando dispara |
|--------|----------------|
| `order.created` | Pedido criado |
| `order.updated` | Pedido atualizado |
| `order.deleted` | Pedido deletado |
| `product.created` | Produto criado |
| `product.updated` | Produto atualizado |
| `product.deleted` | Produto deletado |
| `customer.created` | Cliente criado |
| `customer.updated` | Cliente atualizado |
| `customer.deleted` | Cliente deletado |
| `coupon.created` | Cupom criado |
| `coupon.updated` | Cupom atualizado |
| `coupon.deleted` | Cupom deletado |

---

## ENDPOINTS — CONFIGURAÇÕES (SETTINGS)

```
GET    /wc/v3/settings
GET    /wc/v3/settings/{group}
GET    /wc/v3/settings/{group}/{id}
PUT    /wc/v3/settings/{group}/{id}
POST   /wc/v3/settings/batch
```

Grupos: `general`, `products`, `tax`, `shipping`, `checkout`, `account`, `email`, `advanced`

---

## ENDPOINTS — RELATÓRIOS (REPORTS)

```
GET /wc/v3/reports
GET /wc/v3/reports/sales
GET /wc/v3/reports/top_sellers
GET /wc/v3/reports/coupons/totals
GET /wc/v3/reports/customers/totals
GET /wc/v3/reports/orders/totals
GET /wc/v3/reports/products/totals
GET /wc/v3/reports/reviews/totals
```

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `period` | string | week, month, last_month, year |
| `date_min` | string | Data mínima (YYYY-MM-DD) |
| `date_max` | string | Data máxima (YYYY-MM-DD) |

---

## ENDPOINTS — STATUS DO SISTEMA

```
GET  /wc/v3/system_status
GET  /wc/v3/system_status/tools
GET  /wc/v3/system_status/tools/{id}
POST /wc/v3/system_status/tools/{id}
```

---

## ENDPOINTS — DADOS (DATA)

```
GET /wc/v3/data
GET /wc/v3/data/continents
GET /wc/v3/data/continents/{code}
GET /wc/v3/data/countries
GET /wc/v3/data/countries/{code}
GET /wc/v3/data/currencies
GET /wc/v3/data/currencies/{code}
GET /wc/v3/data/currencies/current
```

---

## OPERAÇÕES BATCH (BULK)

A maioria dos endpoints suporta operações em lote:

```
POST /wc/v3/{endpoint}/batch
```

```json
{
  "create": [ ... ],
  "update": [ ... ],
  "delete": [ 1, 2, 3 ]
}
```

**Limites:** Máximo 100 objetos por batch (padrão). Configurável via filtro WordPress.

---

## BOAS PRÁTICAS

1. **HTTPS sempre** em produção
2. **Chaves separadas** por integração (descrição clara)
3. **Permissão mínima** — usar Read quando não precisa escrever
4. **Cache** — respeitar headers `Last-Modified` e `ETag`
5. **Rate limiting** — depende do host; evitar mais de 5 req/s
6. **Paginação** — sempre usar `per_page` e `page` para listas grandes
7. **Webhook** em vez de polling para eventos
8. **Meta data** para dados customizados sem alterar estrutura

---

## SDKs E BIBLIOTECAS

### Node.js

```bash
npm install @woocommerce/woocommerce-rest-api
```

```javascript
const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;
const api = new WooCommerceRestApi({
  url: "https://suletiquetas.com.br",
  consumerKey: process.env.SULETIQUETAS_WC_CONSUMER_KEY,
  consumerSecret: process.env.SULETIQUETAS_WC_CONSUMER_SECRET,
  version: "wc/v3"
});

// Listar produtos
const { data } = await api.get("products", { per_page: 20 });
```

### Python

```bash
pip install woocommerce
```

```python
from woocommerce import API
wcapi = API(
    url="https://suletiquetas.com.br",
    consumer_key="ck_xxx",
    consumer_secret="cs_xxx",
    version="wc/v3"
)
products = wcapi.get("products").json()
```

### PHP

```php
// Via Composer: composer require automattic/woocommerce
$woocommerce = new Client(
    'https://suletiquetas.com.br',
    'ck_xxx',
    'cs_xxx',
    ['version' => 'wc/v3']
);
$products = $woocommerce->get('products');
```

### cURL (Bash)

```bash
# Listar produtos
curl -s "https://suletiquetas.com.br/wp-json/wc/v3/products" \
  -u "ck_xxx:cs_xxx" | jq

# Criar produto
curl -X POST "https://suletiquetas.com.br/wp-json/wc/v3/products" \
  -u "ck_xxx:cs_xxx" \
  -H "Content-Type: application/json" \
  -d '{"name":"Produto Teste","regular_price":"10.00"}'
```

---

## WORDPRESS REST API (COMPLEMENTAR)

Base URL: `{site}/wp-json/wp/v2/`

| Recurso | Endpoint |
|---------|----------|
| Posts | `/wp/v2/posts` |
| Páginas | `/wp/v2/pages` |
| Mídia | `/wp/v2/media` |
| Usuários | `/wp/v2/users` |
| Categorias | `/wp/v2/categories` |
| Comentários | `/wp/v2/comments` |
| Tags | `/wp/v2/tags` |
| Settings | `/wp/v2/settings` |

**Autenticação WordPress:** Application Passwords (WP 5.6+)
- Usuários → Perfil → Application Passwords → Criar

---

## TROUBLESHOOTING

| Problema | Solução |
|----------|---------|
| 401 Unauthorized | Verificar consumer_key/secret, conferir permissões |
| 404 Not Found | Pretty Permalinks desativados — ativar em Configurações → Links Permanentes |
| 501 Method Not Implemented | ModSecurity bloqueando — contatar host |
| SSL Error | Certificado inválido — verificar HTTPS |
| Empty response | Plugin de cache bloqueando — limpar cache |
| Rate limited | Reduzir frequência, implementar backoff |
| Campos faltando | Verificar `context=edit` no GET |
