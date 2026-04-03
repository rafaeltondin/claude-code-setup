---
title: "Meu WhatsApp Pessoal via Evolution API - Guia Completo de Interação"
category: "Automacao"
tags:
  - evolution api
  - whatsapp
  - cenora
  - automação
  - mensagens
  - grupos
  - api rest
  - claude code
topic: "WhatsApp Pessoal via API"
priority: critical
version: "2.2.0"
last_updated: "2026-02-24"
---

# Meu WhatsApp Pessoal via Evolution API - Guia Completo de Interação

Guia completo e testado para interagir com o WhatsApp pessoal do Rafael A Tondin atraves da Evolution API v2.3.7, usando a instancia **cenora**.

---

## REGRAS OBRIGATORIAS (RESUMO RAPIDO)

> **3 regras que NUNCA podem ser violadas:**
>
> 1. **INSTANCIA:** Usar SEMPRE `cenora` — nunca criar ou usar outra instancia
> 2. **PADRAO DE ESCRITA:** Toda mensagem DEVE seguir o padrao de escrita do Rafael (secao abaixo) — tudo minusculo, abreviacoes, sem pontuacao, girias gauchas, "tu" ao inves de "voce"
> 3. **CONFIRMACAO:** NUNCA enviar sem apresentar a mensagem ao usuario e receber confirmacao explicita

**Para documentacao tecnica completa dos endpoints:**
Consulte: `EVOLUTION-API-DOCUMENTACAO-COMPLETA.md`

---

## REGRA OBRIGATORIA: CONFIRMACAO ANTES DE ENVIAR

> **REGRA CRÍTICA E INVIOLÁVEL:** O Claude Code NUNCA deve enviar mensagens pelo WhatsApp sem antes:
> 1. Compor a mensagem seguindo o padrão de escrita do Rafael (seção abaixo)
> 2. Apresentar a mensagem EXATAMENTE como seria enviada
> 3. Aguardar CONFIRMAÇÃO EXPLÍCITA do usuário ("sim", "manda", "pode", "envia", etc.)
> 4. Só então executar o envio via API

### Fluxo Obrigatório de Envio

```
ANTES de qualquer envio de mensagem:
│
├── 1. COMPOR a mensagem usando o padrão de escrita do Rafael
│
├── 2. APRESENTAR ao usuário:
│      ┌──────────────────────────────────────┐
│      │ 📱 MENSAGEM PARA ENVIO               │
│      │                                       │
│      │ Para: [Nome/Número do destinatário]   │
│      │ Mensagem:                             │
│      │ "[texto exato que será enviado]"       │
│      │                                       │
│      │ Confirma o envio? (sim/não)           │
│      └──────────────────────────────────────┘
│
├── 3. AGUARDAR resposta do usuário
│      ├── SE "sim/manda/pode/envia" → Enviar
│      ├── SE "não/cancela" → Cancelar
│      └── SE pediu alteração → Ajustar e reapresentar
│
└── 4. SÓ ENTÃO enviar via API
│
└── 5. SE múltiplas mensagens separadas:
       └── Aguardar 30 SEGUNDOS entre cada envio
       └── Usar sleep(30000) no script ou delay equivalente
       └── Isso evita bloqueio do WhatsApp e parece natural
```

### Regra de Delay para Mensagens Sequenciais

> **REGRA OBRIGATÓRIA:** Quando enviar MÚLTIPLAS mensagens separadas para o mesmo contato (ex: mensagem dividida em 3-5 partes), o Claude Code DEVE aguardar **30 segundos** entre cada envio. Isso é necessário para:
> 1. Evitar bloqueio/ban do número pelo WhatsApp (anti-spam)
> 2. Parecer um envio natural (humano não digita tudo instantaneamente)
> 3. Dar tempo do destinatário ler cada parte antes de receber a próxima
>
> **Implementação no script:**
> ```javascript
> // Entre cada mensagem sequencial: aguardar 30 segundos
> await sleep(30000); // 30 segundos OBRIGATÓRIOS
> ```
>
> **NÃO usar delays menores** como 2s, 3s ou 5s para mensagens separadas. O mínimo é 30 segundos.
> O campo `"delay"` do payload da API (efeito "digitando...") pode ser usado adicionalmente, mas NÃO substitui o sleep de 30s entre envios.

### Exemplo Prático

```
Usuário: "manda msg pro Torres perguntando se vai na pescaria"

Claude Code apresenta:
┌──────────────────────────────────────┐
│ 📱 MENSAGEM PARA ENVIO               │
│                                       │
│ Para: Torres (555491942218)           │
│ Mensagem:                             │
│ "e ai torres, bora pescar? to         │
│ pensando em organizar uma pescaria.   │
│ me avisa se tu ta dentro."            │
│                                       │
│ Confirma o envio? (sim/não)           │
└──────────────────────────────────────┘

Usuário: "sim"
→ Claude Code envia a mensagem
```

---

## PADRÃO DE ESCRITA DO RAFAEL (OBRIGATÓRIO!)

> **REGRA:** Toda mensagem composta pelo Claude Code para envio via WhatsApp DEVE seguir este padrão fielmente. Mensagens que não seguem este padrão serão percebidas como artificiais/robóticas.

### Análise Baseada em +250 Mensagens Reais (13/02/2026)

### Regras de Escrita

| # | Regra | Exemplo CORRETO | Exemplo ERRADO |
|---|-------|-----------------|----------------|
| 1 | **Tudo em minúscula** (exceto ênfase intencional) | `e ai, tudo certo?` | `E aí, tudo certo?` |
| 2 | **Acentos são opcionais** (pode usar ou não) | `não` ou `nao`, `já` ou `ja` - ambos OK | Forçar acentuação formal em tudo |
| 3 | **Abreviações pesadas** | `q`, `mt`, `ctg`, `tbm`, `dps`, `hj`, `pra`, `ngm`, `msm`, `dms`, `blza` | `que`, `muito`, `contigo`, `também`, `depois`, `hoje`, `para`, `ninguém`, `mesmo`, `demais`, `beleza` |
| 4 | **Pontuação adequada** (vírgulas, pontos e ? naturalmente) | `to indo pra la agora.` / `show, ja faço.` | Sem nenhuma pontuação ou pontuação excessiva (!!!) |
| 5 | **Usa "tu" ao invés de "você"** | `tu viu isso?` | `você viu isso?` |
| 6 | **Mensagens curtas e fragmentadas** | Várias msgs de 2-10 palavras | Uma msg longa com tudo |
| 7 | **Gírias gaúchas** | `bah`, `tri`, `pilas`, `dale`, `guri` | Evitar gírias de outras regiões |
| 8 | **Risada = "kkk"** | `kkkkkk`, `kkk` | `hahaha`, `rsrs`, `😂` |
| 9 | **Letras repetidas para ênfase** | `siiiim`, `oiiiii`, `blzaaa`, `baaaaaa` | `sim!!`, `oi!!!` |
| 10 | **Quase zero emojis** | texto puro | texto cheio de emojis |

### Vocabulário Frequente

| Palavra/Expressão | Significado | Contexto |
|-------------------|-------------|----------|
| `fala irmao` | Cumprimento para amigos | Início de conversa casual |
| `e ai` | Cumprimento casual | Início de conversa |
| `tudo certo e ctg` / `tudo certo e ctg?` | Como vai? | Cumprimento |
| `bom dia` / `boa tarde` | Cumprimento formal | Contexto profissional |
| `show` | OK/entendi/aprovado | Confirmação |
| `pode crer` | Entendi | Confirmação |
| `pode dale` | Pode fazer/vai em frente | Aprovação |
| `blza` / `blzaaa` | Beleza/OK | Concordância |
| `bora q bora` / `vamo q vamo` | Vamos nessa | Motivação |
| `bah` | Expressão de surpresa | Reação gaúcha |
| `tri` | Muito bom | Elogio gaúcho |
| `pilas` | Dinheiro | Gíria gaúcha |
| `mt bom` / `mt foda` | Muito bom | Elogio |
| `top dms` | Muito bom | Elogio |
| `to feliz com` | Estou satisfeito | Aprovação |
| `ja faço` / `ja mando` | Farei agora | Compromisso |
| `feito` | Concluído | Confirmação de tarefa |
| `eita` / `eitaa` | Surpresa | Reação |
| `capaz` | Não/imagina | Negação gaúcha |

### Padrão por Contexto

**Conversa casual com amigos:**
```
e ai torres, beleza?
bora pescar sabado?
descobri um lugar tri bom.
me avisa se tu ta dentro.
```

**Contexto profissional (ainda informal):**
```
boa tarde.
tudo certo e ctg?
vou analisar aqui e ja te mando.
show, ja faço.
```

**Resposta rápida/confirmação:**
```
sim.
blza.
show.
pode dale.
feito.
ja mando.
```

**Reação a algo:**
```
bah, mt bom.
kkkkkkkkkkkk
top dms.
caramba.
```

### O que NÃO fazer (parece robô)

| NÃO FAÇA | POR QUÊ |
|-----------|---------|
| Começar com maiúscula | Rafael escreve tudo em minúscula |
| Usar pontuação excessiva (!!!, ..., ???) | Rafael pontua de forma natural e simples |
| Escrever parágrafos longos | Rafael fragmenta em msgs curtas |
| Usar linguagem formal | Rafael é extremamente casual |
| Usar emojis em excesso | Rafael quase não usa emojis |
| Escrever "hahaha" ou "rsrs" | Rafael usa "kkk" |
| Usar "você" | Rafael usa "tu" |
| Escrever palavras completas quando há abreviação comum | Rafael abrevia tudo: q, mt, pra, dps, hj, tbm, ctg |

---

## Acesso Rápido

| Campo | Valor |
|-------|-------|
| **URL Base** | `https://evolution.rafaeltondin.com.br` |
| **API Key Global** | `{{secret:EVOLUTION_API_KEY}}` |
| **Versão da API** | `2.3.6` |
| **Instância** | `cenora` |
| **Número WhatsApp** | `555499000753` |
| **JID** | `555499000753@s.whatsapp.net` |
| **Perfil** | Rafael A Tondin |
| **Status Conexão** | `open` (conectada) |
| **Token da Instância** | `{{secret:EVOLUTION_INSTANCE_TOKEN}}` |
| **Tipo de Conexão** | WhatsApp Web (Baileys) |
| **Manager** | `https://evolution.rafaeltondin.com.br/manager/` |

### Estatísticas da Instância (em 08/02/2026)

| Métrica | Valor |
|---------|-------|
| Mensagens | 115.037 |
| Contatos | 1.695 |
| Chats | 1.831 |
| Grupos | 202 |
| Imagens | 9.679 |
| Áudios | 10.364 |
| Vídeos | 2.128 |
| Documentos | 578 |
| Stickers | 3.794 |

---

## Header Padrão (Todas as Requisições)

Toda requisição à API deve incluir:

```
Content-Type: application/json
apikey: {{secret:EVOLUTION_API_KEY}}
```

Template base para curl:

```bash
curl -s --request [MÉTODO] \
  --url "https://evolution.rafaeltondin.com.br/[ENDPOINT]/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '[JSON_BODY]'
```

---

## 1. Verificar Status da Conexão

Antes de qualquer operação, confirme que a instância está conectada.

**Endpoint:** `GET /instance/connectionState/cenora`

```bash
curl -s "https://evolution.rafaeltondin.com.br/instance/connectionState/cenora" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}"
```

**Resposta esperada:**

```json
{
  "instance": {
    "instanceName": "cenora",
    "state": "open"
  }
}
```

**Estados possíveis:**

| Estado | Significado | Ação |
|--------|-------------|------|
| `open` | Conectado e pronto | Pode operar normalmente |
| `close` | Desconectado | Reconectar via QR Code |
| `connecting` | Tentando conectar | Aguardar |

---

## 2. Enviar Mensagens

### 2.1 Enviar Texto Simples

**Endpoint:** `POST /message/sendText/cenora`

```bash
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/message/sendText/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "number": "555499000753",
    "text": "Olá! Mensagem de teste."
  }'
```

**Resposta de sucesso:**

```json
{
  "key": {
    "remoteJid": "555499000753@s.whatsapp.net",
    "fromMe": true,
    "id": "3EB0CCCCC1A6B6F05D762A"
  },
  "pushName": "Você",
  "status": "PENDING",
  "message": {
    "conversation": "Olá! Mensagem de teste."
  },
  "messageType": "conversation",
  "messageTimestamp": 1770604738,
  "source": "web"
}
```

### 2.2 Enviar Texto com Efeito de Digitação

Simula o "digitando..." antes de enviar:

```bash
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/message/sendText/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "number": "555499000753",
    "text": "Mensagem com delay e efeito digitando",
    "delay": 2000
  }'
```

### 2.3 Enviar Texto com Formatação

O WhatsApp suporta formatação Markdown:

```bash
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/message/sendText/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "number": "555499000753",
    "text": "*Negrito*\n_Itálico_\n~Tachado~\n```Monoespaçado```\n\n> Citação\n\n- Lista item 1\n- Lista item 2"
  }'
```

### 2.4 Enviar para um Grupo

Use o JID do grupo (formato `XXXXXXXXXX@g.us`):

```bash
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/message/sendText/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "number": "120363048513214694@g.us",
    "text": "Mensagem para o grupo"
  }'
```

### 2.5 Enviar Imagem

**Via URL:**

```bash
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/message/sendMedia/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "number": "555499000753",
    "mediatype": "image",
    "caption": "Legenda da imagem",
    "media": "https://exemplo.com/imagem.jpg"
  }'
```

### 2.6 Enviar Documento/Arquivo

```bash
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/message/sendMedia/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "number": "555499000753",
    "mediatype": "document",
    "caption": "Relatório mensal",
    "media": "https://exemplo.com/relatorio.pdf",
    "fileName": "relatorio-fev-2026.pdf"
  }'
```

### 2.7 Enviar Áudio

```bash
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/message/sendWhatsAppAudio/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "number": "555499000753",
    "audio": "https://exemplo.com/audio.mp3"
  }'
```

### 2.8 Enviar Localização

```bash
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/message/sendLocation/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "number": "555499000753",
    "locationMessage": {
      "latitude": -28.2564,
      "longitude": -52.4039,
      "name": "Passo Fundo, RS",
      "address": "Centro, Passo Fundo - RS"
    }
  }'
```

### 2.9 Enviar Contato

```bash
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/message/sendContact/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "number": "555499000753",
    "contactMessage": [
      {
        "fullName": "Nome do Contato",
        "wuid": "5554XXXXXXXX@s.whatsapp.net",
        "phoneNumber": "+5554XXXXXXXX"
      }
    ]
  }'
```

### 2.10 Enviar Reação a Mensagem

```bash
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/message/sendReaction/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "reactionMessage": {
      "key": {
        "remoteJid": "555499000753@s.whatsapp.net",
        "fromMe": false,
        "id": "MESSAGE_ID_AQUI"
      },
      "reaction": "👍"
    }
  }'
```

### 2.11 Enviar Enquete (Poll)

```bash
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/message/sendPoll/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "number": "555499000753",
    "pollMessage": {
      "name": "Qual opção você prefere?",
      "selectableCount": 1,
      "values": ["Opção A", "Opção B", "Opção C"]
    }
  }'
```

---

## 3. Ler Conversas e Mensagens

### 3.0 Listar Conversas Recentes (findChats)

**Endpoint:** `POST /chat/findChats/cenora`

Lista todas as conversas (chats) com última mensagem, status de leitura e metadados. Útil para ver conversas recentes e identificar JIDs.

```bash
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/chat/findChats/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{}'
```

**Estrutura de um chat:**

```json
{
  "id": "cmm1ez1280030jj5py0evmwaz",
  "remoteJid": "555491942218@s.whatsapp.net",
  "pushName": "Torres",
  "profilePicUrl": "https://pps.whatsapp.net/...",
  "updatedAt": "2026-02-25T02:17:19.000Z",
  "windowStart": "2026-02-25T02:27:16.636Z",
  "windowExpires": "2026-02-26T02:27:16.636Z",
  "windowActive": true,
  "lastMessage": {
    "key": {"id": "MSG_ID", "fromMe": true, "remoteJid": "555491942218@s.whatsapp.net"},
    "message": {"conversation": "Última mensagem..."},
    "messageTimestamp": 1771985969
  },
  "unreadCount": 0,
  "isSaved": true
}
```

**Campos importantes:**

| Campo | Descrição |
|-------|-----------|
| `remoteJid` | JID do chat — use para buscar mensagens |
| `pushName` | Nome de exibição do contato/grupo |
| `lastMessage` | Última mensagem trocada no chat |
| `unreadCount` | Mensagens não lidas |
| `updatedAt` | Data da última atividade |
| `windowActive` | Se a janela de 24h para resposta está ativa |

**Filtrar conversas por tipo (client-side):**

```javascript
// Após buscar todos os chats:
const chats = response; // array de chats

// Apenas conversas individuais
const individuais = chats.filter(c => c.remoteJid.includes('@s.whatsapp'));

// Apenas grupos
const grupos = chats.filter(c => c.remoteJid.includes('@g.us'));

// Conversas com mensagens não lidas
const naoLidas = chats.filter(c => c.unreadCount > 0);

// Buscar chat por nome (busca parcial)
const resultado = chats.filter(c =>
  (c.pushName || '').toLowerCase().includes('rafael')
);
```

> **Dados reais:** A instância cenora tem ~392 chats (231 individuais, 43 grupos, demais são status/broadcast).

---

### 3.1 Buscar Mensagens de um Chat Específico

**Endpoint:** `POST /chat/findMessages/cenora`

Use o campo `where` para filtrar por JID e `limit`/`page` para paginação.

```bash
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/chat/findMessages/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "where": {
      "key": {
        "remoteJid": "555499000753@s.whatsapp.net"
      }
    },
    "limit": 50,
    "page": 1
  }'
```

**Estrutura da resposta:**

```json
{
  "messages": {
    "total": 122,
    "pages": 3,
    "currentPage": 1,
    "records": [
      {
        "id": "cmlekcgf26gqinv6hvy6faih0",
        "key": {
          "id": "3EB0CCCCC1A6B6F05D762A",
          "fromMe": true,
          "remoteJid": "555499000753@s.whatsapp.net"
        },
        "pushName": "Você",
        "messageType": "conversation",
        "message": {
          "conversation": "Texto da mensagem aqui"
        },
        "messageTimestamp": 1770604738,
        "instanceId": "a0f29797-1aed-48d9-a488-33f3983dea88",
        "source": "web",
        "MessageUpdate": [
          {"status": "SERVER_ACK"}
        ]
      }
    ]
  }
}
```

**Campos importantes de cada mensagem:**

| Campo | Descrição |
|-------|-----------|
| `key.id` | ID único da mensagem |
| `key.fromMe` | `true` se enviada por mim, `false` se recebida |
| `key.remoteJid` | JID do chat (número@s.whatsapp.net ou grupo@g.us) |
| `pushName` | Nome de exibição do remetente |
| `messageType` | Tipo da mensagem (ver tabela abaixo) |
| `message` | Conteúdo da mensagem (varia por tipo) |
| `messageTimestamp` | Timestamp Unix da mensagem |
| `source` | Origem: `web`, `android`, `ios` |

### 3.2 Tipos de Mensagem (messageType)

| Tipo | Descrição | Campo do conteúdo |
|------|-----------|-------------------|
| `conversation` | Texto simples | `message.conversation` |
| `extendedTextMessage` | Texto com link preview | `message.extendedTextMessage.text` |
| `imageMessage` | Imagem | `message.imageMessage` |
| `videoMessage` | Vídeo | `message.videoMessage` |
| `audioMessage` | Áudio/voz | `message.audioMessage` |
| `documentMessage` | Documento/arquivo | `message.documentMessage` |
| `documentWithCaptionMessage` | Documento com legenda | `message.documentWithCaptionMessage.message.documentMessage` |
| `stickerMessage` | Sticker | `message.stickerMessage` |
| `locationMessage` | Localização | `message.locationMessage` |
| `contactMessage` | Contato | `message.contactMessage` |
| `reactionMessage` | Reação | `message.reactionMessage` |
| `pollCreationMessage` | Enquete | `message.pollCreationMessage` |
| `protocolMessage` | Protocolo (deletar, etc) | `message.protocolMessage` |

### 3.3 Filtrar Mensagens por Tipo

Buscar apenas documentos:

```bash
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/chat/findMessages/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "where": {
      "messageType": "documentMessage"
    },
    "limit": 50,
    "page": 1
  }'
```

Buscar apenas imagens:

```bash
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/chat/findMessages/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "where": {
      "messageType": "imageMessage"
    },
    "limit": 50,
    "page": 1
  }'
```

### 3.4 Combinar Filtros (Chat + Tipo)

Buscar documentos de um contato específico:

```bash
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/chat/findMessages/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "where": {
      "key": {
        "remoteJid": "555491332097@s.whatsapp.net"
      },
      "messageType": "documentMessage"
    },
    "limit": 50,
    "page": 1
  }'
```

Buscar mensagens enviadas por mim em um grupo:

```bash
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/chat/findMessages/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "where": {
      "key": {
        "remoteJid": "120363048513214694@g.us",
        "fromMe": true
      }
    },
    "limit": 50,
    "page": 1
  }'
```

### 3.5 Paginação

A API retorna mensagens paginadas. Parâmetros podem ir no body OU na query string:

**Via body (recomendado):**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `limit` | number | Mensagens por página (padrão: 50) |
| `page` | number | Número da página (começa em 1) |

**Via query string (alternativa):**

```bash
# Equivalente: page 2 com 50 registros por página
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/chat/findMessages/cenora?page=2&offset=50" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "where": {
      "key": {
        "remoteJid": "120363159697531789@g.us"
      }
    }
  }'
```

**Estrutura da resposta paginada:**

```json
{
  "messages": {
    "total": 1119,
    "pages": 23,
    "currentPage": 2,
    "records": [...]
  }
}
```

Para percorrer todas as páginas, incremente `page` até `currentPage >= pages`.

> **Nota:** `offset` na query string define quantos registros por página (similar a `limit` no body).

### 3.6 Estrutura de Mensagem de Imagem

```json
{
  "imageMessage": {
    "url": "https://mmg.whatsapp.net/...",
    "width": 1080,
    "height": 1920,
    "mediaKey": "base64...",
    "mimetype": "image/jpeg",
    "viewOnce": false,
    "directPath": "/v/t62...",
    "fileLength": {"low": 123456, "high": 0},
    "fileSha256": "base64...",
    "jpegThumbnail": "base64...",
    "caption": "Legenda opcional"
  }
}
```

### 3.7 Estrutura de Mensagem de Documento

```json
{
  "documentMessage": {
    "url": "https://mmg.whatsapp.net/...",
    "fileName": "relatorio.pdf",
    "mimetype": "application/pdf",
    "fileLength": {"low": 50153, "high": 0},
    "mediaKey": "base64...",
    "directPath": "/v/t62..."
  }
}
```

---

## 4. Buscar Contatos

### 4.1 Listar Todos os Contatos

**Endpoint:** `POST /chat/findContacts/cenora`

```bash
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/chat/findContacts/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "where": {}
  }'
```

**Estrutura de um contato:**

```json
{
  "id": "cmk1qye8d0fonmr6ih3wvqn3j",
  "remoteJid": "555491942218@s.whatsapp.net",
  "pushName": "Torres",
  "profilePicUrl": "https://pps.whatsapp.net/...",
  "createdAt": "2026-01-05T22:43:17.735Z",
  "updatedAt": "2026-02-05T11:01:13.827Z",
  "instanceId": "a0f29797-1aed-48d9-a488-33f3983dea88",
  "isGroup": false,
  "isSaved": true,
  "type": "contact"
}
```

### 4.2 Buscar Contato por Nome

**Match exato** (API nativa):

```bash
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/chat/findContacts/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "where": {
      "pushName": "Torres"
    }
  }'
```

> **IMPORTANTE:** O `where.pushName` faz **match exato** (case-sensitive). Para busca parcial, use a abordagem client-side abaixo.

**Busca parcial (client-side — recomendado para Claude Code):**

```javascript
// 1. Buscar TODOS os contatos (sem where)
const response = await fetch('https://evolution.rafaeltondin.com.br/chat/findContacts/cenora', {
  method: 'POST',
  headers: { 'apikey': '{{secret:EVOLUTION_API_KEY}}', 'Content-Type': 'application/json' },
  body: JSON.stringify({})
});
const contatos = await response.json();

// 2. Filtrar client-side (case-insensitive, parcial)
const busca = 'rafael';
const encontrados = contatos.filter(c =>
  (c.pushName || '').toLowerCase().includes(busca.toLowerCase())
);
// Resultado: [{pushName: "Rafael Schumuneck", remoteJid: "555496827575@s.whatsapp.net"}, ...]
```

> **Dados reais:** A instância cenora tem ~1156 contatos. Buscar "rafael" retorna ~6 resultados.

### 4.3 Verificar se Número Tem WhatsApp

**Endpoint:** `POST /chat/whatsappNumbers/cenora`

```bash
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/chat/whatsappNumbers/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "numbers": ["555499000753", "5511999999999"]
  }'
```

**Resposta:**

```json
[
  {
    "jid": "555499000753@s.whatsapp.net",
    "exists": true,
    "number": "555499000753",
    "name": "",
    "lid": "lid"
  },
  {
    "jid": "5511999999999@s.whatsapp.net",
    "exists": false,
    "number": "5511999999999"
  }
]
```

### 4.4 Buscar Foto de Perfil

**Endpoint:** `POST /chat/fetchProfilePictureUrl/cenora`

```bash
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/chat/fetchProfilePictureUrl/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "number": "555499000753"
  }'
```

**Resposta:**

```json
{
  "wuid": "555499000753@s.whatsapp.net",
  "profilePictureUrl": "https://pps.whatsapp.net/..."
}
```

---

## 5. Gerenciamento de Grupos

### 5.1 Listar Todos os Grupos

**Endpoint:** `GET /group/fetchAllGroups/cenora`

```bash
curl -s "https://evolution.rafaeltondin.com.br/group/fetchAllGroups/cenora?getParticipants=false" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}"
```

**Estrutura de um grupo:**

```json
{
  "id": "120363416845995854@g.us",
  "subject": "Nome do Grupo",
  "subjectTime": 1742930566,
  "pictureUrl": "https://pps.whatsapp.net/...",
  "size": 15,
  "creation": 1742930566,
  "restrict": false,
  "announce": false,
  "isCommunity": false,
  "isCommunityAnnounce": false
}
```

**Campos:**

| Campo | Descrição |
|-------|-----------|
| `id` | JID do grupo (formato XXXXXXXXXX@g.us) |
| `subject` | Nome do grupo |
| `size` | Número de participantes |
| `creation` | Timestamp de criação |
| `restrict` | Se apenas admins editam info do grupo |
| `announce` | Se apenas admins enviam mensagens |
| `isCommunity` | Se é uma comunidade |

Use `?getParticipants=true` para incluir lista de membros (mais lento).

### 5.2 Informações Detalhadas de um Grupo

**Endpoint:** `GET /group/findGroupInfos/cenora?groupJid=JID`

```bash
curl -s "https://evolution.rafaeltondin.com.br/group/findGroupInfos/cenora?groupJid=120363416845995854@g.us" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}"
```

**Resposta (inclui participantes):**

```json
{
  "id": "120363416845995854@g.us",
  "subject": "Nome do Grupo",
  "subjectTime": 1742930566,
  "pictureUrl": "https://pps.whatsapp.net/...",
  "size": 1,
  "creation": 1742930566,
  "restrict": false,
  "announce": false,
  "participants": [
    {
      "id": "266988404359416@lid",
      "phoneNumber": "555499000753@s.whatsapp.net",
      "admin": "admin"
    }
  ],
  "isCommunity": false,
  "isCommunityAnnounce": false
}
```

### 5.3 Mensagens de um Grupo

```bash
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/chat/findMessages/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "where": {
      "key": {
        "remoteJid": "120363048513214694@g.us"
      }
    },
    "limit": 50,
    "page": 1
  }'
```

### 5.4 Criar Grupo

**Endpoint:** `POST /group/create/cenora`

```bash
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/group/create/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "subject": "Novo Grupo Teste",
    "description": "Descrição do grupo",
    "participants": ["555491942218"]
  }'
```

### 5.5 Obter Link de Convite

```bash
curl -s "https://evolution.rafaeltondin.com.br/group/inviteCode/cenora?groupJid=120363416845995854@g.us" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}"
```

### 5.6 Gerenciar Participantes

**Adicionar:**

```bash
curl -s --request PUT \
  --url "https://evolution.rafaeltondin.com.br/group/updateParticipant/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "groupJid": "120363416845995854@g.us",
    "action": "add",
    "participants": ["555491942218"]
  }'
```

**Remover:** Mesmo endpoint, `"action": "remove"`
**Promover a admin:** Mesmo endpoint, `"action": "promote"`
**Rebaixar de admin:** Mesmo endpoint, `"action": "demote"`

---

## 6. Buscar Documentos e Mídias

### 6.1 Buscar Todos os Documentos

```bash
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/chat/findMessages/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "where": {
      "messageType": "documentMessage"
    },
    "limit": 50,
    "page": 1
  }'
```

Campos úteis de cada documento:

| Campo | Descrição |
|-------|-----------|
| `message.documentMessage.fileName` | Nome do arquivo |
| `message.documentMessage.mimetype` | Tipo MIME (application/pdf, etc) |
| `message.documentMessage.fileLength` | Tamanho em bytes |
| `message.documentMessage.url` | URL temporária para download |
| `key.remoteJid` | De qual chat veio |
| `pushName` | Quem enviou |
| `messageTimestamp` | Quando foi enviado |

### 6.2 Buscar Documentos de um Contato

```bash
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/chat/findMessages/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "where": {
      "key": {
        "remoteJid": "555491332097@s.whatsapp.net"
      },
      "messageType": "documentMessage"
    },
    "limit": 50,
    "page": 1
  }'
```

### 6.3 Buscar Imagens com Legenda

```bash
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/chat/findMessages/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "where": {
      "messageType": "imageMessage"
    },
    "limit": 50,
    "page": 1
  }'
```

### 6.4 Buscar Vídeos

```bash
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/chat/findMessages/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "where": {
      "messageType": "videoMessage"
    },
    "limit": 50,
    "page": 1
  }'
```

### 6.5 Buscar Áudios

```bash
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/chat/findMessages/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "where": {
      "messageType": "audioMessage"
    },
    "limit": 50,
    "page": 1
  }'
```

---

## 7. Análise de Conversa de Grupo (Relatórios)

### 7.1 Metodologia para Gerar Relatórios

Para criar um relatório completo de atividade de um grupo, siga este fluxo:

```
1. Obter info do grupo → GET /group/findGroupInfos/cenora?groupJid=JID
2. Buscar mensagens    → POST /chat/findMessages/cenora (paginando todas)
3. Processar dados     → Contagem por participante, tipo, período
4. Gerar relatório     → Compilar métricas e insights
```

### 7.2 Passo 1: Coletar Info do Grupo

```bash
curl -s "https://evolution.rafaeltondin.com.br/group/findGroupInfos/cenora?groupJid=GROUP_JID" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}"
```

Extrair:
- Nome do grupo
- Total de participantes
- Lista de membros e seus papéis (admin/membro)
- Data de criação

### 7.3 Passo 2: Coletar Todas as Mensagens (Paginação)

Script para percorrer todas as páginas:

```bash
# Página 1 (descobrir total)
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/chat/findMessages/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "where": {
      "key": {
        "remoteJid": "GROUP_JID@g.us"
      }
    },
    "limit": 50,
    "page": 1
  }'

# Continuar com page=2, page=3, etc. até currentPage >= pages
```

### 7.4 Passo 3: Métricas para o Relatório

Com os dados coletados, calcular:

**Métricas de Atividade:**
- Total de mensagens no período
- Mensagens por dia (média)
- Dia mais ativo / dia menos ativo
- Horário de pico de atividade

**Métricas por Participante:**
- Total de mensagens enviadas
- Tipos de mensagem (texto, imagem, áudio, etc.)
- Porcentagem de participação
- Média de mensagens por dia

**Métricas de Conteúdo:**
- Distribuição por tipo de mídia
- Total de documentos compartilhados
- Total de links compartilhados
- Mensagens mais reagidas

### 7.5 Template de Relatório de Grupo

```
╔══════════════════════════════════════════════════════════════╗
║           RELATÓRIO DE ATIVIDADE DO GRUPO                    ║
╚══════════════════════════════════════════════════════════════╝

📋 INFORMAÇÕES DO GRUPO
───────────────────────
Nome:          [Nome do Grupo]
JID:           [GroupJID@g.us]
Participantes: [N] membros
Criado em:     [Data]
Período:       [Data início] a [Data fim]

📊 RESUMO DE ATIVIDADE
──────────────────────
Total de mensagens:     [N]
Média diária:           [N/dia]
Dia mais ativo:         [Data] ([N] msgs)
Horário de pico:        [HH:MM - HH:MM]

👥 RANKING DE PARTICIPAÇÃO
──────────────────────────
1. [Nome] .......... [N] msgs ([X%])
2. [Nome] .......... [N] msgs ([X%])
3. [Nome] .......... [N] msgs ([X%])
...

📎 DISTRIBUIÇÃO POR TIPO
────────────────────────
Texto:      [N] ([X%])
Imagens:    [N] ([X%])
Áudios:     [N] ([X%])
Vídeos:     [N] ([X%])
Documentos: [N] ([X%])
Stickers:   [N] ([X%])
Outros:     [N] ([X%])

📄 DOCUMENTOS COMPARTILHADOS
─────────────────────────────
• [filename.pdf] - Enviado por [Nome] em [Data]
• [relatorio.xlsx] - Enviado por [Nome] em [Data]

🔗 LINKS MAIS COMPARTILHADOS
─────────────────────────────
• [url] - [N] vezes
• [url] - [N] vezes
```

---

## 8. Ações em Chats

### 8.1 Marcar Mensagem como Lida

**Endpoint:** `PUT /chat/markMessageAsRead/cenora`

```bash
curl -s --request PUT \
  --url "https://evolution.rafaeltondin.com.br/chat/markMessageAsRead/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "readMessages": [
      {
        "remoteJid": "555499000753@s.whatsapp.net",
        "fromMe": false,
        "id": "MESSAGE_ID"
      }
    ]
  }'
```

### 8.2 Arquivar Chat

```bash
curl -s --request PUT \
  --url "https://evolution.rafaeltondin.com.br/chat/archiveChat/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "chat": "555499000753@s.whatsapp.net",
    "archive": true
  }'
```

Para desarquivar: `"archive": false`

### 8.3 Deletar Mensagem para Todos

```bash
curl -s --request DELETE \
  --url "https://evolution.rafaeltondin.com.br/chat/deleteMessageForEveryone/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "remoteJid": "555499000753@s.whatsapp.net",
    "messageId": "MESSAGE_ID",
    "fromMe": true
  }'
```

### 8.4 Enviar Presença (Digitando/Gravando)

```bash
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/chat/sendPresence/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "number": "555499000753",
    "presence": "composing",
    "delay": 3000
  }'
```

**Valores de presença:**

| Valor | Efeito |
|-------|--------|
| `composing` | Mostra "digitando..." |
| `recording` | Mostra "gravando áudio..." |
| `available` | Online |
| `unavailable` | Offline |

---

## 9. Configurações da Instância

### 9.1 Ver Configurações Atuais

**Endpoint:** `GET /settings/find/cenora`

```bash
curl -s "https://evolution.rafaeltondin.com.br/settings/find/cenora" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}"
```

**Configurações atuais da cenora:**

```json
{
  "rejectCall": false,
  "msgCall": "",
  "groupsIgnore": false,
  "alwaysOnline": false,
  "readMessages": false,
  "readStatus": false,
  "syncFullHistory": false,
  "wavoipToken": ""
}
```

### 9.2 Alterar Configurações

**Endpoint:** `POST /settings/set/cenora`

```bash
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/settings/set/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "rejectCall": true,
    "msgCall": "Não posso atender agora, envie mensagem.",
    "alwaysOnline": true,
    "readMessages": true,
    "readStatus": true,
    "groupsIgnore": false,
    "syncFullHistory": false
  }'
```

**Descrição dos campos:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `rejectCall` | bool | Rejeitar chamadas automaticamente |
| `msgCall` | string | Mensagem automática ao rejeitar chamada |
| `groupsIgnore` | bool | Ignorar mensagens de grupos |
| `alwaysOnline` | bool | Manter status sempre online |
| `readMessages` | bool | Marcar mensagens como lidas automaticamente |
| `readStatus` | bool | Marcar stories/status como vistos |
| `syncFullHistory` | bool | Sincronizar histórico completo |

---

## 10. Perfil

### 10.1 Atualizar Nome do Perfil

```bash
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/profile/updateProfileName/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "name": "Rafael A Tondin"
  }'
```

### 10.2 Atualizar Status/Recado

```bash
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/profile/updateProfileStatus/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "status": "Disponível para contato"
  }'
```

### 10.3 Atualizar Foto do Perfil

```bash
curl -s --request PUT \
  --url "https://evolution.rafaeltondin.com.br/profile/updateProfilePicture/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "picture": "https://exemplo.com/foto.jpg"
  }'
```

---

## 11. Webhooks (Receber Eventos em Tempo Real)

### 11.1 Configurar Webhook

```bash
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/webhook/set/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "enabled": true,
    "url": "https://meu-servidor.com/webhook/cenora",
    "webhookByEvents": false,
    "webhookBase64": true,
    "events": [
      "MESSAGES_UPSERT",
      "MESSAGES_UPDATE",
      "SEND_MESSAGE",
      "CONNECTION_UPDATE"
    ]
  }'
```

### 11.2 Verificar Webhook Atual

```bash
curl -s "https://evolution.rafaeltondin.com.br/webhook/find/cenora" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}"
```

**Status atual:** Nenhum webhook configurado (`null`).

### 11.3 Eventos Disponíveis

| Evento | Descrição |
|--------|-----------|
| `MESSAGES_UPSERT` | Nova mensagem recebida |
| `MESSAGES_UPDATE` | Mensagem atualizada (lida, entregue) |
| `MESSAGES_DELETE` | Mensagem deletada |
| `SEND_MESSAGE` | Mensagem enviada com sucesso |
| `CONNECTION_UPDATE` | Status de conexão mudou |
| `QRCODE_UPDATED` | Novo QR Code gerado |
| `CONTACTS_SET` | Contatos carregados |
| `CONTACTS_UPSERT` | Contato adicionado/atualizado |
| `PRESENCE_UPDATE` | Status de presença atualizado |
| `CHATS_SET` | Chats carregados |
| `GROUPS_UPSERT` | Grupo criado/atualizado |
| `GROUP_PARTICIPANTS_UPDATE` | Membros do grupo alterados |

---

## 12. Outras Instâncias no Servidor

| Instância | Status | Número | Perfil |
|-----------|--------|--------|--------|
| **cenora** | `open` | 555499000753 | Rafael A Tondin |
| **pinha** | `open` | 555198822015 | Pinha Originals |
| **riwerlabs2** | `close` | 554891443566 | Riwer Labs |
| **suletiquetas** | `close` | 555491128500 | Sul Etiquetas |

Para operar outra instância, basta trocar `cenora` pelo nome da instância nos endpoints.

---

## 13. Gerenciamento da Instância

### 13.1 Reiniciar Instância

```bash
curl -s --request PUT \
  --url "https://evolution.rafaeltondin.com.br/instance/restart/cenora" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}"
```

### 13.2 Desconectar (Logout)

```bash
curl -s --request DELETE \
  --url "https://evolution.rafaeltondin.com.br/instance/logout/cenora" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}"
```

### 13.3 Reconectar (Gerar QR Code)

```bash
curl -s "https://evolution.rafaeltondin.com.br/instance/connect/cenora" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}"
```

### 13.4 Definir Presença Global

```bash
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/instance/setPresence/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "presence": "available"
  }'
```

---

## 14. Referência Rápida de Formatos JID

| Tipo | Formato | Exemplo |
|------|---------|---------|
| Contato individual | `NUMERO@s.whatsapp.net` | `555499000753@s.whatsapp.net` |
| Grupo | `XXXXXXXXXX@g.us` | `120363048513214694@g.us` |
| Status/Stories | `status@broadcast` | `status@broadcast` |
| LID (Link ID) | `XXXXXXXXXX@lid` | `266988404359416@lid` |

---

## 15. Guia para Claude Code (Automação)

### 15.1 Variáveis para Scripts

```bash
# Variáveis padrão para automação
EVOLUTION_URL="https://evolution.rafaeltondin.com.br"
EVOLUTION_KEY="{{secret:EVOLUTION_API_KEY}}"
INSTANCE="cenora"
MEU_NUMERO="555499000753"
```

### 15.2 Função Helper para Requisições

```bash
# Função curl helper
evo_api() {
  local METHOD=$1
  local ENDPOINT=$2
  local DATA=$3

  if [ -z "$DATA" ]; then
    curl -s --request $METHOD \
      --url "https://evolution.rafaeltondin.com.br/${ENDPOINT}" \
      --header "Content-Type: application/json" \
      --header "apikey: {{secret:EVOLUTION_API_KEY}}"
  else
    curl -s --request $METHOD \
      --url "https://evolution.rafaeltondin.com.br/${ENDPOINT}" \
      --header "Content-Type: application/json" \
      --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
      --data "$DATA"
  fi
}

# Exemplos de uso:
# evo_api GET "instance/connectionState/cenora"
# evo_api POST "message/sendText/cenora" '{"number":"555499000753","text":"Teste"}'
```

### 15.3 Workflow: Enviar Mensagem

```bash
# 1. Verificar conexão
curl -s "https://evolution.rafaeltondin.com.br/instance/connectionState/cenora" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}"

# 2. Se open, enviar mensagem
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/message/sendText/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{"number": "555499000753", "text": "Mensagem aqui"}'
```

### 15.4 Workflow: Ler Últimas Mensagens de um Chat

```bash
# Buscar últimas 10 mensagens
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/chat/findMessages/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "where": {"key": {"remoteJid": "NUMERO@s.whatsapp.net"}},
    "limit": 10,
    "page": 1
  }'
```

### 15.5 Workflow: Relatório de Grupo

```bash
# 1. Info do grupo
curl -s "https://evolution.rafaeltondin.com.br/group/findGroupInfos/cenora?groupJid=GROUP_JID" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}"

# 2. Mensagens do grupo (paginar)
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/chat/findMessages/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "where": {"key": {"remoteJid": "GROUP_JID@g.us"}},
    "limit": 50,
    "page": 1
  }'

# 3. Repetir para page=2, 3, ... até cobrir todas as páginas
# 4. Processar e gerar relatório
```

### 15.6 Workflow: Buscar Documentos de um Período

Não há filtro direto por data na API. Busque todas as mensagens de documento e filtre pelo `messageTimestamp` no processamento:

```bash
# Buscar documentos
curl -s --request POST \
  --url "https://evolution.rafaeltondin.com.br/chat/findMessages/cenora" \
  --header "Content-Type: application/json" \
  --header "apikey: {{secret:EVOLUTION_API_KEY}}" \
  --data '{
    "where": {"messageType": "documentMessage"},
    "limit": 50,
    "page": 1
  }'

# No processamento, filtrar por messageTimestamp:
# timestamp_inicio <= messageTimestamp <= timestamp_fim
```

---

## 16. Tabela de Endpoints Completa

### Instância

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/instance/connectionState/cenora` | Status da conexão |
| GET | `/instance/fetchInstances` | Listar todas instâncias |
| GET | `/instance/connect/cenora` | Gerar QR Code |
| PUT | `/instance/restart/cenora` | Reiniciar instância |
| DELETE | `/instance/logout/cenora` | Desconectar |
| POST | `/instance/setPresence/cenora` | Definir presença |

### Mensagens

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/message/sendText/cenora` | Enviar texto |
| POST | `/message/sendMedia/cenora` | Enviar imagem/vídeo/documento |
| POST | `/message/sendWhatsAppAudio/cenora` | Enviar áudio |
| POST | `/message/sendLocation/cenora` | Enviar localização |
| POST | `/message/sendContact/cenora` | Enviar contato |
| POST | `/message/sendReaction/cenora` | Enviar reação |
| POST | `/message/sendPoll/cenora` | Enviar enquete |
| POST | `/message/sendList/cenora` | Enviar lista |
| POST | `/message/sendSticker/cenora` | Enviar sticker |
| POST | `/message/sendStatus/cenora` | Postar no status/stories |

### Chat

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/chat/findMessages/cenora` | Buscar mensagens (com filtros) |
| POST | `/chat/findContacts/cenora` | Buscar contatos |
| POST | `/chat/whatsappNumbers/cenora` | Verificar números WhatsApp |
| POST | `/chat/fetchProfilePictureUrl/cenora` | Buscar foto de perfil |
| POST | `/chat/sendPresence/cenora` | Enviar digitando/gravando |
| PUT | `/chat/markMessageAsRead/cenora` | Marcar como lido |
| PUT | `/chat/archiveChat/cenora` | Arquivar/desarquivar chat |
| DELETE | `/chat/deleteMessageForEveryone/cenora` | Deletar mensagem |

### Grupos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/group/fetchAllGroups/cenora` | Listar grupos |
| GET | `/group/findGroupInfos/cenora?groupJid=JID` | Info detalhada |
| GET | `/group/inviteCode/cenora?groupJid=JID` | Link de convite |
| POST | `/group/create/cenora` | Criar grupo |
| PUT | `/group/updateParticipant/cenora` | Add/remove/promote/demote |
| PUT | `/group/updateGroupSubject/cenora` | Alterar nome |
| PUT | `/group/updateGroupDescription/cenora` | Alterar descrição |
| PUT | `/group/updateGroupPicture/cenora` | Alterar foto |
| PUT | `/group/updateSetting/cenora` | Configurações do grupo |
| DELETE | `/group/leaveGroup/cenora` | Sair do grupo |

### Configurações

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/settings/find/cenora` | Ver configurações |
| POST | `/settings/set/cenora` | Alterar configurações |

### Perfil

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/profile/updateProfileName/cenora` | Alterar nome |
| POST | `/profile/updateProfileStatus/cenora` | Alterar recado |
| PUT | `/profile/updateProfilePicture/cenora` | Alterar foto |

### Webhook

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/webhook/find/cenora` | Ver webhook configurado |
| POST | `/webhook/set/cenora` | Configurar webhook |

---

## 17. Guia Rápido de Busca (Referência para Claude Code)

Tabela rápida de "quero encontrar X" → endpoint + filtro:

| Quero encontrar... | Endpoint | Filtro |
|---------------------|----------|--------|
| Todas as conversas recentes | `POST /chat/findChats/cenora` | body: `{}` |
| Conversas não lidas | `POST /chat/findChats/cenora` | client-side: `unreadCount > 0` |
| Contato por nome (parcial) | `POST /chat/findContacts/cenora` | client-side: `pushName.includes('nome')` |
| Contato por número | `POST /chat/findContacts/cenora` | client-side: `remoteJid.includes('5554')` |
| Verificar se número tem WhatsApp | `POST /chat/whatsappNumbers/cenora` | body: `{"numbers": ["5554..."]}` |
| Mensagens de um contato | `POST /chat/findMessages/cenora` | `where.key.remoteJid: "NUM@s.whatsapp.net"` |
| Mensagens de um grupo | `POST /chat/findMessages/cenora` | `where.key.remoteJid: "ID@g.us"` |
| Apenas minhas mensagens em um chat | `POST /chat/findMessages/cenora` | `where.key.fromMe: true` |
| Apenas imagens de um chat | `POST /chat/findMessages/cenora` | `where.messageType: "imageMessage"` |
| Documentos de um contato | `POST /chat/findMessages/cenora` | `where.key.remoteJid + where.messageType` |
| Lista de todos os grupos | `GET /group/fetchAllGroups/cenora` | query: `?getParticipants=false` |
| Info detalhada de um grupo | `GET /group/findGroupInfos/cenora` | query: `?groupJid=ID@g.us` |
| Membros de um grupo | `GET /group/findGroupInfos/cenora` | query: `?groupJid=ID@g.us` → `.participants` |
| Grupo por nome (parcial) | `GET /group/fetchAllGroups/cenora` | client-side: `subject.includes('nome')` |

### Fluxo Típico: "Quero ver conversas com fulano"

```
1. POST /chat/findContacts/cenora → body: {} → filtrar por pushName
2. Pegar remoteJid do contato encontrado
3. POST /chat/findMessages/cenora → where.key.remoteJid = JID_ENCONTRADO
4. Paginar se necessário: page=2, page=3...
```

### Fluxo Típico: "Quero ver mensagens de um grupo"

```
1. GET /group/fetchAllGroups/cenora → filtrar por subject
2. Pegar id (JID) do grupo encontrado
3. POST /chat/findMessages/cenora → where.key.remoteJid = JID_DO_GRUPO
4. Filtrar por tipo se necessário: where.messageType = "conversation"
```

### Dados da Instância Cenora (fev/2026)

| Métrica | Valor |
|---------|-------|
| Total de contatos | ~1.156 |
| Total de chats | ~392 (231 individuais, 43 grupos) |
| Total de mensagens | ~100.261 |
| Total de grupos | ~202 |

---

## 18. Troubleshooting

### Erro 401 - Unauthorized

Verifique se o header `apikey` está correto. Use sempre:
```
apikey: {{secret:EVOLUTION_API_KEY}}
```

### Erro 404 - Not Found

Verifique se:
- O nome da instância está correto (`cenora`)
- O endpoint existe na versão 2.3.6

### Mensagem não chega

1. Verifique se a instância está `open`
2. Confirme que o número inclui código do país (55)
3. Use `/chat/whatsappNumbers` para validar o número

### Conexão caiu

1. Verifique status: `GET /instance/connectionState/cenora`
2. Se `close`, reconecte: `GET /instance/connect/cenora`
3. Escaneie o QR Code no WhatsApp

### Response vazia

Alguns endpoints retornam resposta grande. Salve em arquivo:
```bash
curl -s [endpoint] -o output.json
```

---

**Documento Criado:** 2026-02-08
**Ultima Atualizacao:** 2026-02-14
**Versao:** 2.1.0
**Baseado em:** Testes reais contra Evolution API v2.3.7
**Instância testada:** cenora (555499000753)
**Todas as requisições foram testadas e validadas**
**Padrão de escrita:** Baseado em análise de +250 mensagens reais do Rafael (13/02/2026)
