# Shopify Quick Reference

## AUTENTICACAO

```bash
# Admin API
curl -X GET "https://{shop}.myshopify.com/admin/api/2024-01/{endpoint}.json" \
  -H "X-Shopify-Access-Token: {access_token}"
```

## ENDPOINTS PRINCIPAIS

| Acao | Metodo | Endpoint |
|------|--------|----------|
| Listar produtos | GET | `/products.json` |
| Criar produto | POST | `/products.json` |
| Listar pedidos | GET | `/orders.json` |
| Listar clientes | GET | `/customers.json` |
| Listar collections | GET | `/custom_collections.json` |
| Atualizar produto | PUT | `/products/{id}.json` |

## CREDENCIAIS

Usar Credential Vault:
```bash
node "~/.claude/task-scheduler/credential-cli.js" get SHOPIFY_ACCESS_TOKEN
```

## LIQUID - TEMPLATES

| Objeto | Uso |
|--------|-----|
| `{{ product.title }}` | Titulo do produto |
| `{{ product.price }}` | Preco |
| `{{ cart.items }}` | Itens do carrinho |
| `{% for %}...{% endfor %}` | Loop |
| `{% if %}...{% endif %}` | Condicional |

## DOCUMENTACAO COMPLETA

Ver: `SHOPIFY-DOCUMENTACAO-COMPLETA.md` e `SHOPIFY-LIQUID-SECTIONS-GUIA-COMPLETO.md`