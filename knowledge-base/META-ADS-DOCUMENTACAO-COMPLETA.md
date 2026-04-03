---
title: "Meta Ads API - Documentação Completa Unificada"
category: "Marketing"
tags:
  - meta ads
  - facebook ads
  - instagram ads
  - api
  - graphql
  - marketing api
  - conversions api
  - pixel
  - custom audiences
  - targeting
  - campaigns
  - ad sets
  - creatives
topic: "Meta Marketing API"
priority: high
version: "1.0.0"
last_updated: "2025-12-23"
---

# Meta Ads API - Documentação Completa Unificada

Este documento consolida toda a documentacao Meta Ads API disponivel na base de conhecimento.

---

# PARTE 1: VISAO GERAL E AUTENTICACAO

## Visao Geral

A Meta Marketing API (anteriormente Facebook Ads API) permite criar, gerenciar e otimizar campanhas publicitarias no Facebook, Instagram e outras plataformas Meta de forma programatica.

### URL Base
```
https://graph.facebook.com/v21.0/
```

### Versao Atual
- **v21.0** (2024-2025)
- Versoes deprecadas sao removidas ~2 anos apos lancamento

## Autenticacao

### Access Token

Todas as requisicoes requerem um `access_token` valido.

#### Tipos de Token

| Tipo | Duracao | Uso |
|------|---------|-----|
| Short-lived | ~1-2 horas | Desenvolvimento/Testes |
| Long-lived | ~60 dias | Producao |
| System User | Nao expira | Automacao empresarial |

### Obter Access Token

#### Via Graph API Explorer
```
1. Acesse: developers.facebook.com/tools/explorer
2. Selecione seu App
3. Adicione permissoes: ads_management, ads_read
4. Clique em "Generate Access Token"
```

#### Estender Token (Short -> Long-lived)
```http
GET https://graph.facebook.com/v21.0/oauth/access_token
    ?grant_type=fb_exchange_token
    &client_id={app-id}
    &client_secret={app-secret}
    &fb_exchange_token={short-lived-token}
```

**Resposta:**
```json
{
  "access_token": "EAABs...",
  "token_type": "bearer",
  "expires_in": 5183944
}
```

### App Secret Proof (Seguranca)

Recomendado habilitar em Settings > Advanced > Security.

```python
import hashlib
import hmac

def generate_appsecret_proof(access_token, app_secret):
    return hmac.new(
        app_secret.encode('utf-8'),
        access_token.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

# Uso na requisicao
appsecret_proof = generate_appsecret_proof(access_token, app_secret)
url = f"https://graph.facebook.com/v21.0/me?access_token={access_token}&appsecret_proof={appsecret_proof}"
```

## Estrutura de Objetos

```
Ad Account
    └── Campaign (Objetivo)
        └── Ad Set (Targeting, Budget, Schedule)
            └── Ad (Creative)
                └── Ad Creative (Imagem, Texto, CTA)
```

---

# PARTE 2: CAMPAIGNS

## Listar Campanhas
```http
GET /act_{ad_account_id}/campaigns
```

**Parametros:**
| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| fields | string | Campos a retornar |
| filtering | array | Filtros de busca |
| limit | int | Limite de resultados |

**Exemplo:**
```http
GET https://graph.facebook.com/v21.0/act_123456789/campaigns
    ?fields=id,name,status,objective,created_time
    &access_token={token}
```

**Resposta:**
```json
{
  "data": [
    {
      "id": "23851234567890",
      "name": "Campanha Conversoes Q4",
      "status": "ACTIVE",
      "objective": "CONVERSIONS",
      "created_time": "2024-10-15T10:30:00-0300"
    },
    {
      "id": "23851234567891",
      "name": "Campanha Trafego",
      "status": "PAUSED",
      "objective": "LINK_CLICKS",
      "created_time": "2024-09-01T08:00:00-0300"
    }
  ],
  "paging": {
    "cursors": {
      "before": "MAZDZD",
      "after": "MTAxN..."
    }
  }
}
```

## Criar Campanha
```http
POST /act_{ad_account_id}/campaigns
```

**Parametros Obrigatorios:**
| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| name | string | Nome da campanha |
| objective | enum | Objetivo da campanha |
| status | enum | ACTIVE, PAUSED |
| special_ad_categories | array | Categorias especiais |

**Objetivos Disponiveis:**
- `OUTCOME_AWARENESS` - Reconhecimento
- `OUTCOME_ENGAGEMENT` - Engajamento
- `OUTCOME_LEADS` - Geracao de leads
- `OUTCOME_SALES` - Vendas
- `OUTCOME_TRAFFIC` - Trafego
- `OUTCOME_APP_PROMOTION` - Promocao de app

**Exemplo:**
```http
POST https://graph.facebook.com/v21.0/act_123456789/campaigns
Content-Type: application/json

{
  "name": "Campanha Black Friday 2024",
  "objective": "OUTCOME_SALES",
  "status": "PAUSED",
  "special_ad_categories": [],
  "access_token": "{token}"
}
```

**Resposta:**
```json
{
  "id": "23851234567892"
}
```

## Atualizar Campanha
```http
POST /{campaign_id}
```

**Exemplo:**
```http
POST https://graph.facebook.com/v21.0/23851234567892
Content-Type: application/json

{
  "name": "Campanha Black Friday 2024 - Atualizada",
  "status": "ACTIVE",
  "access_token": "{token}"
}
```

**Resposta:**
```json
{
  "success": true
}
```

## Deletar Campanha
```http
DELETE /{campaign_id}
```

**Exemplo:**
```http
DELETE https://graph.facebook.com/v21.0/23851234567892
    ?access_token={token}
```

**Resposta:**
```json
{
  "success": true
}
```

---

# PARTE 3: AD SETS

## Listar Ad Sets
```http
GET /act_{ad_account_id}/adsets
```

**Exemplo:**
```http
GET https://graph.facebook.com/v21.0/act_123456789/adsets
    ?fields=id,name,status,daily_budget,targeting,optimization_goal
    &access_token={token}
```

**Resposta:**
```json
{
  "data": [
    {
      "id": "23851234567900",
      "name": "AdSet - Brasil 25-45",
      "status": "ACTIVE",
      "daily_budget": "5000",
      "optimization_goal": "OFFSITE_CONVERSIONS",
      "targeting": {
        "age_min": 25,
        "age_max": 45,
        "genders": [1, 2],
        "geo_locations": {
          "countries": ["BR"]
        }
      }
    }
  ]
}
```

## Criar Ad Set
```http
POST /act_{ad_account_id}/adsets
```

**Parametros Principais:**
| Parametro | Tipo | Obrigatorio | Descricao |
|-----------|------|-------------|-----------|
| name | string | Sim | Nome do ad set |
| campaign_id | string | Sim | ID da campanha pai |
| daily_budget | int | * | Orcamento diario (centavos) |
| lifetime_budget | int | * | Orcamento total (centavos) |
| billing_event | enum | Sim | IMPRESSIONS, LINK_CLICKS, etc |
| optimization_goal | enum | Sim | Objetivo de otimizacao |
| targeting | object | Sim | Segmentacao |
| status | enum | Sim | ACTIVE, PAUSED |
| start_time | datetime | Nao | Inicio programado |
| end_time | datetime | Nao | Fim programado |

**Exemplo Completo:**
```http
POST https://graph.facebook.com/v21.0/act_123456789/adsets
Content-Type: application/json

{
  "name": "AdSet - Mulheres 25-40 SP",
  "campaign_id": "23851234567892",
  "daily_budget": 5000,
  "billing_event": "IMPRESSIONS",
  "optimization_goal": "OFFSITE_CONVERSIONS",
  "bid_strategy": "LOWEST_COST_WITHOUT_CAP",
  "targeting": {
    "age_min": 25,
    "age_max": 40,
    "genders": [2],
    "geo_locations": {
      "regions": [{"key": "3847"}],
      "location_types": ["home", "recent"]
    },
    "interests": [
      {"id": "6003139266461", "name": "Moda"}
    ],
    "facebook_positions": ["feed", "instant_article"],
    "instagram_positions": ["stream", "story"],
    "device_platforms": ["mobile", "desktop"],
    "publisher_platforms": ["facebook", "instagram"]
  },
  "promoted_object": {
    "pixel_id": "123456789",
    "custom_event_type": "PURCHASE"
  },
  "status": "PAUSED",
  "access_token": "{token}"
}
```

**Resposta:**
```json
{
  "id": "23851234567901"
}
```

## Atualizar Ad Set
```http
POST /{adset_id}
```

**Exemplo - Atualizar Orcamento:**
```http
POST https://graph.facebook.com/v21.0/23851234567901
Content-Type: application/json

{
  "daily_budget": 10000,
  "status": "ACTIVE",
  "access_token": "{token}"
}
```

**Resposta:**
```json
{
  "success": true
}
```

---

# PARTE 4: ADS E CREATIVES

## Listar Ads
```http
GET /act_{ad_account_id}/ads
```

**Exemplo:**
```http
GET https://graph.facebook.com/v21.0/act_123456789/ads
    ?fields=id,name,status,creative,adset_id,created_time
    &access_token={token}
```

**Resposta:**
```json
{
  "data": [
    {
      "id": "23851234568000",
      "name": "Ad - Promocao 50% OFF",
      "status": "ACTIVE",
      "adset_id": "23851234567901",
      "creative": {
        "id": "23851234568100"
      },
      "created_time": "2024-10-20T14:00:00-0300"
    }
  ]
}
```

## Criar Ad
```http
POST /act_{ad_account_id}/ads
```

**Parametros:**
| Parametro | Tipo | Obrigatorio | Descricao |
|-----------|------|-------------|-----------|
| name | string | Sim | Nome do anuncio |
| adset_id | string | Sim | ID do Ad Set |
| creative | object | Sim | Creative ou creative_id |
| status | enum | Sim | ACTIVE, PAUSED |

**Exemplo:**
```http
POST https://graph.facebook.com/v21.0/act_123456789/ads
Content-Type: application/json

{
  "name": "Ad - Black Friday Principal",
  "adset_id": "23851234567901",
  "creative": {
    "creative_id": "23851234568100"
  },
  "status": "PAUSED",
  "access_token": "{token}"
}
```

**Resposta:**
```json
{
  "id": "23851234568001"
}
```

## Listar Creatives
```http
GET /act_{ad_account_id}/adcreatives
```

**Exemplo:**
```http
GET https://graph.facebook.com/v21.0/act_123456789/adcreatives
    ?fields=id,name,object_story_spec,thumbnail_url
    &access_token={token}
```

## Criar Ad Creative
```http
POST /act_{ad_account_id}/adcreatives
```

**Exemplo - Creative com Imagem:**
```http
POST https://graph.facebook.com/v21.0/act_123456789/adcreatives
Content-Type: application/json

{
  "name": "Creative - Produto Principal",
  "object_story_spec": {
    "page_id": "123456789012345",
    "link_data": {
      "link": "https://meusite.com/produto",
      "message": "Aproveite 50% OFF em todos os produtos! Oferta por tempo limitado.",
      "name": "Grande Promocao de Fim de Ano",
      "description": "Descontos imperdiveis em toda a loja",
      "call_to_action": {
        "type": "SHOP_NOW",
        "value": {
          "link": "https://meusite.com/produto"
        }
      },
      "image_hash": "abc123def456..."
    }
  },
  "access_token": "{token}"
}
```

**Resposta:**
```json
{
  "id": "23851234568100"
}
```

**Exemplo - Creative com Video:**
```http
POST https://graph.facebook.com/v21.0/act_123456789/adcreatives
Content-Type: application/json

{
  "name": "Creative - Video Promocional",
  "object_story_spec": {
    "page_id": "123456789012345",
    "video_data": {
      "video_id": "1234567890",
      "title": "Conheca nossa nova colecao",
      "message": "Assista e descubra as novidades!",
      "call_to_action": {
        "type": "LEARN_MORE",
        "value": {
          "link": "https://meusite.com/colecao"
        }
      }
    }
  },
  "access_token": "{token}"
}
```

**Exemplo - Creative para Instagram:**
```http
POST https://graph.facebook.com/v21.0/act_123456789/adcreatives
Content-Type: application/json

{
  "name": "Creative - Instagram Story",
  "object_story_spec": {
    "page_id": "123456789012345",
    "instagram_actor_id": "987654321",
    "link_data": {
      "link": "https://meusite.com",
      "message": "Deslize para cima e confira!",
      "call_to_action": {
        "type": "SHOP_NOW"
      },
      "image_hash": "abc123..."
    }
  },
  "access_token": "{token}"
}
```

## Upload de Imagem
```http
POST /act_{ad_account_id}/adimages
```

**Exemplo:**
```http
POST https://graph.facebook.com/v21.0/act_123456789/adimages
Content-Type: multipart/form-data

filename=produto.jpg
access_token={token}
```

**Resposta:**
```json
{
  "images": {
    "produto.jpg": {
      "hash": "abc123def456ghi789...",
      "url": "https://scontent.xx.fbcdn.net/..."
    }
  }
}
```

---

# PARTE 5: INSIGHTS (RELATORIOS)

## Insights de Ad Account
```http
GET /act_{ad_account_id}/insights
```

**Parametros:**
| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| fields | string | Metricas a retornar |
| date_preset | enum | today, yesterday, last_7d, last_30d, etc |
| time_range | object | {"since": "2024-01-01", "until": "2024-12-31"} |
| level | enum | account, campaign, adset, ad |
| breakdowns | array | age, gender, country, device_platform, etc |
| filtering | array | Filtros |

**Exemplo:**
```http
GET https://graph.facebook.com/v21.0/act_123456789/insights
    ?fields=impressions,clicks,spend,ctr,cpc,cpm,reach,frequency,actions
    &date_preset=last_30d
    &level=campaign
    &access_token={token}
```

**Resposta:**
```json
{
  "data": [
    {
      "impressions": "125000",
      "clicks": "3500",
      "spend": "1500.50",
      "ctr": "2.8",
      "cpc": "0.43",
      "cpm": "12.00",
      "reach": "85000",
      "frequency": "1.47",
      "actions": [
        {
          "action_type": "link_click",
          "value": "3500"
        },
        {
          "action_type": "purchase",
          "value": "150"
        },
        {
          "action_type": "add_to_cart",
          "value": "450"
        }
      ],
      "date_start": "2024-11-20",
      "date_stop": "2024-12-20"
    }
  ]
}
```

## Insights com Breakdown
```http
GET https://graph.facebook.com/v21.0/act_123456789/insights
    ?fields=impressions,clicks,spend
    &date_preset=last_7d
    &breakdowns=age,gender
    &access_token={token}
```

**Resposta:**
```json
{
  "data": [
    {
      "impressions": "15000",
      "clicks": "450",
      "spend": "180.00",
      "age": "25-34",
      "gender": "female",
      "date_start": "2024-12-13",
      "date_stop": "2024-12-20"
    },
    {
      "impressions": "12000",
      "clicks": "380",
      "spend": "150.00",
      "age": "35-44",
      "gender": "female",
      "date_start": "2024-12-13",
      "date_stop": "2024-12-20"
    }
  ]
}
```

## Insights de Campanha Especifica
```http
GET /{campaign_id}/insights
    ?fields=impressions,reach,spend,actions
    &date_preset=last_30d
    &access_token={token}
```

## Insights Assincronos (Relatorios Grandes)
```http
POST /act_{ad_account_id}/insights
```

**Exemplo:**
```http
POST https://graph.facebook.com/v21.0/act_123456789/insights
Content-Type: application/json

{
  "fields": "impressions,clicks,spend,actions",
  "date_preset": "last_90d",
  "level": "ad",
  "breakdowns": ["age", "gender", "country"],
  "access_token": "{token}"
}
```

**Resposta:**
```json
{
  "report_run_id": "123456789"
}
```

**Verificar Status:**
```http
GET /123456789
    ?access_token={token}
```

**Resposta:**
```json
{
  "id": "123456789",
  "async_status": "Job Completed",
  "async_percent_completion": 100
}
```

## Metricas Disponiveis

### Metricas Basicas
| Campo | Descricao |
|-------|-----------|
| impressions | Total de impressoes |
| reach | Pessoas unicas alcancadas |
| frequency | Media de vezes que cada pessoa viu |
| clicks | Todos os cliques |
| unique_clicks | Cliques unicos |
| spend | Valor gasto |

### Metricas de Custo
| Campo | Descricao |
|-------|-----------|
| cpc | Custo por clique |
| cpm | Custo por mil impressoes |
| cpp | Custo por mil pessoas alcancadas |
| cost_per_action_type | Custo por tipo de acao |

### Metricas de Engajamento
| Campo | Descricao |
|-------|-----------|
| ctr | Taxa de cliques |
| actions | Array de acoes (purchase, add_to_cart, etc) |
| action_values | Valores das acoes de conversao |
| video_p25_watched_actions | 25% do video assistido |
| video_p50_watched_actions | 50% do video assistido |
| video_p75_watched_actions | 75% do video assistido |
| video_p100_watched_actions | 100% do video assistido |

---

# PARTE 6: PIXEL E CONVERSIONS API

## Meta Pixel

O Meta Pixel e um codigo JavaScript que rastreia eventos no seu site.

## Configuracao do Pixel

### Obter Informacoes do Pixel
```http
GET /{pixel_id}
    ?fields=id,name,creation_time,last_fired_time
    &access_token={token}
```

**Resposta:**
```json
{
  "id": "123456789012345",
  "name": "Pixel Principal",
  "creation_time": "2023-01-15T10:00:00-0300",
  "last_fired_time": "2024-12-20T14:30:00-0300"
}
```

### Listar Pixels da Conta
```http
GET /act_{ad_account_id}/adspixels
    ?fields=id,name,is_unavailable
    &access_token={token}
```

**Resposta:**
```json
{
  "data": [
    {
      "id": "123456789012345",
      "name": "Pixel E-commerce",
      "is_unavailable": false
    }
  ]
}
```

## Eventos Padrao

| Evento | Descricao |
|--------|-----------|
| PageView | Visualizacao de pagina |
| ViewContent | Visualizacao de produto |
| Search | Busca no site |
| AddToCart | Adicionar ao carrinho |
| AddToWishlist | Adicionar a lista de desejos |
| InitiateCheckout | Iniciar checkout |
| AddPaymentInfo | Adicionar info de pagamento |
| Purchase | Compra concluida |
| Lead | Geracao de lead |
| CompleteRegistration | Registro completo |
| Contact | Contato |
| Subscribe | Assinatura |

## Conversions API (Server-Side)

A Conversions API envia eventos diretamente do servidor, complementando o Pixel.

### Endpoint
```http
POST /{pixel_id}/events
```

### Estrutura do Evento
```json
{
  "data": [
    {
      "event_name": "Purchase",
      "event_time": 1703091600,
      "action_source": "website",
      "event_source_url": "https://seusite.com/obrigado",
      "user_data": {
        "em": ["hash_sha256_email"],
        "ph": ["hash_sha256_phone"],
        "fn": ["hash_sha256_firstname"],
        "ln": ["hash_sha256_lastname"],
        "ct": ["hash_sha256_city"],
        "st": ["hash_sha256_state"],
        "zp": ["hash_sha256_zip"],
        "country": ["hash_sha256_country"],
        "external_id": ["hash_sha256_customer_id"],
        "client_ip_address": "192.168.1.1",
        "client_user_agent": "Mozilla/5.0...",
        "fbc": "fb.1.1703091600.abcd1234",
        "fbp": "fb.1.1703091600.xyz789"
      },
      "custom_data": {
        "currency": "BRL",
        "value": 299.90,
        "content_ids": ["SKU123", "SKU456"],
        "content_type": "product",
        "contents": [
          {"id": "SKU123", "quantity": 1, "item_price": 199.90},
          {"id": "SKU456", "quantity": 2, "item_price": 50.00}
        ],
        "order_id": "ORDER-12345",
        "num_items": 3
      }
    }
  ],
  "access_token": "{token}"
}
```

### Campos user_data

| Campo | Tipo | Descricao | Hashing |
|-------|------|-----------|---------|
| em | array | Email | SHA256 |
| ph | array | Telefone | SHA256 |
| fn | array | Primeiro nome | SHA256 |
| ln | array | Sobrenome | SHA256 |
| ct | array | Cidade | SHA256 |
| st | array | Estado (2 letras) | SHA256 |
| zp | array | CEP | SHA256 |
| country | array | Pais (2 letras) | SHA256 |
| external_id | array | ID do cliente | SHA256 |
| client_ip_address | string | IP do cliente | Nao |
| client_user_agent | string | User Agent | Nao |
| fbc | string | Click ID | Nao |
| fbp | string | Browser ID | Nao |

## Exemplos de Eventos

### Evento PageView
```http
POST /{pixel_id}/events
Content-Type: application/json

{
  "data": [
    {
      "event_name": "PageView",
      "event_time": 1703091600,
      "action_source": "website",
      "event_source_url": "https://seusite.com/",
      "user_data": {
        "client_ip_address": "177.32.145.22",
        "client_user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
        "fbp": "fb.1.1703091600.123456789"
      }
    }
  ],
  "access_token": "{token}"
}
```

**Resposta:**
```json
{
  "events_received": 1,
  "messages": [],
  "fbtrace_id": "AbCdEfGhIjK..."
}
```

### Evento ViewContent
```http
POST /{pixel_id}/events
Content-Type: application/json

{
  "data": [
    {
      "event_name": "ViewContent",
      "event_time": 1703091700,
      "action_source": "website",
      "event_source_url": "https://seusite.com/produto/camiseta-azul",
      "user_data": {
        "em": ["8c5c...hash..."],
        "client_ip_address": "177.32.145.22",
        "client_user_agent": "Mozilla/5.0...",
        "fbp": "fb.1.1703091600.123456789"
      },
      "custom_data": {
        "content_ids": ["SKU-CAMISETA-001"],
        "content_type": "product",
        "content_name": "Camiseta Azul Premium",
        "content_category": "Vestuario > Camisetas",
        "currency": "BRL",
        "value": 89.90
      }
    }
  ],
  "access_token": "{token}"
}
```

### Evento AddToCart
```http
POST /{pixel_id}/events
Content-Type: application/json

{
  "data": [
    {
      "event_name": "AddToCart",
      "event_time": 1703091800,
      "action_source": "website",
      "event_source_url": "https://seusite.com/produto/camiseta-azul",
      "user_data": {
        "em": ["8c5c...hash..."],
        "ph": ["5d41...hash..."],
        "client_ip_address": "177.32.145.22",
        "client_user_agent": "Mozilla/5.0...",
        "fbp": "fb.1.1703091600.123456789"
      },
      "custom_data": {
        "content_ids": ["SKU-CAMISETA-001"],
        "content_type": "product",
        "contents": [
          {
            "id": "SKU-CAMISETA-001",
            "quantity": 2,
            "item_price": 89.90
          }
        ],
        "currency": "BRL",
        "value": 179.80,
        "num_items": 2
      }
    }
  ],
  "access_token": "{token}"
}
```

### Evento Purchase (Compra)
```http
POST /{pixel_id}/events
Content-Type: application/json

{
  "data": [
    {
      "event_name": "Purchase",
      "event_time": 1703092000,
      "action_source": "website",
      "event_source_url": "https://seusite.com/obrigado",
      "user_data": {
        "em": ["8c5c...hash..."],
        "ph": ["5d41...hash..."],
        "fn": ["abc1...hash..."],
        "ln": ["def2...hash..."],
        "ct": ["ghi3...hash..."],
        "st": ["jkl4...hash..."],
        "zp": ["mno5...hash..."],
        "country": ["pqr6...hash..."],
        "external_id": ["stu7...hash..."],
        "client_ip_address": "177.32.145.22",
        "client_user_agent": "Mozilla/5.0...",
        "fbc": "fb.1.1703091600.abcd1234",
        "fbp": "fb.1.1703091600.123456789"
      },
      "custom_data": {
        "currency": "BRL",
        "value": 329.70,
        "content_ids": ["SKU-CAMISETA-001", "SKU-CALCA-002"],
        "content_type": "product",
        "contents": [
          {"id": "SKU-CAMISETA-001", "quantity": 2, "item_price": 89.90},
          {"id": "SKU-CALCA-002", "quantity": 1, "item_price": 149.90}
        ],
        "order_id": "PEDIDO-2024-12345",
        "num_items": 3
      }
    }
  ],
  "access_token": "{token}"
}
```

**Resposta:**
```json
{
  "events_received": 1,
  "messages": [],
  "fbtrace_id": "AbCdEfGhIjK..."
}
```

### Evento Lead
```http
POST /{pixel_id}/events
Content-Type: application/json

{
  "data": [
    {
      "event_name": "Lead",
      "event_time": 1703092100,
      "action_source": "website",
      "event_source_url": "https://seusite.com/contato",
      "user_data": {
        "em": ["8c5c...hash..."],
        "ph": ["5d41...hash..."],
        "fn": ["abc1...hash..."],
        "ln": ["def2...hash..."],
        "client_ip_address": "177.32.145.22",
        "client_user_agent": "Mozilla/5.0...",
        "fbp": "fb.1.1703091600.123456789"
      },
      "custom_data": {
        "lead_type": "newsletter",
        "currency": "BRL",
        "value": 0
      }
    }
  ],
  "access_token": "{token}"
}
```

## Batch de Eventos

Envie multiplos eventos de uma vez (ate 1000):

```http
POST /{pixel_id}/events
Content-Type: application/json

{
  "data": [
    {
      "event_name": "PageView",
      "event_time": 1703091600,
      "action_source": "website",
      "event_source_url": "https://seusite.com/",
      "user_data": {...}
    },
    {
      "event_name": "ViewContent",
      "event_time": 1703091700,
      "action_source": "website",
      "event_source_url": "https://seusite.com/produto/123",
      "user_data": {...},
      "custom_data": {...}
    },
    {
      "event_name": "Purchase",
      "event_time": 1703092000,
      "action_source": "website",
      "event_source_url": "https://seusite.com/obrigado",
      "user_data": {...},
      "custom_data": {...}
    }
  ],
  "access_token": "{token}"
}
```

**Resposta:**
```json
{
  "events_received": 3,
  "messages": [],
  "fbtrace_id": "AbCdEfGhIjK..."
}
```

## Deduplicacao

Para evitar eventos duplicados quando usar Pixel + Conversions API juntos:

```json
{
  "data": [
    {
      "event_name": "Purchase",
      "event_time": 1703092000,
      "event_id": "unique_event_id_123",
      "action_source": "website",
      "user_data": {...},
      "custom_data": {...}
    }
  ]
}
```

**JavaScript Pixel (correspondente):**
```javascript
fbq('track', 'Purchase', {
  value: 329.70,
  currency: 'BRL'
}, {
  eventID: 'unique_event_id_123'
});
```

---

# PARTE 7: TARGETING E CUSTOM AUDIENCES

## Estrutura de Targeting

O targeting e definido no nivel do Ad Set e controla quem vera seus anuncios.

## Targeting Basico

### Estrutura Completa
```json
{
  "targeting": {
    "age_min": 25,
    "age_max": 55,
    "genders": [1, 2],
    "geo_locations": {
      "countries": ["BR"],
      "regions": [{"key": "3847"}],
      "cities": [{"key": "2430536", "radius": 25, "distance_unit": "kilometer"}],
      "zips": [{"key": "US:90210"}],
      "location_types": ["home", "recent"]
    },
    "locales": [24],
    "publisher_platforms": ["facebook", "instagram", "audience_network"],
    "facebook_positions": ["feed", "instant_article", "marketplace", "video_feeds", "story", "search"],
    "instagram_positions": ["stream", "story", "explore", "reels"],
    "device_platforms": ["mobile", "desktop"],
    "user_os": ["iOS", "Android"],
    "wireless_carrier": ["Wifi"]
  }
}
```

### Generos
| Valor | Descricao |
|-------|-----------|
| 1 | Masculino |
| 2 | Feminino |

### Location Types
| Valor | Descricao |
|-------|-----------|
| home | Pessoas que moram no local |
| recent | Pessoas recentemente no local |
| travel_in | Pessoas viajando pelo local |

## Targeting por Interesses

### Buscar Interesses
```http
GET /search
    ?type=adinterest
    &q=moda
    &access_token={token}
```

**Resposta:**
```json
{
  "data": [
    {
      "id": "6003139266461",
      "name": "Fashion",
      "audience_size_lower_bound": 850000000,
      "audience_size_upper_bound": 1000000000,
      "path": ["Interests", "Shopping and fashion", "Fashion"],
      "topic": "Shopping and fashion"
    },
    {
      "id": "6003277229371",
      "name": "Women's clothing",
      "audience_size_lower_bound": 450000000,
      "audience_size_upper_bound": 550000000
    }
  ]
}
```

### Usar Interesses no Targeting
```json
{
  "targeting": {
    "interests": [
      {"id": "6003139266461", "name": "Fashion"},
      {"id": "6003277229371", "name": "Women's clothing"}
    ],
    "behaviors": [
      {"id": "6002714895372", "name": "Frequent Travelers"}
    ],
    "life_events": [
      {"id": "6003054185372", "name": "Recently engaged"}
    ]
  }
}
```

## Targeting Avancado (Flexible Spec)

Permite criar logica AND/OR complexa.

### Estrutura
```json
{
  "targeting": {
    "flexible_spec": [
      {
        "interests": [
          {"id": "6003139266461", "name": "Fashion"}
        ]
      },
      {
        "behaviors": [
          {"id": "6002714895372", "name": "Frequent Travelers"}
        ]
      }
    ],
    "exclusions": {
      "interests": [
        {"id": "6003107902433", "name": "Competitor Brand"}
      ]
    }
  }
}
```

### Logica
- Itens dentro do mesmo objeto = OR
- Diferentes objetos no array = AND
- `exclusions` = NOT (excluir)

### Exemplo Pratico
"Pessoas interessadas em (Moda OU Beleza) E (Viajantes frequentes) E NAO (Marca concorrente)"

```json
{
  "targeting": {
    "flexible_spec": [
      {
        "interests": [
          {"id": "6003139266461", "name": "Fashion"},
          {"id": "6003305411347", "name": "Beauty"}
        ]
      },
      {
        "behaviors": [
          {"id": "6002714895372", "name": "Frequent Travelers"}
        ]
      }
    ],
    "exclusions": {
      "interests": [
        {"id": "6003107902433", "name": "Competitor"}
      ]
    }
  }
}
```

## Custom Audiences

### Listar Custom Audiences
```http
GET /act_{ad_account_id}/customaudiences
    ?fields=id,name,subtype,approximate_count,data_source
    &access_token={token}
```

**Resposta:**
```json
{
  "data": [
    {
      "id": "23851234569000",
      "name": "Compradores ultimos 30 dias",
      "subtype": "WEBSITE",
      "approximate_count": 15000,
      "data_source": {
        "type": "EVENT_BASED",
        "sub_type": "WEBSITE_CUSTOM_AUDIENCE"
      }
    },
    {
      "id": "23851234569001",
      "name": "Lista de emails clientes",
      "subtype": "CUSTOM",
      "approximate_count": 5000,
      "data_source": {
        "type": "FILE_UPLOADED"
      }
    }
  ]
}
```

### Criar Custom Audience - Website (Pixel)
```http
POST /act_{ad_account_id}/customaudiences
Content-Type: application/json

{
  "name": "Visitantes Site - 30 dias",
  "subtype": "WEBSITE",
  "retention_days": 30,
  "rule": {
    "inclusions": {
      "operator": "or",
      "rules": [
        {
          "event_sources": [{"id": "PIXEL_ID", "type": "pixel"}],
          "retention_seconds": 2592000,
          "filter": {
            "operator": "and",
            "filters": [
              {"field": "url", "operator": "i_contains", "value": "/produto"}
            ]
          }
        }
      ]
    }
  },
  "prefill": true,
  "access_token": "{token}"
}
```

**Resposta:**
```json
{
  "id": "23851234569002"
}
```

### Criar Custom Audience - Eventos de Compra
```http
POST /act_{ad_account_id}/customaudiences
Content-Type: application/json

{
  "name": "Compradores ultimos 60 dias",
  "subtype": "WEBSITE",
  "retention_days": 60,
  "rule": {
    "inclusions": {
      "operator": "or",
      "rules": [
        {
          "event_sources": [{"id": "PIXEL_ID", "type": "pixel"}],
          "retention_seconds": 5184000,
          "filter": {
            "operator": "and",
            "filters": [
              {"field": "event", "operator": "eq", "value": "Purchase"}
            ]
          }
        }
      ]
    }
  },
  "access_token": "{token}"
}
```

### Criar Custom Audience - Upload de Lista
```http
POST /act_{ad_account_id}/customaudiences
Content-Type: application/json

{
  "name": "Lista de Clientes VIP",
  "subtype": "CUSTOM",
  "description": "Clientes com alto LTV",
  "customer_file_source": "USER_PROVIDED_ONLY",
  "access_token": "{token}"
}
```

**Resposta:**
```json
{
  "id": "23851234569003"
}
```

### Adicionar Usuarios a Audience
```http
POST /{custom_audience_id}/users
Content-Type: application/json

{
  "payload": {
    "schema": ["EMAIL", "PHONE", "FN", "LN"],
    "data": [
      ["hash_sha256_email1", "hash_sha256_phone1", "hash_sha256_firstname1", "hash_sha256_lastname1"],
      ["hash_sha256_email2", "hash_sha256_phone2", "hash_sha256_firstname2", "hash_sha256_lastname2"]
    ]
  },
  "access_token": "{token}"
}
```

**Hashing (Python):**
```python
import hashlib

def hash_pii(value):
    """Hash PII data for Custom Audience upload"""
    normalized = value.strip().lower()
    return hashlib.sha256(normalized.encode('utf-8')).hexdigest()

# Exemplo
email_hash = hash_pii("cliente@email.com")
phone_hash = hash_pii("5511999999999")
```

## Lookalike Audiences

### Criar Lookalike
```http
POST /act_{ad_account_id}/customaudiences
Content-Type: application/json

{
  "name": "Lookalike 1% - Compradores BR",
  "subtype": "LOOKALIKE",
  "origin_audience_id": "23851234569002",
  "lookalike_spec": {
    "type": "similarity",
    "ratio": 0.01,
    "country": "BR"
  },
  "access_token": "{token}"
}
```

**Parametros:**
| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| origin_audience_id | string | Audience fonte |
| ratio | float | Tamanho (0.01 = 1%, 0.10 = 10%) |
| country | string | Pais alvo |
| type | enum | similarity, reach |

### Criar Lookalike Multi-Country
```http
POST /act_{ad_account_id}/customaudiences
Content-Type: application/json

{
  "name": "Lookalike LATAM",
  "subtype": "LOOKALIKE",
  "origin_audience_id": "23851234569002",
  "lookalike_spec": {
    "type": "similarity",
    "ratio": 0.02,
    "country": "BR,AR,MX,CO,CL"
  },
  "access_token": "{token}"
}
```

## Usar Audiences no Targeting

### Custom Audience
```json
{
  "targeting": {
    "custom_audiences": [
      {"id": "23851234569002"}
    ],
    "age_min": 25,
    "age_max": 55,
    "geo_locations": {
      "countries": ["BR"]
    }
  }
}
```

### Excluir Audience
```json
{
  "targeting": {
    "custom_audiences": [
      {"id": "23851234569003"}
    ],
    "excluded_custom_audiences": [
      {"id": "23851234569002"}
    ]
  }
}
```

### Lookalike + Interesses
```json
{
  "targeting": {
    "custom_audiences": [
      {"id": "LOOKALIKE_AUDIENCE_ID"}
    ],
    "interests": [
      {"id": "6003139266461", "name": "Fashion"}
    ],
    "geo_locations": {
      "countries": ["BR"]
    }
  }
}
```

## Estimativa de Alcance

### Verificar Tamanho do Publico
```http
POST /act_{ad_account_id}/delivery_estimate
Content-Type: application/json

{
  "targeting_spec": {
    "age_min": 25,
    "age_max": 45,
    "genders": [2],
    "geo_locations": {
      "countries": ["BR"]
    },
    "interests": [
      {"id": "6003139266461", "name": "Fashion"}
    ]
  },
  "optimization_goal": "OFFSITE_CONVERSIONS",
  "access_token": "{token}"
}
```

**Resposta:**
```json
{
  "data": [
    {
      "daily_outcomes_curve": [...],
      "estimate_dau": 5500000,
      "estimate_mau": 12000000,
      "estimate_ready": true
    }
  ]
}
```

---

# PARTE 8: RATE LIMITS E ERROS

## Rate Limits

### Calculo de Limite
```
Chamadas/hora = 60 + 400 * Ads_Ativos - 0.001 * Erros_Usuario
```

### Headers de Resposta
```
x-business-use-case-usage: {"123456789":[{"call_count":28,"total_cputime":25,"total_time":30}]}
x-app-usage: {"call_count":10,"total_cputime":5,"total_time":8}
```

### Boas Praticas
- Use batch requests para multiplas operacoes
- Implemente exponential backoff para 429
- Cache dados que nao mudam frequentemente
- Use campos especificos ao inves de solicitar todos

## Codigos de Erro

| Codigo | HTTP | Descricao | Acao |
|--------|------|-----------|------|
| 1 | 400 | Unknown error | Retry com backoff |
| 2 | 500 | Service temporarily unavailable | Retry apos 5min |
| 4 | 400 | Application request limit reached | Aguardar e retry |
| 17 | 400 | User request limit reached | Aguardar rate limit |
| 100 | 400 | Invalid parameter | Verificar parametros |
| 190 | 400 | Invalid OAuth access token | Renovar token |
| 200 | 403 | Permissions error | Verificar permissoes |
| 294 | 400 | Ad account disabled | Verificar conta |

**Exemplo de Erro:**
```json
{
  "error": {
    "message": "Invalid OAuth access token.",
    "type": "OAuthException",
    "code": 190,
    "error_subcode": 463,
    "fbtrace_id": "AbCdEfGhIjK..."
  }
}
```

---

# PARTE 9: EXEMPLOS PYTHON COMPLETOS

## Instalacao
```bash
pip install facebook-business requests
```

## Configuracao Inicial
```python
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.campaign import Campaign
from facebook_business.adobjects.adset import AdSet
from facebook_business.adobjects.ad import Ad
from facebook_business.adobjects.adcreative import AdCreative

# Inicializacao
app_id = 'SEU_APP_ID'
app_secret = 'SEU_APP_SECRET'
access_token = 'SEU_ACCESS_TOKEN'
ad_account_id = 'act_123456789'

FacebookAdsApi.init(app_id, app_secret, access_token)
account = AdAccount(ad_account_id)
```

## Criar Campanha Completa
```python
# 1. Criar Campanha
campaign = Campaign(parent_id=ad_account_id)
campaign[Campaign.Field.name] = 'Campanha Python API'
campaign[Campaign.Field.objective] = Campaign.Objective.outcome_sales
campaign[Campaign.Field.status] = Campaign.Status.paused
campaign[Campaign.Field.special_ad_categories] = []
campaign.remote_create()
print(f"Campanha criada: {campaign.get_id()}")

# 2. Criar Ad Set
adset = AdSet(parent_id=ad_account_id)
adset[AdSet.Field.name] = 'AdSet - Targeting Brasil'
adset[AdSet.Field.campaign_id] = campaign.get_id()
adset[AdSet.Field.daily_budget] = 5000  # R$ 50,00
adset[AdSet.Field.billing_event] = AdSet.BillingEvent.impressions
adset[AdSet.Field.optimization_goal] = AdSet.OptimizationGoal.offsite_conversions
adset[AdSet.Field.bid_strategy] = AdSet.BidStrategy.lowest_cost_without_cap
adset[AdSet.Field.targeting] = {
    'age_min': 25,
    'age_max': 45,
    'geo_locations': {'countries': ['BR']},
    'publisher_platforms': ['facebook', 'instagram'],
}
adset[AdSet.Field.promoted_object] = {
    'pixel_id': 'SEU_PIXEL_ID',
    'custom_event_type': 'PURCHASE'
}
adset[AdSet.Field.status] = AdSet.Status.paused
adset.remote_create()
print(f"AdSet criado: {adset.get_id()}")

# 3. Criar Creative
creative = AdCreative(parent_id=ad_account_id)
creative[AdCreative.Field.name] = 'Creative - Promocao'
creative[AdCreative.Field.object_story_spec] = {
    'page_id': 'SEU_PAGE_ID',
    'link_data': {
        'link': 'https://seusite.com/produto',
        'message': 'Aproveite 50% OFF!',
        'name': 'Grande Promocao',
        'call_to_action': {'type': 'SHOP_NOW'}
    }
}
creative.remote_create()
print(f"Creative criado: {creative.get_id()}")

# 4. Criar Ad
ad = Ad(parent_id=ad_account_id)
ad[Ad.Field.name] = 'Ad - Principal'
ad[Ad.Field.adset_id] = adset.get_id()
ad[Ad.Field.creative] = {'creative_id': creative.get_id()}
ad[Ad.Field.status] = Ad.Status.paused
ad.remote_create()
print(f"Ad criado: {ad.get_id()}")
```

## Obter Insights
```python
from facebook_business.adobjects.adsinsights import AdsInsights

# Insights da conta
insights = account.get_insights(
    fields=[
        AdsInsights.Field.impressions,
        AdsInsights.Field.clicks,
        AdsInsights.Field.spend,
        AdsInsights.Field.ctr,
        AdsInsights.Field.actions,
    ],
    params={
        'date_preset': 'last_30d',
        'level': 'campaign',
    }
)

for insight in insights:
    print(f"Impressoes: {insight.get('impressions')}")
    print(f"Cliques: {insight.get('clicks')}")
    print(f"Gasto: R$ {insight.get('spend')}")
    print(f"CTR: {insight.get('ctr')}%")

    # Acoes de conversao
    actions = insight.get('actions', [])
    for action in actions:
        print(f"  {action['action_type']}: {action['value']}")
```

## Listar Campanhas Ativas
```python
campaigns = account.get_campaigns(
    fields=[
        Campaign.Field.id,
        Campaign.Field.name,
        Campaign.Field.status,
        Campaign.Field.objective,
    ],
    params={
        'effective_status': ['ACTIVE'],
    }
)

for campaign in campaigns:
    print(f"{campaign['id']}: {campaign['name']} - {campaign['status']}")
```

## Implementacao Conversions API
```python
import hashlib
import time
import requests
import json

class MetaConversionsAPI:
    def __init__(self, pixel_id, access_token):
        self.pixel_id = pixel_id
        self.access_token = access_token
        self.base_url = f"https://graph.facebook.com/v21.0/{pixel_id}/events"

    def hash_pii(self, value):
        """Hash PII data with SHA256"""
        if not value:
            return None
        normalized = str(value).strip().lower()
        return hashlib.sha256(normalized.encode('utf-8')).hexdigest()

    def send_event(self, event_name, user_data, custom_data=None,
                   event_source_url=None, event_id=None):
        """Send a single event to Conversions API"""

        # Hash PII fields
        hashed_user_data = {}
        pii_fields = ['em', 'ph', 'fn', 'ln', 'ct', 'st', 'zp', 'country', 'external_id']

        for field in pii_fields:
            if field in user_data and user_data[field]:
                value = user_data[field]
                if isinstance(value, list):
                    hashed_user_data[field] = [self.hash_pii(v) for v in value]
                else:
                    hashed_user_data[field] = [self.hash_pii(value)]

        # Non-hashed fields
        non_pii_fields = ['client_ip_address', 'client_user_agent', 'fbc', 'fbp']
        for field in non_pii_fields:
            if field in user_data:
                hashed_user_data[field] = user_data[field]

        # Build event
        event = {
            "event_name": event_name,
            "event_time": int(time.time()),
            "action_source": "website",
            "user_data": hashed_user_data
        }

        if event_source_url:
            event["event_source_url"] = event_source_url

        if event_id:
            event["event_id"] = event_id

        if custom_data:
            event["custom_data"] = custom_data

        # Send request
        payload = {
            "data": [event],
            "access_token": self.access_token
        }

        response = requests.post(self.base_url, json=payload)
        return response.json()

    def send_purchase(self, user_data, order_id, value, currency,
                      products, event_source_url=None):
        """Send Purchase event"""

        contents = [
            {
                "id": p.get("sku"),
                "quantity": p.get("quantity", 1),
                "item_price": p.get("price")
            }
            for p in products
        ]

        custom_data = {
            "currency": currency,
            "value": value,
            "content_type": "product",
            "content_ids": [p.get("sku") for p in products],
            "contents": contents,
            "order_id": order_id,
            "num_items": sum(p.get("quantity", 1) for p in products)
        }

        return self.send_event(
            event_name="Purchase",
            user_data=user_data,
            custom_data=custom_data,
            event_source_url=event_source_url,
            event_id=f"purchase_{order_id}"
        )

    def send_add_to_cart(self, user_data, sku, quantity, price,
                         currency, event_source_url=None):
        """Send AddToCart event"""

        custom_data = {
            "currency": currency,
            "value": price * quantity,
            "content_type": "product",
            "content_ids": [sku],
            "contents": [{
                "id": sku,
                "quantity": quantity,
                "item_price": price
            }],
            "num_items": quantity
        }

        return self.send_event(
            event_name="AddToCart",
            user_data=user_data,
            custom_data=custom_data,
            event_source_url=event_source_url
        )

    def send_lead(self, user_data, lead_type=None, value=0,
                  currency="BRL", event_source_url=None):
        """Send Lead event"""

        custom_data = {
            "currency": currency,
            "value": value
        }

        if lead_type:
            custom_data["lead_type"] = lead_type

        return self.send_event(
            event_name="Lead",
            user_data=user_data,
            custom_data=custom_data,
            event_source_url=event_source_url
        )


# Uso
api = MetaConversionsAPI(
    pixel_id="123456789012345",
    access_token="EAABs..."
)

# Enviar compra
result = api.send_purchase(
    user_data={
        "em": "cliente@email.com",
        "ph": "5511999999999",
        "fn": "Joao",
        "ln": "Silva",
        "client_ip_address": "177.32.145.22",
        "client_user_agent": "Mozilla/5.0...",
        "fbp": "fb.1.1703091600.123456789"
    },
    order_id="PEDIDO-12345",
    value=299.90,
    currency="BRL",
    products=[
        {"sku": "SKU-001", "quantity": 1, "price": 199.90},
        {"sku": "SKU-002", "quantity": 2, "price": 50.00}
    ],
    event_source_url="https://seusite.com/obrigado"
)

print(f"Eventos recebidos: {result.get('events_received')}")
```

## Workflow Custom Audiences
```python
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.customaudience import CustomAudience
import hashlib

# Inicializacao
FacebookAdsApi.init(app_id, app_secret, access_token)
account = AdAccount('act_123456789')

# 1. Criar Custom Audience para upload
audience = CustomAudience(parent_id='act_123456789')
audience[CustomAudience.Field.name] = 'Clientes Premium'
audience[CustomAudience.Field.subtype] = CustomAudience.Subtype.custom
audience[CustomAudience.Field.customer_file_source] = 'USER_PROVIDED_ONLY'
audience.remote_create()
print(f"Audience criada: {audience.get_id()}")

# 2. Preparar dados (hashear PII)
def hash_pii(value):
    return hashlib.sha256(value.strip().lower().encode()).hexdigest()

clientes = [
    {"email": "cliente1@email.com", "phone": "5511999999999"},
    {"email": "cliente2@email.com", "phone": "5511888888888"},
]

payload = {
    "schema": ["EMAIL", "PHONE"],
    "data": [
        [hash_pii(c["email"]), hash_pii(c["phone"])]
        for c in clientes
    ]
}

# 3. Upload de usuarios
audience.add_users(
    schema=["EMAIL", "PHONE"],
    users=payload["data"]
)
print("Usuarios adicionados!")

# 4. Criar Lookalike
lookalike = CustomAudience(parent_id='act_123456789')
lookalike[CustomAudience.Field.name] = 'Lookalike 1% - Clientes Premium'
lookalike[CustomAudience.Field.subtype] = CustomAudience.Subtype.lookalike
lookalike[CustomAudience.Field.origin_audience_id] = audience.get_id()
lookalike[CustomAudience.Field.lookalike_spec] = {
    'type': 'similarity',
    'ratio': 0.01,
    'country': 'BR'
}
lookalike.remote_create()
print(f"Lookalike criado: {lookalike.get_id()}")

# 5. Usar no targeting do AdSet
targeting = {
    'custom_audiences': [{'id': lookalike.get_id()}],
    'age_min': 25,
    'age_max': 55,
    'geo_locations': {'countries': ['BR']},
    'publisher_platforms': ['facebook', 'instagram'],
}

print(f"Targeting pronto para uso: {targeting}")
```

---

# REFERENCIAS E LINKS UTEIS

## Documentacao Oficial
- Marketing API: https://developers.facebook.com/docs/marketing-apis
- Graph API Explorer: https://developers.facebook.com/tools/explorer
- Conversions API: https://developers.facebook.com/docs/marketing-api/conversions-api
- Pixel Documentation: https://developers.facebook.com/docs/meta-pixel
- Event Parameters: https://developers.facebook.com/docs/meta-pixel/reference

## SDKs
- SDK Python: https://github.com/facebook/facebook-python-business-sdk
- SDK Node.js: https://www.npmjs.com/package/facebook-nodejs-business-sdk

## Recursos Adicionais
- Targeting Spec: https://developers.facebook.com/docs/marketing-api/audiences/reference/targeting-search
- Custom Audiences: https://developers.facebook.com/docs/marketing-api/audiences/guides/custom-audiences
- Lookalike Audiences: https://developers.facebook.com/docs/marketing-api/audiences/guides/lookalike-audiences
