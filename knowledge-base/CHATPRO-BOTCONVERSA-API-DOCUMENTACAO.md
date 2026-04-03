# ChatPro / BotConversa API - Documentação Completa

## Visão Geral
- **ChatPro Digital** é white-label do **BotConversa**
- **Backend API:** `https://backend.botconversa.com.br`
- **Frontend:** `https://app.chatpro.digital`
- **Webhook (READ-ONLY):** `https://conectawebhook.com.br/api/v1/webhook` com header `api-key`
- **Auth:** JWT Bearer token via localStorage do browser

## Dados da Conta Performa Academia
- **Bot ID:** 69429
- **Company ID:** 76490
- **Franchise ID:** 88
- **User ID:** 199118
- **Login:** nadia.ton@hotmail.com / Performa@123
- **Telefone conectado:** 555492726073
- **Chrome debug port:** 9333

## Autenticação
JWT obtido via browser localStorage:
```js
const browser = await puppeteer.connect({ browserURL: 'http://localhost:9333' });
const page = pages.find(p => p.url().includes('chatpro'));
const token = await page.evaluate(() => localStorage.getItem('authToken'));
```

Headers obrigatórios:
```
Authorization: Bearer {TOKEN}
Content-Type: application/json
X-Language: pt
Origin: https://app.chatpro.digital
Referer: https://app.chatpro.digital/
```

## Endpoints CRUD

### Flows
| Ação | Método | Endpoint |
|------|--------|----------|
| Listar | GET | `/api/v1/flows/?bot_id=69429` |
| Criar | POST | `/api/v1/flows/` body: `{name, bot: 69429}` |
| Detalhe | GET | `/api/v1/flows/{id}/` |
| Atualizar | PATCH | `/api/v1/flows/{id}/` body: `{folder: id}` |
| Deletar | DELETE | `/api/v1/flows/{id}/` |

### Blocks
| Ação | Método | Endpoint |
|------|--------|----------|
| Listar por flow | GET | `/api/v1/blocks/flow/{flowId}/?bot_id=69429` (**bot_id obrigatório!**) |
| Criar | POST | `/api/v1/blocks/` body: `{flow, type, x, y}` |
| Conectar | PATCH | `/api/v1/blocks/{id}/` body: `{block_to: targetBlockId}` |

### Tipos de Bloco
| Type | Nome | Campo ativo |
|------|------|-------------|
| 0 | CONTENT | content_block |
| 1 | ACTION | action_block |
| 2 | START_FLOW | start_flow_block |
| 3 | CONDITION | condition_block |
| 4 | RANDOMIZER | randomizer_block |
| 5 | STARTING | (auto-criado) |
| 6 | MENU | menu_block |
| 7 | INTEGRATION | integration_block |
| 8 | SMART_DELAY | smart_delay_block |
| 9 | AI | ai_block |
| 10 | GPT | gpt_block |
| 11 | SEND_MSG | send_message_block |

### Texto (ENDPOINT SECRETO)
```
PATCH /api/v1/blocks_content/text/{textContentSubBlockId}/
```
Body em formato Draft.js:
```json
{
  "text": "Texto completo aqui",
  "text_styles": {
    "blocks": [
      {
        "key": "random5chars",
        "text": "Linha do texto",
        "type": "unstyled",
        "depth": 0,
        "inlineStyleRanges": [],
        "entityRanges": [],
        "data": {}
      }
    ],
    "entityMap": {}
  }
}
```
Para texto multi-linha, criar um block por linha.

### Smart Delay
```
PATCH /api/v1/blocks_smart_delay/{smartDelayBlockId}/
```
Body:
```json
{
  "delay_type": 0,
  "value_duration": 30,
  "value_duration_type": 0
}
```
- `delay_type`: 0 = duração
- `value_duration_type`: 0 = minutos, 1 = horas, 2 = dias

### Action Block (Tags)
1. Criar sub-bloco de tag:
```
POST /api/v1/blocks_action/tag/
Body: {"action_block": actionBlockId, "type": 0, "bot_id": 69429}
```
- `type: 0` = adicionar etiqueta
- `type: 1` = remover etiqueta (provável)

2. Associar tag:
```
PATCH /api/v1/blocks_action/tag/{actionTagSubBlockId}/
Body: {"tag_type": tagTypeId}
```

### Tags
| Ação | Método | Endpoint |
|------|--------|----------|
| Listar | GET | `/api/v1/tag_types/bot/short/69429/` |
| Criar | POST | `/api/v1/tag_types/` body: `{name, bot: 69429}` |
| Deletar | DELETE | `/api/v1/tag_types/{id}/` |

### Folders
| Ação | Método | Endpoint |
|------|--------|----------|
| Criar | POST | `/api/v1/folders/` body: `{name, bot: 69429}` |

### Condition Block
Estrutura retornada:
```json
{
  "id": ...,
  "block": ...,
  "condition_sub_block": [],
  "true_block_to": null,
  "false_block_to": null,
  "condition_type": 1
}
```
- condition_type 6 = business hours
- `true_block_to` / `false_block_to`: IDs dos blocos de destino

### Variáveis de Personalização
- `{primeiro-nome}` → nome do contato
- Suporta formatação: `*bold*`, emojis

## IDs Criados (Performa Academia)

### Tags (23)
| Tag | ID |
|-----|-----|
| INTERESSE_AULA_GRATIS | 16762516 |
| INTERESSE_ORANGE_ZONE | 16762517 |
| INTERESSE_PERSONAL_2X1 | 16762518 |
| INTERESSE_SOUL_BOXE | 16762519 |
| LEAD_NOVO | 16762520 |
| SEM_RESPOSTA_30MIN | 16762521 |
| SEM_RESPOSTA_24H | 16762522 |
| SEM_RESPOSTA_3D | 16762523 |
| LEAD_FRIO_7D | 16762524 |
| AULA_TESTE_AGENDADA | 16762525 |
| AULA_TESTE_NO_SHOW | 16762526 |
| AULA_TESTE_REALIZADA | 16762527 |
| MATRICULADO_NOVO | 16762528 |
| INDICACAO_SOLICITADA | 16762529 |
| ORIGEM_META_ADS | 16762530 |
| ORIGEM_GOOGLE_ADS | 16762531 |
| ORIGEM_ORGANICO | 16762532 |
| ORIGEM_INDICACAO | 16762533 |
| CONTATO_FORA_HORARIO | 16762534 |
| EX_CLIENTE_REATIVACAO | 16762535 |
| REATIVACAO_ENVIADA | 16762536 |
| POS_ATENDIMENTO_OK | 16762537 |
| POS_ATENDIMENTO_SEM_MATRICULA | 16762538 |

### Folders (6)
| Folder | ID |
|--------|-----|
| MELHORIAS 2026 | 1150591 |
| FLUXOS SEGMENTADOS | 1150592 |
| FOLLOW-UP AUTOMÁTICO | 1150593 |
| PÓS-ATENDIMENTO | 1150594 |
| REATIVAÇÃO & INDICAÇÃO | 1150595 |
| LEMBRETES | 1150596 |

### Flows Criados (12)
| Flow | ID | Folder |
|------|-----|--------|
| Aula Grátis Segmentado | 8673239 | FLUXOS SEGMENTADOS |
| Orange Zone Segmentado | 8673240 | FLUXOS SEGMENTADOS |
| Personal 2x1 Segmentado | 8673241 | FLUXOS SEGMENTADOS |
| Soul Boxe Segmentado | 8673243 | FLUXOS SEGMENTADOS |
| Follow-up Automático v2 | 8673245 | FOLLOW-UP AUTOMÁTICO |
| Pós-Atendimento Completo | 8673246 | PÓS-ATENDIMENTO |
| Lembrete Aula Teste + No-Show | 8673247 | LEMBRETES |
| Resposta Fora Horário | 8673248 | MELHORIAS 2026 |
| Reativação Ex-Clientes | 8673249 | REATIVAÇÃO & INDICAÇÃO |
| Indicação com Recompensa | 8673250 | REATIVAÇÃO & INDICAÇÃO |
| Boas-Vindas Otimizado v2 | 8673251 | MELHORIAS 2026 |
| Plano Família / Dupla | 8679371 | (sem folder) |

### Keywords Criadas
| Keyword | ID | Flow | Palavras |
|---------|-----|------|---------|
| Plano Família | 561109 | 8679371 | familia,dupla,2 pessoas,duas pessoas,plano para 2,meu filho,minha filha,meu marido,minha esposa,casal,juntos,somos 2,... |
| Agendar Visita | 561110 | 8677433 | 1,agendar,visita,quero conhecer,quero ir,posso visitar,vou conhecer,quero visitar,agendar visita,quero agendar,quero agendar uma visita |
| Falar com Atendente | 561111 | 8677433 | 2,falar com atendente,quero falar com alguem,quero falar com um atendente,atendente,falar com humano,falar com recepção,recepção,atendimento humano |
| Ainda tenho duvidas | 561112 | 8673437 | 3,tenho duvidas,ainda tenho duvidas,nao sei,mais informacoes,quero mais info,quero saber mais,tenho uma duvida,tem duvidas,me tira uma duvida,duvida,informacoes |

### Blocos do Flow Plano Família / Dupla (8679371)
| Bloco | ID | text_content_sub_block_id | Descricao |
|-------|-----|--------------------------|-----------|
| Bloco 1 | 173724682 | 76555653 | Starting block - boas-vindas |
| Bloco 2 | 173724683 | 76555654 | Coleta de dados (qtd pessoas, modalidade, data) |
| Bloco 3 | 173724684 | 76555655 | Encaminhamento para equipe de vendas |

### Bloco CTA adicionado ao Flow Planos (2633433)
| Bloco | ID | text_content_sub_block_id | Descricao |
|-------|-----|--------------------------|-----------|
| CTA Final | 173724692 | 76555658 | "Gostou de alguma opção? 😊" — CTA com 3 opções (agendar visita, atendente, dúvidas) |
**Cadeia:** Plano Força/Premium/VIP/Pagamentos → CTA (173724692) → Menu "O que deseja fazer agora?" (58413120)

### Flows Existentes (Referência)
| Flow | ID |
|------|-----|
| Menu Primeira Vez (welcome) | 2633331 |
| Menu Outras Vezes (default) | 2633332 |
| Resposta Padrão Mídias | 3478180 |
| FOLLOW-UP LEAD NOVO (existente) | 8603106 |
| Roteador de Status (Ativo/Inativo/Prospect) | 8677433 |
| Interesse Generico | Redirecionar | 8673437 |

### Keywords
| Ação | Método | Endpoint |
|------|--------|----------|
| Criar | POST | `/api/v1/keywords/` body: `{name, text: "p1,p2,...", type: 1, flow: id, bot: id, is_turn_on: true}` |
| Atualizar palavras | PATCH | `/api/v1/keywords/{id}/` body: `{text: "p1,p2,..."}` |
| Detalhe | GET | `/api/v1/keywords/{id}/` |
**GOTCHA:** Endpoint `/api/v1/bots/{id}/keywords/` retorna 404. Usar `/api/v1/keywords/` sem prefixo de bot.
**GOTCHA:** Campo para palavras é `text` (não `words`). Palavras separadas por vírgula.

## Limitações da API
- **Texto:** Aplicar via `PATCH /api/v1/blocks_content/text/{text_content_sub_block_id}/` com `{text: "...", text_styles: DraftJs}`
- **text_content_sub_block_id:** Está em `bloco.content_block.content_sub_block[0].text_content_sub_block.id` (NÃO em `text_sub_block.id`)
- **GET bloco individual:** `GET /api/v1/blocks/{blockId}/` retorna detalhes com content_sub_block
- **Texto (antigo):** SÓ funciona via `/api/v1/blocks_content/text/` (outros endpoints retornam 404)
- **Botões/Menu:** Endpoint de criação de sub-blocks retorna 404 via API
- **Condições:** condition_sub_block precisa ser configurado via constructor UI
- **Content sub-blocks:** POST `/api/v1/content_sub_blocks/` retorna 404
- **Login direto:** POST `/api/v1/auth/jwt/create/` retorna 401 (precisa browser)
- **Token JWT:** Funciona SOMENTE em contexto do browser (page.evaluate). Chamadas fetch diretas do Node.js retornam 403 mesmo com token válido
- **DELETE tag sub-blocks:** Método DELETE retorna 405 (não suportado) para `/api/v1/blocks_action/tag/{id}/`
- **Tag sub-block field name:** Na resposta GET, tags estão em `action_block.action_sub_block[].tag_action_sub_block` (NÃO `action_tag_sub_block`)
- **Blocks listing:** Resposta é array direto (não tem wrapper `.blocks` nem `.results`)
- **Refresh token:** `POST /api/v1/auth/jwt/refresh/` com `{refresh: token}` retorna novo access token

## GOTCHA: Chamadas API via Browser
**OBRIGATÓRIO:** Todas as chamadas à API devem ser feitas dentro de `page.evaluate()` via Puppeteer:
```js
const result = await page.evaluate(async () => {
  const token = localStorage.getItem('authToken');
  const res = await fetch('https://backend.botconversa.com.br/api/v1/...', {
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', 'X-Language': 'pt' }
  });
  return await res.json();
});
```
Chamadas diretas via `fetch` do Node.js retornam 403 ("Bot in request.data does not exist").
