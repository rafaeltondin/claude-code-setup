---
title: "Shopify - Documentação Completa Unificada"
category: "Shopify"
tags:
  - shopify
  - temas
  - liquid
  - storefront api
  - admin graphql
  - hydrogen
  - functions
  - webhooks
  - ui extensions
  - checkout
  - e-commerce
  - desenvolvimento
topic: "Shopify Development"
priority: high
version: "1.0.0"
last_updated: "2025-12-23"
---

# Shopify - Documentação Completa Unificada

Este documento consolida toda a documentacao Shopify disponivel na base de conhecimento.

---

# PARTE 1: GUIA DE CRIACAO DE TEMAS SHOPIFY

## Introducao

Este guia abrange todo o processo de criacao de temas para a plataforma Shopify, desde a configuracao inicial ate o desenvolvimento e deploy.

## Requisitos Iniciais

### Ferramentas Necessarias
1. **Node.js** (versao 16 ou superior)
2. **npm** ou **yarn**
3. **Git**
4. **CLI Shopify**
5. **Editor de codigo** (VS Code recomendado)

### Configuracao do Ambiente

1. **Instalar CLI Shopify**
```bash
npm install -g @shopify/cli @shopify/theme
```

2. **Autenticar com Shopify**
```bash
shopify auth login
```

## Estrutura Basica de um Tema

### Diretorios Principais
```
theme/
├── assets/
├── config/
├── layout/
├── locales/
├── sections/
├── snippets/
└── templates/
```

- **assets/**: Arquivos estaticos (CSS, JS, imagens)
- **config/**: Arquivos de configuracao e settings
- **layout/**: Templates base do tema
- **locales/**: Arquivos de traducao
- **sections/**: Secoes modulares do tema
- **snippets/**: Componentes reutilizaveis
- **templates/**: Templates especificos de pagina

### Arquivos Essenciais

1. **layout/theme.liquid**
```liquid
<!DOCTYPE html>
<html lang="{{ shop.locale }}">
  <head>
    <meta charset="utf-8">
    <title>{{ page_title }}</title>
    {{ content_for_header }}
  </head>
  <body>
    {{ content_for_layout }}
  </body>
</html>
```

2. **config/settings_schema.json**
```json
[
  {
    "name": "theme_info",
    "theme_name": "Meu Tema",
    "theme_version": "1.0.0",
    "theme_author": "Seu Nome",
    "theme_documentation_url": ""
  }
]
```

## Desenvolvimento do Tema

### Criando um Novo Tema

1. **Iniciar novo projeto**
```bash
shopify theme init [nome-do-tema]
```

2. **Estrutura recomendada para assets**
```
assets/
├── base.css
├── theme.js
└── vendor/
```

### Linguagem Liquid

#### Sintaxe Basica
```liquid
{% if product.available %}
  {{ product.price | money }}
{% else %}
  Produto Indisponivel
{% endif %}
```

#### Tags Importantes
- `{% section %}`: Renderiza secoes modulares
- `{% render %}`: Inclui snippets
- `{% form %}`: Cria formularios
- `{% paginate %}`: Implementa paginacao

### Desenvolvimento Local

1. **Iniciar servidor local**
```bash
shopify theme serve
```

2. **Sincronizacao com loja**
```bash
shopify theme pull
shopify theme push
```

## Secoes e Blocos

### Criando Secoes Dinamicas
```liquid
{% schema %}
{
  "name": "Banner Hero",
  "settings": [
    {
      "type": "text",
      "id": "title",
      "label": "Titulo",
      "default": "Bem-vindo"
    }
  ],
  "presets": [
    {
      "name": "Banner Hero"
    }
  ]
}
{% endschema %}
```

### Blocos Personalizaveis
```liquid
{% schema %}
{
  "name": "Galeria",
  "blocks": [
    {
      "type": "imagem",
      "name": "Imagem",
      "settings": [
        {
          "type": "image_picker",
          "id": "imagem",
          "label": "Imagem"
        }
      ]
    }
  ]
}
{% endschema %}
```

## Performance e Otimizacao

### Boas Praticas
1. Minificacao de assets
2. Lazy loading de imagens
3. Uso de CDN
4. Cache eficiente

### SEO
1. Meta tags dinamicas
2. Schema.org markup
3. Sitemap XML
4. URLs amigaveis

## Deploy e Publicacao

### Checklist Pre-Deploy
- Teste em diferentes dispositivos
- Validacao de HTML/CSS
- Teste de performance
- Revisao de SEO

### Processo de Deploy
1. **Teste em ambiente de desenvolvimento**
```bash
shopify theme push -u
```

2. **Publicacao em producao**
```bash
shopify theme push -f
```

---

# PARTE 2: RECURSOS AVANCADOS PARA TEMAS

## Ajax Cart

### Implementacao do Carrinho Ajax
```javascript
// assets/cart.js
class AjaxCart {
  constructor() {
    this.bindEvents();
  }

  bindEvents() {
    document.addEventListener('click', '.add-to-cart', this.addToCart.bind(this));
  }

  async addToCart(event) {
    event.preventDefault();
    const form = event.target.closest('form');
    const formData = new FormData(form);

    try {
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        body: formData
      });
      const cart = await response.json();
      this.updateCart(cart);
    } catch (error) {
      console.error('Erro ao adicionar ao carrinho:', error);
    }
  }

  async updateCart(cart) {
    // Atualizar mini carrinho
  }
}
```

## Metafields Avancados

### Configuracao de Metafields
```json
{
  "metafields": [
    {
      "namespace": "custom",
      "key": "specifications",
      "type": "json",
      "value": {
        "material": "Algodao",
        "origem": "Nacional",
        "garantia": "12 meses"
      }
    }
  ]
}
```

### Acesso via Liquid
```liquid
{% if product.metafields.custom.specifications %}
  {% assign specs = product.metafields.custom.specifications %}
  <div class="product-specs">
    <p>Material: {{ specs.material }}</p>
    <p>Origem: {{ specs.origem }}</p>
    <p>Garantia: {{ specs.garantia }}</p>
  </div>
{% endif %}
```

## CSS Avancado

### Arquitetura CSS (SCSS)
```scss
// assets/styles/main.scss

// 1. Configuracoes
@import "config/variables";
@import "config/mixins";

// 2. Base
@import "base/reset";
@import "base/typography";

// 3. Layout
@import "layout/grid";
@import "layout/header";
@import "layout/footer";

// 4. Componentes
@import "components/buttons";
@import "components/cards";
@import "components/forms";

// 5. Paginas
@import "pages/home";
@import "pages/collection";
@import "pages/product";
```

### Mixins Uteis
```scss
// Responsividade
@mixin respond-to($breakpoint) {
  @if $breakpoint == "small" {
    @media (max-width: 767px) { @content; }
  } @else if $breakpoint == "medium" {
    @media (min-width: 768px) and (max-width: 1024px) { @content; }
  } @else if $breakpoint == "large" {
    @media (min-width: 1025px) { @content; }
  }
}

// Uso
.product-grid {
  display: grid;

  @include respond-to('small') {
    grid-template-columns: 1fr;
  }

  @include respond-to('medium') {
    grid-template-columns: repeat(2, 1fr);
  }

  @include respond-to('large') {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

## JavaScript Modular

### Estrutura de Modulos
```javascript
// assets/js/modules/Product.js
export default class Product {
  constructor(container) {
    this.container = container;
    this.init();
  }

  init() {
    this.variantSelector = this.container.querySelector('.variant-selector');
    this.bindEvents();
  }

  bindEvents() {
    if (this.variantSelector) {
      this.variantSelector.addEventListener('change', this.handleVariantChange.bind(this));
    }
  }

  handleVariantChange(event) {
    // Logica de mudanca de variante
  }
}

// assets/js/theme.js
import Product from './modules/Product';

// Inicializacao
document.addEventListener('DOMContentLoaded', () => {
  const productContainers = document.querySelectorAll('.product-container');
  productContainers.forEach(container => new Product(container));
});
```

## APIs Avancadas

### Storefront API com GraphQL
```javascript
const STOREFRONT_ACCESS_TOKEN = 'seu-token';

async function fetchProducts() {
  const response = await fetch('/api/2024-01/graphql.json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': STOREFRONT_ACCESS_TOKEN
    },
    body: JSON.stringify({
      query: `
        query Products {
          products(first: 10) {
            edges {
              node {
                id
                title
                handle
                priceRange {
                  minVariantPrice {
                    amount
                  }
                }
                images(first: 1) {
                  edges {
                    node {
                      url
                    }
                  }
                }
              }
            }
          }
        }
      `
    })
  });

  return response.json();
}
```

## Performance Avancada

### Lazy Loading de Imagens
```liquid
{% comment %} sections/image-gallery.liquid {% endcomment %}
<div class="image-gallery">
  {% for image in section.blocks %}
    <img
      src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="
      data-src="{{ image.settings.image | img_url: '800x' }}"
      class="lazyload"
      alt="{{ image.settings.alt }}"
      loading="lazy"
    >
  {% endfor %}
</div>
```

### Critical CSS
```liquid
{% comment %} layout/theme.liquid {% endcomment %}
<style>
  {% render 'critical-css' %}
</style>
<link rel="preload" href="{{ 'theme.css' | asset_url }}" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="{{ 'theme.css' | asset_url }}"></noscript>
```

## SEO Avancado

### Schema.org Markup
```liquid
{% comment %} templates/product.liquid {% endcomment %}
<script type="application/ld+json">
{
  "@context": "https://schema.org/",
  "@type": "Product",
  "name": "{{ product.title }}",
  "image": [
    {% for image in product.images %}
      "{{ image.src | img_url: 'grande' }}"{% unless forloop.last %},{% endunless %}
    {% endfor %}
  ],
  "description": "{{ product.description | strip_html }}",
  "sku": "{{ product.selected_or_first_available_variant.sku }}",
  "brand": {
    "@type": "Brand",
    "name": "{{ product.vendor }}"
  },
  "offers": {
    "@type": "Offer",
    "url": "{{ shop.url }}{{ product.url }}",
    "priceCurrency": "{{ shop.currency }}",
    "price": "{{ product.price | divided_by: 100.00 }}",
    "availability": "{% if product.available %}https://schema.org/InStock{% else %}https://schema.org/OutOfStock{% endif %}"
  }
}
</script>
```

## Automacao e CI/CD

### GitHub Actions para Deploy
```yaml
# .github/workflows/theme-deploy.yml
name: Theme Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2

    - name: Use Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'

    - name: Install dependencies
      run: npm install

    - name: Install Shopify CLI
      run: npm install -g @shopify/cli @shopify/theme

    - name: Deploy to Shopify
      env:
        SHOPIFY_FLAG_STORE: ${{ secrets.SHOPIFY_STORE }}
        SHOPIFY_CLI_THEME_TOKEN: ${{ secrets.SHOPIFY_CLI_THEME_TOKEN }}
      run: shopify theme push -f
```

## Testes

### Jest para JavaScript
```javascript
// tests/modules/Product.test.js
import Product from '../../assets/js/modules/Product';

describe('Product Module', () => {
  let product;

  beforeEach(() => {
    document.body.innerHTML = `
      <div class="product-container">
        <select class="variant-selector">
          <option value="1">Opcao 1</option>
          <option value="2">Opcao 2</option>
        </select>
      </div>
    `;

    product = new Product(document.querySelector('.product-container'));
  });

  test('deve inicializar corretamente', () => {
    expect(product.variantSelector).toBeTruthy();
  });

  test('deve atualizar ao mudar variante', () => {
    const event = new Event('change');
    product.variantSelector.dispatchEvent(event);
    // Adicione suas assertions aqui
  });
});
```

## Internacionalizacao

### Configuracao de Traducoes
```json
// locales/pt-BR.json
{
  "general": {
    "404": {
      "title": "Pagina nao encontrada",
      "message": "A pagina que voce esta procurando nao existe."
    }
  },
  "products": {
    "product": {
      "add_to_cart": "Adicionar ao carrinho",
      "sold_out": "Esgotado",
      "unavailable": "Indisponivel"
    }
  }
}
```

### Uso em Templates
```liquid
{% comment %} templates/404.liquid {% endcomment %}
<div class="error-page">
  <h1>{{ 'general.404.title' | t }}</h1>
  <p>{{ 'general.404.message' | t }}</p>
</div>
```

---

# PARTE 3: STOREFRONT API

## Visao Geral

A Storefront API e uma API GraphQL que permite construir experiencias de comercio customizadas, escalaveis e de alta performance.

### Endpoint Principal
```
https://{store_name}.myshopify.com/api/{API_VERSION}/graphql.json
```

### Versao Atual
- **2025-10** (Estavel)
- Metodo: POST (GraphQL apenas)

## Recursos Disponiveis

### Acesso Tokenless (Limite: 1.000 pontos)
- Products e Collections
- Selling Plans
- Search
- Pages, Blogs, Articles
- Cart (leitura/escrita)

### Acesso com Token
- Product Tags
- Metaobjects
- Metafields
- Menu
- Customers

## Autenticacao

### 1. Tokenless Access
- Sem necessidade de token
- Limite de complexidade: 1.000
- Ideal para dados publicos

### 2. Public Token Access
```
Header: X-Shopify-Storefront-Access-Token: {token}
```
- Uso em navegadores e apps moveis
- Criacao via storefrontAccessTokenCreate mutation

### 3. Private Token Access
```
Header: Shopify-Storefront-Private-Token: {token}
Header: Shopify-Storefront-Buyer-IP: {ip} (recomendado)
```
- Maximo 100 tokens ativos por loja
- Uso server-side apenas

## Queries Principais

### Listar Produtos
```graphql
query {
  products(first: 10) {
    edges {
      node {
        id
        title
        handle
        description
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        images(first: 1) {
          edges {
            node {
              url
              altText
            }
          }
        }
      }
    }
  }
}
```

### Produto por Handle
```graphql
query getProduct($handle: String!) {
  productByHandle(handle: $handle) {
    id
    title
    description
    variants(first: 10) {
      edges {
        node {
          id
          title
          price {
            amount
            currencyCode
          }
          availableForSale
        }
      }
    }
  }
}
```

### Buscar Colecoes
```graphql
query {
  collections(first: 10) {
    edges {
      node {
        id
        title
        handle
        products(first: 5) {
          edges {
            node {
              id
              title
            }
          }
        }
      }
    }
  }
}
```

## Mutations - Carrinho

### Criar Carrinho
```graphql
mutation createCart($input: CartInput!) {
  cartCreate(input: $input) {
    cart {
      id
      checkoutUrl
      lines(first: 10) {
        edges {
          node {
            id
            quantity
            merchandise {
              ... on ProductVariant {
                id
                title
              }
            }
          }
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}
```

Variables:
```json
{
  "input": {
    "lines": [
      {
        "merchandiseId": "gid://shopify/ProductVariant/123456",
        "quantity": 1
      }
    ]
  }
}
```

### Adicionar ao Carrinho
```graphql
mutation addToCart($cartId: ID!, $lines: [CartLineInput!]!) {
  cartLinesAdd(cartId: $cartId, lines: $lines) {
    cart {
      id
      lines(first: 10) {
        edges {
          node {
            id
            quantity
          }
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}
```

### Atualizar Carrinho
```graphql
mutation updateCart($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
  cartLinesUpdate(cartId: $cartId, lines: $lines) {
    cart {
      id
      lines(first: 10) {
        edges {
          node {
            id
            quantity
          }
        }
      }
    }
  }
}
```

### Remover do Carrinho
```graphql
mutation removeFromCart($cartId: ID!, $lineIds: [ID!]!) {
  cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
    cart {
      id
    }
    userErrors {
      field
      message
    }
  }
}
```

## Directives GraphQL

### @inContext
Usado para localizacao, idiomas e identidade do comprador.

```graphql
query getProducts @inContext(country: BR, language: PT) {
  products(first: 10) {
    edges {
      node {
        title
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
      }
    }
  }
}
```

### @defer (Developer Preview)
Para respostas em streaming.

```graphql
query {
  product(id: "gid://shopify/Product/123") {
    title
    ... @defer {
      recommendations {
        title
      }
    }
  }
}
```

## Rate Limits

| Plano | Limite |
|-------|--------|
| Todos | Sem limite fixo |

- Protecao via security throttling (codigo 430)
- Limite de complexidade por query: 1.000 pontos

## Codigos de Erro

| Codigo | Descricao |
|--------|-----------|
| 200 | Sucesso (pode conter erros GraphQL) |
| 430 | Security throttling |
| 401 | Token invalido |
| 404 | Recurso nao encontrado |

---

# PARTE 4: ADMIN GRAPHQL API

## Visao Geral

A Admin GraphQL API permite gerenciar todos os aspectos de uma loja Shopify programaticamente.

### Endpoint Principal
```
https://{store_name}.myshopify.com/admin/api/{API_VERSION}/graphql.json
```

### Versao Atual
- **2025-10** (Estavel)
- Metodo: POST

## Autenticacao

### Headers Obrigatorios
```
Content-Type: application/json
X-Shopify-Access-Token: {access_token}
```

### Tipos de Autenticacao
1. **Session Tokens** - Apps embedded
2. **Token Exchange** - Autorizacao moderna
3. **Authorization Code Grant** - Apps nao embedded
4. **Custom Apps** - Via Shopify Admin

## Rate Limits por Plano

| Plano | Limite |
|-------|--------|
| Standard | 100 pts/segundo |
| Advanced | 200 pts/segundo |
| Plus | 1000 pts/segundo |
| Enterprise | 2000 pts/segundo |

- Single Query: Maximo 1.000 pontos
- Input Arrays: Maximo 250 itens
- Paginacao: Limitada a 25.000 objetos

## Queries Principais

### Listar Produtos
```graphql
query getProducts($first: Int!) {
  products(first: $first) {
    edges {
      node {
        id
        title
        handle
        status
        totalInventory
        variants(first: 10) {
          edges {
            node {
              id
              title
              price
              sku
              inventoryQuantity
            }
          }
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

### Listar Pedidos
```graphql
query getOrders($first: Int!) {
  orders(first: $first) {
    edges {
      node {
        id
        name
        createdAt
        totalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        customer {
          id
          email
          firstName
          lastName
        }
        lineItems(first: 10) {
          edges {
            node {
              title
              quantity
              originalUnitPriceSet {
                shopMoney {
                  amount
                }
              }
            }
          }
        }
      }
    }
  }
}
```

### Buscar Cliente
```graphql
query getCustomer($id: ID!) {
  customer(id: $id) {
    id
    email
    firstName
    lastName
    phone
    ordersCount
    totalSpent
    addresses {
      address1
      city
      country
    }
  }
}
```

## Mutations Principais

### Criar Produto
```graphql
mutation createProduct($input: ProductInput!) {
  productCreate(input: $input) {
    product {
      id
      title
      handle
    }
    userErrors {
      field
      message
    }
  }
}
```

Variables:
```json
{
  "input": {
    "title": "Novo Produto",
    "descriptionHtml": "<p>Descricao do produto</p>",
    "vendor": "Minha Loja",
    "productType": "Categoria",
    "status": "ACTIVE"
  }
}
```

### Atualizar Produto
```graphql
mutation updateProduct($input: ProductInput!) {
  productUpdate(input: $input) {
    product {
      id
      title
    }
    userErrors {
      field
      message
    }
  }
}
```

### Criar Pedido Draft
```graphql
mutation createDraftOrder($input: DraftOrderInput!) {
  draftOrderCreate(input: $input) {
    draftOrder {
      id
      invoiceUrl
    }
    userErrors {
      field
      message
    }
  }
}
```

### Atualizar Inventario
```graphql
mutation adjustInventory($input: InventoryAdjustQuantityInput!) {
  inventoryAdjustQuantity(input: $input) {
    inventoryLevel {
      id
      available
    }
    userErrors {
      field
      message
    }
  }
}
```

## Bulk Operations

### Criar Bulk Query
```graphql
mutation {
  bulkOperationRunQuery(
    query: """
    {
      products {
        edges {
          node {
            id
            title
            variants {
              edges {
                node {
                  id
                  sku
                }
              }
            }
          }
        }
      }
    }
    """
  ) {
    bulkOperation {
      id
      status
    }
    userErrors {
      field
      message
    }
  }
}
```

### Verificar Status
```graphql
query {
  currentBulkOperation {
    id
    status
    errorCode
    objectCount
    url
  }
}
```

## Codigos de Erro

| Codigo | Descricao |
|--------|-----------|
| THROTTLED (429) | Limite de taxa excedido |
| ACCESS_DENIED (401) | Falha de autenticacao |
| SHOP_INACTIVE | Conta suspensa |
| INTERNAL_SERVER_ERROR | Erro do servidor |

---

# PARTE 5: HYDROGEN FRAMEWORK

## Visao Geral

Hydrogen e o framework React oficial da Shopify para construcao de storefronts headless. Baseado em React Router.

## Arquitetura em Tres Camadas

### 1. Hydrogen (App)
- Componentes, utilitarios e padroes de design
- Integracao com APIs Shopify

### 2. React Router (Framework)
- Roteamento
- Busca de dados
- Server-side rendering
- Reatividade

### 3. Oxygen (Hosting)
- Plataforma serverless global
- Deploy na edge
- CI/CD integrado

## Instalacao

### Criar Novo Projeto
```bash
npm create @shopify/hydrogen@latest
```

### Requisitos
- Node.js 18+
- npm, yarn ou pnpm

## Pacotes Essenciais

| Pacote | Descricao |
|--------|-----------|
| @shopify/hydrogen | Componentes e utilitarios principais |
| @shopify/hydrogen-cli | CLI para desenvolvimento |
| @shopify/mini-oxygen | Servidor local de desenvolvimento |
| @shopify/remix-oxygen | Adaptador para Oxygen |

## Comandos CLI - Hydrogen

### Desenvolvimento
```bash
shopify hydrogen dev              # Ambiente local
shopify hydrogen preview          # Serve build localmente
shopify hydrogen build            # Compila para producao
shopify hydrogen deploy           # Deploy para Oxygen
```

### Configuracao
```bash
shopify hydrogen init             # Cria novo storefront
shopify hydrogen link             # Conecta ao storefront remoto
shopify hydrogen unlink           # Desconecta do remoto
shopify hydrogen login            # Autentica na loja
shopify hydrogen logout           # Remove autenticacao
```

### Geracao de Codigo
```bash
shopify hydrogen codegen          # Gera tipos GraphQL
shopify hydrogen generate route   # Cria rota padrao
shopify hydrogen generate routes  # Gera todas as rotas
```

### Ambiente
```bash
shopify hydrogen env list         # Lista ambientes
shopify hydrogen env pull         # Baixa variaveis
shopify hydrogen env push         # Envia variaveis
```

### Outros
```bash
shopify hydrogen check            # Valida rotas
shopify hydrogen upgrade          # Atualiza dependencias
shopify hydrogen setup css        # Adiciona suporte CSS
shopify hydrogen setup markets    # Habilita multi-market
```

## Estrutura de Projeto

```
my-hydrogen-store/
├── app/
│   ├── components/      # Componentes React
│   ├── routes/          # Rotas da aplicacao
│   ├── styles/          # Estilos CSS
│   ├── graphql/         # Queries e Mutations
│   ├── entry.client.tsx # Entry point cliente
│   └── entry.server.tsx # Entry point servidor
├── public/              # Assets estaticos
├── shopify.config.js    # Configuracao Shopify
└── package.json
```

## Componentes Principais

### ShopPayButton
```tsx
import { ShopPayButton } from '@shopify/hydrogen';

function Product({ variantId }) {
  return (
    <ShopPayButton
      variantIds={[variantId]}
      className="shop-pay-button"
    />
  );
}
```

### MediaFile
```tsx
import { MediaFile } from '@shopify/hydrogen';

function ProductMedia({ media }) {
  return <MediaFile data={media} />;
}
```

## Hooks Principais

### useMoney
```tsx
import { useMoney } from '@shopify/hydrogen';

function Price({ amount, currencyCode }) {
  const money = useMoney({ amount, currencyCode });
  return <span>{money.localizedString}</span>;
}
```

### useCart
```tsx
import { useCart } from '@shopify/hydrogen';

function CartButton() {
  const { totalQuantity } = useCart();
  return <button>Cart ({totalQuantity})</button>;
}
```

## Utilities

### flattenConnection
```tsx
import { flattenConnection } from '@shopify/hydrogen';

// Converte edges/nodes para array
const products = flattenConnection(data.products);
```

### createStorefrontClient
```tsx
import { createStorefrontClient } from '@shopify/hydrogen';

const client = createStorefrontClient({
  storeDomain: 'my-store.myshopify.com',
  publicStorefrontToken: 'your-token',
});
```

## Exemplo de Rota

### app/routes/products.$handle.tsx
```tsx
import { useLoaderData } from '@remix-run/react';
import { json, LoaderFunction } from '@shopify/remix-oxygen';

export const loader: LoaderFunction = async ({ params, context }) => {
  const { handle } = params;
  const { storefront } = context;

  const { product } = await storefront.query(PRODUCT_QUERY, {
    variables: { handle },
  });

  if (!product) {
    throw new Response('Not Found', { status: 404 });
  }

  return json({ product });
};

export default function ProductPage() {
  const { product } = useLoaderData();

  return (
    <div>
      <h1>{product.title}</h1>
      <p>{product.description}</p>
    </div>
  );
}

const PRODUCT_QUERY = `#graphql
  query Product($handle: String!) {
    product(handle: $handle) {
      id
      title
      description
      variants(first: 10) {
        nodes {
          id
          title
          price {
            amount
            currencyCode
          }
        }
      }
    }
  }
`;
```

## Deploy para Oxygen

### Via CLI
```bash
shopify hydrogen deploy
```

### Configuracao de Ambiente
```bash
# Variaveis de ambiente no Oxygen
shopify hydrogen env push
```

---

# PARTE 6: LIQUID API

## Visao Geral

Liquid e a linguagem de template criada pela Shopify para construcao de temas.

### Componentes Principais
1. **Tags** `{% %}` - Definem logica e instrucoes
2. **Filters** `|` - Modificam output de variaveis
3. **Objects** `{{ }}` - Representam variaveis

## TAGS

### Condicionais

#### if/elsif/else
```liquid
{% if product.available %}
  <p>Em estoque</p>
{% elsif product.compare_at_price %}
  <p>Esgotado - Avise-me</p>
{% else %}
  <p>Indisponivel</p>
{% endif %}
```

#### unless
```liquid
{% unless product.available %}
  <p>Produto indisponivel</p>
{% endunless %}
```

#### case/when
```liquid
{% case product.type %}
  {% when 'Camiseta' %}
    <p>Categoria: Vestuario</p>
  {% when 'Caneca' %}
    <p>Categoria: Acessorios</p>
  {% else %}
    <p>Categoria: Outros</p>
{% endcase %}
```

### Iteracao

#### for
```liquid
{% for product in collection.products %}
  <div class="product">
    <h2>{{ product.title }}</h2>
    <p>{{ product.price | money }}</p>
  </div>
{% endfor %}
```

#### for com parametros
```liquid
{% for product in collection.products limit: 4 offset: 2 %}
  {{ product.title }}
{% endfor %}

{% for i in (1..5) %}
  Item {{ i }}
{% endfor %}
```

#### forloop
```liquid
{% for product in collection.products %}
  {{ forloop.index }}     <!-- 1, 2, 3... -->
  {{ forloop.index0 }}    <!-- 0, 1, 2... -->
  {{ forloop.first }}     <!-- true/false -->
  {{ forloop.last }}      <!-- true/false -->
  {{ forloop.length }}    <!-- total de itens -->
{% endfor %}
```

#### cycle
```liquid
{% for product in collection.products %}
  <div class="{% cycle 'odd', 'even' %}">
    {{ product.title }}
  </div>
{% endfor %}
```

#### tablerow
```liquid
<table>
  {% tablerow product in collection.products cols: 3 %}
    {{ product.title }}
  {% endtablerow %}
</table>
```

#### paginate
```liquid
{% paginate collection.products by 12 %}
  {% for product in collection.products %}
    {{ product.title }}
  {% endfor %}

  {{ paginate | default_pagination }}
{% endpaginate %}
```

### Tema

#### render
```liquid
{% render 'product-card', product: product %}
```

#### section
```liquid
{% section 'header' %}
{% section 'footer' %}
```

#### layout
```liquid
{% layout 'alternate' %}
{% layout none %}
```

#### stylesheet/javascript
```liquid
{% stylesheet %}
  .my-class { color: red; }
{% endstylesheet %}

{% javascript %}
  console.log('Hello');
{% endjavascript %}
```

### Variaveis

#### assign
```liquid
{% assign my_variable = 'Hello' %}
{% assign product_title = product.title | upcase %}
```

#### capture
```liquid
{% capture full_name %}
  {{ customer.first_name }} {{ customer.last_name }}
{% endcapture %}
```

#### increment/decrement
```liquid
{% increment counter %}  <!-- 0, 1, 2... -->
{% decrement counter %}  <!-- -1, -2, -3... -->
```

## FILTERS

### String
```liquid
{{ 'hello' | capitalize }}           <!-- Hello -->
{{ 'HELLO' | downcase }}             <!-- hello -->
{{ 'hello' | upcase }}               <!-- HELLO -->
{{ 'hello world' | truncate: 8 }}    <!-- hello... -->
{{ 'hello' | append: ' world' }}     <!-- hello world -->
{{ 'hello world' | replace: 'world', 'Shopify' }}
{{ 'hello-world' | handleize }}      <!-- hello-world -->
{{ '<p>HTML</p>' | strip_html }}     <!-- HTML -->
{{ 'a,b,c' | split: ',' }}           <!-- ['a','b','c'] -->
```

### Array
```liquid
{{ collection.products | first }}
{{ collection.products | last }}
{{ collection.products | size }}
{{ collection.products | sort: 'title' }}
{{ collection.products | reverse }}
{{ collection.products | map: 'title' }}
{{ collection.products | where: 'available', true }}
{{ collection.products | uniq }}
```

### Math
```liquid
{{ 10 | plus: 5 }}          <!-- 15 -->
{{ 10 | minus: 5 }}         <!-- 5 -->
{{ 10 | times: 2 }}         <!-- 20 -->
{{ 10 | divided_by: 2 }}    <!-- 5 -->
{{ 10 | modulo: 3 }}        <!-- 1 -->
{{ 4.5 | floor }}           <!-- 4 -->
{{ 4.5 | ceil }}            <!-- 5 -->
{{ 4.567 | round: 2 }}      <!-- 4.57 -->
{{ -5 | abs }}              <!-- 5 -->
```

### Money
```liquid
{{ product.price | money }}                     <!-- R$ 99,99 -->
{{ product.price | money_with_currency }}       <!-- R$ 99,99 BRL -->
{{ product.price | money_without_currency }}    <!-- 99,99 -->
{{ product.price | money_without_trailing_zeros }}
```

### URL
```liquid
{{ 'style.css' | asset_url }}
{{ 'image.png' | file_url }}
{{ product | url }}
{{ product.featured_image | img_url: 'medium' }}
{{ product.featured_image | image_url: width: 300 }}
{{ 'hello world' | url_encode }}   <!-- hello%20world -->
```

### Media
```liquid
{{ product.featured_image | image_tag }}
{{ product.featured_image | img_url: '300x300' }}
{{ external_video | external_video_tag }}
{{ video | video_tag }}
```

### Date
```liquid
{{ 'now' | date: '%Y-%m-%d' }}           <!-- 2025-01-15 -->
{{ article.created_at | date: '%d/%m/%Y' }}
{{ 'now' | date: '%H:%M' }}              <!-- 14:30 -->
```

### Color
```liquid
{{ '#ff0000' | color_to_rgb }}
{{ '#ff0000' | color_brighten: 20 }}
{{ '#ff0000' | color_darken: 20 }}
{{ '#ff0000' | color_modify: 'alpha', 0.5 }}
```

### Default
```liquid
{{ product.metafield | default: 'Sem valor' }}
{{ paginate | default_pagination }}
```

## OBJECTS GLOBAIS

### shop
```liquid
{{ shop.name }}
{{ shop.email }}
{{ shop.url }}
{{ shop.currency }}
{{ shop.money_format }}
```

### cart
```liquid
{{ cart.item_count }}
{{ cart.total_price | money }}
{{ cart.items }}
{% for item in cart.items %}
  {{ item.title }} x {{ item.quantity }}
{% endfor %}
```

### customer
```liquid
{% if customer %}
  Ola, {{ customer.first_name }}!
  Email: {{ customer.email }}
  Pedidos: {{ customer.orders_count }}
{% endif %}
```

### request
```liquid
{{ request.host }}
{{ request.path }}
{{ request.page_type }}
{{ request.locale }}
```

### settings
```liquid
{{ settings.logo }}
{{ settings.primary_color }}
```

## OBJECTS POR TEMPLATE

### product (product.liquid)
```liquid
{{ product.title }}
{{ product.description }}
{{ product.price | money }}
{{ product.compare_at_price | money }}
{{ product.available }}
{{ product.images }}
{{ product.variants }}
{{ product.options }}
{{ product.tags }}
{{ product.vendor }}
{{ product.type }}
```

### collection (collection.liquid)
```liquid
{{ collection.title }}
{{ collection.description }}
{{ collection.products }}
{{ collection.products_count }}
{{ collection.all_products_count }}
{{ collection.image }}
```

### article (article.liquid)
```liquid
{{ article.title }}
{{ article.content }}
{{ article.author }}
{{ article.created_at | date: '%d/%m/%Y' }}
{{ article.tags }}
{{ article.comments }}
```

### page (page.liquid)
```liquid
{{ page.title }}
{{ page.content }}
{{ page.handle }}
{{ page.author }}
```

## METAFIELDS

```liquid
{{ product.metafields.custom.my_field }}
{{ product.metafields.custom.my_field.value }}

{% if product.metafields.custom.specifications %}
  {{ product.metafields.custom.specifications | metafield_tag }}
{% endif %}
```

## SCHEMA (Sections)

```liquid
{% schema %}
{
  "name": "Minha Secao",
  "settings": [
    {
      "type": "text",
      "id": "heading",
      "label": "Titulo",
      "default": "Bem-vindo"
    },
    {
      "type": "image_picker",
      "id": "image",
      "label": "Imagem"
    },
    {
      "type": "color",
      "id": "background",
      "label": "Cor de fundo",
      "default": "#ffffff"
    }
  ],
  "presets": [
    {
      "name": "Minha Secao"
    }
  ]
}
{% endschema %}
```

---

# PARTE 7: FUNCTIONS E WEBHOOKS

## SHOPIFY FUNCTIONS

### Visao Geral

Functions permitem criar logica de backend customizada que executa no checkout Shopify.

### Versao Atual
- **2025-10** (Estavel)

## Tipos de Functions

### 1. Cart & Checkout
- **Cart Transform** - Modifica linhas do carrinho
- **Cart and Checkout Validation** - Valida checkout

### 2. Discounts
- **Discount** - Descontos customizados
- Product Discount (deprecated)
- Order Discount (deprecated)

### 3. Fulfillment & Routing
- **Fulfillment Constraints** - Restricoes de fulfillment
- **Order Routing Location Rule** - Regras de roteamento

### 4. Delivery
- **Delivery Customization** - Customiza opcoes de entrega
- Pickup Point Delivery (unstable)
- Local Pickup Delivery (unstable)

### 5. Payments
- **Payment Customization** - Customiza metodos de pagamento

## Sequencia de Execucao no Checkout

```
1. Cart Transform        -> Cart lines
2. Discount              -> Cart line discounts
3. Fulfillment/Routing   -> Fulfillment groups
4. Delivery              -> Delivery methods
5. Discount (delivery)   -> Delivery discounts
6. Payment               -> Payment methods
7. Validation            -> Verification
```

## Limites Fixos

| Recurso | Limite |
|---------|--------|
| Tamanho binario | 256 kB |
| Memoria runtime | 10.000 kB |
| Memoria stack | 512 kB |
| Logs | 1 kB |

## Limites Dinamicos (ate 200 line items)

| Recurso | Limite |
|---------|--------|
| Instructions | 11 milhoes |
| Input | 128 kB |
| Output | 20 kB |
| Input query cost | 30 |

## Exemplo de Discount Function

### shopify.extension.toml
```toml
api_version = "2025-10"

[[extensions]]
name = "discount-percentage"
type = "function"
handle = "discount-percentage"

[[extensions.targeting]]
target = "purchase.cart-lines-discount.run"
input_query = "input.graphql"
export = "run"
```

### input.graphql
```graphql
query Input {
  cart {
    lines {
      id
      quantity
      merchandise {
        ... on ProductVariant {
          id
          product {
            title
          }
        }
      }
    }
  }
  discountNode {
    metafield(namespace: "discount", key: "config") {
      value
    }
  }
}
```

### src/run.js
```javascript
export function run(input) {
  const discounts = [];

  input.cart.lines.forEach(line => {
    discounts.push({
      targets: [{ cartLine: { id: line.id } }],
      value: {
        percentage: { value: "10" }
      },
      message: "10% de desconto!"
    });
  });

  return {
    discounts,
    discountApplicationStrategy: "FIRST"
  };
}
```

## Disponibilidade

| Tipo de App | Plano |
|-------------|-------|
| Apps publicos (App Store) | Todos os planos |
| Apps customizados | Shopify Plus apenas |

## WEBHOOKS

### Visao Geral

Webhooks sao notificacoes HTTP POST enviadas quando eventos ocorrem na loja.

## Topicos Principais

### App
- `app/uninstalled`
- `app/scopes_update`

### Products
- `products/create`
- `products/update`
- `products/delete`

### Orders
- `orders/create`
- `orders/updated`
- `orders/paid`
- `orders/fulfilled`
- `orders/cancelled`

### Customers
- `customers/create`
- `customers/update`
- `customers/delete`

### Inventory
- `inventory_levels/update`
- `inventory_items/update`

### Fulfillment
- `fulfillments/create`
- `fulfillments/update`

### Checkout
- `checkouts/create`
- `checkouts/update`

## Configuracao via shopify.app.toml

```toml
[webhooks]
api_version = "2025-10"

[[webhooks.subscriptions]]
topics = ["products/create", "products/update"]
uri = "/webhooks/products"

[[webhooks.subscriptions]]
topics = ["orders/create"]
uri = "/webhooks/orders"
```

## Verificacao de Webhook

### Node.js
```javascript
import crypto from 'crypto';

function verifyWebhook(body, hmacHeader, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');

  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(hmacHeader)
  );
}
```

### Headers do Webhook
```
X-Shopify-Topic: orders/create
X-Shopify-Hmac-SHA256: {hmac}
X-Shopify-Shop-Domain: my-store.myshopify.com
X-Shopify-API-Version: 2025-10
```

## Payload de Exemplo (orders/create)

```json
{
  "id": 123456789,
  "name": "#1001",
  "email": "customer@email.com",
  "created_at": "2025-01-15T10:00:00-05:00",
  "total_price": "99.99",
  "currency": "BRL",
  "line_items": [
    {
      "id": 987654321,
      "title": "Produto Exemplo",
      "quantity": 1,
      "price": "99.99"
    }
  ],
  "customer": {
    "id": 111222333,
    "email": "customer@email.com",
    "first_name": "Joao",
    "last_name": "Silva"
  }
}
```

## Filtros de Webhook

### Via Admin API
```graphql
mutation {
  webhookSubscriptionCreate(
    topic: ORDERS_CREATE
    webhookSubscription: {
      callbackUrl: "https://my-app.com/webhooks/orders"
      format: JSON
      filter: "order.total_price:>=100"
    }
  ) {
    webhookSubscription {
      id
    }
    userErrors {
      field
      message
    }
  }
}
```

---

# PARTE 8: UI EXTENSIONS

## Visao Geral

UI Extensions permitem estender a interface do Shopify em diferentes superficies.

### Versao Atual
- **2025-10**

### Tecnologias Base
- Preact (framework padrao)
- Preact Hooks
- Preact Signals
- Remote DOM
- Polaris Web Components

## Tipos de Extensions

### 1. Admin Extensions
- Extensoes para o Shopify Admin
- Documentacao: /docs/api/admin-extensions

### 2. Checkout UI Extensions
- Extensoes para o checkout
- Documentacao: /docs/api/checkout-ui-extensions

### 3. Customer Account UI Extensions
- Extensoes para conta do cliente
- Documentacao: /docs/api/customer-account-ui-extensions

### 4. POS UI Extensions
- Extensoes para Point of Sale
- Documentacao: /docs/api/pos-ui-extensions

### 5. Post-Purchase Extensions
- Extensoes pos-compra
- Documentacao: /docs/api/checkout-extensions/post-purchase

## ADMIN EXTENSIONS

### APIs Disponiveis
- **resourcePicker** - Busca produtos, colecoes, variantes
- **picker** - Busca tipos de dados customizados

### Componentes Polaris Web
```html
<s-button>Clique aqui</s-button>
<s-text-field label="Nome" />
<s-number-field label="Quantidade" />
<s-stack>
  <s-text>Texto</s-text>
</s-stack>
<s-admin-block title="Titulo">
  Conteudo
</s-admin-block>
```

### Exemplo de Admin Action
```tsx
import { reactExtension, useApi, AdminAction, Button, Text } from '@shopify/ui-extensions-react/admin';

export default reactExtension('admin.product-details.action.render', () => <MyAction />);

function MyAction() {
  const { close, data } = useApi();

  return (
    <AdminAction title="Minha Acao">
      <Text>Produto: {data.selected[0].id}</Text>
      <Button onPress={close}>Fechar</Button>
    </AdminAction>
  );
}
```

## CHECKOUT UI EXTENSIONS

### Extension Targets Principais
- `purchase.checkout.block.render` - Bloco customizado
- `purchase.checkout.cart-line-list.render-after` - Apos lista de itens
- `purchase.checkout.payment-method-list.render-before` - Antes de pagamentos

### Componentes Polaris
```html
<s-banner status="info" title="Aviso">
  Mensagem importante
</s-banner>

<s-button kind="primary">Continuar</s-button>

<s-text size="medium">Texto</s-text>

<s-stack direction="horizontal" spacing="base">
  <s-text>Item 1</s-text>
  <s-text>Item 2</s-text>
</s-stack>
```

### Exemplo de Checkout Extension
```tsx
import {
  reactExtension,
  Banner,
  useCartLines,
} from '@shopify/ui-extensions-react/checkout';

export default reactExtension('purchase.checkout.block.render', () => <FreightBanner />);

function FreightBanner() {
  const cartLines = useCartLines();
  const totalQuantity = cartLines.reduce((sum, line) => sum + line.quantity, 0);

  if (totalQuantity >= 3) {
    return (
      <Banner status="success" title="Frete Gratis!">
        Voce ganhou frete gratis por comprar 3+ itens!
      </Banner>
    );
  }

  return null;
}
```

## CUSTOMER ACCOUNT UI EXTENSIONS

### Paginas Suportadas
- Order Index - Listagem de pedidos
- Order Status - Detalhes do pedido
- Profile - Perfil do cliente (B2B no Plus)

### Exemplo
```tsx
import {
  reactExtension,
  Text,
  useOrder,
} from '@shopify/ui-extensions-react/customer-account';

export default reactExtension('customer-account.order-status.block.render', () => <OrderInfo />);

function OrderInfo() {
  const order = useOrder();

  return (
    <Text>
      Pedido: {order.name} - Status: {order.fulfillmentStatus}
    </Text>
  );
}
```

## POS UI EXTENSIONS

### Tipos de Targets
1. **Tile** - Grade inteligente (home)
2. **Action** - Menu + Modal
3. **Block** - Conteudo inline

### Componentes POS
```html
<s-tile title="Meu Tile" subtitle="Descricao" />

<s-pos-block title="Bloco POS">
  <s-text>Conteudo</s-text>
</s-pos-block>

<s-box padding="base">
  <s-button>Acao</s-button>
</s-box>
```

### APIs POS
- Customer API - Dados de clientes
- Session API - Detalhes de transacoes
- Storage API - Armazenamento customizado
- Product API - Informacoes de produtos

## POST-PURCHASE EXTENSIONS

### Componentes Disponiveis
Banner, BlockStack, Button, ButtonGroup, BuyerConsent, CalloutBanner,
Checkbox, Form, FormLayout, Heading, Image, InlineStack, Layout, Link,
Radio, Select, Separator, Spinner, Text, TextField, View

### Exemplo
```tsx
import {
  extend,
  render,
  BlockStack,
  Button,
  Heading,
  Text,
} from '@shopify/post-purchase-ui-extensions-react';

extend('Checkout::PostPurchase::Render', (root, api) => {
  render(<PostPurchase api={api} />, root);
});

function PostPurchase({ api }) {
  const handleAccept = async () => {
    await api.applyChangeset([
      { type: 'add_variant', variantId: 123456, quantity: 1 }
    ]);
    api.done();
  };

  return (
    <BlockStack>
      <Heading>Oferta Especial!</Heading>
      <Text>Adicione mais um produto com 20% de desconto</Text>
      <Button onPress={handleAccept}>Aceitar Oferta</Button>
      <Button onPress={() => api.done()}>Nao, obrigado</Button>
    </BlockStack>
  );
}
```

## Configuracao shopify.extension.toml

```toml
api_version = "2025-10"

[[extensions]]
name = "my-checkout-extension"
type = "ui_extension"
handle = "my-checkout-extension"

[[extensions.targeting]]
module = "./src/Checkout.tsx"
target = "purchase.checkout.block.render"
```

---

# PARTE 9: SDKs, BIBLIOTECAS E URLs

## SDKs OFICIAIS

### JavaScript/TypeScript

#### @shopify/hydrogen
Framework React para storefronts headless
- npm: https://www.npmjs.com/package/@shopify/hydrogen
- GitHub: https://github.com/Shopify/hydrogen

#### @shopify/hydrogen-react
Componentes React para Storefront API
- npm: https://www.npmjs.com/package/@shopify/hydrogen-react

#### @shopify/storefront-api-client
Cliente leve para Storefront API
- npm: https://www.npmjs.com/package/@shopify/storefront-api-client
- GitHub: https://github.com/Shopify/shopify-app-js/tree/main/packages/api-clients/storefront-api-client

#### @shopify/admin-api-client
Cliente leve para Admin API
- GitHub: https://github.com/Shopify/shopify-app-js/tree/main/packages/api-clients/admin-api-client

#### @shopify/shopify-api
SDK completo para Node.js
- npm: https://www.npmjs.com/package/@shopify/shopify-api
- GitHub: https://github.com/Shopify/shopify-app-js/tree/main/packages/apps/shopify-api

#### @shopify/shopify-app-react-router
Framework recomendado para apps
- npm: https://www.npmjs.com/package/@shopify/shopify-app-react-router
- GitHub: https://github.com/Shopify/shopify-app-template-react-router

#### @shopify/shopify-app-remix
Framework Remix para apps
- npm: https://www.npmjs.com/package/@shopify/shopify-app-remix

### Ruby

#### shopify_api
SDK oficial para Ruby
- RubyGems: https://rubygems.org/gems/shopify_api
- Docs: https://shopify.github.io/shopify-api-ruby/
- GitHub: https://github.com/Shopify/shopify-api-ruby

#### shopify_app
Engine Rails para apps
- GitHub: https://github.com/Shopify/shopify_app

### Mobile

#### Android SDK
- GitHub: https://github.com/Shopify/mobile-buy-sdk-android

#### iOS SDK
- GitHub: https://github.com/Shopify/mobile-buy-sdk-ios

## BIBLIOTECAS DE TERCEIROS

### Node.js
- https://github.com/MONEI/Shopify-api-node
- https://github.com/christophergregory/shopify-node-api

### PHP
- https://github.com/phpclassic/php-shopify
- https://github.com/robwittman/shopify-php-sdk
- https://github.com/gnikyt/Basic-Shopify-API

### Go
- https://github.com/bold-commerce/go-shopify

### .NET
- https://github.com/nozzlegear/ShopifySharp

## APP TEMPLATES

### Recomendado
- https://github.com/Shopify/shopify-app-template-react-router

### Outros
- https://github.com/Shopify/shopify-app-template-remix
- https://github.com/Shopify/shopify-app-template-none
- https://github.com/Shopify/shopify-app-template-node
- https://github.com/Shopify/shopify-app-template-ruby
- https://github.com/Shopify/shopify-app-template-php

## SAMPLE APPS
- https://github.com/Shopify/shopify-app-examples
- https://github.com/Shopify/storefront-api-examples
- https://github.com/Shopify/hydrogen-demo-store

## URLs DE DOCUMENTACAO

### APIs Principais
| API | URL |
|-----|-----|
| Storefront API | https://shopify.dev/docs/api/storefront |
| Admin GraphQL API | https://shopify.dev/docs/api/admin-graphql |
| Customer Account API | https://shopify.dev/docs/api/customer |
| Partner API | https://shopify.dev/docs/api/partner |
| Payments Apps API | https://shopify.dev/docs/api/payments-apps |
| Functions API | https://shopify.dev/docs/api/functions |
| Webhooks | https://shopify.dev/docs/api/webhooks |

### Frameworks
| Framework | URL |
|-----------|-----|
| Hydrogen | https://shopify.dev/docs/api/hydrogen |
| Hydrogen React | https://shopify.dev/docs/api/hydrogen-react |
| App Bridge | https://shopify.dev/docs/api/app-bridge |

### UI Extensions
| Extension | URL |
|-----------|-----|
| Admin Extensions | https://shopify.dev/docs/api/admin-extensions |
| Checkout UI | https://shopify.dev/docs/api/checkout-ui-extensions |
| Customer Account UI | https://shopify.dev/docs/api/customer-account-ui-extensions |
| POS UI | https://shopify.dev/docs/api/pos-ui-extensions |
| Post-Purchase | https://shopify.dev/docs/api/checkout-extensions/post-purchase |

### Themes
| Recurso | URL |
|---------|-----|
| Liquid | https://shopify.dev/docs/api/liquid |
| Ajax API | https://shopify.dev/docs/api/ajax |
| Customer Privacy | https://shopify.dev/docs/api/customer-privacy |

### Ferramentas
| Ferramenta | URL |
|------------|-----|
| Shopify CLI | https://shopify.dev/docs/api/shopify-cli |
| ShopifyQL | https://shopify.dev/docs/api/shopifyql |
| Polaris | https://shopify.dev/docs/api/polaris |
| Web Pixels | https://shopify.dev/docs/api/web-pixels-api |

## FERRAMENTAS ONLINE

| Ferramenta | URL |
|------------|-----|
| GraphiQL Explorer | https://shopify-graphiql-app.shopifycloud.com/ |
| Web Components Playground | https://webcomponents.shopify.dev/playground |
| Shopify Status | https://www.shopifystatus.com |
| Changelog | https://shopify.dev/changelog |
| Liquid Cheat Sheet | https://www.shopify.com/partners/shopify-cheat-sheet |

## HEADLESS

| Recurso | URL |
|---------|-----|
| Visao Geral | https://shopify.dev/docs/storefronts/headless |
| Hydrogen Getting Started | https://shopify.dev/docs/storefronts/headless/hydrogen/getting-started |
| Bring Your Own Stack | https://shopify.dev/docs/storefronts/headless/bring-your-own-stack |
| B2B | https://shopify.dev/docs/storefronts/headless/bring-your-own-stack/b2b |
| WordPress | https://shopify.dev/docs/storefronts/headless/bring-your-own-stack/wordpress |

## USAGE E CONFIGURACAO

| Recurso | URL |
|---------|-----|
| Autenticacao | https://shopify.dev/docs/api/usage/authentication |
| Versionamento | https://shopify.dev/docs/api/usage/versioning |
| Rate Limits | https://shopify.dev/docs/api/usage/limits |
| Response Codes | https://shopify.dev/docs/api/usage/response-codes |
| Access Scopes | https://shopify.dev/docs/api/usage/access-scopes |

## APP STORE

| Recurso | URL |
|---------|-----|
| Hydrogen App | https://apps.shopify.com/hydrogen |
| Headless Channel | https://apps.shopify.com/headless |
| Custom Storefront Apps | https://apps.shopify.com/collections/custom-storefront-apps |

## COMUNIDADE

| Recurso | URL |
|---------|-----|
| Polaris Forum | https://community.shopify.dev/c/polaris/29 |
| CLI & Libraries | https://community.shopify.dev/c/shopify-cli-libraries/14 |
| Dev Platform | https://community.shopify.dev/c/dev-platform/32 |

## DESIGN

| Recurso | URL |
|---------|-----|
| Polaris UI Kit | https://www.figma.com/community/file/1554895871000783188 |
| Checkout UI Kit | https://www.figma.com/community/file/1554582792754361051 |

## MCP E AI

| Recurso | URL |
|---------|-----|
| Storefront MCP | https://shopify.dev/docs/apps/build/storefront-mcp |
| Dev MCP | https://shopify.dev/docs/apps/build/devmcp |
| API Assistant | https://shopify.dev/docs/api?assistant=1 |
| Polaris MCP | https://shopify.dev/docs/api/polaris/using-mcp |

## VERSIONAMENTO

### Versoes Estaveis 2025
- 2025-01
- 2025-04
- 2025-07
- 2025-10 (Atual)

### Proximas
- 2026-01 (Release Candidate)
- unstable (Desenvolvimento)

### Cronograma
- Nova versao: A cada 3 meses
- Suporte: Minimo 12 meses
- Lancamento: 5pm UTC

## RATE LIMITS RESUMO

| API | Standard | Advanced | Plus | Enterprise |
|-----|----------|----------|------|------------|
| Admin GraphQL | 100/s | 200/s | 1000/s | 2000/s |
| Storefront | Sem limite | Sem limite | Sem limite | Sem limite |
| Customer Account | 100/s | 200/s | 200/s | 400/s |
| Partner | 4 req/s | 4 req/s | 4 req/s | 4 req/s |
| Payments Apps | 27300/s | 27300/s | 54600/s | 109200/s |

---

# PARTE 10: FIBER OFICIAL — OPERACOES E INTEGRACAO

## Dados da Loja

| Campo | Valor |
|-------|-------|
| **Shop Domain** | `fiber-knit-sport-br.myshopify.com` |
| **Site Publico** | `fiberoficial.com.br` |
| **API Version** | `2025-01` (testada e funcional) |
| **Token Vault** | `SHOPIFY_ACCESS_TOKEN` |
| **GraphQL Endpoint** | `https://fiber-knit-sport-br.myshopify.com/admin/api/2025-01/graphql.json` |
| **Collection "Todos os Produtos"** | `gid://shopify/Collection/393228419289` (91 produtos) |

### Autenticacao

```bash
# Header obrigatorio em TODAS as requests
X-Shopify-Access-Token: $(credential-cli.js get SHOPIFY_ACCESS_TOKEN)
```

## UpPromote — Integracao de Afiliados

### Dados da API

| Campo | Valor |
|-------|-------|
| **API Base URL** | `https://aff-api.uppromote.com/api/v2` |
| **API Key Vault** | Nao salva no vault (usar: `pk_2y88CTMcTyUNeMmy2U6qBAd1uW9H6wLR`) |
| **Rate Limit** | 120 requests/min |
| **Auth Header** | `Authorization: {API_KEY}` (sem Bearer) |
| **Max per_page** | 100 (nao aceita 250) |

### Endpoints Principais

| Acao | Metodo | Endpoint | Obs |
|------|--------|----------|-----|
| Listar cupons | GET | `/coupons?per_page=100&page=N` | Retorna affiliate_email, coupon, affiliate_id |
| Listar referrals | GET | `/referrals?per_page=100&page=N` | Vendas rastreadas por afiliado |
| Referrals por periodo | GET | `/referrals?from_date=YYYY-MM-DDTHH:mm:ssZ&to_date=YYYY-MM-DDTHH:mm:ssZ&per_page=100` | **OBRIGATORIO** enviar from_date E to_date juntos |
| Listar afiliados | GET | `/affiliates` | Dados completos do afiliado |
| Atribuir cupom | POST | `/coupons/{id}/affiliate` | Vincular cupom a afiliado |
| Listar programas | GET | `/programs` | Programas de afiliados |

### Exemplo de Resposta — GET /coupons

```json
{
  "status": 200,
  "message": "success",
  "data": [
    {
      "id": 158201,
      "affiliate_id": 1970615,
      "affiliate_email": "example@gmail.com",
      "coupon": "CODIGO10",
      "description": "",
      "created_at": "2024-07-11T06:58:59Z"
    }
  ]
}
```

### Exemplo de Resposta — GET /referrals

```json
{
  "id": 3632365,
  "order_id": 4957999104217,
  "order_number": 112755,
  "quantity": 3,
  "total_sales": "382.24",
  "commission": "57.34",
  "status": "paid",
  "tracking_type": "Tracked by coupon",
  "affiliate": {
    "id": 2766081,
    "email": "email@gmail.com",
    "first_name": "Nome",
    "last_name": "Sobrenome"
  },
  "created_at": "2022-10-27T02:11:13Z"
}
```

### Estatisticas da Fiber (referencia 27/02/2026)

| Metrica | Valor |
|---------|-------|
| Total cupons | 2.592 |
| Total afiliados | 2.156 |
| Cupons inativos (6+ meses) | 1.786 (68,9%) |
| Afiliados inativos (6+ meses) | 1.522 (70,6%) |

## Descontos (Discounts) — GraphQL Admin API

### IMPORTANTE: discountClass (ORDER vs PRODUCT)

A Shopify diferencia descontos por `discountClass`:

| discountClass | Significado | Como e Criado |
|---------------|-------------|---------------|
| **ORDER** | Desconto no pedido inteiro | `customerGets.items.all = true` |
| **PRODUCT** | Desconto nos produtos | `customerGets.items.collections` ou `customerGets.items.products` |
| **SHIPPING** | Desconto no frete | Via `discountCodeFreeShippingCreate` |

### REGRA CRITICA: Nao e possivel alterar o discountClass via update

A mutation `discountCodeBasicUpdate` **NAO PERMITE** mudar o tipo de ORDER para PRODUCT (ou vice-versa). O campo `discountClass` e imutavel apos criacao.

**Solucao:** Deletar o desconto antigo e recriar com o tipo correto.

### Fluxo para Mudar Tipo de Desconto

```
1. GET  → Buscar desconto atual (anotar configuracoes)
2. DELETE → discountCodeDelete(id: "gid://...")
3. CREATE → discountCodeBasicCreate com tipo correto
   - Para PRODUCT: usar items.collections ou items.products
   - Para ORDER: usar items.all = true
4. VERIFY → Confirmar discountClass no novo desconto
```

### Mutation: Buscar Desconto com Tipo

```graphql
query {
  codeDiscountNodes(first: 1, query: "CODIGO") {
    nodes {
      id
      codeDiscount {
        ... on DiscountCodeBasic {
          title
          status
          discountClass
          combinesWith {
            orderDiscounts
            productDiscounts
            shippingDiscounts
          }
          customerGets {
            value {
              ... on DiscountPercentage { percentage }
            }
            items {
              __typename
              ... on AllDiscountItems { allItems }
              ... on DiscountCollections {
                collections(first: 5) { nodes { title } }
              }
            }
          }
          codes(first: 1) { nodes { code } }
          summary
        }
      }
    }
  }
}
```

### Mutation: Deletar Desconto

```graphql
mutation {
  discountCodeDelete(id: "gid://shopify/DiscountCodeNode/XXXXXX") {
    deletedCodeDiscountId
    userErrors { field code message }
  }
}
```

### Mutation: Criar Desconto tipo PRODUCT (combinavel)

```graphql
mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
  discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
    codeDiscountNode {
      id
      codeDiscount {
        ... on DiscountCodeBasic {
          title
          status
          discountClass
          combinesWith { orderDiscounts productDiscounts shippingDiscounts }
          summary
        }
      }
    }
    userErrors { field code message }
  }
}
```

**Variables para desconto PRODUCT (todos os produtos, combinavel):**

```json
{
  "basicCodeDiscount": {
    "title": "NOMEDOCUPOM",
    "code": "NOMEDOCUPOM",
    "startsAt": "2026-01-01T00:00:00Z",
    "endsAt": null,
    "combinesWith": {
      "orderDiscounts": true,
      "productDiscounts": true,
      "shippingDiscounts": true
    },
    "customerSelection": {
      "all": true
    },
    "customerGets": {
      "value": { "percentage": 0.10 },
      "items": {
        "collections": {
          "add": ["gid://shopify/Collection/393228419289"]
        }
      },
      "appliesOnOneTimePurchase": true,
      "appliesOnSubscription": false
    },
    "appliesOncePerCustomer": false,
    "usageLimit": null
  }
}
```

### GOTCHAS — Erros Comuns

| Erro | Causa | Solucao |
|------|-------|---------|
| `customerSelection can't be blank` | Faltou `customerSelection` no create | Adicionar `customerSelection: { all: true }` |
| `discountClass` nao muda no update | API nao permite alterar tipo | Deletar e recriar |
| `items.all = true` cria ORDER | Shopify interpreta "todos" como pedido | Usar `items.collections` com a collection "Todos os Produtos" |
| API version 404 | Shop domain errado | Domain correto: `fiber-knit-sport-br.myshopify.com` |
| UpPromote `per_page > 100` | Maximo e 100 | Paginar com `per_page=100` |
| UpPromote `from_date` sem `to_date` | Ambos sao obrigatorios | Sempre enviar from_date E to_date |

### Mutation: Atualizar combinesWith (sem mudar tipo)

```graphql
mutation {
  discountCodeBasicUpdate(
    id: "gid://shopify/DiscountCodeNode/XXXXXX"
    basicCodeDiscount: {
      combinesWith: {
        orderDiscounts: true
        productDiscounts: true
        shippingDiscounts: true
      }
      endsAt: null
    }
  ) {
    codeDiscountNode {
      codeDiscount {
        ... on DiscountCodeBasic {
          discountClass
          combinesWith { orderDiscounts productDiscounts shippingDiscounts }
        }
      }
    }
    userErrors { field code message }
  }
}
```

### Collections Importantes da Fiber

| Collection | ID | Produtos |
|------------|----|----------|
| Todos os Produtos | `gid://shopify/Collection/393228419289` | 91 |
| Acessorios | `gid://shopify/Collection/275991789751` | 41 |
| Lancamentos | `gid://shopify/Collection/373291450585` | 37 |
| ArmBand | `gid://shopify/Collection/279165108407` | 11 |
| Meias de Compressao | `gid://shopify/Collection/393806938329` | 11 |

---

# REFERENCIAS FINAIS

## Documentacao Oficial
- Storefront API: https://shopify.dev/docs/api/storefront
- Admin GraphQL API: https://shopify.dev/docs/api/admin-graphql
- Liquid: https://shopify.dev/docs/api/liquid
- Hydrogen: https://shopify.dev/docs/api/hydrogen
- Functions: https://shopify.dev/docs/api/functions
- Webhooks: https://shopify.dev/docs/api/webhooks

## Ferramentas
- GraphiQL Explorer: https://shopify-graphiql-app.shopifycloud.com/
- Theme Check (CLI linter)
- Liquid Cheat Sheet: https://www.shopify.com/partners/shopify-cheat-sheet

## GitHub
- Hydrogen: https://github.com/Shopify/hydrogen
- Hydrogen Demo Store: https://github.com/Shopify/hydrogen-demo-store
- Liquid: https://github.com/Shopify/liquid
